"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangeDetectionJob = void 0;
exports.processChangeDetectionJob = processChangeDetectionJob;
const common_1 = require("@cmdb/common");
const date_fns_1 = require("date-fns");
class ChangeDetectionJob {
    neo4jClient;
    postgresClient;
    constructor(neo4jClient, postgresClient) {
        this.neo4jClient = neo4jClient;
        this.postgresClient = postgresClient;
    }
    async execute(job) {
        const startTime = Date.now();
        const data = job.data;
        const lookbackHours = data.lookbackHours || 24;
        const since = data.since || (0, date_fns_1.subHours)(new Date(), lookbackHours).toISOString();
        common_1.logger.info('Starting change detection job', {
            _jobId: job.id,
            since,
            lookbackHours
        });
        const result = {
            cisChecked: 0,
            changesDetected: 0,
            changesRecorded: 0,
            changes: [],
            durationMs: 0,
            completedAt: new Date().toISOString()
        };
        try {
            const changedCIs = await this.getChangedCIs(since, data.ciIds);
            common_1.logger.info(`Found ${changedCIs.length} CIs with potential changes`);
            for (let i = 0; i < changedCIs.length; i++) {
                const ci = changedCIs[i];
                await job.updateProgress((i / changedCIs.length) * 100);
                try {
                    const changes = await this.detectChanges(ci, since);
                    if (changes.length > 0) {
                        result.changesDetected += changes.length;
                        result.changes.push(...changes);
                        await this.recordChanges(changes);
                        result.changesRecorded += changes.length;
                    }
                    result.cisChecked++;
                }
                catch (error) {
                    common_1.logger.error('Error detecting changes for CI', { ciId: ci._id, error });
                }
            }
            if (data.includeRelationships) {
                const relChanges = await this.detectRelationshipChanges(since);
                result.changesDetected += relChanges.length;
                result.changes.push(...relChanges);
                if (relChanges.length > 0) {
                    await this.recordChanges(relChanges);
                    result.changesRecorded += relChanges.length;
                }
            }
            result.durationMs = Date.now() - startTime;
            result.completedAt = new Date().toISOString();
            common_1.logger.info('Change detection job completed', {
                _cisChecked: result.cisChecked,
                _changesDetected: result.changesDetected
            });
            return result;
        }
        catch (error) {
            common_1.logger.error('Change detection job failed', { error, jobId: job.id });
            throw error;
        }
    }
    async getChangedCIs(since, ciIds) {
        const session = this.neo4jClient.getSession();
        try {
            let query = 'MATCH (ci:CI) WHERE ci.updated_at >= datetime($since)';
            const params = { since };
            if (ciIds && ciIds.length > 0) {
                query += ' AND ci.id IN $ciIds';
                params['ciIds'] = ciIds;
            }
            query += ' RETURN ci ORDER BY ci.updated_at DESC';
            const result = await session.run(query, params);
            return result.records.map((record) => {
                const node = record.get('ci');
                const props = node.properties;
                return {
                    _id: props.id,
                    external_id: props.external_id,
                    name: props.name,
                    _type: props.type,
                    _status: props.status,
                    environment: props.environment,
                    _created_at: props.created_at,
                    _updated_at: props.updated_at,
                    _discovered_at: props.discovered_at,
                    _metadata: props.metadata ? JSON.parse(props.metadata) : {}
                };
            });
        }
        finally {
            await session.close();
        }
    }
    async detectChanges(ci, since) {
        const changes = [];
        const historicalCI = await this.getHistoricalCI(ci._id, since);
        if (!historicalCI) {
            changes.push({
                ciId: ci._id,
                ciName: ci.name,
                changeType: 'created',
                fieldName: '*',
                oldValue: null,
                newValue: ci,
                changedAt: ci._created_at,
                changedBy: 'system'
            });
            return changes;
        }
        const fieldsToCheck = [
            'name', '_status', 'environment', '_type'
        ];
        for (const field of fieldsToCheck) {
            if (ci[field] !== historicalCI[field]) {
                const changeType = field === '_status' ? 'status-changed' : 'updated';
                changes.push({
                    ciId: ci._id,
                    ciName: ci.name,
                    changeType,
                    fieldName: field,
                    oldValue: historicalCI[field],
                    newValue: ci[field],
                    changedAt: ci._updated_at,
                    changedBy: 'system'
                });
            }
        }
        const currentMeta = JSON.stringify(ci._metadata || {});
        const historicalMeta = JSON.stringify(historicalCI._metadata || {});
        if (currentMeta !== historicalMeta) {
            changes.push({
                ciId: ci._id,
                ciName: ci.name,
                changeType: 'metadata-changed',
                fieldName: 'metadata',
                oldValue: historicalCI._metadata,
                newValue: ci._metadata,
                changedAt: ci._updated_at,
                changedBy: 'system'
            });
        }
        return changes;
    }
    async getHistoricalCI(ciId, beforeDate) {
        const result = await this.postgresClient.query(`SELECT * FROM dim_ci
       WHERE ci_id = $1
       AND effective_date < $2
       ORDER BY effective_date DESC
       LIMIT 1`, [ciId, beforeDate]);
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
    async detectRelationshipChanges(since) {
        const changes = [];
        const session = this.neo4jClient.getSession();
        try {
            const result = await session.run(`MATCH (from:CI)-[r]->(to:CI)
         WHERE r.created_at >= datetime($since) OR r.updated_at >= datetime($since)
         RETURN from.id as fromId, from.name as fromName,
                to.id as toId, to.name as toName,
                type(r) as relType, r.created_at as createdAt, r.updated_at as updatedAt`, { since });
            for (const record of result.records) {
                const createdAt = record.get('createdAt');
                const updatedAt = record.get('updatedAt');
                const isNew = new Date(createdAt).toISOString() >= since;
                changes.push({
                    ciId: record.get('fromId'),
                    ciName: record.get('fromName'),
                    changeType: isNew ? 'relationship-added' : 'updated',
                    fieldName: 'relationship',
                    oldValue: null,
                    newValue: {
                        type: record.get('relType'),
                        to: {
                            id: record.get('toId'),
                            name: record.get('toName')
                        }
                    },
                    changedAt: isNew ? createdAt : updatedAt,
                    changedBy: 'system'
                });
            }
        }
        finally {
            await session.close();
        }
        return changes;
    }
    async recordChanges(changes) {
        if (changes.length === 0) {
            return;
        }
        await this.postgresClient.transaction(async (client) => {
            for (const change of changes) {
                try {
                    await client.query(`INSERT INTO fact_ci_changes
             (ci_id, change_type, field_name, old_value, new_value, changed_at, changed_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                        change.ciId,
                        change.changeType,
                        change.fieldName,
                        JSON.stringify(change.oldValue),
                        JSON.stringify(change.newValue),
                        change.changedAt,
                        change.changedBy || 'system'
                    ]);
                }
                catch (error) {
                    common_1.logger.error('Error recording change', { change, error });
                }
            }
        });
        common_1.logger.info(`Recorded ${changes.length} changes in database`);
    }
}
exports.ChangeDetectionJob = ChangeDetectionJob;
async function processChangeDetectionJob(job, neo4jClient, postgresClient) {
    const processor = new ChangeDetectionJob(neo4jClient, postgresClient);
    return await processor.execute(job);
}
//# sourceMappingURL=change-detection.job.js.map