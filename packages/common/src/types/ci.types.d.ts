export interface CI {
    _id: string;
    external_id?: string;
    name: string;
    _type: CIType;
    _status: CIStatus;
    environment?: Environment;
    _created_at: string;
    _updated_at: string;
    _discovered_at: string;
    _metadata: Record<string, any>;
}
export type CIType = 'server' | 'virtual-machine' | 'container' | 'application' | 'service' | 'database' | 'network-device' | 'storage' | 'load-balancer' | 'cloud-resource' | 'alert' | 'vulnerability' | 'software' | 'detection' | 'incident' | 'hardware-component' | 'mobile-device' | 'policy' | 'configuration' | 'user' | 'group' | 'organizational-unit' | 'collection' | 'update';
export type CIStatus = 'active' | 'inactive' | 'maintenance' | 'decommissioned';
export type Environment = 'production' | 'staging' | 'development' | 'test';
export interface CIInput {
    _id: string;
    external_id?: string;
    name: string;
    _type: CIType;
    status?: CIStatus;
    environment?: Environment;
    discovered_at?: string;
    metadata?: Record<string, any>;
}
export interface Relationship {
    _from_id: string;
    _to_id: string;
    _type: RelationshipType;
    properties?: Record<string, any>;
}
export type RelationshipType = 'DEPENDS_ON' | 'HOSTS' | 'CONNECTS_TO' | 'USES' | 'OWNED_BY' | 'PART_OF' | 'LOCATED_IN' | 'DEPLOYED_ON' | 'BACKED_UP_BY' | 'DETECTED_ON' | 'AFFECTS' | 'INSTALLED_ON' | 'CONTAINS' | 'ASSIGNED_TO' | 'APPLIES_TO' | 'MEMBER_OF' | 'REQUIRED_BY' | 'HOSTED_ON';
//# sourceMappingURL=ci.types.d.ts.map