import { Pool } from 'pg';
import { UnifiedCredential, CredentialMatchContext, CredentialMatchResult } from '@cmdb/common';
export declare class CredentialAffinityService {
    private pool;
    private encryptionService;
    constructor(pool: Pool);
    findBestMatch(context: CredentialMatchContext): Promise<CredentialMatchResult | null>;
    rankCredentials(context: CredentialMatchContext): Promise<CredentialMatchResult[]>;
    calculateAffinityScore(credential: UnifiedCredential, context: CredentialMatchContext): {
        score: number;
        reasons: string[];
    };
}
//# sourceMappingURL=affinity.service.d.ts.map