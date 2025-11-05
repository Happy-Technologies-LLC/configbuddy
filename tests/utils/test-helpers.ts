/**
 * Test Helper Utilities
 *
 * Common utilities for setting up test environments and assertions.
 */

import { jest } from '@jest/globals';

/**
 * Wait for a condition to be true (useful for async testing)
 */
export const waitFor = async (
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
};

/**
 * Sleep utility for testing timing-dependent code
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Flush all pending promises
 */
export const flushPromises = (): Promise<void> => {
  return new Promise(resolve => setImmediate(resolve));
};

/**
 * Mock timers utility
 */
export const setupMockTimers = () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  return {
    advance: (ms: number) => jest.advanceTimersByTime(ms),
    advanceAll: () => jest.runAllTimers(),
    advanceOne: () => jest.runOnlyPendingTimers(),
  };
};

/**
 * Capture console output for testing logging
 */
export const captureConsole = () => {
  const logs: string[] = [];
  const errors: string[] = [];
  const warns: string[] = [];

  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  beforeEach(() => {
    logs.length = 0;
    errors.length = 0;
    warns.length = 0;

    console.log = jest.fn((...args: any[]) => {
      logs.push(args.map(a => String(a)).join(' '));
    });

    console.error = jest.fn((...args: any[]) => {
      errors.push(args.map(a => String(a)).join(' '));
    });

    console.warn = jest.fn((...args: any[]) => {
      warns.push(args.map(a => String(a)).join(' '));
    });
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  });

  return { logs, errors, warns };
};

/**
 * Test data seeding helper
 */
export class TestDataSeeder {
  private data: any[] = [];

  add(item: any): this {
    this.data.push(item);
    return this;
  }

  addMultiple(items: any[]): this {
    this.data.push(...items);
    return this;
  }

  build(): any[] {
    return [...this.data];
  }

  clear(): this {
    this.data = [];
    return this;
  }
}

/**
 * Mock function call order verification
 */
export const verifyCallOrder = (mocks: jest.Mock[]): boolean => {
  const calls = mocks.map(mock => ({
    mock,
    timestamp: mock.mock.invocationCallOrder[0],
  }));

  for (let i = 1; i < calls.length; i++) {
    if (calls[i].timestamp < calls[i - 1].timestamp) {
      return false;
    }
  }

  return true;
};

/**
 * Async error testing helper
 */
export const expectAsyncError = async (
  fn: () => Promise<any>,
  expectedError?: string | RegExp
): Promise<void> => {
  try {
    await fn();
    throw new Error('Expected function to throw an error');
  } catch (error: any) {
    if (expectedError) {
      if (typeof expectedError === 'string') {
        expect(error.message).toContain(expectedError);
      } else {
        expect(error.message).toMatch(expectedError);
      }
    }
  }
};

/**
 * Create spy on object method
 */
export const spyOn = <T extends object, K extends keyof T>(
  object: T,
  method: K
): jest.SpyInstance => {
  return jest.spyOn(object, method as any);
};

/**
 * Reset all mocks in an object
 */
export const resetAllMocks = (mockObject: Record<string, any>): void => {
  Object.values(mockObject).forEach(value => {
    if (typeof value === 'function' && 'mockReset' in value) {
      value.mockReset();
    } else if (typeof value === 'object' && value !== null) {
      resetAllMocks(value);
    }
  });
};

/**
 * Environment variable testing helper
 */
export class TestEnvironment {
  private original: Record<string, string | undefined> = {};

  set(key: string, value: string): this {
    if (!(key in this.original)) {
      this.original[key] = process.env[key];
    }
    process.env[key] = value;
    return this;
  }

  setMultiple(vars: Record<string, string>): this {
    Object.entries(vars).forEach(([key, value]) => this.set(key, value));
    return this;
  }

  restore(): void {
    Object.entries(this.original).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
    this.original = {};
  }
}

/**
 * Create test environment helper
 */
export const createTestEnvironment = () => {
  const env = new TestEnvironment();

  afterEach(() => {
    env.restore();
  });

  return env;
};
