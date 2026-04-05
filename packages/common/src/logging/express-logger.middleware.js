// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorLoggerMiddleware = exports.requestLoggerMiddleware = void 0;
const uuid_1 = require("uuid");
const logger_1 = require("./logger");
const requestLoggerMiddleware = (req, res, next) => {
    const logger = (0, logger_1.getLogger)();
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || (0, uuid_1.v4)();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);
    const context = {
        requestId,
        method: req.method,
        _url: req.url,
        _userAgent: req.headers['user-agent'],
        _ip: req.ip || req.connection.remoteAddress,
    };
    if (req.user?.id) {
        context.userId = req.user.id;
    }
    logger.setContext(context);
    logger.info('Request received', {
        headers: sanitizeHeaders(req.headers),
    });
    const originalSend = res.send;
    res.send = function (data) {
        const duration = Date.now() - startTime;
        logger.logRequest(req.method, req.url, res.statusCode, duration, {
            _responseSize: Buffer.byteLength(JSON.stringify(data)),
        });
        logger.clearContext();
        return originalSend.call(this, data);
    };
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        if (!res.headersSent) {
            logger.logRequest(req.method, req.url, res.statusCode, duration);
            logger.clearContext();
        }
    });
    res.on('error', (error) => {
        const duration = Date.now() - startTime;
        logger.error('Request error', error, {
            _duration_ms: duration,
        });
        logger.clearContext();
    });
    next();
};
exports.requestLoggerMiddleware = requestLoggerMiddleware;
function sanitizeHeaders(headers) {
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
const errorLoggerMiddleware = (err, req, _res, next) => {
    const logger = (0, logger_1.getLogger)();
    logger.error('Unhandled error', err, {
        _requestId: req.headers['x-request-id'],
        method: req.method,
        _url: req.url,
        body: req.body,
    });
    next(err);
};
exports.errorLoggerMiddleware = errorLoggerMiddleware;
//# sourceMappingURL=express-logger.middleware.js.map