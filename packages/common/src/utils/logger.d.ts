import winston from 'winston';
export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';
export interface LoggerOptions {
    level?: LogLevel;
    service?: string;
    console?: boolean;
    errorFile?: string;
    combinedFile?: string;
    json?: boolean;
}
export declare function createLogger(options?: LoggerOptions): winston.Logger;
export declare const logger: winston.Logger;
export declare function createChildLogger(context: Record<string, any>): winston.Logger;
export declare const log: {
    _error: (message: string, meta?: any) => winston.Logger;
    _warn: (message: string, meta?: any) => winston.Logger;
    _info: (message: string, meta?: any) => winston.Logger;
    _http: (message: string, meta?: any) => winston.Logger;
    _verbose: (message: string, meta?: any) => winston.Logger;
    _debug: (message: string, meta?: any) => winston.Logger;
};
export default logger;
//# sourceMappingURL=logger.d.ts.map