import { Job } from 'bullmq';
import { Neo4jClient, PostgresClient } from '@cmdb/database';
export interface ChangeDetectionJobData {
    since?: string;
    ciIds?: string[];
    lookbackHours?: number;
    includeRelationships?: boolean;
}
export interface ChangeDetectionResult {
    cisChecked: number;
    changesDetected: number;
    changesRecorded: number;
    changes: ChangeEvent[];
    durationMs: number;
    completedAt: string;
}
export interface ChangeEvent {
    ciId: string;
    ciName: string;
    changeType: ChangeType;
    fieldName: string;
    oldValue: unknown;
    newValue: unknown;
    changedAt: string;
    changedBy?: string;
}
export type ChangeType = 'created' | 'updated' | 'deleted' | 'status-changed' | 'relationship-added' | 'relationship-removed' | 'metadata-changed';
export declare class ChangeDetectionJob {
    private neo4jClient;
    private postgresClient;
    constructor(neo4jClient: Neo4jClient, postgresClient: PostgresClient);
    execute(job: Job<ChangeDetectionJobData>): Promise<ChangeDetectionResult>;
    private getChangedCIs;
    private detectChanges;
    private getHistoricalCI;
    private detectRelationshipChanges;
    private recordChanges;
}
export declare function processChangeDetectionJob(job: Job<ChangeDetectionJobData>, neo4jClient: Neo4jClient, postgresClient: PostgresClient): Promise<ChangeDetectionResult>;
//# sourceMappingURL=change-detection.job.d.ts.map