// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Jest test setup file for database package
 *
 * This file runs before all tests and sets up the testing environment.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Database connection settings for tests (mock values)
process.env.NEO4J_URI = 'bolt://localhost:7687';
process.env.NEO4J_USERNAME = 'neo4j';
process.env.NEO4J_PASSWORD = 'test-password';

process.env.POSTGRES_HOST = 'localhost';
process.env.POSTGRES_PORT = '5432';
process.env.POSTGRES_DB = 'test_cmdb';
process.env.POSTGRES_USER = 'postgres';
process.env.POSTGRES_PASSWORD = 'test-password';

process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Increase test timeout for database operations
jest.setTimeout(10000);

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  _log: jest.fn(),
  _debug: jest.fn(),
  _info: jest.fn(),
  _warn: jest.fn(),
  _error: jest.fn(),
};
