import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import type { JobProgress, WorkerConfig } from '../types/job.types';
export declare class EnhancedQueueManager {
    private queues;
    private workers;
    private queueEvents;
    private connection;
    private isShuttingDown;
    constructor();
    getQueue<T = any>(queueName: string): Queue<T>;
    registerWorker<T = any>(_config: WorkerConfig, _processor: (job: Job<T>) => Promise<any>): Worker<T>;
    setupQueueEvents(queueName: string): QueueEvents;
    addJob<T>(_queueName: string, _jobName: string, _data: T, options?: any): Promise<Job<T>>;
    addRepeatableJob<T>(_queueName: string, _jobName: string, _data: T, _repeatOptions: {
        pattern?: string;
        every?: number;
        immediately?: boolean;
    }): Promise<Job<T>>;
    updateJobProgress(job: Job, progress: JobProgress): Promise<void>;
    getJob(queueName: string, jobId: string): Promise<Job | undefined>;
    removeJob(queueName: string, jobId: string): Promise<void>;
    getQueueStats(queueName: string): Promise<{
        queueName: string;
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
        paused: number;
    }>;
    getFailedJobs(queueName: string, start?: number, end?: number): Promise<Job[]>;
    retryJob(queueName: string, jobId: string): Promise<void>;
    getWorkerStatus(workerName: string): {
        workerName: string;
        _isRunning: boolean;
        _isPaused: boolean;
    } | null;
    pauseWorker(workerName: string): Promise<void>;
    resumeWorker(workerName: string): Promise<void>;
    private setupGracefulShutdown;
    closeAll(): Promise<void>;
    cleanQueue(_queueName: string, _grace?: number, _limit?: number, _type?: 'completed' | 'failed'): Promise<void>;
}
export declare function getQueueManager(): EnhancedQueueManager;
//# sourceMappingURL=queue-manager.d.ts.map