import { Pool } from 'pg';
import { AuditLogEntry, AuditLogQuery, AuditLogResponse } from '@cmdb/common';
export declare class AuditService {
    private pool;
    constructor(pool: Pool);
    logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void>;
    logCICreate(ciId: string, actor: string, actorType: 'user' | 'system' | 'discovery', newData: any): Promise<void>;
    logCIUpdate(ciId: string, actor: string, actorType: 'user' | 'system' | 'discovery', oldData: any, newData: any, metadata?: Record<string, any>): Promise<void>;
    logCIDelete(ciId: string, actor: string, actorType: 'user' | 'system' | 'discovery', deletedData: any): Promise<void>;
    logRelationshipAdd(fromId: string, toId: string, type: string, actor: string, actorType: 'user' | 'system' | 'discovery', properties?: Record<string, any>): Promise<void>;
    logRelationshipRemove(fromId: string, toId: string, type: string, actor: string, actorType: 'user' | 'system' | 'discovery', properties?: Record<string, any>): Promise<void>;
    logDiscoveryUpdate(ciId: string, discoveryJobId: string, oldData: any, newData: any): Promise<void>;
    queryAuditLogs(query: AuditLogQuery): Promise<AuditLogResponse>;
    getCIAuditHistory(ciId: string, limit?: number): Promise<AuditLogEntry[]>;
}
export declare function getAuditService(pool: Pool): AuditService;
//# sourceMappingURL=audit.service.d.ts.map