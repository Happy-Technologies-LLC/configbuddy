import { Job } from 'bullmq';
export declare enum ErrorCategory {
    TRANSIENT = "transient",
    PERMANENT = "permanent",
    RESOURCE = "resource",
    SYSTEM = "system"
}
export interface ErrorClassification {
    _category: ErrorCategory;
    shouldRetry: boolean;
    retryDelay?: number;
    notifyAdmin?: boolean;
}
export declare class JobErrorHandler {
    static classifyError(error: Error): ErrorClassification;
    static handleJobFailure(job: Job, error: Error): Promise<void>;
    private static sendToDeadLetterQueue;
    private static notifyAdmin;
    static getRetryDelay(_attemptsMade: number, _error: Error): number | undefined;
    static shouldRetryJob(job: Job, error: Error): boolean;
}
export declare function createErrorHandlerMiddleware(): {
    _onFailed: (job: Job | undefined, error: Error) => Promise<void>;
    _onStalled: (jobId: string) => Promise<void>;
};
//# sourceMappingURL=error-handler.d.ts.map