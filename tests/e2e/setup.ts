/**
 * E2E Test Setup
 *
 * Global setup script that runs before all E2E tests.
 * Responsibilities:
 * - Start Docker Compose services
 * - Wait for all services to be healthy
 * - Initialize databases with test schemas
 * - Verify connectivity to all services
 */

import { execSync } from 'child_process';
import * as path from 'path';
import { waitForService, waitForNeo4j, waitForPostgres, waitForRedis } from './utils/wait-for-services';
import { logger } from './utils/logger';

const E2E_COMPOSE_FILE = path.join(__dirname, 'docker-compose.e2e.yml');
const MAX_STARTUP_TIME = 120000; // 2 minutes

/**
 * Global setup function
 * Called once before all test suites
 */
export default async function globalSetup() {
  logger.info('========================================');
  logger.info('Starting E2E Test Environment Setup');
  logger.info('========================================');

  const startTime = Date.now();

  try {
    // Step 1: Stop any existing E2E containers
    logger.info('Step 1: Cleaning up existing E2E containers...');
    try {
      execSync(`docker-compose -f ${E2E_COMPOSE_FILE} down -v`, {
        stdio: 'pipe',
        timeout: 30000,
      });
      logger.info('Cleanup completed');
    } catch (error) {
      logger.warn('No existing containers to clean up');
    }

    // Step 2: Build and start Docker Compose services
    logger.info('Step 2: Building and starting Docker Compose services...');
    execSync(`docker-compose -f ${E2E_COMPOSE_FILE} up -d --build`, {
      stdio: 'inherit',
      timeout: 180000, // 3 minutes for build + start
    });
    logger.info('Docker Compose services started');

    // Step 3: Wait for infrastructure services to be healthy
    logger.info('Step 3: Waiting for infrastructure services...');

    await Promise.all([
      waitForNeo4j({
        uri: 'bolt://localhost:7688',
        user: 'neo4j',
        password: 'test_password',
        timeout: 60000,
      }),
      waitForPostgres({
        host: 'localhost',
        port: 5433,
        database: 'cmdb_test',
        user: 'test_user',
        password: 'test_password',
        timeout: 60000,
      }),
      waitForRedis({
        host: 'localhost',
        port: 6380,
        timeout: 30000,
      }),
    ]);

    logger.info('Infrastructure services are healthy');

    // Step 4: Wait for application services
    logger.info('Step 4: Waiting for application services...');

    await Promise.all([
      waitForService({
        name: 'API Server',
        url: 'http://localhost:3001/health',
        timeout: 60000,
      }),
      // Discovery Engine and ETL Processor don't have HTTP endpoints
      // They're verified by checking if processes are running (via healthcheck)
    ]);

    logger.info('Application services are healthy');

    // Step 5: Initialize test databases
    logger.info('Step 5: Initializing test databases...');
    await initializeDatabases();
    logger.info('Databases initialized');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info('========================================');
    logger.info(`E2E Test Environment Ready (${elapsed}s)`);
    logger.info('========================================');

  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.error('========================================');
    logger.error(`E2E Setup Failed (${elapsed}s)`);
    logger.error('========================================');
    logger.error(error);

    // Cleanup on failure
    try {
      execSync(`docker-compose -f ${E2E_COMPOSE_FILE} logs`, { stdio: 'inherit' });
      execSync(`docker-compose -f ${E2E_COMPOSE_FILE} down -v`, { stdio: 'inherit' });
    } catch (cleanupError) {
      logger.error('Cleanup failed:', cleanupError);
    }

    throw error;
  }
}

/**
 * Initialize test databases with schemas and constraints
 */
async function initializeDatabases() {
  const neo4j = require('neo4j-driver');
  const { Pool } = require('pg');

  // Neo4j initialization
  const neo4jDriver = neo4j.driver(
    'bolt://localhost:7688',
    neo4j.auth.basic('neo4j', 'test_password')
  );

  try {
    const session = neo4jDriver.session();

    // Create constraints and indexes
    await session.run(`
      CREATE CONSTRAINT ci_id_unique IF NOT EXISTS
      FOR (ci:CI) REQUIRE ci.id IS UNIQUE
    `);

    await session.run(`
      CREATE INDEX ci_type_index IF NOT EXISTS
      FOR (ci:CI) ON (ci.type)
    `);

    await session.run(`
      CREATE INDEX ci_status_index IF NOT EXISTS
      FOR (ci:CI) ON (ci.status)
    `);

    await session.close();
    logger.info('Neo4j schema initialized');
  } finally {
    await neo4jDriver.close();
  }

  // PostgreSQL initialization
  const pgPool = new Pool({
    host: 'localhost',
    port: 5433,
    database: 'cmdb_test',
    user: 'test_user',
    password: 'test_password',
  });

  try {
    // Create TimescaleDB extension
    await pgPool.query('CREATE EXTENSION IF NOT EXISTS timescaledb');

    // Create test tables (basic structure)
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS dim_ci (
        ci_key SERIAL PRIMARY KEY,
        ci_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        environment VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS fact_ci_metrics (
        time TIMESTAMPTZ NOT NULL,
        ci_key INTEGER REFERENCES dim_ci(ci_key),
        metric_name VARCHAR(100) NOT NULL,
        metric_value DOUBLE PRECISION,
        PRIMARY KEY (time, ci_key, metric_name)
      )
    `);

    // Convert to hypertable
    await pgPool.query(`
      SELECT create_hypertable('fact_ci_metrics', 'time', if_not_exists => TRUE)
    `);

    logger.info('PostgreSQL schema initialized');
  } finally {
    await pgPool.end();
  }
}
