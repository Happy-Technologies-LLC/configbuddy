"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresClient = void 0;
exports.getPostgresClient = getPostgresClient;
const pg_1 = require("pg");
const common_1 = require("@cmdb/common");
class PostgresClient {
    pool;
    constructor(config) {
        this.pool = new pg_1.Pool({
            host: config._host,
            port: config._port,
            database: config._database,
            user: config._user,
            password: config._password,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        this.pool.on('error', (err) => {
            common_1.logger.error('Unexpected error on idle PostgreSQL client', err);
        });
    }
    async query(text, params) {
        const start = Date.now();
        try {
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            common_1.logger.debug('Executed query', { text, duration, rows: result.rowCount });
            return result;
        }
        catch (error) {
            common_1.logger.error('Query error', { text, error });
            throw error;
        }
    }
    async getClient() {
        return await this.pool.connect();
    }
    async transaction(callback) {
        const client = await this.getClient();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async close() {
        await this.pool.end();
    }
    async insertCIDimension(ci) {
        const result = await this.query(`
      INSERT INTO cmdb.dim_ci (
        ci_id, ci_name, ci_type, ci_status, environment,
        external_id, metadata, effective_from, is_current
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
      RETURNING ci_key
      `, [
            ci.ci_id,
            ci.ciname,
            ci.ci_type,
            ci.ci_status,
            ci.environment || null,
            ci.external_id || null,
            ci.metadata ? JSON.stringify(ci.metadata) : null,
            ci.effective_from || new Date(),
        ]);
        return result.rows[0].ci_key;
    }
    async updateCIDimension(ci) {
        return await this.transaction(async (client) => {
            const now = new Date();
            await client.query(`
        UPDATE cmdb.dim_ci
        SET effective_to = $1, is_current = FALSE
        WHERE ci_id = $2 AND is_current = TRUE
        `, [now, ci.ci_id]);
            const result = await client.query(`
        INSERT INTO cmdb.dim_ci (
          ci_id, ci_name, ci_type, ci_status, environment,
          external_id, metadata, effective_from, is_current
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
        RETURNING ci_key
        `, [
                ci.ci_id,
                ci.ciname,
                ci.ci_type,
                ci.ci_status,
                ci.environment || null,
                ci.external_id || null,
                ci.metadata ? JSON.stringify(ci.metadata) : null,
                now,
            ]);
            return result.rows[0].ci_key;
        });
    }
    async upsertCIDimension(ci) {
        const existing = await this.query(`
      SELECT ci_key FROM cmdb.dim_ci
      WHERE ci_id = $1 AND is_current = TRUE
      `, [ci.ci_id]);
        if (existing.rows.length > 0) {
            return await this.updateCIDimension(ci);
        }
        else {
            return await this.insertCIDimension(ci);
        }
    }
    async getCurrentCIKey(ciId) {
        const result = await this.query(`
      SELECT ci_key FROM cmdb.dim_ci
      WHERE ci_id = $1 AND is_current = TRUE
      `, [ciId]);
        return result.rows.length > 0 ? result.rows[0].ci_key : null;
    }
    async insertLocationDimension(location) {
        const result = await this.query(`
      INSERT INTO cmdb.dim_location (
        location_id, location_name, location_type, cloud_provider,
        region, country, city, latitude, longitude, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (location_id) DO UPDATE
      SET location_name = EXCLUDED.location_name,
          updated_at = CURRENT_TIMESTAMP
      RETURNING location_key
      `, [
            location.location_id,
            location.locationname,
            location.location_type,
            location.cloud_provider || null,
            location.region || null,
            location.country || null,
            location.city || null,
            location.latitude || null,
            location.longitude || null,
            location.metadata ? JSON.stringify(location.metadata) : null,
        ]);
        return result.rows[0].location_key;
    }
    async getLocationKey(locationId) {
        const result = await this.query(`
      SELECT location_key FROM cmdb.dim_location
      WHERE location_id = $1
      `, [locationId]);
        return result.rows.length > 0 ? result.rows[0].location_key : null;
    }
    async insertOwnerDimension(owner) {
        const result = await this.query(`
      INSERT INTO cmdb.dim_owner (
        owner_id, owner_name, owner_type, email,
        department, cost_center, manager_id, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (owner_id) DO UPDATE
      SET owner_name = EXCLUDED.owner_name,
          email = EXCLUDED.email,
          updated_at = CURRENT_TIMESTAMP
      RETURNING owner_key
      `, [
            owner.owner_id,
            owner.ownername,
            owner.owner_type,
            owner.email || null,
            owner.department || null,
            owner.cost_center || null,
            owner.manager_id || null,
            owner.metadata ? JSON.stringify(owner.metadata) : null,
        ]);
        return result.rows[0].owner_key;
    }
    async getDateKey(timestamp) {
        const result = await this.query(`SELECT cmdb.get_date_key($1::TIMESTAMPTZ) AS date_key`, [timestamp]);
        return result.rows[0].date_key;
    }
    async insertDiscoveryFact(fact) {
        await this.query(`
      INSERT INTO cmdb.fact_discovery (
        ci_key, location_key, date_key, discovered_at,
        discovery_job_id, discovery_provider, discovery_method,
        confidence_score, discovery_duration_ms
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
            fact.ci_key,
            fact.location_key || null,
            fact.date_key,
            fact.discovered_at,
            fact.discovery_job_id,
            fact.discovery_provider,
            fact.discoverymethod,
            fact.confidence_score || null,
            fact.discovery_duration_ms || null,
        ]);
    }
    async insertChangesFact(change) {
        await this.query(`
      INSERT INTO cmdb.fact_ci_changes (
        ci_key, date_key, changed_at, change_type,
        field_name, old_value, new_value, changed_by,
        change_source, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
            change.ci_key,
            change.date_key,
            change.changed_at,
            change.change_type,
            change.field_name || null,
            change.old_value || null,
            change.new_value || null,
            change.changed_by || null,
            change.change_source || 'discovery',
            change.metadata ? JSON.stringify(change.metadata) : null,
        ]);
    }
    async insertRelationshipFact(relationship) {
        await this.query(`
      INSERT INTO cmdb.fact_ci_relationships (
        from_ci_key, to_ci_key, date_key, relationship_type,
        relationship_strength, discovered_at, last_verified_at,
        is_active, properties
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
            relationship.from_ci_key,
            relationship.to_ci_key,
            relationship.date_key,
            relationship.relationship_type,
            relationship.relationship_strength || null,
            relationship.discovered_at,
            relationship.last_verified_at || null,
            relationship.is_active !== undefined ? relationship.is_active : true,
            relationship.properties ? JSON.stringify(relationship.properties) : null,
        ]);
    }
    async deactivateRelationship(fromCiKey, toCiKey, relationshipType) {
        await this.query(`
      UPDATE cmdb.fact_ci_relationships
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE from_ci_key = $1 AND to_ci_key = $2 AND relationship_type = $3 AND is_active = TRUE
      `, [fromCiKey, toCiKey, relationshipType]);
    }
    async getCurrentInventory() {
        const result = await this.query('SELECT * FROM cmdb.v_current_ci_inventory');
        return result.rows;
    }
    async getDiscoverySummary(ciId) {
        if (ciId) {
            const result = await this.query('SELECT * FROM cmdb.v_ci_discovery_summary WHERE ci_id = $1', [ciId]);
            return result.rows;
        }
        else {
            const result = await this.query('SELECT * FROM cmdb.v_ci_discovery_summary');
            return result.rows;
        }
    }
    async getChangeHistory(ciId, limit = 100) {
        if (ciId) {
            const result = await this.query(`
        SELECT * FROM cmdb.v_ci_change_history
        WHERE ci_id = $1
        ORDER BY changed_at DESC
        LIMIT $2
        `, [ciId, limit]);
            return result.rows;
        }
        else {
            const result = await this.query(`
        SELECT * FROM cmdb.v_ci_change_history
        ORDER BY changed_at DESC
        LIMIT $1
        `, [limit]);
            return result.rows;
        }
    }
    async getCIRelationships(ciId) {
        const result = await this.query(`
      SELECT * FROM cmdb.v_ci_relationships
      WHERE from_ci_id = $1 OR to_ci_id = $1
      `, [ciId]);
        return result.rows;
    }
}
exports.PostgresClient = PostgresClient;
let postgresClient = null;
function getPostgresClient() {
    if (!postgresClient) {
        postgresClient = new PostgresClient({
            _host: process.env['POSTGRES_HOST'] || 'localhost',
            _port: parseInt(process.env['POSTGRES_PORT'] || '5432'),
            _database: process.env['POSTGRES_DB'] || 'cmdb_datamart',
            _user: process.env['POSTGRES_USER'] || 'postgres',
            _password: process.env['POSTGRES_PASSWORD'] || 'password',
        });
    }
    return postgresClient;
}
//# sourceMappingURL=client.js.map