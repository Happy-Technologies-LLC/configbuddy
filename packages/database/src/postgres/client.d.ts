import { Pool, PoolClient } from 'pg';
import type { CIDimensionInput, LocationDimensionInput, OwnerDimensionInput, DiscoveryFactInput, ChangesFactInput, RelationshipFactInput, CurrentCIInventoryRow, CIDiscoverySummaryRow, CIChangeHistoryRow, CIRelationshipRow } from '@cmdb/common';
export declare class PostgresClient {
    pool: Pool;
    constructor(config: {
        _host: string;
        _port: number;
        _database: string;
        _user: string;
        _password: string;
        ssl?: boolean | 'require' | 'prefer' | 'verify-full';
    });
    query(text: string, params?: any[]): Promise<import("pg").QueryResult<any>>;
    getClient(): Promise<PoolClient>;
    transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
    close(): Promise<void>;
    insertCIDimension(ci: CIDimensionInput): Promise<number>;
    updateCIDimension(ci: CIDimensionInput): Promise<number>;
    upsertCIDimension(ci: CIDimensionInput): Promise<number>;
    getCurrentCIKey(ciId: string): Promise<number | null>;
    insertLocationDimension(location: LocationDimensionInput): Promise<number>;
    getLocationKey(locationId: string): Promise<number | null>;
    insertOwnerDimension(owner: OwnerDimensionInput): Promise<number>;
    getDateKey(timestamp: Date): Promise<number>;
    insertDiscoveryFact(fact: DiscoveryFactInput): Promise<void>;
    insertChangesFact(change: ChangesFactInput): Promise<void>;
    insertRelationshipFact(relationship: RelationshipFactInput): Promise<void>;
    deactivateRelationship(fromCiKey: number, toCiKey: number, relationshipType: string): Promise<void>;
    getCurrentInventory(): Promise<CurrentCIInventoryRow[]>;
    getDiscoverySummary(ciId?: string): Promise<CIDiscoverySummaryRow[]>;
    getChangeHistory(ciId?: string, limit?: number): Promise<CIChangeHistoryRow[]>;
    getCIRelationships(ciId: string): Promise<CIRelationshipRow[]>;
}
export declare function getPostgresClient(): PostgresClient;
//# sourceMappingURL=client.d.ts.map