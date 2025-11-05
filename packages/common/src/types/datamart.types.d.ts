import { CIType, CIStatus, Environment, RelationshipType } from './ci.types';
import { DiscoveryProvider, DiscoveryMethod } from './discovery.types';
export interface CIDimensionInput {
    ci_id: string;
    ciname: string;
    ci_type: CIType;
    ci_status: CIStatus;
    environment?: Environment;
    external_id?: string;
    metadata?: Record<string, any>;
    effective_from?: Date;
}
export interface LocationDimensionInput {
    location_id: string;
    locationname: string;
    location_type: 'cloud_region' | 'datacenter' | 'availability_zone' | 'subnet' | 'unknown';
    cloud_provider?: 'aws' | 'azure' | 'gcp';
    region?: string;
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    metadata?: Record<string, any>;
}
export interface OwnerDimensionInput {
    owner_id: string;
    ownername: string;
    owner_type: 'user' | 'team' | 'department' | 'cost_center' | 'system';
    email?: string;
    department?: string;
    cost_center?: string;
    manager_id?: string;
    metadata?: Record<string, any>;
}
export interface DiscoveryFactInput {
    ci_key: number;
    location_key?: number;
    date_key: number;
    discovered_at: Date;
    discovery_job_id: string;
    discovery_provider: DiscoveryProvider;
    discoverymethod: DiscoveryMethod;
    confidence_score?: number;
    discovery_duration_ms?: number;
}
export interface ChangesFactInput {
    ci_key: number;
    date_key: number;
    changed_at: Date;
    change_type: 'created' | 'updated' | 'deleted' | 'status_changed' | 'discovered' | 'modified';
    field_name?: string;
    old_value?: string;
    new_value?: string;
    changed_by?: string;
    change_source?: 'discovery' | 'manual' | 'api' | 'import' | 'automation';
    metadata?: Record<string, any>;
}
export interface RelationshipFactInput {
    from_ci_key: number;
    to_ci_key: number;
    date_key: number;
    relationship_type: RelationshipType;
    relationship_strength?: number;
    discovered_at: Date;
    last_verified_at?: Date;
    is_active?: boolean;
    properties?: Record<string, any>;
}
export interface CurrentCIInventoryRow {
    ci_key: number;
    ci_id: string;
    ciname: string;
    ci_type: CIType;
    ci_status: CIStatus;
    environment?: Environment;
    external_id?: string;
    metadata?: Record<string, any>;
    effective_from: Date;
    created_at: Date;
    updated_at: Date;
}
export interface CIDiscoverySummaryRow {
    ci_id: string;
    ciname: string;
    ci_type: CIType;
    discovery_provider: DiscoveryProvider;
    discovery_count: number;
    last_discovered_at: Date;
    avg_confidence_score: number;
    avg_discovery_duration_ms?: number;
}
export interface CIChangeHistoryRow {
    change_key: number;
    ci_id: string;
    ciname: string;
    ci_type: CIType;
    change_type: string;
    field_name?: string;
    old_value?: string;
    new_value?: string;
    changed_at: Date;
    changed_by?: string;
    change_source?: string;
    full_date: Date;
    year: number;
    month: number;
    quarter: number;
}
export interface CIRelationshipRow {
    relationship_key: number;
    from_ci_id: string;
    from_ciname: string;
    from_ci_type: CIType;
    relationship_type: RelationshipType;
    to_ci_id: string;
    to_ciname: string;
    to_ci_type: CIType;
    relationship_strength?: number;
    discovered_at: Date;
    last_verified_at?: Date;
    properties?: Record<string, any>;
}
export interface TimeDimensionRow {
    date_key: number;
    full_date: Date;
    year: number;
    quarter: number;
    month: number;
    monthname: string;
    week: number;
    day_of_month: number;
    day_of_week: number;
    dayname: string;
    is_weekend: boolean;
    is_holiday: boolean;
    fiscal_year: number;
    fiscal_quarter: number;
}
//# sourceMappingURL=datamart.types.d.ts.map