import { Pool } from 'pg';
import { AuditLogEntry, AuditChange, AuditLogQuery, AuditLogResponse } from '@cmdb/common';
import { logger } from '@cmdb/common';

export class AuditService {
  constructor(private pool: Pool) {}

  /**
   * Log an audit entry for CI or relationship changes
   */
  async logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `
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
        `,
        [
          entry['entity_type'],
          entry['entity_id'],
          entry['action'],
          entry['actor'],
          entry['actor_type'],
          JSON.stringify(entry['changes']),
          entry['metadata'] ? JSON.stringify(entry['metadata']) : null,
          entry['ip_address'] || null,
          entry['user_agent'] || null,
        ]
      );
    } catch (error) {
      logger.error('Failed to log audit entry', { error, entry });
      // Don't throw - audit logging shouldn't break the main operation
    } finally {
      client.release();
    }
  }

  /**
   * Log a CI create event
   */
  async logCICreate(ciId: string, actor: string, actorType: 'user' | 'system' | 'discovery', newData: any): Promise<void> {
    const changes: AuditChange[] = Object.entries(newData).map(([field, value]) => ({
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

  /**
   * Log a CI update event
   */
  async logCIUpdate(
    ciId: string,
    actor: string,
    actorType: 'user' | 'system' | 'discovery',
    oldData: any,
    newData: any,
    metadata?: Record<string, any>
  ): Promise<void> {
    const changes: AuditChange[] = [];

    // Compare old and new data to find changes
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

    // Only log if there are actual changes
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

  /**
   * Log a CI delete event
   */
  async logCIDelete(ciId: string, actor: string, actorType: 'user' | 'system' | 'discovery', deletedData: any): Promise<void> {
    const changes: AuditChange[] = Object.entries(deletedData).map(([field, value]) => ({
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

  /**
   * Log a relationship add event
   */
  async logRelationshipAdd(
    fromId: string,
    toId: string,
    type: string,
    actor: string,
    actorType: 'user' | 'system' | 'discovery',
    properties?: Record<string, any>
  ): Promise<void> {
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

  /**
   * Log a relationship remove event
   */
  async logRelationshipRemove(
    fromId: string,
    toId: string,
    type: string,
    actor: string,
    actorType: 'user' | 'system' | 'discovery',
    properties?: Record<string, any>
  ): Promise<void> {
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

  /**
   * Log a discovery update event
   */
  async logDiscoveryUpdate(
    ciId: string,
    discoveryJobId: string,
    oldData: any,
    newData: any
  ): Promise<void> {
    const changes: AuditChange[] = [];

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

  /**
   * Query audit logs with filters and pagination
   */
  async queryAuditLogs(query: AuditLogQuery): Promise<AuditLogResponse> {
    const client = await this.pool.connect();
    try {
      const conditions: string[] = [];
      const params: any[] = [];
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

      // Get total count
      const countResult = await client.query(
        `SELECT COUNT(*) as total FROM audit_log ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].total, 10);

      // Get paginated results
      const limit = query.limit || 50;
      const offset = query.offset || 0;
      const page = Math.floor(offset / limit) + 1;

      const dataResult = await client.query(
        `
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
        `,
        [...params, limit, offset]
      );

      const entries: AuditLogEntry[] = dataResult.rows.map((row) => ({
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
    } finally {
      client.release();
    }
  }

  /**
   * Get audit history for a specific CI
   */
  async getCIAuditHistory(ciId: string, limit = 100): Promise<AuditLogEntry[]> {
    const response = await this.queryAuditLogs({
      entity_type: 'CI',
      entity_id: ciId,
      limit,
    });
    return response.entries;
  }
}

// Singleton instance
let auditService: AuditService | null = null;

export function getAuditService(pool: Pool): AuditService {
  if (!auditService) {
    auditService = new AuditService(pool);
  }
  return auditService;
}
