import { RelationshipType } from './ci.types';
export interface RelationshipDetails {
    id?: string;
    _from_id: string;
    _to_id: string;
    _type: RelationshipType;
    properties?: Record<string, any>;
    created_at?: string;
    updated_at?: string;
    is_active?: boolean;
}
export interface RelationshipInput {
    _from_id: string;
    _to_id: string;
    _type: RelationshipType;
    properties?: Record<string, any>;
}
export interface RelationshipQuery {
    _ci_id: string;
    direction?: 'in' | 'out' | 'both';
    type?: RelationshipType;
    depth?: number;
    active_only?: boolean;
}
export interface DependencyPath {
    _source_id: string;
    _target_id: string;
    _path: string[];
    _distance: number;
    _relationship_types: RelationshipType[];
}
export interface ImpactAnalysisResult {
    _ci_id: string;
    _impacted_cis: ImpactedCI[];
    _total_impacted: number;
    _max_distance: number;
}
export interface ImpactedCI {
    _ci_id: string;
    _ciname: string;
    _ci_type: string;
    _distance: number;
    _path: RelationshipType[];
}
//# sourceMappingURL=relationship.types.d.ts.map