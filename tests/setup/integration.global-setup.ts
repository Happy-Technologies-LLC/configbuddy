/**
 * Integration Test Global Setup
 *
 * Starts Testcontainers before all integration tests run.
 * This setup runs once before the entire test suite.
 */

import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

let neo4jContainer: StartedTestContainer;
let postgresContainer: StartedTestContainer;
let redisContainer: StartedTestContainer;

export default async function globalSetup() {
  console.log('Starting integration test containers...');

  try {
    // Start Neo4j container
    console.log('Starting Neo4j container...');
    neo4jContainer = await new GenericContainer('neo4j:5.15.0')
      .withExposedPorts(7687, 7474)
      .withEnvironment({
        NEO4J_AUTH: 'neo4j/testpassword',
        NEO4J_PLUGINS: '["apoc"]',
      })
      .withWaitStrategy(Wait.forLogMessage('Started.'))
      .start();

    const neo4jBoltPort = neo4jContainer.getMappedPort(7687);
    process.env.NEO4J_URI = `bolt://localhost:${neo4jBoltPort}`;
    process.env.NEO4J_USERNAME = 'neo4j';
    process.env.NEO4J_PASSWORD = 'testpassword';

    console.log(`Neo4j started on bolt://localhost:${neo4jBoltPort}`);

    // Start PostgreSQL container
    console.log('Starting PostgreSQL container...');
    postgresContainer = await new GenericContainer('postgres:15-alpine')
      .withExposedPorts(5432)
      .withEnvironment({
        POSTGRES_DB: 'cmdb_test',
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'testpassword',
      })
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
      .start();

    const postgresPort = postgresContainer.getMappedPort(5432);
    process.env.POSTGRES_HOST = 'localhost';
    process.env.POSTGRES_PORT = String(postgresPort);
    process.env.POSTGRES_DB = 'cmdb_test';
    process.env.POSTGRES_USER = 'test';
    process.env.POSTGRES_PASSWORD = 'testpassword';

    console.log(`PostgreSQL started on localhost:${postgresPort}`);

    // Start Redis container
    console.log('Starting Redis container...');
    redisContainer = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
      .start();

    const redisPort = redisContainer.getMappedPort(6379);
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = String(redisPort);

    console.log(`Redis started on localhost:${redisPort}`);

    // Store container IDs for cleanup
    (global as any).__NEO4J_CONTAINER__ = neo4jContainer;
    (global as any).__POSTGRES_CONTAINER__ = postgresContainer;
    (global as any).__REDIS_CONTAINER__ = redisContainer;

    console.log('All integration test containers started successfully');
  } catch (error) {
    console.error('Failed to start integration test containers:', error);
    throw error;
  }
}
