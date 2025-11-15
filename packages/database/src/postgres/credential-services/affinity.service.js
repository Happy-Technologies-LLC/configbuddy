"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialAffinityService = void 0;
const common_1 = require("@cmdb/common");
const common_2 = require("@cmdb/common");
const utils_1 = require("./utils");
class CredentialAffinityService {
    pool;
    encryptionService = (0, common_1.getEncryptionService)();
    constructor(pool) {
        this.pool = pool;
    }
    async findBestMatch(context) {
        const matches = await this.rankCredentials(context);
        return matches.length > 0 ? matches[0] ?? null : null;
    }
    async rankCredentials(context) {
        const client = await this.pool.connect();
        try {
            const conditions = [];
            const params = [];
            let paramIndex = 1;
            if (context.required_protocol) {
                conditions.push(`protocol = $${paramIndex++}`);
                params.push(context.required_protocol);
            }
            if (context.required_scope) {
                conditions.push(`scope = $${paramIndex++}`);
                params.push(context.required_scope);
            }
            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            const result = await client.query(`SELECT * FROM credentials ${whereClause}`, params);
            const scoredCredentials = [];
            for (const row of result.rows) {
                try {
                    const credentialsData = JSON.parse(this.encryptionService.decrypt(row.credentials));
                    const credential = {
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
                    const { score, reasons } = this.calculateAffinityScore(credential, context);
                    scoredCredentials.push({
                        credential,
                        score,
                        reasons,
                    });
                }
                catch (error) {
                    common_2.logger.error('Failed to decrypt credential during matching', {
                        id: row.id,
                        error,
                    });
                }
            }
            scoredCredentials.sort((a, b) => b.score - a.score);
            return scoredCredentials;
        }
        finally {
            client.release();
        }
    }
    calculateAffinityScore(credential, context) {
        let score = 0;
        const reasons = [];
        const affinity = credential.affinity;
        if (context.ip && affinity.networks && affinity.networks.length > 0) {
            for (const network of affinity.networks) {
                if (network && (0, utils_1.isIpInCidr)(context.ip, network)) {
                    score += 30;
                    reasons.push(`Network match: ${network}`);
                    break;
                }
            }
        }
        if (context.hostname &&
            affinity.hostname_patterns &&
            affinity.hostname_patterns.length > 0) {
            for (const pattern of affinity.hostname_patterns) {
                if (pattern && (0, utils_1.matchGlob)(context.hostname, pattern)) {
                    score += 25;
                    reasons.push(`Hostname match: ${pattern}`);
                    break;
                }
            }
        }
        if (context.os_type &&
            affinity.os_types &&
            affinity.os_types.includes(context.os_type)) {
            score += 20;
            reasons.push(`OS type match: ${context.os_type}`);
        }
        if (context.device_type &&
            affinity.device_types &&
            affinity.device_types.includes(context.device_type)) {
            score += 15;
            reasons.push(`Device type match: ${context.device_type}`);
        }
        if (context.environment &&
            affinity.environments &&
            affinity.environments.includes(context.environment)) {
            score += 10;
            reasons.push(`Environment match: ${context.environment}`);
        }
        if (context.cloud_provider &&
            affinity.cloud_providers &&
            affinity.cloud_providers.includes(context.cloud_provider)) {
            score += 20;
            reasons.push(`Cloud provider match: ${context.cloud_provider}`);
        }
        if (affinity.priority !== undefined) {
            const priorityBonus = affinity.priority * 2;
            score += priorityBonus;
            reasons.push(`Priority boost: +${priorityBonus} (priority ${affinity.priority})`);
        }
        if (reasons.length === 0) {
            score = 1;
            reasons.push('Default match (no affinity specified)');
        }
        return { score, reasons };
    }
}
exports.CredentialAffinityService = CredentialAffinityService;
//# sourceMappingURL=affinity.service.js.map