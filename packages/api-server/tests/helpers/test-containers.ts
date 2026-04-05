// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Test Containers Setup
 *
 * Provides testcontainers setup for Neo4j and PostgreSQL for integration testing.
 * Uses singleton pattern to ensure containers are shared across test suites.
 */

import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import neo4j, { Driver, Session } from 'neo4j-driver';
import { Pool } from 'pg';

export interface TestDatabaseContext {
  _neo4jContainer: StartedTestContainer;
  _postgresContainer: StartedTestContainer;
  _neo4jDriver: Driver;
  _postgresPool: Pool;
  _neo4jUri: string;
  _postgresUri: string;
}

let testContext: TestDatabaseContext | null = null;

/**
 * Start test containers for Neo4j and PostgreSQL
 */
export async function startTestContainers(): Promise<TestDatabaseContext> {
  if (testContext) {
    return testContext;
  }

  console.log('Starting test containers...');

  // Start Neo4j container
  const neo4jContainer = await new GenericContainer('neo4j:5.13.0')
    .withEnvironment({
      _NEO4J_AUTH: 'neo4j/testpassword',
      _NEO4J_PLUGINS: '["apoc"]',
      _NEO4J_dbms_security_procedures_unrestricted: 'apoc.*',
    })
    .withExposedPorts(7687, 7474)
    .withWaitStrategy(Wait.forLogMessage(/Started/))
    .withStartupTimeout(120000)
    .start();

  // Start PostgreSQL container with TimescaleDB
  const postgresContainer = await new GenericContainer('timescale/timescaledb:latest-pg15')
    .withEnvironment({
      _POSTGRES_USER: 'testuser',
      _POSTGRES_PASSWORD: 'testpassword',
      _POSTGRES_DB: 'cmdb_test',
    })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/))
    .withStartupTimeout(60000)
    .start();

  const neo4jHost = neo4jContainer.getHost();
  const neo4jPort = neo4jContainer.getMappedPort(7687);
  const neo4jUri = `bolt://${neo4jHost}:${neo4jPort}`;

  const postgresHost = postgresContainer.getHost();
  const postgresPort = postgresContainer.getMappedPort(5432);
  const postgresUri = `postgresql://testuser:testpassword@${postgresHost}:${postgresPort}/cmdb_test`;

  // Create Neo4j driver
  const neo4jDriver = neo4j.driver(neo4jUri, neo4j.auth.basic('neo4j', 'testpassword'));

  // Wait for Neo4j to be ready
  await waitForNeo4j(neo4jDriver);

  // Create PostgreSQL pool
  const postgresPool = new Pool({
    _host: postgresHost,
    _port: postgresPort,
    _user: 'testuser',
    _password: 'testpassword',
    _database: 'cmdb_test',
  });

  // Initialize database schemas
  await initializeNeo4jSchema(neo4jDriver);
  await initializePostgresSchema(postgresPool);

  testContext = {
    neo4jContainer,
    postgresContainer,
    neo4jDriver,
    postgresPool,
    neo4jUri,
    postgresUri,
  };

  console.log('Test containers started successfully');
  return testContext;
}

/**
 * Stop test containers and clean up resources
 */
export async function stopTestContainers(): Promise<void> {
  if (!testContext) {
    return;
  }

  console.log('Stopping test containers...');

  await testContext.neo4jDriver.close();
  await testContext.postgresPool.end();
  await testContext.neo4jContainer.stop();
  await testContext.postgresContainer.stop();

  testContext = null;
  console.log('Test containers stopped');
}

/**
 * Clean all data from databases between tests
 */
