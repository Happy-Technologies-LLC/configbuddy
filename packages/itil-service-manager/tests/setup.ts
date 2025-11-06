/**
 * Test setup file
 * Common test utilities and configurations
 */

// Mock logger to suppress output during tests
jest.mock('@cmdb/common', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Set test timeout
jest.setTimeout(10000);

// Global test helpers
global.beforeAll(() => {
  console.log('Starting ITIL Service Manager tests...');
});

global.afterAll(() => {
  console.log('ITIL Service Manager tests completed.');
});
