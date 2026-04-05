// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialSetService = void 0;
exports.getCredentialSetService = getCredentialSetService;
const uuid_1 = require("uuid");
const common_1 = require("@cmdb/common");
const common_2 = require("@cmdb/common");
class CredentialSetService {
    pool;
    encryptionService = (0, common_2.getEncryptionService)();
    constructor(pool) {
        this.pool = pool;
    }
    async create(input, createdBy) {
        const client = await this.pool.connect();
        try {
            if (!input.credential_ids || input.credential_ids.length === 0) {
                throw new Error('Credential set must contain at least one credential');
            }
            const credentialCheckResult = await client.query(`
        SELECT id FROM credentials WHERE id = ANY($1::uuid[])
        `, [input.credential_ids]);
            if (credentialCheckResult.rows.length !== input.credential_ids.length) {
                const foundIds = credentialCheckResult.rows.map((row) => row.id);
                const missingIds = input.credential_ids.filter((id) => !foundIds.includes(id));
                throw new Error(`The following credential IDs do not exist: ${missingIds.join(', ')}`);
            }
            const id = (0, uuid_1.v4)();
            const strategy = input.strategy || 'sequential';
            const stopOnSuccess = input.stop_on_success !== undefined ? input.stop_on_success : true;
            if (!['sequential', 'parallel', 'adaptive'].includes(strategy)) {
                throw new Error(`Invalid strategy: ${strategy}. Must be one of: sequential, parallel, adaptive`);
            }
            const result = await client.query(`
        INSERT INTO credential_sets (
          id,
          name,
          description,
          credential_ids,
          strategy,
          stop_on_success,
          tags,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        `, [
                id,
                input.name,
                input.description || null,
                input.credential_ids,
                strategy,
                stopOnSuccess,
                input.tags || [],
                createdBy,
            ]);
            const row = result.rows[0];
            common_1.logger.info('Credential set created', {
                id: row.id,
                name: row.name,
                strategy: row.strategy,
                credential_count: row.credential_ids.length,
                created_by: createdBy,
            });
            return {
                id: row.id,
                name: row.name,
                description: row.description,
                credential_ids: row.credential_ids,
                strategy: row.strategy,
                stop_on_success: row.stop_on_success,
                tags: row.tags,
                created_by: row.created_by,
                created_at: row.created_at,
                updated_at: row.updated_at,
            };
        }
        catch (error) {
            if (error.code === '23505') {
                throw new Error(`Credential set with name '${input.name}' already exists`);
            }
            common_1.logger.error('Failed to create credential set', { error, input });
            throw error;
        }
        finally {
            client.release();
        }
    }
    async getById(id) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
        SELECT * FROM credential_sets WHERE id = $1
        `, [id]);
            if (result.rows.length === 0) {
                return null;
            }
            const row = result.rows[0];
            return {
                id: row.id,
                name: row.name,
                description: row.description,
                credential_ids: row.credential_ids,
                strategy: row.strategy,
                stop_on_success: row.stop_on_success,
                tags: row.tags,
                created_by: row.created_by,
                created_at: row.created_at,
                updated_at: row.updated_at,
            };
        }
        finally {
            client.release();
        }
    }
    async getWithCredentials(id) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
        SELECT
          id,
          name,
          description,
          strategy,
          stop_on_success,
          tags,
          created_by,
          created_at,
          updated_at,
          credential_ids,
          usage_count,
          credentials
        FROM credential_set_summaries
        WHERE id = $1
        `, [id]);
            if (result.rows.length === 0) {
                return null;
            }
            const row = result.rows[0];
            const credentials = row.credentials || [];
            return {
                id: row.id,
                name: row.name,
                description: row.description,
                credentials,
                strategy: row.strategy,
                stop_on_success: row.stop_on_success,
                tags: row.tags,
                created_at: row.created_at,
                updated_at: row.updated_at,
                usage_count: parseInt(row.usage_count || '0', 10),
            };
        }
        finally {
            client.release();
        }
    }
    async list() {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
        SELECT
          id,
          name,
          description,
          strategy,
          stop_on_success,
          tags,
          created_by,
          created_at,
          updated_at,
          credential_ids,
          usage_count,
          credentials
        FROM credential_set_summaries
        ORDER BY created_at DESC
        `);
            return result.rows.map((row) => {
                const credentials = row.credentials || [];
                return {
                    id: row.id,
                    name: row.name,
                    description: row.description,
                    credentials,
                    strategy: row.strategy,
                    stop_on_success: row.stop_on_success,
                    tags: row.tags,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                    usage_count: parseInt(row.usage_count || '0', 10),
                };
            });
        }
        finally {
            client.release();
        }
    }
    async update(id, input) {
        const client = await this.pool.connect();
        try {
            if (input.credential_ids && input.credential_ids.length > 0) {
                const credentialCheckResult = await client.query(`
          SELECT id FROM credentials WHERE id = ANY($1::uuid[])
          `, [input.credential_ids]);
                if (credentialCheckResult.rows.length !== input.credential_ids.length) {
                    const foundIds = credentialCheckResult.rows.map((row) => row.id);
                    const missingIds = input.credential_ids.filter((id) => !foundIds.includes(id));
                    throw new Error(`The following credential IDs do not exist: ${missingIds.join(', ')}`);
                }
            }
            if (input.strategy && !['sequential', 'parallel', 'adaptive'].includes(input.strategy)) {
                throw new Error(`Invalid strategy: ${input.strategy}. Must be one of: sequential, parallel, adaptive`);
            }
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
            if (input.credential_ids !== undefined) {
                updates.push(`credential_ids = $${paramIndex++}`);
                params.push(input.credential_ids);
            }
            if (input.strategy !== undefined) {
                updates.push(`strategy = $${paramIndex++}`);
                params.push(input.strategy);
            }
            if (input.stop_on_success !== undefined) {
                updates.push(`stop_on_success = $${paramIndex++}`);
                params.push(input.stop_on_success);
            }
            if (input.tags !== undefined) {
                updates.push(`tags = $${paramIndex++}`);
                params.push(input.tags);
            }
            if (updates.length === 0) {
                const existing = await this.getById(id);
                if (!existing) {
                    throw new Error(`Credential set with ID ${id} not found`);
                }
                return existing;
            }
            params.push(id);
            const result = await client.query(`
        UPDATE credential_sets
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
        `, params);
            if (result.rows.length === 0) {
                throw new Error(`Credential set with ID ${id} not found`);
            }
            const row = result.rows[0];
            common_1.logger.info('Credential set updated', {
                id: row.id,
                name: row.name,
                updates: Object.keys(input),
            });
            return {
                id: row.id,
                name: row.name,
                description: row.description,
                credential_ids: row.credential_ids,
                strategy: row.strategy,
                stop_on_success: row.stop_on_success,
                tags: row.tags,
                created_by: row.created_by,
                created_at: row.created_at,
                updated_at: row.updated_at,
            };
        }
        catch (error) {
            if (error.code === '23505') {
                throw new Error(`Credential set with name '${input.name}' already exists`);
            }
            common_1.logger.error('Failed to update credential set', { error, id });
            throw error;
        }
        finally {
            client.release();
        }
    }
    async delete(id) {
        const client = await this.pool.connect();
        try {
            const usageResult = await client.query(`
        SELECT COUNT(*) as count
        FROM discovery_definitions
        WHERE credential_set_id = $1
        `, [id]);
            const usageCount = parseInt(usageResult.rows[0].count, 10);
            if (usageCount > 0) {
                throw new Error(`Cannot delete credential set: it is currently used by ${usageCount} discovery definition(s)`);
            }
            const result = await client.query(`
        DELETE FROM credential_sets
        WHERE id = $1
        RETURNING id, name
        `, [id]);
            if (result.rows.length === 0) {
                throw new Error(`Credential set with ID ${id} not found`);
            }
            common_1.logger.info('Credential set deleted', {
                id: result.rows[0].id,
                name: result.rows[0].name,
            });
        }
        catch (error) {
            common_1.logger.error('Failed to delete credential set', { error, id });
            throw error;
        }
        finally {
            client.release();
        }
    }
    async selectCredentials(setId, context, strategy) {
        const client = await this.pool.connect();
        try {
            const set = await this.getById(setId);
            if (!set) {
                throw new Error(`Credential set with ID ${setId} not found`);
            }
            const effectiveStrategy = strategy || set.strategy;
            const credentialResults = await client.query(`
        SELECT * FROM credentials
        WHERE id = ANY($1::uuid[])
        `, [set.credential_ids]);
            const credentials = credentialResults.rows.map((row) => {
                const credentialsData = JSON.parse(this.encryptionService.decrypt(row.credentials));
                return {
                    id: row.id,
                    name: row.name,
                    description: row.description,
                    protocol: row.protocol,
                    scope: row.scope,
                    credentials: credentialsData,
                    affinity: row.affinity || {},
                    tags: row.tags || [],
                    created_by: row.created_by,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                    last_validated_at: row.last_validated_at,
                    validation_status: row.validation_status,
                };
            });
            switch (effectiveStrategy) {
                case 'sequential':
                    return this.sortBySetOrder(credentials, set.credential_ids);
                case 'parallel':
                    return this.sortBySetOrder(credentials, set.credential_ids);
                case 'adaptive':
                    return this.applyAdaptiveStrategy(credentials, set.credential_ids, context);
                default:
                    throw new Error(`Unknown strategy: ${effectiveStrategy}`);
            }
        }
        finally {
            client.release();
        }
    }
    sortBySetOrder(credentials, credentialIds) {
        const orderMap = new Map();
        credentialIds.forEach((id, index) => {
            orderMap.set(id, index);
        });
        return credentials.sort((a, b) => {
            const orderA = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
            const orderB = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
            return orderA - orderB;
        });
    }
    applyAdaptiveStrategy(credentials, credentialIds, context) {
        const scoredCredentials = credentials.map((credential) => ({
            credential,
            affinityScore: this.calculateAffinityScore(credential, context),
            setOrder: credentialIds.indexOf(credential.id),
        }));
        scoredCredentials.sort((a, b) => {
            if (a.affinityScore !== b.affinityScore) {
                return b.affinityScore - a.affinityScore;
            }
            return a.setOrder - b.setOrder;
        });
        return scoredCredentials.map((item) => item.credential);
    }
    calculateAffinityScore(credential, context) {
        let score = 0;
        const affinity = credential.affinity;
        if (context.ip && affinity.networks && affinity.networks.length > 0) {
            const isInNetwork = affinity.networks.some((cidr) => this.isIpInCidr(context.ip, cidr));
            if (isInNetwork) {
                score += 30;
            }
        }
        if (context.hostname && affinity.hostname_patterns && affinity.hostname_patterns.length > 0) {
            const matchesPattern = affinity.hostname_patterns.some((pattern) => this.matchesHostnamePattern(context.hostname, pattern));
            if (matchesPattern) {
                score += 25;
            }
        }
        if (context.os_type && affinity.os_types && affinity.os_types.includes(context.os_type)) {
            score += 20;
        }
        if (context.device_type && affinity.device_types && affinity.device_types.includes(context.device_type)) {
            score += 15;
        }
        if (context.environment && affinity.environments && affinity.environments.includes(context.environment)) {
            score += 10;
        }
        if (context.cloud_provider && affinity.cloud_providers && affinity.cloud_providers.includes(context.cloud_provider)) {
            score += 20;
        }
        if (context.required_protocol && credential.protocol !== context.required_protocol) {
            score -= 50;
        }
        if (context.required_scope && credential.scope !== context.required_scope && credential.scope !== 'universal') {
            score -= 30;
        }
        const priority = affinity.priority || 5;
        score += priority * 2;
        return Math.max(0, score);
    }
    isIpInCidr(ip, cidr) {
        try {
            const [network, bits] = cidr.split('/');
            if (!network) {
                return false;
            }
            if (!bits) {
                return ip === network;
            }
            const ipParts = ip.split('.').map(Number);
            const networkParts = network.split('.').map(Number);
            const maskBits = parseInt(bits, 10);
            if (ipParts.length !== 4 || networkParts.length !== 4) {
                return false;
            }
            if (ipParts[0] === undefined || ipParts[1] === undefined || ipParts[2] === undefined || ipParts[3] === undefined ||
                networkParts[0] === undefined || networkParts[1] === undefined || networkParts[2] === undefined || networkParts[3] === undefined) {
                return false;
            }
            const ipInt = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
            const networkInt = (networkParts[0] << 24) | (networkParts[1] << 16) | (networkParts[2] << 8) | networkParts[3];
            const mask = ~((1 << (32 - maskBits)) - 1);
            return (ipInt & mask) === (networkInt & mask);
        }
        catch (error) {
            common_1.logger.warn('Failed to parse CIDR', { ip, cidr, error });
            return false;
        }
    }
    matchesHostnamePattern(hostname, pattern) {
        try {
            const regexPattern = pattern
                .replace(/\./g, '\\.')
                .replace(/\*/g, '.*')
                .replace(/\?/g, '.');
            const regex = new RegExp(`^${regexPattern}$`, 'i');
            return regex.test(hostname);
        }
        catch (error) {
            common_1.logger.warn('Failed to match hostname pattern', { hostname, pattern, error });
            return false;
        }
    }
}
exports.CredentialSetService = CredentialSetService;
let credentialSetService = null;
function getCredentialSetService(pool) {
    if (!credentialSetService) {
        credentialSetService = new CredentialSetService(pool);
    }
    return credentialSetService;
}
//# sourceMappingURL=credential-set.service.js.map