import { CI, CIType, CIStatus, Environment } from '@cmdb/common';
export interface CIDimension {
    ci_key?: number;
    _ci_id: string;
    _ci_name: string;
    _ci_type: CIType;
    environment?: Environment;
    _status: CIStatus;
    external_id?: string;
    _effective_date: Date;
    end_date?: Date;
    _is_current: boolean;
    created_at?: Date;
    updated_at?: Date;
}
export interface LocationDimension {
    location_key?: number;
    _region: string;
    availability_zone?: string;
    data_center?: string;
    cloud_provider?: string;
    country?: string;
}
export interface DateDimension {
    _date_key: number;
    _full_date: Date;
    _year: number;
    _quarter: number;
    _month: number;
    _month_name: string;
    _week: number;
    _day_of_month: number;
    _day_of_week: number;
    _day_name: string;
    _is_weekend: boolean;
    is_holiday?: boolean;
}
export interface DiscoveryFact {
    _ci_key: number;
    location_key?: number;
    _date_key: number;
    _discovered_at: Date;
    _discovery_method: string;
    _discovery_source: string;
    discovery_duration_ms?: number;
}
export interface RelationshipFact {
    _from_ci_key: number;
    _to_ci_key: number;
    _relationship_type: string;
    relationship_key?: number;
    _effective_date: Date;
    end_date?: Date;
    _is_current: boolean;
}
export interface ChangeFact {
    change_key?: number;
    _ci_key: number;
    _date_key: number;
    _change_type: string;
    _field_name: string;
    old_value?: string;
    new_value?: string;
    _changed_at: Date;
    _changed_by: string;
}
export declare class DimensionTransformer {
    toDimension(ci: CI): CIDimension;
    toDiscoveryFact(ci: CI, ciKey?: number): Partial<DiscoveryFact>;
    toLocationDimension(ci: CI): LocationDimension | null;
    toDateDimension(date: Date): DateDimension;
    toRelationshipFact(_fromCiKey: number, _toCiKey: number, _relationshipType: string): RelationshipFact;
    toChangeFact(_ciKey: number, _changeType: string, _fieldName: string, _oldValue: any, _newValue: any, _changedBy?: string): ChangeFact;
    generateSurrogateKey(naturalKey: string): number;
    generateDateKey(date: Date): number;
    parseDateKey(dateKey: number): Date;
    createSCDUpdate(_currentDimension: CIDimension, _updates: Partial<CIDimension>): {
        close: Partial<CIDimension>;
        insert: CIDimension;
    };
    private inferDiscoveryMethod;
    private inferDiscoverySource;
    private inferProvider;
    private getWeekNumber;
    private serializeValue;
}
//# sourceMappingURL=dimension-transformer.d.ts.map