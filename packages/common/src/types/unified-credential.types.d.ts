export type AuthProtocol = 'oauth2' | 'api_key' | 'basic' | 'bearer' | 'aws_iam' | 'azure_sp' | 'gcp_sa' | 'ssh_key' | 'ssh_password' | 'certificate' | 'kerberos' | 'snmp_v2c' | 'snmp_v3' | 'winrm' | 'kubernetes' | 'redfish' | 'ldap' | 'proxmox' | 'tenable' | 'veeam' | 'wiz' | 'infoblox';
export type CredentialScope = 'cloud_provider' | 'ssh' | 'api' | 'network' | 'database' | 'container' | 'virtualization' | 'universal';
export type ValidationStatus = 'valid' | 'invalid' | 'expired' | 'unknown';
export interface CredentialAffinity {
    networks?: string[];
    hostname_patterns?: string[];
    os_types?: string[];
    device_types?: string[];
    environments?: string[];
    cloud_providers?: string[];
    priority?: number;
}
export interface UnifiedCredential {
    id: string;
    name: string;
    description?: string;
    protocol: AuthProtocol;
    scope: CredentialScope;
    credentials: Record<string, any>;
    affinity: CredentialAffinity;
    tags: string[];
    created_by: string;
    created_at: Date;
    updated_at: Date;
    last_validated_at?: Date;
    validation_status?: ValidationStatus;
}
export interface UnifiedCredentialInput {
    name: string;
    description?: string;
    protocol: AuthProtocol;
    scope: CredentialScope;
    credentials: Record<string, any>;
    affinity?: CredentialAffinity;
    tags?: string[];
}
export interface UnifiedCredentialUpdateInput {
    name?: string;
    description?: string;
    credentials?: Record<string, any>;
    affinity?: CredentialAffinity;
    tags?: string[];
}
export interface UnifiedCredentialSummary {
    id: string;
    name: string;
    description?: string;
    protocol: AuthProtocol;
    scope: CredentialScope;
    affinity: CredentialAffinity;
    tags: string[];
    created_at: Date;
    updated_at: Date;
    last_validated_at?: Date;
    validation_status?: ValidationStatus;
    usage_count?: number;
    connector_usage_count?: number;
}
export type CredentialSetStrategy = 'sequential' | 'parallel' | 'adaptive';
export interface CredentialSet {
    id: string;
    name: string;
    description?: string;
    credential_ids: string[];
    strategy: CredentialSetStrategy;
    stop_on_success: boolean;
    tags: string[];
    created_by: string;
    created_at: Date;
    updated_at: Date;
}
export interface CredentialSetInput {
    name: string;
    description?: string;
    credential_ids: string[];
    strategy?: CredentialSetStrategy;
    stop_on_success?: boolean;
    tags?: string[];
}
export interface CredentialSetUpdateInput {
    name?: string;
    description?: string;
    credential_ids?: string[];
    strategy?: CredentialSetStrategy;
    stop_on_success?: boolean;
    tags?: string[];
}
export interface CredentialSetSummary {
    id: string;
    name: string;
    description?: string;
    credentials: UnifiedCredentialSummary[];
    strategy: CredentialSetStrategy;
    stop_on_success: boolean;
    tags: string[];
    created_at: Date;
    updated_at: Date;
    usage_count?: number;
}
export interface CredentialMatchResult {
    credential: UnifiedCredential;
    score: number;
    reasons: string[];
}
export interface CredentialMatchContext {
    ip?: string;
    hostname?: string;
    os_type?: string;
    device_type?: string;
    environment?: string;
    cloud_provider?: string;
    required_protocol?: AuthProtocol;
    required_scope?: CredentialScope;
}
export interface CredentialValidationResult {
    valid: boolean;
    message: string;
    validated_at: Date;
    details?: Record<string, any>;
}
//# sourceMappingURL=unified-credential.types.d.ts.map