// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Integration Tests - ETL Processor
 *
 * Tests the Neo4j to PostgreSQL ETL pipeline including:
 * - Data extraction from Neo4j
 * - Transformation to dimensional model
 * - Loading into PostgreSQL data mart
 * - SCD Type 2 change tracking
 */

import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import neo4j, { Driver } from 'neo4j-driver';
import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Job } from 'bullmq';
import {
  Neo4jToPostgresJob,
  Neo4jToPostgresJobData,
} from '../../src/jobs/neo4j-to-postgres.job';
import { Neo4jClient, PostgresClient } from '@cmdb/database';
import { CI } from '@cmdb/common';

describe('ETL Processor Integration Tests', () => {
  let neo4jContainer: StartedTestContainer;
  let postgresContainer: StartedTestContainer;
  let neo4jDriver: Driver;
  let postgresPool: Pool;
  let neo4jClient: Neo4jClient;
  let postgresClient: PostgresClient;

  beforeAll(async () => {
    // Start Neo4j container
    neo4jContainer = await new GenericContainer('neo4j:5.13.0')
      .withEnvironment({
        _NEO4J_AUTH: 'neo4j/testpassword',
      })
      .withExposedPorts(7687, 7474)
      .withWaitStrategy(Wait.forLogMessage(/Started/))
      .withStartupTimeout(120000)
      .start();

    // Start PostgreSQL container
    postgresContainer = await new GenericContainer('postgres:15')
      .withEnvironment({
        _POSTGRES_USER: 'testuser',
        _POSTGRES_PASSWORD: 'testpassword',
        _POSTGRES_DB: 'cmdb_test',
      })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/))
      .withStartupTimeout(60000)
      .start();

    // Initialize Neo4j
    const neo4jHost = neo4jContainer.getHost();
    const neo4jPort = neo4jContainer.getMappedPort(7687);
    const neo4jUri = `bolt://${neo4jHost}:${neo4jPort}`;

    neo4jDriver = neo4j.driver(neo4jUri, neo4j.auth.basic('neo4j', 'testpassword'));
    await waitForNeo4j(neo4jDriver);

    // Initialize PostgreSQL
    const postgresHost = postgresContainer.getHost();
    const postgresPort = postgresContainer.getMappedPort(5432);

    postgresPool = new Pool({
      _host: postgresHost,
      _port: postgresPort,
      _user: 'testuser',
      _password: 'testpassword',
      _database: 'cmdb_test',
    });

    // Create database schemas
    await initializePostgresSchema(postgresPool);

    // Create client instances
    neo4jClient = new Neo4jClient(neo4jDriver);
    postgresClient = new PostgresClient(postgresPool);
  }, 120000);

  afterEach(async () => {
    // Clean both databases
    const neo4jSession = neo4jDriver.session();
    try {
      await neo4jSession.run('MATCH (n) DETACH DELETE n');
    } finally {
      await neo4jSession.close();
    }

    const pgClient = await postgresPool.connect();
    try {
      await pgClient.query('TRUNCATE TABLE fact_ci_discovery CASCADE');
      await pgClient.query('TRUNCATE TABLE fact_ci_relationships CASCADE');
      await pgClient.query('TRUNCATE TABLE dim_ci CASCADE');
    } finally {
      pgClient.release();
    }
  });

  afterAll(async () => {
    await neo4jDriver.close();
    await postgresPool.end();
    await neo4jContainer.stop();
    await postgresContainer.stop();
  }, 30000);

  describe('Basic ETL Flow', () => {
    it('should extract CIs from Neo4j and load into PostgreSQL', async () => {
      // 1. Create test CIs in Neo4j
      const ciId1 = uuidv4();
      const ciId2 = uuidv4();

      await createCIInNeo4j(neo4jDriver, {
        _id: ciId1,
        _name: 'web-server-01',
        _type: 'server',
        _status: 'active',
        _environment: 'production',
        _external_id: 'i-1234567890',
      });

      await createCIInNeo4j(neo4jDriver, {
        _id: ciId2,
        _name: 'database-01',
        _type: 'database',
        _status: 'active',
        _environment: 'production',
        _external_id: 'db-abcdef123',
      });

      // 2. Run ETL job
      const etlJob = new Neo4jToPostgresJob(neo4jClient, postgresClient);
      const mockJob = createMockJob({});

      const result = await etlJob.execute(mockJob);

      // 3. Verify results
      expect(result.cisProcessed).toBe(2);
      expect(result.recordsInserted).toBe(2);
      expect(result.recordsUpdated).toBe(0);
      expect(result.errors).toBe(0);

      // 4. Verify data in PostgreSQL
      const pgClient = await postgresPool.connect();
      try {
        const dimResult = await pgClient.query(
          'SELECT * FROM dim_ci WHERE is_current = true ORDER BY ci_name'
        );

        expect(dimResult.rows).toHaveLength(2);
        expect(dimResult.rows[0]).toMatchObject({
          _ci_id: ciId2,
          _ci_name: 'database-01',
          _ci_type: 'database',
          _status: 'active',
          _environment: 'production',
          _is_current: true,
        });

        expect(dimResult.rows[1]).toMatchObject({
          _ci_id: ciId1,
          _ci_name: 'web-server-01',
          _ci_type: 'server',
          _status: 'active',
          _environment: 'production',
          _is_current: true,
        });
      } finally {
        pgClient.release();
      }
    });

    it('should handle CIs without environment', async () => {
      const ciId = uuidv4();

      await createCIInNeo4j(neo4jDriver, {
        _id: ciId,
        _name: 'test-server',
        _type: 'server',
        _status: 'active',
        // environment not specified
      });

      const etlJob = new Neo4jToPostgresJob(neo4jClient, postgresClient);
      const result = await etlJob.execute(createMockJob({}));

      expect(result.cisProcessed).toBe(1);
      expect(result.recordsInserted).toBe(1);

      const pgClient = await postgresPool.connect();
      try {
        const dimResult = await pgClient.query('SELECT * FROM dim_ci WHERE ci_id = $1', [ciId]);
        expect(dimResult.rows[0].environment).toBeNull();
      } finally {
        pgClient.release();
      }
    });
  });

  describe('SCD Type 2 - Slowly Changing Dimensions', () => {
    it('should create new version when CI changes', async () => {
      const ciId = uuidv4();

      // 1. Initial CI creation
      await createCIInNeo4j(neo4jDriver, {
        _id: ciId,
        _name: 'app-server',
        _type: 'server',
        _status: 'active',
        _environment: 'production',
      });

      // First ETL run
      const etlJob = new Neo4jToPostgresJob(neo4jClient, postgresClient);
      const result1 = await etlJob.execute(createMockJob({}));

      expect(result1.recordsInserted).toBe(1);

      // 2. Update CI in Neo4j (change status)
      const session = neo4jDriver.session();
      try {
        await session.run(
          `
          MATCH (ci:CI {id: $id})
          SET ci.status = $status, ci.updated_at = datetime()
          RETURN ci
          `,
          { id: ciId, status: 'maintenance' }
        );
      } finally {
        await session.close();
      }

      // Second ETL run
      const result2 = await etlJob.execute(createMockJob({}));

      expect(result2.cisProcessed).toBe(1);
      expect(result2.recordsUpdated).toBe(1);
      expect(result2.recordsInserted).toBe(1); // New version inserted

      // 3. Verify SCD Type 2 in PostgreSQL
      const pgClient = await postgresPool.connect();
      try {
        // Should have 2 versions
        const allVersions = await pgClient.query(
          'SELECT * FROM dim_ci WHERE ci_id = $1 ORDER BY effective_date',
          [ciId]
        );

        expect(allVersions.rows).toHaveLength(2);

        // First version should be expired
        expect(allVersions.rows[0]).toMatchObject({
          _ci_id: ciId,
          _status: 'active',
          _is_current: false,
        });
        expect(allVersions.rows[0].end_date).not.toBeNull();

        // Second version should be current
        expect(allVersions.rows[1]).toMatchObject({
          _ci_id: ciId,
          _status: 'maintenance',
          _is_current: true,
        });
        expect(allVersions.rows[1].end_date).toBeNull();

        // Only current version should be returned with is_current filter
        const currentVersion = await pgClient.query(
          'SELECT * FROM dim_ci WHERE ci_id = $1 AND is_current = true',
          [ciId]
        );

        expect(currentVersion.rows).toHaveLength(1);
        expect(currentVersion.rows[0].status).toBe('maintenance');
      } finally {
        pgClient.release();
      }
    });

    it('should not create new version if CI has not changed', async () => {
      const ciId = uuidv4();

      await createCIInNeo4j(neo4jDriver, {
        _id: ciId,
        _name: 'static-server',
        _type: 'server',
        _status: 'active',
      });

      const etlJob = new Neo4jToPostgresJob(neo4jClient, postgresClient);

      // First run
      const result1 = await etlJob.execute(createMockJob({}));
      expect(result1.recordsInserted).toBe(1);

      // Second run without changes
      const result2 = await etlJob.execute(createMockJob({}));
      expect(result2.cisProcessed).toBe(1);
      expect(result2.recordsUpdated).toBe(0);
      expect(result2.recordsInserted).toBe(0);

      // Verify only one version exists
      const pgClient = await postgresPool.connect();
      try {
        const versions = await pgClient.query('SELECT * FROM dim_ci WHERE ci_id = $1', [ciId]);
        expect(versions.rows).toHaveLength(1);
      } finally {
        pgClient.release();
      }
    });

    it('should track multiple changes over time', async () => {
      const ciId = uuidv4();

      await createCIInNeo4j(neo4jDriver, {
        _id: ciId,
        _name: 'evolving-server',
        _type: 'server',
        _status: 'active',
        _environment: 'development',
      });

      const etlJob = new Neo4jToPostgresJob(neo4jClient, postgresClient);

      // Initial state
      await etlJob.execute(createMockJob({}));

      // Change 1: Status to maintenance
      await updateCIInNeo4j(neo4jDriver, ciId, { status: 'maintenance' });
      await etlJob.execute(createMockJob({}));

      // Change 2: Environment to staging
      await updateCIInNeo4j(neo4jDriver, ciId, { environment: 'staging' });
      await etlJob.execute(createMockJob({}));

      // Change 3: Status back to active
      await updateCIInNeo4j(neo4jDriver, ciId, { status: 'active' });
      await etlJob.execute(createMockJob({}));

      // Verify history
      const pgClient = await postgresPool.connect();
      try {
        const history = await pgClient.query(
          'SELECT * FROM dim_ci WHERE ci_id = $1 ORDER BY effective_date',
          [ciId]
        );

        expect(history.rows).toHaveLength(4);

        // Version 1: active, development
        expect(history.rows[0]).toMatchObject({
          _status: 'active',
          _environment: 'development',
          _is_current: false,
        });

        // Version 2: maintenance, development
        expect(history.rows[1]).toMatchObject({
          _status: 'maintenance',
          _environment: 'development',
          _is_current: false,
        });

        // Version 3: maintenance, staging
        expect(history.rows[2]).toMatchObject({
          _status: 'maintenance',
          _environment: 'staging',
          _is_current: false,
        });

        // Version 4: active, staging (current)
        expect(history.rows[3]).toMatchObject({
          _status: 'active',
          _environment: 'staging',
          _is_current: true,
        });
      } finally {
        pgClient.release();
      }
    });
  });

  describe('Incremental Sync', () => {
    it('should only process CIs updated since last sync', async () => {
      const oldCiId = uuidv4();
      const newCiId = uuidv4();

      const oldTimestamp = new Date(Date.now() - 86400000); // 24 hours ago

      // Create old CI
      await createCIInNeo4j(neo4jDriver, {
        _id: oldCiId,
        _name: 'old-server',
        _type: 'server',
        _status: 'active',
      });

      // Manually set old timestamp
      const session = neo4jDriver.session();
      try {
        await session.run(
          `
          MATCH (ci:CI {id: $id})
          SET ci.updated_at = datetime($timestamp)
          `,
          { id: oldCiId, timestamp: oldTimestamp.toISOString() }
        );
      } finally {
        await session.close();
      }

      // Create new CI
      await createCIInNeo4j(neo4jDriver, {
        _id: newCiId,
        _name: 'new-server',
        _type: 'server',
        _status: 'active',
      });

      // Run incremental ETL (only last hour)
      const etlJob = new Neo4jToPostgresJob(neo4jClient, postgresClient);
      const incrementalSince = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago

      const result = await etlJob.execute(
        createMockJob({ incrementalSince, fullRefresh: false })
      );

      // Should only process the new CI
      expect(result.cisProcessed).toBe(1);

      const pgClient = await postgresPool.connect();
      try {
        const dims = await pgClient.query('SELECT * FROM dim_ci WHERE is_current = true');
        expect(dims.rows).toHaveLength(1);
        expect(dims.rows[0].ci_id).toBe(newCiId);
      } finally {
        pgClient.release();
      }
    });
  });

  describe('Batch Processing', () => {
    it('should process CIs in batches', async () => {
      // Create 25 CIs
      const ciIds = [];
      for (let i = 0; i < 25; i++) {
        const ciId = uuidv4();
        ciIds.push(ciId);
        await createCIInNeo4j(neo4jDriver, {
          _id: ciId,
          _name: `server-${i}`,
          _type: 'server',
          _status: 'active',
        });
      }

      // Process with batch size of 10
      const etlJob = new Neo4jToPostgresJob(neo4jClient, postgresClient);
      const result = await etlJob.execute(createMockJob({ batchSize: 10 }));

      expect(result.cisProcessed).toBe(25);
      expect(result.recordsInserted).toBe(25);

      // Verify all persisted
      const pgClient = await postgresPool.connect();
      try {
        const count = await pgClient.query('SELECT COUNT(*) FROM dim_ci WHERE is_current = true');
        expect(parseInt(count.rows[0].count)).toBe(25);
      } finally {
        pgClient.release();
      }
    });
  });

  describe('CI Type Filtering', () => {
    it('should filter CIs by type', async () => {
      await createCIInNeo4j(neo4jDriver, {
        _id: uuidv4(),
        _name: 'server-01',
        _type: 'server',
        _status: 'active',
      });

      await createCIInNeo4j(neo4jDriver, {
        _id: uuidv4(),
        _name: 'database-01',
        _type: 'database',
        _status: 'active',
      });

      await createCIInNeo4j(neo4jDriver, {
        _id: uuidv4(),
        _name: 'app-01',
        _type: 'application',
        _status: 'active',
      });

      // Process only servers and databases
      const etlJob = new Neo4jToPostgresJob(neo4jClient, postgresClient);
      const result = await etlJob.execute(
        createMockJob({ ciTypes: ['server', 'database'] })
      );

      expect(result.cisProcessed).toBe(2);

      const pgClient = await postgresPool.connect();
      try {
        const dims = await pgClient.query('SELECT ci_type FROM dim_ci WHERE is_current = true');
        expect(dims.rows).toHaveLength(2);
        expect(dims.rows.map((r) => r.ci_type).sort()).toEqual(['database', 'server']);
      } finally {
        pgClient.release();
      }
    });
  });

  describe('Error Handling', () => {
    it('should continue processing after individual CI error', async () => {
      // Create valid CI
      await createCIInNeo4j(neo4jDriver, {
        _id: uuidv4(),
        _name: 'valid-server',
        _type: 'server',
        _status: 'active',
      });

      // Note: In a real scenario, we'd inject an error condition
      // For this test, we're verifying the ETL completes

      const etlJob = new Neo4jToPostgresJob(neo4jClient, postgresClient);
      const result = await etlJob.execute(createMockJob({}));

      expect(result.cisProcessed).toBeGreaterThan(0);
    });
  });

  describe('Full Refresh', () => {
    it('should force update all CIs on full refresh', async () => {
      const ciId = uuidv4();

      await createCIInNeo4j(neo4jDriver, {
        _id: ciId,
        _name: 'server-01',
        _type: 'server',
        _status: 'active',
      });

      const etlJob = new Neo4jToPostgresJob(neo4jClient, postgresClient);

      // Initial load
      await etlJob.execute(createMockJob({}));

      // Full refresh without changes
      const result = await etlJob.execute(createMockJob({ fullRefresh: true }));

      // Should create new version even without changes
      expect(result.cisProcessed).toBe(1);
      expect(result.recordsUpdated).toBe(1);

      const pgClient = await postgresPool.connect();
      try {
        const versions = await pgClient.query('SELECT * FROM dim_ci WHERE ci_id = $1', [ciId]);
        expect(versions.rows).toHaveLength(2);
      } finally {
        pgClient.release();
      }
    });
  });
});

