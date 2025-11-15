import { Pool } from 'pg';
import { CredentialSet, CredentialSetInput, CredentialSetUpdateInput, CredentialSetSummary, CredentialSetStrategy, CredentialMatchContext, UnifiedCredential } from '@cmdb/common';
export declare class CredentialSetService {
    private pool;
    private encryptionService;
    constructor(pool: Pool);
    create(input: CredentialSetInput, createdBy: string): Promise<CredentialSet>;
    getById(id: string): Promise<CredentialSet | null>;
    getWithCredentials(id: string): Promise<CredentialSetSummary | null>;
    list(): Promise<CredentialSetSummary[]>;
    update(id: string, input: CredentialSetUpdateInput): Promise<CredentialSet>;
    delete(id: string): Promise<void>;
    selectCredentials(setId: string, context: CredentialMatchContext, strategy?: CredentialSetStrategy): Promise<UnifiedCredential[]>;
    private sortBySetOrder;
    private applyAdaptiveStrategy;
    private calculateAffinityScore;
    private isIpInCidr;
    private matchesHostnamePattern;
}
export declare function getCredentialSetService(pool: Pool): CredentialSetService;
//# sourceMappingURL=credential-set.service.d.ts.map