import { QueueConfig } from '../types/job.types';
export declare const QUEUE_CONFIGS: Record<string, QueueConfig>;
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
export declare function getQueueConfig(queueName: string): QueueConfig;
export declare function getDiscoveryQueueNames(): string[];
export declare function getETLQueueNames(): string[];
//# sourceMappingURL=queue-config.d.ts.map