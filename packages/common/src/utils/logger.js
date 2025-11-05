"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = exports.logger = void 0;
exports.createLogger = createLogger;
exports.createChildLogger = createChildLogger;
const tslib_1 = require("tslib");
const winston_1 = tslib_1.__importDefault(require("winston"));
function createLogger(options = {}) {
    const { level = process.env['LOG_LEVEL'] || 'info', service = process.env['SERVICE_NAME'] || 'cmdb', console: enableConsole = true, errorFile, combinedFile, json = process.env['NODE_ENV'] === 'production', } = options;
    const logFormat = json
        ? winston_1.default.format.json()
        : winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.printf(({ timestamp, level, message, service, ...metadata }) => {
            let msg = `${timestamp} [${service}] ${level}: ${message}`;
            if (Object.keys(metadata).length > 0) {
                msg += ` ${JSON.stringify(metadata)}`;
            }
            return msg;
        }));
    const transports = [];
    if (enableConsole) {
        transports.push(new winston_1.default.transports.Console({
            format: logFormat,
        }));
    }
    if (errorFile) {
        transports.push(new winston_1.default.transports.File({
            filename: errorFile,
            level: 'error',
            format: winston_1.default.format.json(),
        }));
    }
    if (combinedFile) {
        transports.push(new winston_1.default.transports.File({
            filename: combinedFile,
            format: winston_1.default.format.json(),
        }));
    }
    const logger = winston_1.default.createLogger({
        level,
        defaultMeta: { service },
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.metadata()),
        transports,
        exitOnError: false,
    });
    return logger;
}
exports.logger = createLogger();
function createChildLogger(context) {
    return exports.logger.child(context);
}
exports.log = {
    _error: (message, meta) => exports.logger.error(message, meta),
    _warn: (message, meta) => exports.logger.warn(message, meta),
    _info: (message, meta) => exports.logger.info(message, meta),
    _http: (message, meta) => exports.logger.http(message, meta),
    _verbose: (message, meta) => exports.logger.verbose(message, meta),
    _debug: (message, meta) => exports.logger.debug(message, meta),
};
exports.default = exports.logger;
//# sourceMappingURL=logger.js.map