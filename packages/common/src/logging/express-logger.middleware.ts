/**
 * Express Logging Middleware
 * Automatically logs HTTP requests with context injection
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getLogger, LogContext } from './logger';

/**
 * Express middleware to log HTTP requests
 */
export const requestLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const logger = getLogger();
  const startTime = Date.now();

  // Generate request ID if not present
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);

  // Set request context
  const context: LogContext = {
    requestId,
    method: req.method,
    _url: req.url,
    _userAgent: req.headers['user-agent'],
    _ip: req.ip || req.connection.remoteAddress,
  };

  // Add user context if available
  if ((req as any).user?.id) {
    context.userId = (req as any).user.id;
  }

  logger.setContext(context);

  // Log request start
  logger.info('Request received', {
    headers: sanitizeHeaders(req.headers),
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (data: any): Response {
    const duration = Date.now() - startTime;

    // Log request completion
    logger.logRequest(req.method, req.url, res.statusCode, duration, {
      _responseSize: Buffer.byteLength(JSON.stringify(data)),
    });

    // Clear context
    logger.clearContext();

    return originalSend.call(this, data);
  };

  // Handle response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    if (!res.headersSent) {
      logger.logRequest(req.method, req.url, res.statusCode, duration);
      logger.clearContext();
    }
  });

  // Handle errors
  res.on('error', (error: Error) => {
    const duration = Date.now() - startTime;
    logger.error('Request error', error, {
      _duration_ms: duration,
    });
    logger.clearContext();
  });

  next();
};

/**
 * Sanitize headers to remove sensitive information
 */
function sanitizeHeaders(headers: any): any {
  const sanitized = { ...headers };
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
  ];

  sensitiveHeaders.forEach((header) => {
    if (sanitized[header]) {
      sanitized[header] = '***REDACTED***';
    }
  });

  return sanitized;
}

/**
 * Error logging middleware
 */
export const errorLoggerMiddleware = (
  err: Error,
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const logger = getLogger();

  logger.error('Unhandled error', err, {
    _requestId: req.headers['x-request-id'] as string,
    method: req.method,
    _url: req.url,
    body: req.body,
  });

  next(err);
};
