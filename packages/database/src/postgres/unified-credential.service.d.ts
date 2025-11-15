import { Pool } from 'pg';
import { UnifiedCredential, UnifiedCredentialInput, UnifiedCredentialUpdateInput, UnifiedCredentialSummary, CredentialMatchContext, CredentialMatchResult, CredentialValidationResult } from '@cmdb/common';
import { CredentialFilters } from './credential-services/crud.service';
export declare class UnifiedCredentialService {
    private crudService;
    private affinityService;
    private validationService;
    constructor(pool: Pool);
    create(input: UnifiedCredentialInput, createdBy: string): Promise<UnifiedCredential>;
    getById(id: string): Promise<UnifiedCredential | null>;
    list(filters?: CredentialFilters): Promise<UnifiedCredentialSummary[]>;
    update(id: string, input: UnifiedCredentialUpdateInput): Promise<UnifiedCredential>;
    delete(id: string): Promise<void>;
    findBestMatch(context: CredentialMatchContext): Promise<CredentialMatchResult | null>;
    rankCredentials(context: CredentialMatchContext): Promise<CredentialMatchResult[]>;
    calculateAffinityScore(credential: UnifiedCredential, context: CredentialMatchContext): {
        score: number;
        reasons: string[];
    };
    validate(id: string): Promise<CredentialValidationResult>;
    testConnection(id: string): Promise<boolean>;
    validateCredentialStructure(credential: UnifiedCredential): CredentialValidationResult;
}
export declare function getUnifiedCredentialService(pool: Pool): UnifiedCredentialService;
export type { CredentialFilters };
//# sourceMappingURL=unified-credential.service.d.ts.map