"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorLoggerMiddleware = exports.requestLoggerMiddleware = exports.createLogger = exports.getLogger = exports.Logger = void 0;
var logger_1 = require("./logger");
Object.defineProperty(exports, "Logger", { enumerable: true, get: function () { return logger_1.Logger; } });
Object.defineProperty(exports, "getLogger", { enumerable: true, get: function () { return logger_1.getLogger; } });
Object.defineProperty(exports, "createLogger", { enumerable: true, get: function () { return logger_1.createLogger; } });
var express_logger_middleware_1 = require("./express-logger.middleware");
Object.defineProperty(exports, "requestLoggerMiddleware", { enumerable: true, get: function () { return express_logger_middleware_1.requestLoggerMiddleware; } });
Object.defineProperty(exports, "errorLoggerMiddleware", { enumerable: true, get: function () { return express_logger_middleware_1.errorLoggerMiddleware; } });
//# sourceMappingURL=index.js.map