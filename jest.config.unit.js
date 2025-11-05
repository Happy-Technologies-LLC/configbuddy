/**
 * Jest Configuration for Unit Tests
 *
 * TDD London School: Fast, isolated unit tests with mocked dependencies
 * - Target: <100ms per test
 * - All external dependencies mocked
 * - Focus on behavior and interactions
 */

module.exports = {
  // Use ts-jest for TypeScript support
  preset: 'ts-jest',

  // Node environment for unit tests
  testEnvironment: 'node',

  // Display name
  displayName: {
    name: 'UNIT',
    color: 'green',
  },

  // Test file patterns - only unit tests
  testMatch: [
    '**/packages/**/src/**/__tests__/**/*.test.ts',
    '**/packages/**/tests/unit/**/*.test.ts',
    '**/tests/unit/**/*.test.ts',
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    'integration',
    'e2e',
  ],

  // Coverage configuration
  collectCoverage: false, // Enable with --coverage flag
  coverageDirectory: '<rootDir>/coverage/unit',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    '!packages/*/src/**/*.test.ts',
    '!packages/*/src/**/*.spec.ts',
    '!packages/*/src/**/index.ts',
    '!packages/*/src/types/**',
    '!**/node_modules/**',
  ],

  // Coverage thresholds (80% target)
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

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
  setupFilesAfterEnv: ['<rootDir>/tests/setup/unit.setup.ts'],

  // Fast timeout for unit tests (5 seconds max)
  testTimeout: 5000,

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
        outputDirectory: './test-results/unit',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],

  // Globals
  globals: {
    'ts-jest': {
      isolatedModules: true, // Faster compilation
    },
  },

  // Maximum number of workers (parallel test execution)
  maxWorkers: '50%',

  // Detect open handles
  detectOpenHandles: false,

  // Force exit
  forceExit: false,
};
