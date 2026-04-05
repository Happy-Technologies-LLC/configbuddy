// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Test Setup
 * Global configuration for Jest tests
 */

// Extend Jest matchers if needed
// import '@testing-library/jest-dom';

// Set test timeout
jest.setTimeout(10000);

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.CONNECTOR_REGISTRY_URL = 'https://test-registry.example.com';

// Global test utilities
global.console = {
  ...console,
  // Suppress console logs during tests (uncomment to enable)
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
