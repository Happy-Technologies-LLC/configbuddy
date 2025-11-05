/**
 * Jest Configuration for Integration Tests
 *
 * TDD London School: Integration tests with real database interactions
 * using Testcontainers for isolated, reproducible test environments.
 *
 * - Slower than unit tests
 * - Real database operations
 * - Test containers for Neo4j, PostgreSQL, Redis
 */

module.exports = {
  // Use ts-jest for TypeScript support
  preset: 'ts-jest',

  // Node environment for integration tests
  testEnvironment: 'node',

  // Display name
  displayName: {
    name: 'INTEGRATION',
    color: 'yellow',
  },

  // Test file patterns - only integration tests
  testMatch: [
    '**/packages/**/tests/integration/**/*.test.ts',
    '**/tests/integration/**/*.test.ts',
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    'unit',
    'e2e',
  ],

  // Coverage configuration
  collectCoverage: false, // Enable with --coverage flag
  coverageDirectory: '<rootDir>/coverage/integration',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    '!packages/*/src/**/*.test.ts',
    '!packages/*/src/**/*.spec.ts',
    '!packages/*/src/**/index.ts',
    '!packages/*/src/types/**',
    '!**/node_modules/**',
  ],

  // Module path aliases
  moduleNameMapper: {
    '^@cmdb/common$': '<rootDir>/packages/common/src',
    '^@cmdb/database$': '<rootDir>/packages/database/src',
    '^@cmdb/api-server$': '<rootDir>/packages/api-server/src',
    '^@cmdb/discovery-engine$': '<rootDir>/packages/discovery-engine/src',
    '^@cmdb/etl-processor$': '<rootDir>/packages/etl-processor/src',
    '^@test/utils$': '<rootDir>/tests/utils',
  },

  // Transform TypeScript files
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          resolveJsonModule: true,
          moduleResolution: 'node',
        },
      },
    ],
  },

  // Setup files
  globalSetup: '<rootDir>/tests/setup/integration.global-setup.ts',
  globalTeardown: '<rootDir>/tests/setup/integration.global-teardown.ts',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/integration.setup.ts'],

  // Extended timeout for integration tests (60 seconds)
  testTimeout: 60000,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-results/integration',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],

  // Run tests sequentially to avoid container conflicts
  maxWorkers: 1,

  // Detect open handles (useful for debugging database connections)
  detectOpenHandles: true,

  // Force exit after tests
  forceExit: true,
};
