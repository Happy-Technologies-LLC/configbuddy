// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Neo4jClient = void 0;
exports.getNeo4jClient = getNeo4jClient;
const tslib_1 = require("tslib");
const neo4j_driver_1 = tslib_1.__importDefault(require("neo4j-driver"));
const common_1 = require("@cmdb/common");
const fs = tslib_1.__importStar(require("fs"));
const path = tslib_1.__importStar(require("path"));
class Neo4jClient {
    driver;
    constructor(uri, username, password, config) {
        const sslEnabled = process.env['NEO4J_SSL_ENABLED'] === 'true' ||
            process.env['NEO4J_ENCRYPTION'] === 'true' ||
            config?.encrypted === true;
        const trustStrategy = config?.trust ||
            process.env['NEO4J_SSL_TRUST_STRATEGY'] ||
            'TRUST_SYSTEM_CA_SIGNED_CERTIFICATES';
        this.driver = neo4j_driver_1.default.driver(uri, neo4j_driver_1.default.auth.basic(username, password), {
            maxConnectionLifetime: 3 * 60 * 60 * 1000,
            maxConnectionPoolSize: 50,
            connectionAcquisitionTimeout: 2 * 60 * 1000,
            encrypted: sslEnabled ? 'ENCRYPTION_ON' : 'ENCRYPTION_OFF',
            trust: trustStrategy,
        });
        if (sslEnabled) {
            common_1.logger.info('Neo4j client initialized with SSL/TLS encryption enabled');
        }
        else {
            common_1.logger.warn('Neo4j client initialized WITHOUT encryption (development mode)');
        }
    }
    async verifyConnectivity() {
        const session = this.driver.session();
        try {
            await session.run('RETURN 1');
            common_1.logger.info('Neo4j connection verified');
        }
        finally {
            await session.close();
        }
    }
    async initializeSchema(schemaFilePath) {
        const session = this.driver.session();
        try {
            const defaultSchemaPath = path.resolve(__dirname, '../../../../infrastructure/scripts/init-neo4j.cypher');
            const filePath = schemaFilePath || defaultSchemaPath;
            if (!fs.existsSync(filePath)) {
                throw new Error(`Schema file not found at: ${filePath}`);
            }
            const cypherScript = fs.readFileSync(filePath, 'utf-8');
            const statements = cypherScript
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => {
                const lines = stmt.split('\n').filter(line => {
                    const trimmed = line.trim();
                    return trimmed && !trimmed.startsWith('//');
                });
                return lines.length > 0;
            });
            common_1.logger.info(`Initializing Neo4j schema from: ${filePath}`);
            common_1.logger.info(`Executing ${statements.length} statements...`);
            let successCount = 0;
            let skipCount = 0;
            for (const statement of statements) {
                if (!statement)
                    continue;
                try {
                    await session.run(statement);
                    successCount++;
                    if (statement.includes('CREATE CONSTRAINT')) {
                        const match = statement.match(/FOR \((\w+):(\w+)\)/);
                        if (match) {
                            common_1.logger.info(`Created constraint for :${match[2]}`);
                        }
                    }
                    else if (statement.includes('CREATE INDEX')) {
                        const match = statement.match(/FOR \((\w+):(\w+)\)/);
                        if (match) {
                            common_1.logger.info(`Created index for :${match[2]}`);
                        }
                    }
                    else if (statement.includes('CREATE FULLTEXT INDEX')) {
                        common_1.logger.info('Created full-text search index');
                    }
                }
                catch (error) {
                    if (error.message && error.message.includes('already exists')) {
                        skipCount++;
                    }
                    else {
                        common_1.logger.error(`Failed to execute statement: ${statement.substring(0, 100)}...`);
                        throw error;
                    }
                }
            }
            common_1.logger.info(`Schema initialization complete: ${successCount} statements executed, ${skipCount} skipped (already exist)`);
            const constraints = await session.run('SHOW CONSTRAINTS');
            const indexes = await session.run('SHOW INDEXES');
            common_1.logger.info(`Total constraints: ${constraints.records.length}`);
            common_1.logger.info(`Total indexes: ${indexes.records.length}`);
        }
        catch (error) {
            common_1.logger.error('Failed to initialize Neo4j schema', error);
            throw error;
        }
        finally {
            await session.close();
        }
    }
    getSession(database = 'neo4j') {
        return this.driver.session({ database });
    }
    async close() {
        await this.driver.close();
    }
    async createCI(ci) {
        const session = this.getSession();
        try {
            const ciId = ci.id || ci._id;
            const ciType = ci.type || ci._type;
            const sanitizedType = (0, common_1.sanitizeCITypeForLabel)(ciType);
            const result = await session.run(`
        CREATE (ci:CI:${sanitizedType} {
          id: $id,
          external_id: $external_id,
          name: $name,
          type: $type,
          status: $status,
          environment: $environment,
          created_at: datetime(),
          updated_at: datetime(),
          discovered_at: datetime($discovered_at),
          discovery_provider: $discovery_provider,
          metadata: $metadata
        })
        RETURN ci
        `, {
                id: ciId,
                external_id: ci.external_id,
                name: ci.name,
                type: ciType,
                status: ci.status || 'active',
                environment: ci.environment || 'development',
                discovered_at: ci.discovered_at || new Date().toISOString(),
                discovery_provider: ci.discovery_provider || null,
                metadata: JSON.stringify(ci.metadata || {}),
            });
            return this.recordToCI(result.records[0].get('ci'));
        }
        finally {
            await session.close();
        }
    }
    async updateCI(id, updates) {
        const session = this.getSession();
        try {
            const processedUpdates = {};
            for (const [key, value] of Object.entries(updates)) {
                const cleanKey = key.startsWith('_') ? key.substring(1) : key;
                if (value === undefined || value === null) {
                    continue;
                }
                if (cleanKey === 'metadata') {
                    processedUpdates[cleanKey] = JSON.stringify(value);
                }
                else if (typeof value === 'object' && value !== null) {
                    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
                        processedUpdates[cleanKey] = JSON.stringify(value);
                    }
                    else if (!Array.isArray(value)) {
                        processedUpdates[cleanKey] = JSON.stringify(value);
                    }
                    else {
                        processedUpdates[cleanKey] = value;
                    }
                }
                else {
                    processedUpdates[cleanKey] = value;
                }
            }
            const result = await session.run(`
        MATCH (ci:CI {id: $id})
        SET ci += $updates,
            ci.updated_at = datetime()
        RETURN ci
        `, { id, updates: processedUpdates });
            if (result.records.length === 0) {
                throw new Error(`CI not found: ${id}`);
            }
            return this.recordToCI(result.records[0].get('ci'));
        }
        finally {
            await session.close();
        }
    }
    async getCI(id) {
        const session = this.getSession();
        try {
            const result = await session.run('MATCH (ci:CI {id: $id}) RETURN ci', { id });
            if (result.records.length === 0) {
                return null;
            }
            return this.recordToCI(result.records[0].get('ci'));
        }
        finally {
            await session.close();
        }
    }
    async createRelationship(fromId, toId, type, properties = {}) {
        const session = this.getSession();
        try {
            const validatedType = (0, common_1.validateRelationshipType)(type);
            await session.run(`
        MATCH (from:CI {id: $fromId})
        MATCH (to:CI {id: $toId})
        MERGE (from)-[r:${validatedType}]->(to)
        SET r += $properties,
            r.created_at = coalesce(r.created_at, datetime()),
            r.updated_at = datetime()
        `, { fromId, toId, properties });
        }
        finally {
            await session.close();
        }
    }
    async getRelationships(ciId, direction = 'both', depth = 1) {
        const session = this.getSession();
        try {
            const queries = [];
            if (direction === 'out' || direction === 'both') {
                queries.push({
                    query: `
            MATCH path = (ci:CI {id: $ciId})-[r*1..${depth}]->(related:CI)
            WITH ci, related, relationships(path) as rels
            UNWIND rels as r
            RETURN DISTINCT type(r) as type, related, r as relationship,
                   startNode(r).id as startNodeId, endNode(r).id as endNodeId,
                   'outgoing' as queryDirection
          `,
                    params: { ciId }
                });
            }
            if (direction === 'in' || direction === 'both') {
                queries.push({
                    query: `
            MATCH path = (ci:CI {id: $ciId})<-[r*1..${depth}]-(related:CI)
            WITH ci, related, relationships(path) as rels
            UNWIND rels as r
            RETURN DISTINCT type(r) as type, related, r as relationship,
                   startNode(r).id as startNodeId, endNode(r).id as endNodeId,
                   'incoming' as queryDirection
          `,
                    params: { ciId }
                });
            }
            const allRelationships = [];
            for (const { query, params } of queries) {
                const result = await session.run(query, params);
                const rels = result.records.map(record => ({
                    _type: record.get('type'),
                    _ci: this.recordToCI(record.get('related')),
                    _properties: record.get('relationship').properties,
                    _startNodeId: record.get('startNodeId'),
                    _endNodeId: record.get('endNodeId'),
                }));
                allRelationships.push(...rels);
            }
            const seen = new Set();
            return allRelationships.filter(rel => {
                const key = `${rel._type}-${rel._startNodeId}-${rel._endNodeId}`;
                if (seen.has(key))
                    return false;
                seen.add(key);
                return true;
            });
        }
        finally {
            await session.close();
        }
    }
    async getDependencies(ciId, depth = 5) {
        const session = this.getSession();
        try {
            const result = await session.run(`
        MATCH path = (ci:CI {id: $ciId})-[:DEPENDS_ON*1..${depth}]->(dep:CI)
        RETURN path
        `, { ciId });
            return result.records.map(record => record.get('path'));
        }
        finally {
            await session.close();
        }
    }
    async impactAnalysis(ciId, depth = 5) {
        const session = this.getSession();
        try {
            const result = await session.run(`
        MATCH path = (ci:CI {id: $ciId})<-[:DEPENDS_ON*1..${depth}]-(impacted:CI)
        RETURN DISTINCT impacted, length(path) as distance
        ORDER BY distance
        `, { ciId });
            return result.records.map(record => ({
                _ci: this.recordToCI(record.get('impacted')),
                _distance: record.get('distance').toNumber(),
            }));
        }
        finally {
            await session.close();
        }
    }
    recordToCI(node) {
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
            _metadata: props.metadata ? JSON.parse(props.metadata) : {},
        };
    }
}
exports.Neo4jClient = Neo4jClient;
let neo4jClient = null;
function getNeo4jClient() {
    if (!neo4jClient) {
        neo4jClient = new Neo4jClient(process.env['NEO4J_URI'] || 'bolt://localhost:7687', process.env['NEO4J_USERNAME'] || 'neo4j', process.env['NEO4J_PASSWORD'] || 'password');
    }
    return neo4jClient;
}
//# sourceMappingURL=client.js.map