import { Queue, Worker, Job } from 'bullmq';
export declare class QueueManager {
    private queues;
    private workers;
    getQueue(name: string): Queue;
    registerWorker(queueName: string, processor: (job: Job) => Promise<any>, options?: {
        concurrency?: number;
    }): Worker;
    closeAll(): Promise<void>;
}
export declare const queueManager: QueueManager;
export declare const QUEUE_NAMES: {
    readonly _DISCOVERY_AWS: "discovery:aws";
    readonly _DISCOVERY_AZURE: "discovery:azure";
    readonly _DISCOVERY_GCP: "discovery:gcp";
    readonly _DISCOVERY_SSH: "discovery:ssh";
    readonly _DISCOVERY_NMAP: "discovery:nmap";
    readonly _ETL_SYNC: "etl:sync";
    readonly _ETL_FULL_REFRESH: "etl:full-refresh";
    readonly _ETL_CHANGE_DETECTION: "etl:change-detection";
    readonly _ETL_RECONCILIATION: "etl:reconciliation";
};
//# sourceMappingURL=queue-manager.d.ts.map