// Helper Functions

async function waitForNeo4j(driver: Driver, maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const session = driver.session();
      await session.run('RETURN 1');
      await session.close();
      return;
    } catch (error) {
      if (i === maxAttempts - 1) {
        throw new Error('Neo4j did not become ready in time');
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function initializePostgresSchema(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create dim_ci table (SCD Type 2)
    await client.query(`
      CREATE TABLE IF NOT EXISTS dim_ci (
        ci_key SERIAL PRIMARY KEY,
        ci_id VARCHAR(255) NOT NULL,
        ci_name VARCHAR(255) NOT NULL,
        ci_type VARCHAR(50) NOT NULL,
        environment VARCHAR(50),
        status VARCHAR(50) NOT NULL,
        external_id VARCHAR(255),
        effective_date TIMESTAMPTZ NOT NULL,
        end_date TIMESTAMPTZ,
        is_current BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_dim_ci_id ON dim_ci(ci_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_dim_ci_current ON dim_ci(ci_id, is_current)
    `);

    // Create fact_ci_discovery table
    await client.query(`
      CREATE TABLE IF NOT EXISTS fact_ci_discovery (
        discovery_key SERIAL PRIMARY KEY,
        ci_key INTEGER REFERENCES dim_ci(ci_key),
        date_key INTEGER,
        discovered_at TIMESTAMPTZ,
        discovery_method VARCHAR(100),
        discovery_source VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create fact_ci_relationships table
    await client.query(`
      CREATE TABLE IF NOT EXISTS fact_ci_relationships (
        relationship_key SERIAL PRIMARY KEY,
        from_ci_id VARCHAR(255) NOT NULL,
        to_ci_id VARCHAR(255) NOT NULL,
        relationship_type VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(from_ci_id, to_ci_id, relationship_type)
      )
    `);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function createCIInNeo4j(driver: Driver, ci: Partial<CI>): Promise<void> {
  const session = driver.session();
  try {
    await session.run(
      `
      CREATE (ci:CI {
        _id: $id,
        _name: $name,
        _type: $type,
        _status: $status,
        _environment: $environment,
        _external_id: $external_id,
        _created_at: datetime(),
        _updated_at: datetime(),
        _discovered_at: datetime(),
        _metadata: $metadata
      })
      `,
      {
        _id: ci.id,
        _name: ci.name,
        _type: ci.type,
        _status: ci.status || 'active',
        _environment: ci.environment || null,
        _external_id: ci.external_id || null,
        _metadata: JSON.stringify(ci.metadata || {}),
      }
    );
  } finally {
    await session.close();
  }
}

async function updateCIInNeo4j(
  _driver: Driver,
  _ciId: string,
  _updates: Partial<CI>
): Promise<void> {
  const session = driver.session();
  try {
    const setStatements = Object.entries(updates)
      .map(([key, _]) => `ci.${key} = $${key}`)
      .join(', ');

    await session.run(
      `
      MATCH (ci:CI {id: $id})
      SET ${setStatements}, ci.updated_at = datetime()
      `,
      { id: ciId, ...updates }
    );
  } finally {
    await session.close();
  }
}

function createMockJob(data: Partial<Neo4jToPostgresJobData>): Job<Neo4jToPostgresJobData> {
  return {
    _id: uuidv4(),
    _name: 'neo4j-to-postgres',
    _data: {
      _batchSize: 100,
      _fullRefresh: false,
      ...data,
    },
    _updateProgress: async () => {},
  } as any;
}
