import { Job } from 'bullmq';
import { Neo4jClient, PostgresClient } from '@cmdb/database';
export interface ReconciliationJobData {
    ciIds?: string[];
    conflictStrategy?: ConflictResolutionStrategy;
    autoResolve?: boolean;
    maxAgeHours?: number;
}
export type ConflictResolutionStrategy = 'neo4j-wins' | 'postgres-wins' | 'newest-wins' | 'manual' | 'merge';
export interface ReconciliationResult {
    _cisChecked: number;
    _conflictsDetected: number;
    _conflictsResolved: number;
    _manualReviewRequired: number;
    _conflicts: Conflict[];
    _durationMs: number;
    _completedAt: string;
}
export interface Conflict {
    _ciId: string;
    _type: ConflictType;
    _description: string;
    _neo4jValue: any;
    _postgresValue: any;
    resolution?: string;
    _autoResolved: boolean;
}
export type ConflictType = 'missing-in-neo4j' | 'missing-in-postgres' | 'status-mismatch' | 'metadata-mismatch' | 'timestamp-mismatch' | 'relationship-mismatch';
export declare class ReconciliationJob {
    private neo4jClient;
    private postgresClient;
    constructor(neo4jClient: Neo4jClient, postgresClient: PostgresClient);
    execute(job: Job<ReconciliationJobData>): Promise<ReconciliationResult>;
    private reconcileCI;
    private getPostgresCI;
    private getAllCIIds;
    private resolveStatusConflict;
    private updatePostgresStatus;
    private updateNeo4jStatus;
    private resolveByCreatingInNeo4j;
    private resolveByCreatingInPostgres;
}
export declare function processReconciliationJob(job: Job<ReconciliationJobData>, neo4jClient: Neo4jClient, postgresClient: PostgresClient): Promise<ReconciliationResult>;
//# sourceMappingURL=reconciliation.job.d.ts.map