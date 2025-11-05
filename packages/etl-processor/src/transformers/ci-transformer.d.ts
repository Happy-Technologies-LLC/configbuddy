import { CI, CIInput, CIType, CIStatus, Environment } from '@cmdb/common';
export interface Neo4jNode {
    _identity: string;
    _labels: string[];
    _properties: Record<string, any>;
}
export interface PostgresRow {
    _ci_id: string;
    _ci_name: string;
    _ci_type: CIType;
    _status: CIStatus;
    environment?: Environment;
    external_id?: string;
    _created_at: Date;
    _updated_at: Date;
    _discovered_at: Date;
    metadata?: Record<string, any>;
}
export interface CIDTO {
    _id: string;
    _name: string;
    _type: CIType;
    status?: CIStatus;
    environment?: Environment;
    externalId?: string;
    metadata?: Record<string, any>;
}
export interface DataQualityResult {
    _isValid: boolean;
    _errors: string[];
    _warnings: string[];
    _score: number;
}
export interface ExtractedMetadata {
    cloud?: {
        provider?: string;
        region?: string;
        availabilityZone?: string;
        accountId?: string;
    };
    compute?: {
        instanceType?: string;
        vcpus?: number;
        memory?: string;
        architecture?: string;
    };
    network?: {
        ipAddresses?: string[];
        vpc?: string;
        subnet?: string;
        securityGroups?: string[];
    };
    tags?: Record<string, string>;
    custom?: Record<string, any>;
}
export declare class CITransformer {
    fromNeo4jNode(node: Neo4jNode): CI;
    checkDataQuality(ci: CI): DataQualityResult;
    extractNestedMetadata(metadata: Record<string, any>): ExtractedMetadata;
    private inferProviderFromMetadata;
    private extractIpAddresses;
    private isValidIP;
    private extractArray;
    private parseNumber;
    toNeo4jProperties(ci: CI | CIInput): Record<string, any>;
    fromPostgresRow(row: PostgresRow): CI;
    toPostgresValues(ci: CI): any[];
    fromDTO(dto: CIDTO): CIInput;
    toDTO(ci: CI): CIDTO;
    normalize(ci: Partial<CI>): CI;
    merge(existing: CI, updates: Partial<CIInput>): CI;
    getChangedFields(oldCI: CI, newCI: CI): Record<string, {
        old: any;
        new: any;
    }>;
    private validateCIType;
    private validateCIStatus;
    private formatDateTime;
    private parseMetadata;
}
//# sourceMappingURL=ci-transformer.d.ts.map