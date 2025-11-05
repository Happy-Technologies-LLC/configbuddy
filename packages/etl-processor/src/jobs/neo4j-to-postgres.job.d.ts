import { Job } from 'bullmq';
import { Neo4jClient, PostgresClient } from '@cmdb/database';
import { CIType } from '@cmdb/common';
export interface Neo4jToPostgresJobData {
    batchSize?: number;
    ciTypes?: CIType[];
    incrementalSince?: string;
    fullRefresh?: boolean;
}
export interface ETLJobResult {
    cisProcessed: number;
    relationshipsProcessed: number;
    recordsInserted: number;
    recordsUpdated: number;
    errors: number;
    durationMs: number;
    completedAt: string;
}
export declare class Neo4jToPostgresJob {
    private neo4jClient;
    private postgresClient;
    private dimensionTransformer;
    constructor(neo4jClient: Neo4jClient, postgresClient: PostgresClient);
    execute(job: Job<Neo4jToPostgresJobData>): Promise<ETLJobResult>;
    private extractCIs;
    private processBatch;
    private sleep;
    private processRelationships;
}
export declare function processNeo4jToPostgresJob(job: Job<Neo4jToPostgresJobData>, neo4jClient: Neo4jClient, postgresClient: PostgresClient): Promise<ETLJobResult>;
//# sourceMappingURL=neo4j-to-postgres.job.d.ts.map