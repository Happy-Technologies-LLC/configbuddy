/**
 * Jest test setup file
 *
 * This file runs before all tests and sets up the testing environment.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Increase test timeout for slower tests
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
