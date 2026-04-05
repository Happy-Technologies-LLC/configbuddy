// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Jest test setup file for discovery-engine package
 *
 * This file runs before all tests and sets up the testing environment.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// AWS credentials for tests (mock values)
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';

// Increase test timeout for discovery operations
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
