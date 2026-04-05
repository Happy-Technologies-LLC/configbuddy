// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
exports.getMigrationStatus = getMigrationStatus;
const tslib_1 = require("tslib");
const common_1 = require("@cmdb/common");
const fs = tslib_1.__importStar(require("fs"));
const path = tslib_1.__importStar(require("path"));
const crypto = tslib_1.__importStar(require("crypto"));
async function runMigrations(client, migrationsDir) {
    try {
        await ensureMigrationsTable(client);
        const migrationFiles = discoverMigrations(migrationsDir);
        if (migrationFiles.length === 0) {
            common_1.logger.info('No migration files found');
            return;
        }
        common_1.logger.info(`Found ${migrationFiles.length} migration files`);
        const appliedMigrations = await getAppliedMigrations(client);
        const appliedMap = new Map(appliedMigrations.map((m) => [m.migration_name, m.checksum]));
        let executedCount = 0;
        for (const migrationFile of migrationFiles) {
            const migrationName = path.basename(migrationFile);
            const migrationSQL = fs.readFileSync(migrationFile, 'utf-8');
            const checksum = calculateChecksum(migrationSQL);
            if (appliedMap.has(migrationName)) {
                const existingChecksum = appliedMap.get(migrationName);
                if (existingChecksum !== checksum) {
                    throw new Error(`Migration checksum mismatch for ${migrationName}. ` +
                        `Migration file has been modified after being applied. ` +
                        `This is not allowed. Expected: ${existingChecksum}, Got: ${checksum}`);
                }
                common_1.logger.debug(`Skipping already applied migration: ${migrationName}`);
                continue;
            }
            common_1.logger.info(`Executing migration: ${migrationName}`);
            await executeMigration(client, migrationName, migrationSQL, checksum);
            executedCount++;
            common_1.logger.info(`Migration completed: ${migrationName}`);
        }
        if (executedCount === 0) {
            common_1.logger.info('All migrations already applied - database is up to date');
        }
        else {
            common_1.logger.info(`Successfully executed ${executedCount} migrations`);
        }
    }
    catch (error) {
        common_1.logger.error('Migration failed', error);
        throw error;
    }
}
async function getMigrationStatus(client, migrationsDir) {
    await ensureMigrationsTable(client);
    const migrationFiles = discoverMigrations(migrationsDir);
    const appliedMigrations = await getAppliedMigrations(client);
    const appliedMap = new Map(appliedMigrations.map((m) => [m.migration_name, m.applied_at]));
    return migrationFiles.map((file) => {
        const name = path.basename(file);
        const applied = appliedMap.has(name);
        const appliedAt = appliedMap.get(name) || null;
        return {
            _name: name,
            _applied: applied,
            _appliedAt: appliedAt,
        };
    });
}
async function ensureMigrationsTable(client) {
    const createTableSQL = `
    CREATE SCHEMA IF NOT EXISTS cmdb;

    CREATE TABLE IF NOT EXISTS cmdb.schema_migrations (
      migration_name VARCHAR(255) PRIMARY KEY,
      checksum VARCHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at
    ON cmdb.schema_migrations(applied_at);
  `;
    await client.query(createTableSQL);
}
function discoverMigrations(migrationsDir) {
    const defaultDir = path.resolve(__dirname, 'migrations');
    const dir = migrationsDir || defaultDir;
    if (!fs.existsSync(dir)) {
        throw new Error(`Migrations directory not found at: ${dir}`);
    }
    const files = fs.readdirSync(dir);
    const migrationFiles = files
        .filter((file) => file.endsWith('.sql'))
        .sort()
        .map((file) => path.join(dir, file));
    return migrationFiles;
}
async function getAppliedMigrations(client) {
    const result = await client.query(`
    SELECT migration_name, checksum, applied_at
    FROM cmdb.schema_migrations
    ORDER BY applied_at ASC
  `);
    return result.rows;
}
async function executeMigration(client, migrationName, migrationSQL, checksum) {
    await client.transaction(async (txClient) => {
        await txClient.query(migrationSQL);
        await txClient.query(`
      INSERT INTO cmdb.schema_migrations (migration_name, checksum)
      VALUES ($1, $2)
      `, [migrationName, checksum]);
    });
}
function calculateChecksum(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}
//# sourceMappingURL=migrator.js.map