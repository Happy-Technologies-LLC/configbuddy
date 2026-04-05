// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconciliationJob = void 0;
exports.processReconciliationJob = processReconciliationJob;
const common_1 = require("@cmdb/common");
class ReconciliationJob {
    neo4jClient;
    postgresClient;
    constructor(neo4jClient, postgresClient) {
        this.neo4jClient = neo4jClient;
        this.postgresClient = postgresClient;
    }
    async execute(job) {
        const startTime = Date.now();
        const data = job.data;
        common_1.logger.info('Starting reconciliation job', {
            _jobId: job.id,
            data
        });
        const result = {
            _cisChecked: 0,
            _conflictsDetected: 0,
            _conflictsResolved: 0,
            _manualReviewRequired: 0,
            _conflicts: [],
            _durationMs: 0,
            _completedAt: new Date().toISOString()
        };
        try {
            const ciIds = data.ciIds || await this.getAllCIIds();
            common_1.logger.info(`Reconciling ${ciIds.length} CIs`);
            for (let i = 0; i < ciIds.length; i++) {
                const ciId = ciIds[i];
                await job.updateProgress((i / ciIds.length) * 100);
                try {
                    const conflicts = await this.reconcileCI(ciId, data);
                    if (conflicts.length > 0) {
                        result._conflictsDetected += conflicts.length;
                        result._conflicts.push(...conflicts);
                        const resolved = conflicts.filter(c => c._autoResolved).length;
                        result._conflictsResolved += resolved;
                        result._manualReviewRequired += conflicts.length - resolved;
                    }
                    result._cisChecked++;
                }
                catch (error) {
                    common_1.logger.error('Error reconciling CI', { ciId, error });
                }
            }
            result._durationMs = Date.now() - startTime;
            result._completedAt = new Date().toISOString();
            common_1.logger.info('Reconciliation job completed', result);
            return result;
        }
        catch (error) {
            common_1.logger.error('Reconciliation job failed', { error, jobId: job.id });
            throw error;
        }
    }
    async reconcileCI(ciId, data) {
        const conflicts = [];
        const neo4jCI = await this.neo4jClient.getCI(ciId);
        const postgresCI = await this.getPostgresCI(ciId);
        if (!neo4jCI && postgresCI) {
            conflicts.push({
                _ciId: ciId,
                _type: 'missing-in-neo4j',
                _description: 'CI exists in PostgreSQL but not in Neo4j',
                _neo4jValue: null,
                _postgresValue: postgresCI,
                _autoResolved: false
            });
            if (data.autoResolve && data.conflictStrategy === 'postgres-wins') {
                await this.resolveByCreatingInNeo4j(postgresCI);
                conflicts[conflicts.length - 1]._autoResolved = true;
                conflicts[conflicts.length - 1].resolution = 'Created CI in Neo4j from PostgreSQL';
            }
            return conflicts;
        }
        if (neo4jCI && !postgresCI) {
            conflicts.push({
                _ciId: ciId,
                _type: 'missing-in-postgres',
                _description: 'CI exists in Neo4j but not in PostgreSQL',
                _neo4jValue: neo4jCI,
                _postgresValue: null,
                _autoResolved: false
            });
            if (data.autoResolve && data.conflictStrategy === 'neo4j-wins') {
                await this.resolveByCreatingInPostgres(neo4jCI);
                conflicts[conflicts.length - 1]._autoResolved = true;
                conflicts[conflicts.length - 1].resolution = 'Created CI in PostgreSQL from Neo4j';
            }
            return conflicts;
        }
        if (!neo4jCI && !postgresCI) {
            return conflicts;
        }
        if (neo4jCI && postgresCI) {
            if (neo4jCI._status !== postgresCI._status) {
                const conflict = {
                    _ciId: ciId,
                    _type: 'status-mismatch',
                    _description: `Status mismatch: Neo4j='${neo4jCI._status}', PostgreSQL='${postgresCI._status}'`,
                    _neo4jValue: neo4jCI._status,
                    _postgresValue: postgresCI._status,
                    _autoResolved: false
                };
                if (data.autoResolve) {
                    const resolved = await this.resolveStatusConflict(ciId, neo4jCI, postgresCI, data.conflictStrategy || 'newest-wins');
                    if (resolved) {
                        conflict._autoResolved = true;
                        conflict.resolution = resolved;
                    }
                }
                conflicts.push(conflict);
            }
            const neo4jMetaKeys = Object.keys(neo4jCI._metadata || {});
            const pgMetaKeys = Object.keys(postgresCI._metadata || {});
            if (neo4jMetaKeys.length !== pgMetaKeys.length) {
                conflicts.push({
                    _ciId: ciId,
                    _type: 'metadata-mismatch',
                    _description: 'Metadata key count mismatch between sources',
                    _neo4jValue: neo4jCI._metadata,
                    _postgresValue: postgresCI._metadata,
                    _autoResolved: false
                });
            }
            const neo4jUpdated = new Date(neo4jCI._updated_at).getTime();
            const pgUpdated = new Date(postgresCI._updated_at).getTime();
            const diff = Math.abs(neo4jUpdated - pgUpdated);
            if (diff > 3600000) {
                conflicts.push({
                    _ciId: ciId,
                    _type: 'timestamp-mismatch',
                    _description: `Large timestamp difference detected: ${diff}ms`,
                    _neo4jValue: neo4jCI._updated_at,
                    _postgresValue: postgresCI._updated_at,
                    _autoResolved: false
                });
            }
        }
        return conflicts;
    }
    async getPostgresCI(ciId) {
        const result = await this.postgresClient.query(`SELECT * FROM dim_ci WHERE ci_id = $1 AND is_current = true`, [ciId]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        return {
            _id: row.ci_id,
            external_id: row.external_id,
            name: row.ci_name,
            _type: row.ci_type,
            _status: row.status,
            environment: row.environment,
            _created_at: row.created_at,
            _updated_at: row.updated_at,
            _discovered_at: row.discovered_at,
            _metadata: row.metadata || {}
        };
    }
    async getAllCIIds() {
        const session = this.neo4jClient.getSession();
        const ciIds = new Set();
        try {
            const neo4jResult = await session.run('MATCH (ci:CI) RETURN ci.id as id');
            neo4jResult.records.forEach((record) => ciIds.add(record.get('id')));
            const pgResult = await this.postgresClient.query('SELECT DISTINCT ci_id FROM dim_ci WHERE is_current = true');
            pgResult.rows.forEach((row) => ciIds.add(row.ci_id));
            return Array.from(ciIds);
        }
        finally {
            await session.close();
        }
    }
    async resolveStatusConflict(ciId, neo4jCI, postgresCI, strategy) {
        let sourceOfTruth = null;
        switch (strategy) {
            case 'neo4j-wins':
                sourceOfTruth = 'neo4j';
                break;
            case 'postgres-wins':
                sourceOfTruth = 'postgres';
                break;
            case 'newest-wins':
                const neo4jTime = new Date(neo4jCI._updated_at).getTime();
                const pgTime = new Date(postgresCI._updated_at).getTime();
                sourceOfTruth = neo4jTime > pgTime ? 'neo4j' : 'postgres';
                break;
            default:
                return null;
        }
        if (sourceOfTruth === 'neo4j') {
            await this.updatePostgresStatus(ciId, neo4jCI._status);
            return `Updated PostgreSQL status to '${neo4jCI._status}' from Neo4j`;
        }
        else {
            await this.updateNeo4jStatus(ciId, postgresCI._status);
            return `Updated Neo4j status to '${postgresCI._status}' from PostgreSQL`;
        }
    }
    async updatePostgresStatus(ciId, status) {
        await this.postgresClient.query(`UPDATE dim_ci SET status = $1, updated_at = NOW()
       WHERE ci_id = $2 AND is_current = true`, [status, ciId]);
        common_1.logger.info('Updated PostgreSQL CI status', { ciId, status });
    }
    async updateNeo4jStatus(ciId, status) {
        await this.neo4jClient.updateCI(ciId, { status });
        common_1.logger.info('Updated Neo4j CI status', { ciId, status });
    }
    async resolveByCreatingInNeo4j(ci) {
        await this.neo4jClient.createCI(ci);
        common_1.logger.info('Created CI in Neo4j from PostgreSQL', { ciId: ci._id });
    }
    async resolveByCreatingInPostgres(ci) {
        await this.postgresClient.query(`INSERT INTO dim_ci
       (ci_id, ci_name, ci_type, environment, status, effective_date, is_current)
       VALUES ($1, $2, $3, $4, $5, NOW(), true)`, [ci._id, ci.name, ci._type, ci.environment, ci._status]);
        common_1.logger.info('Created CI in PostgreSQL from Neo4j', { ciId: ci._id });
    }
}
exports.ReconciliationJob = ReconciliationJob;
async function processReconciliationJob(job, neo4jClient, postgresClient) {
    const processor = new ReconciliationJob(neo4jClient, postgresClient);
    return await processor.execute(job);
}
//# sourceMappingURL=reconciliation.job.js.map