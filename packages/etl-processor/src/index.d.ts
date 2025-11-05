export { Neo4jToPostgresJob, processNeo4jToPostgresJob, type Neo4jToPostgresJobData, type ETLJobResult } from './jobs/neo4j-to-postgres.job';
export { ReconciliationJob, processReconciliationJob, type ReconciliationJobData, type ReconciliationResult, type Conflict, type ConflictType, type ConflictResolutionStrategy } from './jobs/reconciliation.job';
export { ChangeDetectionJob, processChangeDetectionJob, type ChangeDetectionJobData, type ChangeDetectionResult, type ChangeEvent, type ChangeType } from './jobs/change-detection.job';
export { FullRefreshJob, processFullRefreshJob, type FullRefreshJobData, type FullRefreshResult } from './jobs/full-refresh.job';
export { CITransformer, type Neo4jNode, type PostgresRow, type CIDTO, type DataQualityResult, type ExtractedMetadata } from './transformers/ci-transformer';
export { DimensionTransformer, type CIDimension, type LocationDimension, type DateDimension, type DiscoveryFact, type RelationshipFact, type ChangeFact } from './transformers/dimension-transformer';
export declare class ETLWorkerManager {
    private workers;
    private neo4jClient;
    private postgresClient;
    private redisClient;
    startWorkers(): Promise<void>;
    start(): Promise<void>;
    stopWorkers(): Promise<void>;
    stop(): Promise<void>;
    getAllWorkerStatuses(): Promise<WorkerHealthStatus>;
    getHealthStatus(): Promise<WorkerHealthStatus>;
    pauseWorkers(): Promise<void>;
    resumeWorkers(): Promise<void>;
}
export interface WorkerHealthStatus {
    healthy: boolean;
    workers: {
        name: string;
        running: boolean;
        concurrency: number;
    }[];
}
export declare function getETLWorkerManager(): ETLWorkerManager;
export declare const getETLScheduler: typeof getETLWorkerManager;
export declare function initializeETLWorkers(): Promise<ETLWorkerManager>;
export declare function shutdownETLWorkers(): Promise<void>;
//# sourceMappingURL=index.d.ts.map