"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FullRefreshJob = void 0;
exports.processFullRefreshJob = processFullRefreshJob;
const common_1 = require("@cmdb/common");
const dimension_transformer_1 = require("../transformers/dimension-transformer");
class FullRefreshJob {
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
        const batchSize = data.batchSize || 500;
        common_1.logger.info('Starting full refresh job', {
            jobId: job.id,
            data
        });
        const result = {
            cisProcessed: 0,
            relationshipsProcessed: 0,
            dimensionsCreated: 0,
            factsCreated: 0,
            durationMs: 0,
            completedAt: new Date().toISOString(),
            stagesCompleted: []
        };
        try {
            if (data.truncateTables !== false) {
                await this.truncateTables();
                await job.updateProgress(10);
                result.stagesCompleted.push('truncate');
                common_1.logger.info('Tables truncated successfully');
            }
            const cis = await this.extractAllCIs();
            await job.updateProgress(25);
            result.stagesCompleted.push('extract-cis');
            common_1.logger.info(`Extracted ${cis.length} CIs from Neo4j`);
            for (let i = 0; i < cis.length; i += batchSize) {
                const batch = cis.slice(i, i + batchSize);
                const progress = 25 + ((i / cis.length) * 40);
                await job.updateProgress(progress);
                const batchResult = await this.loadCIDimensions(batch);
                result.dimensionsCreated += batchResult.created;
                result.cisProcessed += batch.length;
            }
            result.stagesCompleted.push('load-dimensions');
            common_1.logger.info(`Loaded ${result.dimensionsCreated} CI dimensions`);
            await job.updateProgress(70);
            const relationshipResult = await this.loadRelationships(cis);
            result.relationshipsProcessed = relationshipResult.processed;
            result.factsCreated = relationshipResult.created;
            result.stagesCompleted.push('load-relationships');
            common_1.logger.info(`Loaded ${result.factsCreated} relationship facts`);
            if (data.rebuildIndexes !== false) {
                await job.updateProgress(90);
                await this.rebuildIndexes();
                result.stagesCompleted.push('rebuild-indexes');
                common_1.logger.info('Indexes rebuilt successfully');
            }
            result.durationMs = Date.now() - startTime;
            result.completedAt = new Date().toISOString();
            await job.updateProgress(100);
            common_1.logger.info('Full refresh completed successfully', result);
            return result;
        }
        catch (error) {
            common_1.logger.error('Full refresh job failed', { error, jobId: job.id });
            throw error;
        }
    }
    async truncateTables() {
        common_1.logger.info('Truncating data mart tables');
        const tables = [
            'fact_ci_relationships',
            'fact_ci_changes',
            'fact_ci_discovery',
            'dim_ci',
            'dim_date'
        ];
        await this.postgresClient.transaction(async (client) => {
            for (const table of tables) {
                try {
                    await client.query(`TRUNCATE TABLE ${table} CASCADE`);
                    common_1.logger.debug(`Truncated table: ${table}`);
                }
                catch (error) {
                    common_1.logger.warn(`Failed to truncate table ${table}`, { error });
                }
            }
        });
    }
    async extractAllCIs() {
        const session = this.neo4jClient.getSession();
        try {
            const result = await session.run(`
        MATCH (ci:CI)
        RETURN ci
        ORDER BY ci.created_at
      `);
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
    async loadCIDimensions(cis) {
        let created = 0;
        await this.postgresClient.transaction(async (client) => {
            for (const ci of cis) {
                try {
                    const dimension = this.dimensionTransformer.toDimension(ci);
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
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT DO NOTHING`, [
                            discoveryFact._ci_key,
                            discoveryFact._date_key,
                            discoveryFact._discovered_at,
                            discoveryFact._discovery_method,
                            discoveryFact._discovery_source
                        ]);
                    }
                    created++;
                }
                catch (error) {
                    common_1.logger.error('Error loading CI dimension', { ciId: ci._id, error });
                }
            }
        });
        return { created };
    }
    async loadRelationships(cis) {
        let processed = 0;
        let created = 0;
        for (const ci of cis) {
            try {
                const relationships = await this.neo4jClient.getRelationships(ci._id, 'out');
                for (const rel of relationships) {
                    try {
                        await this.postgresClient.query(`INSERT INTO fact_ci_relationships
               (from_ci_id, to_ci_id, relationship_type, created_at)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (from_ci_id, to_ci_id, relationship_type) DO NOTHING`, [ci._id, rel._ci._id, rel._type, new Date()]);
                        created++;
                    }
                    catch (error) {
                        common_1.logger.error('Error loading relationship', {
                            from: ci._id,
                            to: rel._ci._id,
                            type: rel._type,
                            error
                        });
                    }
                }
                processed++;
            }
            catch (error) {
                common_1.logger.error('Error processing CI relationships', { ciId: ci._id, error });
            }
        }
        return { processed, created };
    }
    async rebuildIndexes() {
        common_1.logger.info('Rebuilding indexes and updating statistics');
        const tables = [
            'dim_ci',
            'fact_ci_relationships',
            'fact_ci_changes',
            'fact_ci_discovery'
        ];
        await this.postgresClient.transaction(async (client) => {
            for (const table of tables) {
                try {
                    await client.query(`REINDEX TABLE ${table}`);
                    await client.query(`ANALYZE ${table}`);
                    common_1.logger.debug(`Rebuilt indexes for table: ${table}`);
                }
                catch (error) {
                    common_1.logger.warn(`Failed to rebuild indexes for ${table}`, { error });
                }
            }
        });
    }
}
exports.FullRefreshJob = FullRefreshJob;
async function processFullRefreshJob(job, neo4jClient, postgresClient) {
    const processor = new FullRefreshJob(neo4jClient, postgresClient);
    return await processor.execute(job);
}
//# sourceMappingURL=full-refresh.job.js.map