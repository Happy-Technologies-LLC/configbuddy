/**
 * Integration Test Setup
 *
 * Setup for integration tests with real database connections.
 */

import { jest } from '@jest/globals';

// Global test configuration
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Environment variables for integration tests
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'warn';

// Global error handler
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection in integration test:', error);
});

// Allow console output in integration tests (for debugging)
// but can be silenced if needed
