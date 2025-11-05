/**
 * Unit Test Setup
 *
 * Global setup for all unit tests following TDD London School principles.
 */

import { jest } from '@jest/globals';

// Extend Jest matchers for better assertions
expect.extend({
  /**
   * Custom matcher for mock call order verification
   */
  toHaveBeenCalledBefore(received: jest.Mock, expected: jest.Mock) {
    const receivedOrder = received.mock.invocationCallOrder[0];
    const expectedOrder = expected.mock.invocationCallOrder[0];

    const pass = receivedOrder < expectedOrder;

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received.getMockName()} not to be called before ${expected.getMockName()}`
          : `Expected ${received.getMockName()} to be called before ${expected.getMockName()}`,
    };
  },

  /**
   * Custom matcher for checking if a mock was called with partial object
   */
  toHaveBeenCalledWithMatch(received: jest.Mock, expected: any) {
    const calls = received.mock.calls;
    const pass = calls.some((call) =>
      call.some((arg) => {
        if (typeof arg === 'object' && arg !== null) {
          return Object.entries(expected).every(
            ([key, value]) => arg[key] === value
          );
        }
        return false;
      })
    );

    return {
      pass,
      message: () =>
        pass
          ? `Expected mock not to be called with matching object`
          : `Expected mock to be called with matching object ${JSON.stringify(expected)}`,
    };
  },
});

// Global test configuration
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Restore all mocks after each test
  jest.restoreAllMocks();
});

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests

// Disable actual network requests in unit tests
if (global.fetch) {
  global.fetch = jest.fn(() =>
    Promise.reject(new Error('Network requests are not allowed in unit tests'))
  ) as any;
}

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection in test:', error);
});

// Silence console during tests (can be overridden per test)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
