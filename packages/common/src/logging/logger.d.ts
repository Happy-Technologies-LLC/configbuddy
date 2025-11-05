import winston from 'winston';
export interface LogContext {
    requestId?: string;
    userId?: string;
    jobId?: string;
    provider?: string;
    operation?: string;
    [key: string]: any;
}
export declare class Logger {
    private static instance;
    private logger;
    private context;
    private constructor();
    static getInstance(): Logger;
    setContext(context: LogContext): void;
    clearContext(): void;
    getContext(): LogContext;
    child(context: LogContext): Logger;
    error(message: string, error?: Error, meta?: LogContext): void;
    warn(message: string, meta?: LogContext): void;
    info(message: string, meta?: LogContext): void;
    debug(message: string, meta?: LogContext): void;
    logRequest(method: string, _url: string, _statusCode: number, _duration: number, meta?: LogContext): void;
    logQuery(_database: string, _query: string, _duration: number, meta?: LogContext): void;
    logJob(_jobType: string, _jobId: string, _status: 'started' | 'completed' | 'failed', duration?: number, meta?: LogContext): void;
    private sanitizeQuery;
    getWinstonLogger(): winston.Logger;
}
export declare const getLogger: () => Logger;
export declare const createLogger: (context?: LogContext) => Logger;
//# sourceMappingURL=logger.d.ts.map