// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataMartClient = void 0;
exports.getDataMartClient = getDataMartClient;
exports.resetDataMartClient = resetDataMartClient;
const client_1 = require("../postgres/client");
const common_1 = require("@cmdb/common");
class DataMartClient {
    pgClient;
    constructor(pgClient) {
        this.pgClient = pgClient;
    }
    async upsertCI(ci) {
        try {
            const existing = await this.pgClient.query(`
        SELECT ci_key, ci_name, ci_type, ci_status, environment, external_id, metadata
        FROM cmdb.dim_ci
        WHERE ci_id = $1 AND is_current = TRUE
        `, [ci.ci_id]);
            if (existing.rows.length > 0) {
                const currentRecord = existing.rows[0];
                if (this.hasCIChanged(currentRecord, ci)) {
                    common_1.logger.debug('CI attributes changed, creating new version', { ci_id: ci.ci_id });
                    return await this.pgClient.updateCIDimension(ci);
                }
                else {
                    common_1.logger.debug('CI unchanged, returning existing key', { ci_id: ci.ci_id });
                    return currentRecord.ci_key;
                }
            }
            else {
                common_1.logger.debug('Creating new CI dimension record', { ci_id: ci.ci_id });
                return await this.pgClient.insertCIDimension(ci);
            }
        }
        catch (error) {
            common_1.logger.error('Failed to upsert CI dimension', { ci_id: ci.ci_id, error });
            throw error;
        }
    }
    async batchUpsertCIs(cis) {
        const ciKeyMap = new Map();
        common_1.logger.info('Starting batch CI upsert', { count: cis.length });
        for (const ci of cis) {
            try {
                const ciKey = await this.upsertCI(ci);
                ciKeyMap.set(ci.ci_id, ciKey);
            }
            catch (error) {
                common_1.logger.error('Failed to upsert CI in batch', { ci_id: ci.ci_id, error });
            }
        }
        common_1.logger.info('Batch CI upsert completed', {
            total: cis.length,
            successful: ciKeyMap.size,
            failed: cis.length - ciKeyMap.size,
        });
        return ciKeyMap;
    }
    async getCIKey(ciId) {
        return await this.pgClient.getCurrentCIKey(ciId);
    }
    async getCurrentCIsByType(ciType) {
        const result = await this.pgClient.query(`
      SELECT ci_key, ci_id, ci_name, ci_type, ci_status, environment, external_id, metadata
      FROM cmdb.dim_ci
      WHERE ci_type = $1 AND is_current = TRUE
      ORDER BY ci_name
      `, [ciType]);
        return result.rows;
    }
    async getCIHistory(ciId) {
        const result = await this.pgClient.query(`
      SELECT ci_key, ci_id, ci_name, ci_type, ci_status, environment,
             external_id, metadata, effective_from, effective_to, is_current
      FROM cmdb.dim_ci
      WHERE ci_id = $1
      ORDER BY effective_from DESC
      `, [ciId]);
        return result.rows;
    }
    async upsertLocation(location) {
        try {
            return await this.pgClient.insertLocationDimension(location);
        }
        catch (error) {
            common_1.logger.error('Failed to upsert location dimension', {
                location_id: location.location_id,
                error,
            });
            throw error;
        }
    }
    async getLocationKey(locationId) {
        return await this.pgClient.getLocationKey(locationId);
    }
    async upsertOwner(owner) {
        try {
            return await this.pgClient.insertOwnerDimension(owner);
        }
        catch (error) {
            common_1.logger.error('Failed to upsert owner dimension', { owner_id: owner.owner_id, error });
            throw error;
        }
    }
    async recordDiscovery(discovery) {
        try {
            await this.pgClient.insertDiscoveryFact(discovery);
            common_1.logger.debug('Discovery fact recorded', {
                ci_key: discovery.ci_key,
                provider: discovery.discovery_provider,
            });
        }
        catch (error) {
            common_1.logger.error('Failed to record discovery fact', { discovery, error });
            throw error;
        }
    }
    async batchRecordDiscoveries(discoveries) {
        common_1.logger.info('Starting batch discovery recording', { count: discoveries.length });
        let successCount = 0;
        let failCount = 0;
        for (const discovery of discoveries) {
            try {
                await this.recordDiscovery(discovery);
                successCount++;
            }
            catch (error) {
                failCount++;
                common_1.logger.error('Failed to record discovery in batch', { discovery, error });
            }
        }
        common_1.logger.info('Batch discovery recording completed', {
            total: discoveries.length,
            successful: successCount,
            failed: failCount,
        });
    }
    async recordChange(change) {
        try {
            await this.pgClient.insertChangesFact(change);
            common_1.logger.debug('Change fact recorded', {
                ci_key: change.ci_key,
                change_type: change.change_type,
            });
        }
        catch (error) {
            common_1.logger.error('Failed to record change fact', { change, error });
            throw error;
        }
    }
    async batchRecordChanges(changes) {
        common_1.logger.info('Starting batch change recording', { count: changes.length });
        let successCount = 0;
        let failCount = 0;
        for (const change of changes) {
            try {
                await this.recordChange(change);
                successCount++;
            }
            catch (error) {
                failCount++;
                common_1.logger.error('Failed to record change in batch', { change, error });
            }
        }
        common_1.logger.info('Batch change recording completed', {
            total: changes.length,
            successful: successCount,
            failed: failCount,
        });
    }
    async recordRelationship(relationship) {
        try {
            await this.pgClient.insertRelationshipFact(relationship);
            common_1.logger.debug('Relationship fact recorded', {
                from_ci_key: relationship.from_ci_key,
                to_ci_key: relationship.to_ci_key,
                type: relationship.relationship_type,
            });
        }
        catch (error) {
            common_1.logger.error('Failed to record relationship fact', { relationship, error });
            throw error;
        }
    }
    async batchRecordRelationships(relationships) {
        common_1.logger.info('Starting batch relationship recording', { count: relationships.length });
        let successCount = 0;
        let failCount = 0;
        for (const relationship of relationships) {
            try {
                await this.recordRelationship(relationship);
                successCount++;
            }
            catch (error) {
                failCount++;
                common_1.logger.error('Failed to record relationship in batch', { relationship, error });
            }
        }
        common_1.logger.info('Batch relationship recording completed', {
            total: relationships.length,
            successful: successCount,
            failed: failCount,
        });
    }
    async deactivateRelationship(fromCiKey, toCiKey, relationshipType) {
        try {
            await this.pgClient.deactivateRelationship(fromCiKey, toCiKey, relationshipType);
            common_1.logger.debug('Relationship deactivated', { fromCiKey, toCiKey, relationshipType });
        }
        catch (error) {
            common_1.logger.error('Failed to deactivate relationship', {
                fromCiKey,
                toCiKey,
                relationshipType,
                error,
            });
            throw error;
        }
    }
    async getCurrentInventory() {
        try {
            return await this.pgClient.getCurrentInventory();
        }
        catch (error) {
            common_1.logger.error('Failed to get current inventory', error);
            throw error;
        }
    }
    async getDiscoverySummary(ciId) {
        try {
            return await this.pgClient.getDiscoverySummary(ciId);
        }
        catch (error) {
            common_1.logger.error('Failed to get discovery summary', { ciId, error });
            throw error;
        }
    }
    async getChangeHistory(ciId, limit = 100) {
        try {
            return await this.pgClient.getChangeHistory(ciId, limit);
        }
        catch (error) {
            common_1.logger.error('Failed to get change history', { ciId, limit, error });
            throw error;
        }
    }
    async getCIRelationships(ciId) {
        try {
            return await this.pgClient.getCIRelationships(ciId);
        }
        catch (error) {
            common_1.logger.error('Failed to get CI relationships', { ciId, error });
            throw error;
        }
    }
    async getCICountByType() {
        try {
            const result = await this.pgClient.query(`
        SELECT ci_type, COUNT(*) as count
        FROM cmdb.dim_ci
        WHERE is_current = TRUE
        GROUP BY ci_type
        ORDER BY count DESC
      `);
            const countMap = new Map();
            for (const row of result.rows) {
                countMap.set(row.ci_type, parseInt(row.count));
            }
            return countMap;
        }
        catch (error) {
            common_1.logger.error('Failed to get CI count by type', error);
            throw error;
        }
    }
    async getCICountByEnvironment() {
        try {
            const result = await this.pgClient.query(`
        SELECT environment, COUNT(*) as count
        FROM cmdb.dim_ci
        WHERE is_current = TRUE AND environment IS NOT NULL
        GROUP BY environment
        ORDER BY count DESC
      `);
            const countMap = new Map();
            for (const row of result.rows) {
                countMap.set(row.environment, parseInt(row.count));
            }
            return countMap;
        }
        catch (error) {
            common_1.logger.error('Failed to get CI count by environment', error);
            throw error;
        }
    }
    async getDiscoveryStats(startDate, endDate) {
        try {
            const statsResult = await this.pgClient.query(`
        SELECT
          COUNT(*) as total_discoveries,
          COUNT(DISTINCT ci_key) as unique_cis,
          AVG(confidence_score) as avg_confidence
        FROM cmdb.fact_discovery
        WHERE discovered_at >= $1 AND discovered_at <= $2
        `, [startDate, endDate]);
            const providerResult = await this.pgClient.query(`
        SELECT
          discovery_provider as provider,
          COUNT(*) as count
        FROM cmdb.fact_discovery
        WHERE discovered_at >= $1 AND discovered_at <= $2
        GROUP BY discovery_provider
        ORDER BY count DESC
        `, [startDate, endDate]);
            return {
                total_discoveries: parseInt(statsResult.rows[0]?.total_discoveries || '0'),
                unique_cis: parseInt(statsResult.rows[0]?.unique_cis || '0'),
                avg_confidence: parseFloat(statsResult.rows[0]?.avg_confidence || '0'),
                by_provider: providerResult.rows.map((row) => ({
                    provider: row.provider,
                    count: parseInt(row.count),
                })),
            };
        }
        catch (error) {
            common_1.logger.error('Failed to get discovery stats', { startDate, endDate, error });
            throw error;
        }
    }
    async getChangeStats(startDate, endDate) {
        try {
            const statsResult = await this.pgClient.query(`
        SELECT
          COUNT(*) as total_changes,
          COUNT(DISTINCT ci_key) as unique_cis
        FROM cmdb.fact_ci_changes
        WHERE changed_at >= $1 AND changed_at <= $2
        `, [startDate, endDate]);
            const typeResult = await this.pgClient.query(`
        SELECT
          change_type,
          COUNT(*) as count
        FROM cmdb.fact_ci_changes
        WHERE changed_at >= $1 AND changed_at <= $2
        GROUP BY change_type
        ORDER BY count DESC
        `, [startDate, endDate]);
            const sourceResult = await this.pgClient.query(`
        SELECT
          change_source,
          COUNT(*) as count
        FROM cmdb.fact_ci_changes
        WHERE changed_at >= $1 AND changed_at <= $2
        GROUP BY change_source
        ORDER BY count DESC
        `, [startDate, endDate]);
            return {
                total_changes: parseInt(statsResult.rows[0]?.total_changes || '0'),
                unique_cis: parseInt(statsResult.rows[0]?.unique_cis || '0'),
                by_type: typeResult.rows.map((row) => ({
                    change_type: row.change_type,
                    count: parseInt(row.count),
                })),
                by_source: sourceResult.rows.map((row) => ({
                    change_source: row.change_source,
                    count: parseInt(row.count),
                })),
            };
        }
        catch (error) {
            common_1.logger.error('Failed to get change stats', { startDate, endDate, error });
            throw error;
        }
    }
    async getDateKey(timestamp) {
        return await this.pgClient.getDateKey(timestamp);
    }
    hasCIChanged(existing, incoming) {
        if (existing.ciname !== incoming.ciname)
            return true;
        if (existing.ci_type !== incoming.ci_type)
            return true;
        if (existing.ci_status !== incoming.ci_status)
            return true;
        if (existing.environment !== incoming.environment)
            return true;
        if (existing.external_id !== incoming.external_id)
            return true;
        if (incoming.metadata) {
            const existingMetadata = existing.metadata || {};
            const incomingMetadata = incoming.metadata;
            if (JSON.stringify(existingMetadata) !== JSON.stringify(incomingMetadata)) {
                return true;
            }
        }
        return false;
    }
    async query(sql, params) {
        return await this.pgClient.query(sql, params);
    }
    async transaction(callback) {
        return await this.pgClient.transaction(callback);
    }
}
exports.DataMartClient = DataMartClient;
let dataMartClient = null;
function getDataMartClient() {
    if (!dataMartClient) {
        const pgClient = (0, client_1.getPostgresClient)();
        dataMartClient = new DataMartClient(pgClient);
        common_1.logger.info('DataMartClient initialized');
    }
    return dataMartClient;
}
function resetDataMartClient() {
    dataMartClient = null;
}
//# sourceMappingURL=datamart.client.js.map