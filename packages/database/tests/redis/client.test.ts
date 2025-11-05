/**
 * Redis Client Tests
 *
 * Tests for Redis cache client including:
 * - Connection management
 * - String get/set operations with TTL
 * - JSON get/set operations
 * - Delete operations
 * - Error handling and retry strategy
 */

import { RedisClient } from '../../src/redis/client';
import Redis from 'ioredis';

// Mock ioredis
jest.mock('ioredis');

describe('RedisClient', () => {
  let client: RedisClient;
  let mockRedis: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock Redis client
    mockRedis = {
      _get: jest.fn(),
      _set: jest.fn(),
      _setex: jest.fn(),
      _del: jest.fn(),
      _quit: jest.fn(),
      _on: jest.fn(),
    };

    // Mock Redis constructor
    (Redis as unknown as jest.Mock).mockImplementation(() => mockRedis);

    // Create client
    client = new RedisClient();
  });

  afterEach(async () => {
    await client.close();
  });

  describe('Constructor', () => {
    it('should create Redis client with default configuration', () => {
      expect(Redis).toHaveBeenCalledWith({
        _host: 'localhost',
        _port: 6379,
        _password: undefined,
        _retryStrategy: expect.any(Function),
      });
    });

    it('should create Redis client with custom configuration', () => {
      const config = {
        _host: 'redis.example.com',
        _port: 6380,
        _password: 'secret',
      };

      new RedisClient(config);

      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          _host: 'redis.example.com',
          _port: 6380,
          _password: 'secret',
        })
      );
    });

    it('should use environment variables', () => {
      process.env.REDIS_HOST = 'env-redis';
      process.env.REDIS_PORT = '6380';
      process.env.REDIS_PASSWORD = 'env-pass';

      new RedisClient();

      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          _host: 'env-redis',
          _port: 6380,
          _password: 'env-pass',
        })
      );

      // Cleanup
      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;
      delete process.env.REDIS_PASSWORD;
    });

    it('should register error and connect event handlers', () => {
      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    it('should configure retry strategy with exponential backoff', () => {
      const call = (Redis as unknown as jest.Mock).mock.calls[0][0];
      const retryStrategy = call.retryStrategy;

      expect(retryStrategy(1)).toBe(50);
      expect(retryStrategy(2)).toBe(100);
      expect(retryStrategy(10)).toBe(500);
      expect(retryStrategy(50)).toBe(2000); // max delay
    });
  });

  describe('get', () => {
    it('should get string value by key', async () => {
      mockRedis.get.mockResolvedValueOnce('test-value');

      const result = await client.get('test-key');

      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
      expect(result).toBe('test-value');
    });

    it('should return null for non-existent key', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await client.get('non-existent');

      expect(result).toBeNull();
    });

    it('should handle get errors', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('Get failed'));

      await expect(client.get('error-key')).rejects.toThrow('Get failed');
    });
  });

  describe('set', () => {
    it('should set string value without TTL', async () => {
      mockRedis.set.mockResolvedValueOnce('OK');

      await client.set('test-key', 'test-value');

      expect(mockRedis.set).toHaveBeenCalledWith('test-key', 'test-value');
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it('should set string value with TTL', async () => {
      mockRedis.setex.mockResolvedValueOnce('OK');

      await client.set('test-key', 'test-value', 3600);

      expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 3600, 'test-value');
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('should handle set errors', async () => {
      mockRedis.set.mockRejectedValueOnce(new Error('Set failed'));

      await expect(client.set('error-key', 'value')).rejects.toThrow('Set failed');
    });
  });

  describe('getJSON', () => {
    it('should get and parse JSON value', async () => {
      const obj = { id: 1, name: 'test', tags: ['a', 'b'] };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(obj));

      const result = await client.getJSON('json-key');

      expect(mockRedis.get).toHaveBeenCalledWith('json-key');
      expect(result).toEqual(obj);
    });

    it('should return null for non-existent key', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await client.getJSON('non-existent');

      expect(result).toBeNull();
    });

    it('should handle JSON parse errors', async () => {
      mockRedis.get.mockResolvedValueOnce('invalid-json');

      await expect(client.getJSON('invalid-json-key')).rejects.toThrow();
    });

    it('should handle complex nested objects', async () => {
      const complexObj = {
        _user: {
          _id: 1,
          _profile: {
            _name: 'John',
            _settings: { theme: 'dark', notifications: true },
          },
        },
        _metadata: [1, 2, 3],
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(complexObj));

      const result = await client.getJSON('complex-key');

      expect(result).toEqual(complexObj);
    });
  });

  describe('setJSON', () => {
    it('should stringify and set JSON value without TTL', async () => {
      const obj = { id: 1, name: 'test' };
      mockRedis.set.mockResolvedValueOnce('OK');

      await client.setJSON('json-key', obj);

      expect(mockRedis.set).toHaveBeenCalledWith('json-key', JSON.stringify(obj));
    });

    it('should stringify and set JSON value with TTL', async () => {
      const obj = { id: 1, name: 'test' };
      mockRedis.setex.mockResolvedValueOnce('OK');

      await client.setJSON('json-key', obj, 1800);

      expect(mockRedis.setex).toHaveBeenCalledWith('json-key', 1800, JSON.stringify(obj));
    });

    it('should handle complex objects', async () => {
      const complexObj = {
        _array: [1, 2, 3],
        _nested: { deep: { value: 'test' } },
        _date: '2025-01-15T10:00:00Z',
      };

      mockRedis.set.mockResolvedValueOnce('OK');

      await client.setJSON('complex-key', complexObj);

      expect(mockRedis.set).toHaveBeenCalledWith('complex-key', JSON.stringify(complexObj));
    });

    it('should handle null and undefined values', async () => {
      mockRedis.set.mockResolvedValue('OK');

      await client.setJSON('null-key', null);
      await client.setJSON('undefined-key', undefined);

      expect(mockRedis.set).toHaveBeenCalledWith('null-key', 'null');
      expect(mockRedis.set).toHaveBeenCalledWith('undefined-key', undefined);
    });
  });

  describe('del', () => {
    it('should delete key', async () => {
      mockRedis.del.mockResolvedValueOnce(1);

      await client.del('test-key');

      expect(mockRedis.del).toHaveBeenCalledWith('test-key');
    });

    it('should handle delete of non-existent key', async () => {
      mockRedis.del.mockResolvedValueOnce(0);

      await client.del('non-existent');

      expect(mockRedis.del).toHaveBeenCalledWith('non-existent');
    });

    it('should handle delete errors', async () => {
      mockRedis.del.mockRejectedValueOnce(new Error('Delete failed'));

      await expect(client.del('error-key')).rejects.toThrow('Delete failed');
    });
  });

  describe('close', () => {
    it('should close Redis connection', async () => {
      mockRedis.quit.mockResolvedValueOnce('OK');

      await client.close();

      expect(mockRedis.quit).toHaveBeenCalled();
    });

    it('should handle close errors gracefully', async () => {
      mockRedis.quit.mockRejectedValueOnce(new Error('Close failed'));

      await expect(client.close()).rejects.toThrow('Close failed');
    });
  });

  describe('getConnection', () => {
    it('should return underlying Redis connection', () => {
      const connection = client.getConnection();

      expect(connection).toBe(mockRedis);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string values', async () => {
      mockRedis.set.mockResolvedValueOnce('OK');
      mockRedis.get.mockResolvedValueOnce('');

      await client.set('empty-key', '');
      const result = await client.get('empty-key');

      expect(result).toBe('');
    });

    it('should handle very long TTL values', async () => {
      mockRedis.setex.mockResolvedValueOnce('OK');

      await client.set('long-ttl-key', 'value', 86400 * 365); // 1 year

      expect(mockRedis.setex).toHaveBeenCalledWith('long-ttl-key', 86400 * 365, 'value');
    });

    it('should handle zero TTL', async () => {
      mockRedis.setex.mockResolvedValueOnce('OK');

      await client.set('zero-ttl-key', 'value', 0);

      // Should use setex even with 0 TTL (key expires immediately)
      expect(mockRedis.setex).toHaveBeenCalledWith('zero-ttl-key', 0, 'value');
    });

    it('should handle special characters in keys', async () => {
      const specialKey = 'key:with:colons:and-dashes_and_underscores';
      mockRedis.set.mockResolvedValueOnce('OK');

      await client.set(specialKey, 'value');

      expect(mockRedis.set).toHaveBeenCalledWith(specialKey, 'value');
    });

    it('should handle unicode values', async () => {
      const unicodeValue = '你好世界🎉';
      mockRedis.set.mockResolvedValueOnce('OK');
      mockRedis.get.mockResolvedValueOnce(unicodeValue);

      await client.set('unicode-key', unicodeValue);
      const result = await client.get('unicode-key');

      expect(result).toBe(unicodeValue);
    });

    it('should handle large JSON objects', async () => {
      const largeObj = {
        _data: Array.from({ length: 1000 }, (_, i) => ({
          _id: i,
          _name: `Item ${i}`,
          _metadata: { index: i },
        })),
      };

      mockRedis.set.mockResolvedValueOnce('OK');

      await client.setJSON('large-key', largeObj);

      expect(mockRedis.set).toHaveBeenCalledWith('large-key', JSON.stringify(largeObj));
    });

    it('should handle concurrent operations', async () => {
      mockRedis.get.mockResolvedValue('value');
      mockRedis.set.mockResolvedValue('OK');

      const promises = [
        client.get('key1'),
        client.get('key2'),
        client.set('key3', 'value3'),
        client.set('key4', 'value4', 60),
      ];

      await Promise.all(promises);

      expect(mockRedis.get).toHaveBeenCalledTimes(2);
      expect(mockRedis.set).toHaveBeenCalledTimes(1);
      expect(mockRedis.setex).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Event Handling', () => {
    it('should call error handler when error event is emitted', () => {
      const errorHandler = mockRedis.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];

      expect(errorHandler).toBeDefined();

      // Simulate error
      const testError = new Error('Connection lost');
      errorHandler(testError);

      // Error should be logged (console is mocked in setup)
    });

    it('should call connect handler when connect event is emitted', () => {
      const connectHandler = mockRedis.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];

      expect(connectHandler).toBeDefined();

      // Simulate connection
      connectHandler();

      // Connection should be logged
    });
  });
});
