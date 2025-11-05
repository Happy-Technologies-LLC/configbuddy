import { Job } from 'bullmq';
import { Neo4jClient, PostgresClient } from '@cmdb/database';
export interface FullRefreshJobData {
    truncateTables?: boolean;
    batchSize?: number;
    rebuildIndexes?: boolean;
}
export interface FullRefreshResult {
    cisProcessed: number;
    relationshipsProcessed: number;
    dimensionsCreated: number;
    factsCreated: number;
    durationMs: number;
    completedAt: string;
    stagesCompleted: string[];
}
export declare class FullRefreshJob {
    private neo4jClient;
    private postgresClient;
    private dimensionTransformer;
    constructor(neo4jClient: Neo4jClient, postgresClient: PostgresClient);
    execute(job: Job<FullRefreshJobData>): Promise<FullRefreshResult>;
    private truncateTables;
    private extractAllCIs;
    private loadCIDimensions;
    private loadRelationships;
    private rebuildIndexes;
}
export declare function processFullRefreshJob(job: Job<FullRefreshJobData>, neo4jClient: Neo4jClient, postgresClient: PostgresClient): Promise<FullRefreshResult>;
//# sourceMappingURL=full-refresh.job.d.ts.map