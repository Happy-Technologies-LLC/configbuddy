// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Neo4jToPostgresJob = void 0;
exports.processNeo4jToPostgresJob = processNeo4jToPostgresJob;
const common_1 = require("@cmdb/common");
const dimension_transformer_1 = require("../transformers/dimension-transformer");
class Neo4jToPostgresJob {
    neo4jClient;
    postgresClient;
    dimensionTransformer;
    constructor(neo4jClient, postgresClient) {
        this.neo4jClient = neo4jClient;
        this.postgresClient = postgresClient;
        this.dimensionTransformer = new dimension_transformer_1.DimensionTransformer();
    }
    async execute(job) {
        const startTime = Date.now();
        const data = job.data;
        const batchSize = data.batchSize || 100;
        common_1.logger.info('Starting Neo4j to PostgreSQL ETL job', {
            _jobId: job.id,
            data
        });
        const result = {
            cisProcessed: 0,
            relationshipsProcessed: 0,
            recordsInserted: 0,
            recordsUpdated: 0,
            errors: 0,
            durationMs: 0,
            completedAt: new Date().toISOString()
        };
        try {
            const cis = await this.extractCIs(data);
            common_1.logger.info(`Extracted ${cis.length} CIs from Neo4j`);
            for (let i = 0; i < cis.length; i += batchSize) {
                const batch = cis.slice(i, i + batchSize);
                await job.updateProgress((i / cis.length) * 100);
                try {
                    const batchResult = await this.processBatch(batch, data.fullRefresh || false);
                    result.cisProcessed += batchResult.cisProcessed;
                    result.recordsInserted += batchResult.recordsInserted;
                    result.recordsUpdated += batchResult.recordsUpdated;
                    common_1.logger.debug(`Processed batch ${i / batchSize + 1}`, batchResult);
                }
                catch (error) {
                    result.errors++;
                    common_1.logger.error('Error processing batch', { batch: i / batchSize + 1, error });
                }
            }
            if (data.fullRefresh || !data.incrementalSince) {
                const relationshipsResult = await this.processRelationships(cis);
                result.relationshipsProcessed = relationshipsResult.processed;
                result.recordsInserted += relationshipsResult.inserted;
            }
            result.durationMs = Date.now() - startTime;
            result.completedAt = new Date().toISOString();
            common_1.logger.info('ETL job completed successfully', result);
            return result;
        }
        catch (error) {
            common_1.logger.error('ETL job failed', { error, jobId: job.id });
            throw error;
        }
    }
    async extractCIs(data) {
        const session = this.neo4jClient.getSession();
        try {
            let query = 'MATCH (ci:CI)';
            const params = {};
            if (data.ciTypes && data.ciTypes.length > 0) {
                query += ' WHERE ci.type IN $ciTypes';
                params['ciTypes'] = data.ciTypes;
            }
            if (data.incrementalSince && !data.fullRefresh) {
                query += data.ciTypes ? ' AND' : ' WHERE';
                query += ' ci.updated_at >= datetime($since)';
                params['since'] = data.incrementalSince;
            }
            query += ' RETURN ci ORDER BY ci.updated_at';
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
    async processBatch(cis, fullRefresh) {
        const batchStartTime = Date.now();
        const result = { cisProcessed: 0, recordsInserted: 0, recordsUpdated: 0 };
        common_1.logger.info('Processing batch', {
            _batchSize: cis.length,
            fullRefresh
        });
        const maxRetries = 3;
        const retryDelayMs = 1000;
        let attempt = 0;
        let lastError = null;
        while (attempt < maxRetries) {
            try {
                await this.postgresClient.transaction(async (client) => {
                    for (const ci of cis) {
                        try {
                            const dimension = this.dimensionTransformer.toDimension(ci);
                            const existingResult = await client.query('SELECT ci_key, ci_name, ci_type, status, environment FROM dim_ci WHERE ci_id = $1 AND is_current = true', [ci._id]);
                            if (existingResult.rows.length > 0) {
                                const existing = existingResult.rows[0];
                                const hasChanged = existing.ci_name !== dimension._ci_name ||
                                    existing.ci_type !== dimension._ci_type ||
                                    existing.status !== dimension._status ||
                                    existing.environment !== dimension.environment;
                                if (hasChanged || fullRefresh) {
                                    const ciKey = existing.ci_key;
                                    await client.query(`UPDATE dim_ci
                     SET is_current = false,
                         end_date = $1,
                         updated_at = $1
                     WHERE ci_key = $2`, [new Date(), ciKey]);
                                    const insertResult = await client.query(`INSERT INTO dim_ci
                     (ci_id, ci_name, ci_type, environment, status, external_id,
                      effective_date, end_date, is_current, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, true, $8, $9)
                     RETURNING ci_key`, [
                                        dimension._ci_id,
                                        dimension._ci_name,
                                        dimension._ci_type,
                                        dimension.environment,
                                        dimension._status,
                                        dimension.external_id,
                                        new Date(),
                                        dimension.created_at || new Date(),
                                        new Date()
                                    ]);
                                    const newCiKey = insertResult.rows[0].ci_key;
                                    const discoveryFact = this.dimensionTransformer.toDiscoveryFact(ci, newCiKey);
                                    if (discoveryFact._ci_key) {
                                        await client.query(`INSERT INTO fact_ci_discovery
                       (ci_key, date_key, discovered_at, discovery_method, discovery_source)
                       VALUES ($1, $2, $3, $4, $5)
                       ON CONFLICT DO NOTHING`, [
                                            discoveryFact._ci_key,
                                            discoveryFact._date_key,
                                            discoveryFact._discovered_at,
                                            discoveryFact._discovery_method,
                                            discoveryFact._discovery_source
                                        ]);
                                    }
                                    result.recordsUpdated++;
                                    common_1.logger.debug('Updated CI dimension (Type 2 SCD)', {
                                        _ciId: ci._id,
                                        _oldKey: ciKey,
                                        _newKey: newCiKey
                                    });
                                }
                                else {
                                    common_1.logger.debug('CI unchanged, skipping update', { ciId: ci._id });
                                }
                            }
                            else {
                                const insertResult = await client.query(`INSERT INTO dim_ci
                   (ci_id, ci_name, ci_type, environment, status, external_id,
                    effective_date, end_date, is_current, created_at, updated_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, true, $8, $9)
                   RETURNING ci_key`, [
                                    dimension._ci_id,
                                    dimension._ci_name,
                                    dimension._ci_type,
                                    dimension.environment,
                                    dimension._status,
                                    dimension.external_id,
                                    new Date(),
                                    dimension.created_at || new Date(),
                                    new Date()
                                ]);
                                const ciKey = insertResult.rows[0].ci_key;
                                const discoveryFact = this.dimensionTransformer.toDiscoveryFact(ci, ciKey);
                                if (discoveryFact._ci_key) {
                                    await client.query(`INSERT INTO fact_ci_discovery
                     (ci_key, date_key, discovered_at, discovery_method, discovery_source)
                     VALUES ($1, $2, $3, $4, $5)`, [
                                        discoveryFact._ci_key,
                                        discoveryFact._date_key,
                                        discoveryFact._discovered_at,
                                        discoveryFact._discovery_method,
                                        discoveryFact._discovery_source
                                    ]);
                                }
                                result.recordsInserted++;
                                common_1.logger.debug('Inserted new CI dimension', { ciId: ci._id, ciKey });
                            }
                            result.cisProcessed++;
                        }
                        catch (error) {
                            common_1.logger.error('Error processing CI in batch', {
                                _ciId: ci._id,
                                error,
                                _attempt: attempt + 1
                            });
                            throw error;
                        }
                    }
                });
                const batchDuration = Date.now() - batchStartTime;
                common_1.logger.info('Batch processed successfully', {
                    ...result,
                    _durationMs: batchDuration,
                    _avgTimePerCI: Math.round(batchDuration / cis.length)
                });
                return result;
            }
            catch (error) {
                lastError = error;
                attempt++;
                if (attempt < maxRetries) {
                    const delay = retryDelayMs * Math.pow(2, attempt - 1);
                    common_1.logger.warn('Batch processing failed, retrying', {
                        attempt,
                        maxRetries,
                        _delayMs: delay,
                        _error: lastError.message
                    });
                    await this.sleep(delay);
                }
            }
        }
        common_1.logger.error('Batch processing failed after all retries', {
            _attempts: maxRetries,
            _error: lastError
        });
        throw lastError || new Error('Batch processing failed');
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async processRelationships(cis) {
        const result = { processed: 0, inserted: 0 };
        for (const ci of cis) {
            try {
                const relationships = await this.neo4jClient.getRelationships(ci._id, 'out');
                for (const rel of relationships) {
                    await this.postgresClient.query(`INSERT INTO fact_ci_relationships
             (from_ci_id, to_ci_id, relationship_type, created_at)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (from_ci_id, to_ci_id, relationship_type) DO NOTHING`, [ci._id, rel._ci._id, rel._type, new Date()]);
                    result.inserted++;
                }
                result.processed++;
            }
            catch (error) {
                common_1.logger.error('Error processing relationships', { ciId: ci._id, error });
            }
        }
        return result;
    }
}
exports.Neo4jToPostgresJob = Neo4jToPostgresJob;
async function processNeo4jToPostgresJob(job, neo4jClient, postgresClient) {
    const processor = new Neo4jToPostgresJob(neo4jClient, postgresClient);
    return await processor.execute(job);
}
//# sourceMappingURL=neo4j-to-postgres.job.js.map