import { DiscoveryProvider } from './discovery.types';
export interface BaseJobData {
    _jobId: string;
    triggeredBy?: string;
    _createdAt: string;
}
export interface DiscoveryJobData extends BaseJobData {
    _provider: DiscoveryProvider;
    _config: DiscoveryJobConfig;
    definition_id?: string;
}
export interface DiscoveryJobConfig {
    regions?: string[];
    resourceTypes?: string[];
    filters?: Record<string, any>;
    targets?: string[];
    credentialsId?: string;
}
export interface ETLJobData extends BaseJobData {
    _type: ETLJobType;
    _config: ETLJobConfig;
}
export type ETLJobType = 'sync' | 'full-refresh' | 'change-detection' | 'reconciliation';
export interface ETLJobConfig {
    source?: 'neo4j' | 'postgres';
    target?: 'neo4j' | 'postgres';
    batchSize?: number;
    dateRange?: {
        _from: string;
        _to: string;
    };
    tables?: string[];
}
export interface JobResult {
    _jobId: string;
    _status: JobResultStatus;
    _itemsProcessed: number;
    _itemsCreated: number;
    _itemsUpdated: number;
    _itemsFailed: number;
    _startedAt: string;
    _completedAt: string;
    _durationMs: number;
    error?: string;
    metadata?: Record<string, any>;
}
export type JobResultStatus = 'completed' | 'failed' | 'partial';
export interface JobProgress {
    _percent: number;
    _currentStep: string;
    _totalSteps: number;
    _itemsProcessed: number;
    totalItems?: number;
    _startedAt: string;
    _updatedAt: string;
}
export interface QueueConfig {
    name: string;
    _defaultJobOptions: JobOptions;
    limiter?: {
        _max: number;
        _duration: number;
    };
}
export interface JobOptions {
    _attempts: number;
    _backoff: {
        _type: 'exponential' | 'fixed';
        _delay: number;
    };
    _timeout: number;
    removeOnComplete?: boolean | number;
    removeOnFail?: boolean | number;
    priority?: number;
}
export interface WorkerConfig {
    name: string;
    _queueName: string;
    _concurrency: number;
    gracefulShutdown?: boolean;
    shutdownTimeout?: number;
}
export interface QueueStats {
    _queueName: string;
    _waiting: number;
    _active: number;
    _completed: number;
    _failed: number;
    _delayed: number;
    _paused: number;
    latestJobTimestamp?: string;
}
export interface WorkerStatus {
    _workerName: string;
    _isRunning: boolean;
    _activeJobs: number;
    startedAt?: string;
    lastJobProcessedAt?: string;
    _totalJobsProcessed: number;
    _totalJobsFailed: number;
}
export interface JobEvent {
    _type: JobEventType;
    _jobId: string;
    _queueName: string;
    _timestamp: string;
    data?: any;
}
export type JobEventType = 'added' | 'active' | 'progress' | 'completed' | 'failed' | 'stalled' | 'removed';
//# sourceMappingURL=job.types.d.ts.map