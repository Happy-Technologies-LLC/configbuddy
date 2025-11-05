/**
 * Structured Logging Infrastructure
 * Winston-based logger with JSON formatting and context injection
 */

import winston from 'winston';
import * as path from 'path';

export interface LogContext {
  requestId?: string;
  userId?: string;
  jobId?: string;
  provider?: string;
  operation?: string;
  [key: string]: any;
}

export class Logger {
  private static instance: Logger;
  private logger: winston.Logger;
  private context: LogContext = {};

  private constructor() {
    const logDir = process.env['LOG_DIR'] || './logs';
    const logLevel = process.env['LOG_LEVEL'] || 'info';
    const nodeEnv = process.env['NODE_ENV'] || 'development';

    // Define log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.metadata({
        fillExcept: ['message', 'level', 'timestamp', 'stack'],
      }),
      winston.format.json()
    );

    // Console format for development (pretty print)
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.printf(({ timestamp, level, message, metadata, stack }) => {
        const metaStr =
          metadata && Object.keys(metadata).length > 0
            ? `\n${JSON.stringify(metadata, null, 2)}`
            : '';
        const stackStr = stack ? `\n${stack}` : '';
        return `${timestamp} ${level}: ${message}${metaStr}${stackStr}`;
      })
    );

    // Create transports
    const transports: winston.transport[] = [];

    // Console transport (always enabled)
    transports.push(
      new winston.transports.Console({
        format: nodeEnv === 'production' ? logFormat : consoleFormat,
      })
    );

    // File transports for production
    if (nodeEnv === 'production' || process.env['ENABLE_FILE_LOGGING'] === 'true') {
      // Error log file
      transports.push(
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          format: logFormat,
          maxsize: 10485760, // 10MB
          maxFiles: 30,
          tailable: true,
        })
      );

      // Combined log file
      transports.push(
        new winston.transports.File({
          filename: path.join(logDir, 'combined.log'),
          format: logFormat,
          maxsize: 10485760, // 10MB
          maxFiles: 30,
          tailable: true,
        })
      );
    }

    // Create logger instance
    this.logger = winston.createLogger({
      level: logLevel,
      format: logFormat,
      defaultMeta: {
        _service: process.env['SERVICE_NAME'] || 'cmdb',
        _environment: nodeEnv,
        _hostname: process.env['HOSTNAME'] || require('os').hostname(),
        _pid: process.pid,
      },
      transports,
      exitOnError: false,
    });
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Set context for subsequent log calls
   */
  public setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear context
   */
  public clearContext(): void {
    this.context = {};
  }

  /**
   * Get current context
   */
  public getContext(): LogContext {
    return { ...this.context };
  }

  /**
   * Create a child logger with additional context
   */
  public child(context: LogContext): Logger {
    const childLogger = new Logger();
    childLogger.context = { ...this.context, ...context };
    return childLogger;
  }

  /**
   * Log error level message
   */
  public error(message: string, error?: Error, meta?: LogContext): void {
    this.logger.error(message, {
      ...this.context,
      ...meta,
      ...(error && {
        _error: {
          _message: error.message,
          _stack: error.stack,
          name: error.name,
        },
      }),
    });
  }

  /**
   * Log warning level message
   */
  public warn(message: string, meta?: LogContext): void {
    this.logger.warn(message, {
      ...this.context,
      ...meta,
    });
  }

  /**
   * Log info level message
   */
  public info(message: string, meta?: LogContext): void {
    this.logger.info(message, {
      ...this.context,
      ...meta,
    });
  }

  /**
   * Log debug level message
   */
  public debug(message: string, meta?: LogContext): void {
    this.logger.debug(message, {
      ...this.context,
      ...meta,
    });
  }

  /**
   * Log HTTP request
   */
  public logRequest(
    method: string,
    _url: string,
    _statusCode: number,
    _duration: number,
    meta?: LogContext
  ): void {
    this.info('HTTP Request', {
      ...this.context,
      ...meta,
      _http: {
        method,
        _url: _url,
        _status_code: _statusCode,
        _duration_ms: _duration,
      },
    });
  }

  /**
   * Log database query
   */
  public logQuery(
    _database: string,
    _query: string,
    _duration: number,
    meta?: LogContext
  ): void {
    this.debug('Database Query', {
      ...this.context,
      ...meta,
      _database: {
        _type: _database,
        _query: this.sanitizeQuery(_query),
        _duration_ms: _duration,
      },
    });
  }

  /**
   * Log job execution
   */
  public logJob(
    _jobType: string,
    _jobId: string,
    _status: 'started' | 'completed' | 'failed',
    duration?: number,
    meta?: LogContext
  ): void {
    const level = _status === 'failed' ? 'error' : 'info';
    this.logger.log(level, `Job ${_status}`, {
      ...this.context,
      ...meta,
      _job: {
        _type: _jobType,
        _id: _jobId,
        _status: _status,
        ...(duration !== undefined && { duration_ms: duration }),
      },
    });
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  private sanitizeQuery(query: string): string {
    // Remove potential sensitive data patterns
    return query
      .replace(/password\s*=\s*['"][^'"]*['"]/gi, "password='***'")
      .replace(/token\s*=\s*['"][^'"]*['"]/gi, "token='***'")
      .replace(/secret\s*=\s*['"][^'"]*['"]/gi, "secret='***'");
  }

  /**
   * Get underlying Winston logger (for advanced use)
   */
  public getWinstonLogger(): winston.Logger {
    return this.logger;
  }
}

/**
 * Get logger instance
 */
export const getLogger = (): Logger => Logger.getInstance();

/**
 * Create logger with initial context
 */
export const createLogger = (context?: LogContext): Logger => {
  const logger = Logger.getInstance();
  if (context) {
    return logger.child(context);
  }
  return logger;
};
