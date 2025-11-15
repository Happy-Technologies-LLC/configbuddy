import { Pool } from 'pg';
import { UnifiedCredential, CredentialValidationResult } from '@cmdb/common';
export declare class CredentialValidationService {
    private pool;
    constructor(pool: Pool);
    validate(id: string, getById: (id: string) => Promise<UnifiedCredential | null>): Promise<CredentialValidationResult>;
    testConnection(id: string, validateFunc: (id: string) => Promise<CredentialValidationResult>): Promise<boolean>;
    validateCredentialStructure(credential: UnifiedCredential): CredentialValidationResult;
}
//# sourceMappingURL=validation.service.d.ts.map