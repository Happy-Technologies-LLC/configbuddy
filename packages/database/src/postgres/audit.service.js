"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
exports.getAuditService = getAuditService;
const common_1 = require("@cmdb/common");
class AuditService {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async logAudit(entry) {
        const client = await this.pool.connect();
        try {
            await client.query(`
        INSERT INTO audit_log (
          entity_type,
          entity_id,
          action,
          actor,
          actor_type,
          changes,
          metadata,
          ip_address,
          user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
                entry['entity_type'],
                entry['entity_id'],
                entry['action'],
                entry['actor'],
                entry['actor_type'],
                JSON.stringify(entry['changes']),
                entry['metadata'] ? JSON.stringify(entry['metadata']) : null,
                entry['ip_address'] || null,
                entry['user_agent'] || null,
            ]);
        }
        catch (error) {
            common_1.logger.error('Failed to log audit entry', { error, entry });
        }
        finally {
            client.release();
        }
    }
    async logCICreate(ciId, actor, actorType, newData) {
        const changes = Object.entries(newData).map(([field, value]) => ({
            field,
            old_value: null,
            new_value: value,
        }));
        await this.logAudit({
            entity_type: 'CI',
            entity_id: ciId,
            action: 'CREATE',
            actor,
            actor_type: actorType,
            changes,
        });
    }
    async logCIUpdate(ciId, actor, actorType, oldData, newData, metadata) {
        const changes = [];
        for (const [field, newValue] of Object.entries(newData)) {
            const oldValue = oldData[field];
            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                changes.push({
                    field,
                    old_value: oldValue,
                    new_value: newValue,
                });
            }
        }
        if (changes.length > 0) {
            await this.logAudit({
                entity_type: 'CI',
                entity_id: ciId,
                action: 'UPDATE',
                actor,
                actor_type: actorType,
                changes,
                metadata,
            });
        }
    }
    async logCIDelete(ciId, actor, actorType, deletedData) {
        const changes = Object.entries(deletedData).map(([field, value]) => ({
            field,
            old_value: value,
            new_value: null,
        }));
        await this.logAudit({
            entity_type: 'CI',
            entity_id: ciId,
            action: 'DELETE',
            actor,
            actor_type: actorType,
            changes,
        });
    }
    async logRelationshipAdd(fromId, toId, type, actor, actorType, properties) {
        const relationshipId = `${fromId}-${type}-${toId}`;
        await this.logAudit({
            entity_type: 'RELATIONSHIP',
            entity_id: relationshipId,
            action: 'RELATIONSHIP_ADD',
            actor,
            actor_type: actorType,
            changes: [
                { field: 'from_id', old_value: null, new_value: fromId },
                { field: 'to_id', old_value: null, new_value: toId },
                { field: 'type', old_value: null, new_value: type },
                { field: 'properties', old_value: null, new_value: properties },
            ],
        });
    }
    async logRelationshipRemove(fromId, toId, type, actor, actorType, properties) {
        const relationshipId = `${fromId}-${type}-${toId}`;
        await this.logAudit({
            entity_type: 'RELATIONSHIP',
            entity_id: relationshipId,
            action: 'RELATIONSHIP_REMOVE',
            actor,
            actor_type: actorType,
            changes: [
                { field: 'from_id', old_value: fromId, new_value: null },
                { field: 'to_id', old_value: toId, new_value: null },
                { field: 'type', old_value: type, new_value: null },
                { field: 'properties', old_value: properties, new_value: null },
            ],
        });
    }
    async logDiscoveryUpdate(ciId, discoveryJobId, oldData, newData) {
        const changes = [];
        for (const [field, newValue] of Object.entries(newData)) {
            const oldValue = oldData[field];
            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                changes.push({
                    field,
                    old_value: oldValue,
                    new_value: newValue,
                });
            }
        }
        if (changes.length > 0) {
            await this.logAudit({
                entity_type: 'CI',
                entity_id: ciId,
                action: 'DISCOVERY_UPDATE',
                actor: 'discovery-engine',
                actor_type: 'discovery',
                changes,
                metadata: {
                    discovery_job_id: discoveryJobId,
                },
            });
        }
    }
    async queryAuditLogs(query) {
        const client = await this.pool.connect();
        try {
            const conditions = [];
            const params = [];
            let paramIndex = 1;
            if (query.entity_type) {
                conditions.push(`entity_type = $${paramIndex++}`);
                params.push(query.entity_type);
            }
            if (query.entity_id) {
                conditions.push(`entity_id = $${paramIndex++}`);
                params.push(query.entity_id);
            }
            if (query.action) {
                conditions.push(`action = $${paramIndex++}`);
                params.push(query.action);
            }
            if (query.actor) {
                conditions.push(`actor = $${paramIndex++}`);
                params.push(query.actor);
            }
            if (query.from_date) {
                conditions.push(`timestamp >= $${paramIndex++}`);
                params.push(query.from_date);
            }
            if (query.to_date) {
                conditions.push(`timestamp <= $${paramIndex++}`);
                params.push(query.to_date);
            }
            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            const countResult = await client.query(`SELECT COUNT(*) as total FROM audit_log ${whereClause}`, params);
            const total = parseInt(countResult.rows[0].total, 10);
            const limit = query.limit || 50;
            const offset = query.offset || 0;
            const page = Math.floor(offset / limit) + 1;
            const dataResult = await client.query(`
        SELECT
          id,
          entity_type,
          entity_id,
          action,
          actor,
          actor_type,
          changes,
          metadata,
          timestamp,
          ip_address,
          user_agent
        FROM audit_log
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `, [...params, limit, offset]);
            const entries = dataResult.rows.map((row) => ({
                id: row.id,
                entity_type: row.entity_type,
                entity_id: row.entity_id,
                action: row.action,
                actor: row.actor,
                actor_type: row.actor_type,
                changes: row.changes,
                metadata: row.metadata,
                timestamp: row.timestamp.toISOString(),
                ip_address: row.ip_address,
                user_agent: row.user_agent,
            }));
            return {
                entries,
                total,
                page,
                limit,
                total_pages: Math.ceil(total / limit),
            };
        }
        finally {
            client.release();
        }
    }
    async getCIAuditHistory(ciId, limit = 100) {
        const response = await this.queryAuditLogs({
            entity_type: 'CI',
            entity_id: ciId,
            limit,
        });
        return response.entries;
    }
}
exports.AuditService = AuditService;
let auditService = null;
function getAuditService(pool) {
    if (!auditService) {
        auditService = new AuditService(pool);
    }
    return auditService;
}
//# sourceMappingURL=audit.service.js.map