export async function cleanDatabases(): Promise<void> {
  if (!testContext) {
    throw new Error('Test containers not started');
  }

  const session = testContext.neo4jDriver.session();
  try {
    // Delete all nodes and relationships in Neo4j
    await session.run('MATCH (n) DETACH DELETE n');
  } finally {
    await session.close();
  }

  // Clean PostgreSQL tables
  const client = await testContext.postgresPool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE TABLE fact_ci CASCADE');
    await client.query('TRUNCATE TABLE dim_ci_type CASCADE');
    await client.query('TRUNCATE TABLE dim_environment CASCADE');
    await client.query('TRUNCATE TABLE dim_status CASCADE');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get current test context
 */
export function getTestContext(): TestDatabaseContext {
  if (!testContext) {
    throw new Error('Test containers not started. Call startTestContainers() first.');
  }
  return testContext;
}

/**
 * Wait for Neo4j to be ready by attempting connection
 */
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

/**
 * Initialize Neo4j schema with constraints and indexes
 */
async function initializeNeo4jSchema(driver: Driver): Promise<void> {
  const session = driver.session();
  try {
    // Create unique constraint on CI id
    await session.run('CREATE CONSTRAINT ci_id_unique IF NOT EXISTS FOR (ci:CI) REQUIRE ci.id IS UNIQUE');

    // Create indexes for common queries
    await session.run('CREATE INDEX ci_type_idx IF NOT EXISTS FOR (ci:CI) ON (ci.type)');
    await session.run('CREATE INDEX ci_status_idx IF NOT EXISTS FOR (ci:CI) ON (ci.status)');
    await session.run('CREATE INDEX ci_environment_idx IF NOT EXISTS FOR (ci:CI) ON (ci.environment)');
    await session.run('CREATE INDEX ci_name_idx IF NOT EXISTS FOR (ci:CI) ON (ci.name)');

    // Create fulltext search index
    await session.run(`
      CREATE FULLTEXT INDEX ci_search IF NOT EXISTS
      FOR (ci:CI)
      ON EACH [ci.name, ci.type, ci.external_id]
    `);

    console.log('Neo4j schema initialized');
  } catch (error) {
    console.error('Error initializing Neo4j schema:', error);
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Initialize PostgreSQL schema with tables
 */
async function initializePostgresSchema(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create dimension tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS dim_ci_type (
        ci_type_key SERIAL PRIMARY KEY,
        ci_type VARCHAR(50) UNIQUE NOT NULL,
        ci_type_description VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS dim_environment (
        environment_key SERIAL PRIMARY KEY,
        environment VARCHAR(50) UNIQUE NOT NULL,
        environment_description VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS dim_status (
        status_key SERIAL PRIMARY KEY,
        status VARCHAR(50) UNIQUE NOT NULL,
        status_description VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create fact table with SCD Type 2
    await client.query(`
      CREATE TABLE IF NOT EXISTS fact_ci (
        fact_ci_key SERIAL PRIMARY KEY,
        ci_id VARCHAR(255) NOT NULL,
        ci_name VARCHAR(255) NOT NULL,
        ci_type_key INTEGER REFERENCES dim_ci_type(ci_type_key),
        environment_key INTEGER REFERENCES dim_environment(environment_key),
        status_key INTEGER REFERENCES dim_status(status_key),
        external_id VARCHAR(255),
        metadata JSONB,
        valid_from TIMESTAMPTZ NOT NULL,
        valid_to TIMESTAMPTZ,
        is_current BOOLEAN DEFAULT TRUE,
        discovered_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_fact_ci_id ON fact_ci(ci_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_fact_ci_current ON fact_ci(ci_id, is_current)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_fact_ci_valid_dates ON fact_ci(valid_from, valid_to)');

    // Insert default dimension values
    await client.query(`
      INSERT INTO dim_ci_type (ci_type, ci_type_description)
      VALUES
        ('server', 'Physical or virtual server'),
        ('virtual-machine', 'Virtual machine'),
        ('container', 'Container instance'),
        ('application', 'Application service'),
        ('database', 'Database instance'),
        ('network-device', 'Network device'),
        ('storage', 'Storage system'),
        ('load-balancer', 'Load balancer'),
        ('cloud-resource', 'Cloud resource')
      ON CONFLICT (ci_type) DO NOTHING
    `);

    await client.query(`
      INSERT INTO dim_environment (environment, environment_description)
      VALUES
        ('production', 'Production environment'),
        ('staging', 'Staging environment'),
        ('development', 'Development environment'),
        ('test', 'Test environment')
      ON CONFLICT (environment) DO NOTHING
    `);

    await client.query(`
      INSERT INTO dim_status (status, status_description)
      VALUES
        ('active', 'Active and operational'),
        ('inactive', 'Inactive'),
        ('maintenance', 'Under maintenance'),
        ('decommissioned', 'Decommissioned')
      ON CONFLICT (status) DO NOTHING
    `);

    await client.query('COMMIT');
    console.log('PostgreSQL schema initialized');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error initializing PostgreSQL schema:', error);
    throw error;
  } finally {
    client.release();
  }
}
