// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = exports.getLogger = exports.Logger = void 0;
const tslib_1 = require("tslib");
const winston_1 = tslib_1.__importDefault(require("winston"));
const path = tslib_1.__importStar(require("path"));
class Logger {
    static instance;
    logger;
    context = {};
    constructor() {
        const logDir = process.env['LOG_DIR'] || './logs';
        const logLevel = process.env['LOG_LEVEL'] || 'info';
        const nodeEnv = process.env['NODE_ENV'] || 'development';
        const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.metadata({
            fillExcept: ['message', 'level', 'timestamp', 'stack'],
        }), winston_1.default.format.json());
        const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), winston_1.default.format.printf(({ timestamp, level, message, metadata, stack }) => {
            const metaStr = metadata && Object.keys(metadata).length > 0
                ? `\n${JSON.stringify(metadata, null, 2)}`
                : '';
            const stackStr = stack ? `\n${stack}` : '';
            return `${timestamp} ${level}: ${message}${metaStr}${stackStr}`;
        }));
        const transports = [];
        transports.push(new winston_1.default.transports.Console({
            format: nodeEnv === 'production' ? logFormat : consoleFormat,
        }));
        if (nodeEnv === 'production' || process.env['ENABLE_FILE_LOGGING'] === 'true') {
            transports.push(new winston_1.default.transports.File({
                filename: path.join(logDir, 'error.log'),
                level: 'error',
                format: logFormat,
                maxsize: 10485760,
                maxFiles: 30,
                tailable: true,
            }));
            transports.push(new winston_1.default.transports.File({
                filename: path.join(logDir, 'combined.log'),
                format: logFormat,
                maxsize: 10485760,
                maxFiles: 30,
                tailable: true,
            }));
        }
        this.logger = winston_1.default.createLogger({
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
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    setContext(context) {
        this.context = { ...this.context, ...context };
    }
    clearContext() {
        this.context = {};
    }
    getContext() {
        return { ...this.context };
    }
    child(context) {
        const childLogger = new Logger();
        childLogger.context = { ...this.context, ...context };
        return childLogger;
    }
    error(message, error, meta) {
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
    warn(message, meta) {
        this.logger.warn(message, {
            ...this.context,
            ...meta,
        });
    }
    info(message, meta) {
        this.logger.info(message, {
            ...this.context,
            ...meta,
        });
    }
    debug(message, meta) {
        this.logger.debug(message, {
            ...this.context,
            ...meta,
        });
    }
    logRequest(method, _url, _statusCode, _duration, meta) {
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
    logQuery(_database, _query, _duration, meta) {
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
    logJob(_jobType, _jobId, _status, duration, meta) {
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
    sanitizeQuery(query) {
        return query
            .replace(/password\s*=\s*['"][^'"]*['"]/gi, "password='***'")
            .replace(/token\s*=\s*['"][^'"]*['"]/gi, "token='***'")
            .replace(/secret\s*=\s*['"][^'"]*['"]/gi, "secret='***'");
    }
    getWinstonLogger() {
        return this.logger;
    }
}
exports.Logger = Logger;
const getLogger = () => Logger.getInstance();
exports.getLogger = getLogger;
const createLogger = (context) => {
    const logger = Logger.getInstance();
    if (context) {
        return logger.child(context);
    }
    return logger;
};
exports.createLogger = createLogger;
//# sourceMappingURL=logger.js.map