import { PostgresClient } from '../postgres/client';
import type { CIDimensionInput, LocationDimensionInput, OwnerDimensionInput, DiscoveryFactInput, ChangesFactInput, RelationshipFactInput } from '@cmdb/common';
export declare class DataMartClient {
    private pgClient;
    constructor(pgClient: PostgresClient);
    upsertCI(ci: CIDimensionInput): Promise<number>;
    batchUpsertCIs(cis: CIDimensionInput[]): Promise<Map<string, number>>;
    getCIKey(ciId: string): Promise<number | null>;
    getCurrentCIsByType(ciType: string): Promise<any[]>;
    getCIHistory(ciId: string): Promise<any[]>;
    upsertLocation(location: LocationDimensionInput): Promise<number>;
    getLocationKey(locationId: string): Promise<number | null>;
    upsertOwner(owner: OwnerDimensionInput): Promise<number>;
    recordDiscovery(discovery: DiscoveryFactInput): Promise<void>;
    batchRecordDiscoveries(discoveries: DiscoveryFactInput[]): Promise<void>;
    recordChange(change: ChangesFactInput): Promise<void>;
    batchRecordChanges(changes: ChangesFactInput[]): Promise<void>;
    recordRelationship(relationship: RelationshipFactInput): Promise<void>;
    batchRecordRelationships(relationships: RelationshipFactInput[]): Promise<void>;
    deactivateRelationship(fromCiKey: number, toCiKey: number, relationshipType: string): Promise<void>;
    getCurrentInventory(): Promise<any[]>;
    getDiscoverySummary(ciId?: string): Promise<any[]>;
    getChangeHistory(ciId?: string, limit?: number): Promise<any[]>;
    getCIRelationships(ciId: string): Promise<any[]>;
    getCICountByType(): Promise<Map<string, number>>;
    getCICountByEnvironment(): Promise<Map<string, number>>;
    getDiscoveryStats(startDate: Date, endDate: Date): Promise<{
        total_discoveries: number;
        unique_cis: number;
        avg_confidence: number;
        by_provider: Array<{
            provider: string;
            count: number;
        }>;
    }>;
    getChangeStats(startDate: Date, endDate: Date): Promise<{
        total_changes: number;
        unique_cis: number;
        by_type: Array<{
            change_type: string;
            count: number;
        }>;
        by_source: Array<{
            change_source: string;
            count: number;
        }>;
    }>;
    getDateKey(timestamp: Date): Promise<number>;
    private hasCIChanged;
    query(sql: string, params?: any[]): Promise<any>;
    transaction<T>(callback: (client: any) => Promise<T>): Promise<T>;
}
export declare function getDataMartClient(): DataMartClient;
export declare function resetDataMartClient(): void;
//# sourceMappingURL=datamart.client.d.ts.map