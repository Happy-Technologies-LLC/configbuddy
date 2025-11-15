import { Pool } from 'pg';
import { UnifiedCredential, UnifiedCredentialInput, UnifiedCredentialUpdateInput, UnifiedCredentialSummary } from '@cmdb/common';
export interface CredentialFilters {
    protocol?: string;
    scope?: string;
    tags?: string[];
    created_by?: string;
    limit?: number;
    offset?: number;
}
export declare class CredentialCRUDService {
    private pool;
    private encryptionService;
    constructor(pool: Pool);
    create(input: UnifiedCredentialInput, createdBy: string): Promise<UnifiedCredential>;
    getById(id: string): Promise<UnifiedCredential | null>;
    list(filters?: CredentialFilters): Promise<UnifiedCredentialSummary[]>;
    update(id: string, input: UnifiedCredentialUpdateInput): Promise<UnifiedCredential>;
    delete(id: string): Promise<void>;
}
//# sourceMappingURL=crud.service.d.ts.map