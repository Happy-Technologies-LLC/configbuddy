/**
 * Jest Setup for E2E Tests
 *
 * This file runs before each test file
 * Configure global test behavior and add custom matchers
 */

// Extend Jest matchers if needed
expect.extend({
  // Add custom matchers here
  toBeValidCI(received) {
    const pass =
      received &&
      typeof received.id === 'string' &&
      typeof received.name === 'string' &&
      typeof received.type === 'string' &&
      typeof received.status === 'string';

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid CI`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid CI with id, name, type, and status`,
        pass: false,
      };
    }
  },

  toBeValidRelationship(received) {
    const pass =
      received &&
      typeof received.from_id === 'string' &&
      typeof received.to_id === 'string' &&
      typeof received.type === 'string';

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid Relationship`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid Relationship with from_id, to_id, and type`,
        pass: false,
      };
    }
  },
});

// Global test configuration
global.E2E_TEST_CONFIG = {
  apiBaseURL: process.env.E2E_API_URL || 'http://localhost:3001',
  neo4jURI: process.env.E2E_NEO4J_URI || 'bolt://localhost:7688',
  neo4jUser: process.env.E2E_NEO4J_USER || 'neo4j',
  neo4jPassword: process.env.E2E_NEO4J_PASSWORD || 'test_password',
  postgresHost: process.env.E2E_POSTGRES_HOST || 'localhost',
  postgresPort: parseInt(process.env.E2E_POSTGRES_PORT || '5433', 10),
  postgresDB: process.env.E2E_POSTGRES_DB || 'cmdb_test',
  postgresUser: process.env.E2E_POSTGRES_USER || 'test_user',
  postgresPassword: process.env.E2E_POSTGRES_PASSWORD || 'test_password',
  redisHost: process.env.E2E_REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.E2E_REDIS_PORT || '6380', 10),
};

// Log test environment info
if (process.env.DEBUG === 'true') {
  console.log('E2E Test Configuration:', JSON.stringify(global.E2E_TEST_CONFIG, null, 2));
}
