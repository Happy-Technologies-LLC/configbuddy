// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Jest test setup file for etl-processor package
 *
 * This file runs before all tests and sets up the testing environment.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Increase test timeout for ETL operations
jest.setTimeout(15000);

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  _log: jest.fn(),
  _debug: jest.fn(),
  _info: jest.fn(),
  _warn: jest.fn(),
  _error: jest.fn(),
};
