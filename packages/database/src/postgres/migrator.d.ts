import { PostgresClient } from './client';
export interface MigrationStatus {
    _name: string;
    _applied: boolean;
    _appliedAt: Date | null;
}
export declare function runMigrations(client: PostgresClient, migrationsDir?: string): Promise<void>;
export declare function getMigrationStatus(client: PostgresClient, migrationsDir?: string): Promise<MigrationStatus[]>;
//# sourceMappingURL=migrator.d.ts.map