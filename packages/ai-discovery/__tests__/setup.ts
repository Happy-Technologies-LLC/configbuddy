// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * AI Discovery Test Setup
 * Configures mocks and test utilities
 */

// Mock Database
jest.mock('@cmdb/database', () => ({
  getNeo4jClient: jest.fn(() => ({
    session: jest.fn(() => ({
      run: jest.fn(),
      close: jest.fn(),
    })),
  })),
  getPostgresClient: jest.fn(() => ({
    query: jest.fn(),
  })),
  getRedisClient: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  })),
}));

// Mock Discovery Engine
jest.mock('@cmdb/discovery-engine', () => ({
  ConnectorRegistry: jest.fn(),
  DiscoveryJobManager: jest.fn(),
}));

// Mock HTTP requests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
) as jest.Mock;

jest.setTimeout(15000); // AI operations may take longer

afterEach(() => {
  jest.clearAllMocks();
});
