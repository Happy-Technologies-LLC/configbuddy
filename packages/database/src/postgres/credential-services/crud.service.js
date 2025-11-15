"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialCRUDService = void 0;
const uuid_1 = require("uuid");
const common_1 = require("@cmdb/common");
const common_2 = require("@cmdb/common");
class CredentialCRUDService {
    pool;
    encryptionService = (0, common_1.getEncryptionService)();
    constructor(pool) {
        this.pool = pool;
    }
    async create(input, createdBy) {
        const client = await this.pool.connect();
        try {
            const id = (0, uuid_1.v4)();
            const encryptedData = this.encryptionService.encrypt(JSON.stringify(input.credentials));
            const result = await client.query(`INSERT INTO credentials (
          id, name, description, protocol, scope, credentials,
          affinity, tags, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`, [
                id,
                input.name,
                input.description || null,
                input.protocol,
                input.scope,
                encryptedData,
                input.affinity || {},
                input.tags || [],
                createdBy,
            ]);
            const row = result.rows[0];
            common_2.logger.info('Unified credential created', {
                id: row.id,
                name: row.name,
                protocol: row.protocol,
                scope: row.scope,
                created_by: createdBy,
            });
            const credentialsData = JSON.parse(this.encryptionService.decrypt(row.credentials));
            return {
                id: row.id,
                name: row.name,
                description: row.description,
                protocol: row.protocol,
                scope: row.scope,
                credentials: credentialsData,
                affinity: row.affinity,
                tags: row.tags,
                created_by: row.created_by,
                created_at: row.created_at,
                updated_at: row.updated_at,
                last_validated_at: row.last_validated_at,
                validation_status: row.validation_status,
            };
        }
        catch (error) {
            if (error.code === '23505') {
                throw new Error(`Credential with name '${input.name}' already exists for this user`);
            }
            common_2.logger.error('Failed to create unified credential', {
                error,
                input: { ...input, credentials: '***REDACTED***' },
            });
            throw error;
        }
        finally {
            client.release();
        }
    }
    async getById(id) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`SELECT * FROM credentials WHERE id = $1`, [id]);
            if (result.rows.length === 0) {
                return null;
            }
            const row = result.rows[0];
            let credentialsData;
            try {
                const decrypted = this.encryptionService.decrypt(row.credentials);
                credentialsData = JSON.parse(decrypted);
            }
            catch (error) {
                common_2.logger.error('Failed to decrypt credential', { id, error });
                throw new Error(`Failed to decrypt credential ${id}: ${error instanceof Error ? error.message : String(error)}`);
            }
            return {
                id: row.id,
                name: row.name,
                description: row.description,
                protocol: row.protocol,
                scope: row.scope,
                credentials: credentialsData,
                affinity: row.affinity,
                tags: row.tags,
                created_by: row.created_by,
                created_at: row.created_at,
                updated_at: row.updated_at,
                last_validated_at: row.last_validated_at,
                validation_status: row.validation_status,
            };
        }
        finally {
            client.release();
        }
    }
    async list(filters) {
        const client = await this.pool.connect();
        try {
            const conditions = [];
            const params = [];
            let paramIndex = 1;
            if (filters?.protocol) {
                conditions.push(`protocol = $${paramIndex++}`);
                params.push(filters.protocol);
            }
            if (filters?.scope) {
                conditions.push(`scope = $${paramIndex++}`);
                params.push(filters.scope);
            }
            if (filters?.created_by) {
                conditions.push(`created_by = $${paramIndex++}`);
                params.push(filters.created_by);
            }
            if (filters?.tags && filters.tags.length > 0) {
                conditions.push(`tags && $${paramIndex++}`);
                params.push(filters.tags);
            }
            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            const limit = filters?.limit || 100;
            const offset = filters?.offset || 0;
            const result = await client.query(`SELECT
          id, name, description, protocol, scope, affinity, tags,
          created_at, updated_at, last_validated_at, validation_status,
          usage_count, connector_usage_count
        FROM credential_summaries
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}`, [...params, limit, offset]);
            return result.rows.map((row) => ({
                id: row.id,
                name: row.name,
                description: row.description,
                protocol: row.protocol,
                scope: row.scope,
                affinity: row.affinity,
                tags: row.tags,
                created_at: row.created_at,
                updated_at: row.updated_at,
                last_validated_at: row.last_validated_at,
                validation_status: row.validation_status,
                usage_count: parseInt(row.usage_count, 10),
                connector_usage_count: parseInt(row.connector_usage_count, 10),
            }));
        }
        finally {
            client.release();
        }
    }
    async update(id, input) {
        const client = await this.pool.connect();
        try {
            const updates = [];
            const params = [];
            let paramIndex = 1;
            if (input.name !== undefined) {
                updates.push(`name = $${paramIndex++}`);
                params.push(input.name);
            }
            if (input.description !== undefined) {
                updates.push(`description = $${paramIndex++}`);
                params.push(input.description);
            }
            if (input.credentials !== undefined) {
                const encryptedData = this.encryptionService.encrypt(JSON.stringify(input.credentials));
                updates.push(`credentials = $${paramIndex++}`);
                params.push(encryptedData);
            }
            if (input.affinity !== undefined) {
                updates.push(`affinity = $${paramIndex++}`);
                params.push(input.affinity);
            }
            if (input.tags !== undefined) {
                updates.push(`tags = $${paramIndex++}`);
                params.push(input.tags);
            }
            if (updates.length === 0) {
                const existing = await this.getById(id);
                if (!existing) {
                    throw new Error(`Credential with id ${id} not found`);
                }
                return existing;
            }
            params.push(id);
            const result = await client.query(`UPDATE credentials
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *`, params);
            if (result.rows.length === 0) {
                throw new Error(`Credential with id ${id} not found`);
            }
            const row = result.rows[0];
            common_2.logger.info('Unified credential updated', {
                id: row.id,
                name: row.name,
            });
            const credentialsData = JSON.parse(this.encryptionService.decrypt(row.credentials));
            return {
                id: row.id,
                name: row.name,
                description: row.description,
                protocol: row.protocol,
                scope: row.scope,
                credentials: credentialsData,
                affinity: row.affinity,
                tags: row.tags,
                created_by: row.created_by,
                created_at: row.created_at,
                updated_at: row.updated_at,
                last_validated_at: row.last_validated_at,
                validation_status: row.validation_status,
            };
        }
        catch (error) {
            if (error.code === '23505') {
                throw new Error(`Credential with name '${input.name}' already exists for this user`);
            }
            common_2.logger.error('Failed to update unified credential', { error, id });
            throw error;
        }
        finally {
            client.release();
        }
    }
    async delete(id) {
        const client = await this.pool.connect();
        try {
            const discoveryUsageResult = await client.query(`SELECT COUNT(*) as count FROM discovery_definitions WHERE credential_id = $1`, [id]);
            const discoveryUsageCount = parseInt(discoveryUsageResult.rows[0].count, 10);
            const connectorUsageResult = await client.query(`SELECT COUNT(*) as count FROM connector_configurations WHERE credential_id = $1`, [id]);
            const connectorUsageCount = parseInt(connectorUsageResult.rows[0].count, 10);
            const totalUsage = discoveryUsageCount + connectorUsageCount;
            if (totalUsage > 0) {
                const usageDetails = [];
                if (discoveryUsageCount > 0) {
                    usageDetails.push(`${discoveryUsageCount} discovery definition(s)`);
                }
                if (connectorUsageCount > 0) {
                    usageDetails.push(`${connectorUsageCount} connector configuration(s)`);
                }
                throw new Error(`Cannot delete credential: it is currently used by ${usageDetails.join(' and ')}`);
            }
            const setUsageResult = await client.query(`SELECT COUNT(*) as count FROM credential_sets WHERE $1 = ANY(credential_ids)`, [id]);
            const setUsageCount = parseInt(setUsageResult.rows[0].count, 10);
            if (setUsageCount > 0) {
                throw new Error(`Cannot delete credential: it is currently used by ${setUsageCount} credential set(s)`);
            }
            const result = await client.query(`DELETE FROM credentials WHERE id = $1 RETURNING id, name`, [id]);
            if (result.rows.length === 0) {
                throw new Error(`Credential with id ${id} not found`);
            }
            common_2.logger.info('Unified credential deleted', {
                id: result.rows[0].id,
                name: result.rows[0].name,
            });
        }
        catch (error) {
            common_2.logger.error('Failed to delete unified credential', { error, id });
            throw error;
        }
        finally {
            client.release();
        }
    }
}
exports.CredentialCRUDService = CredentialCRUDService;
//# sourceMappingURL=crud.service.js.map