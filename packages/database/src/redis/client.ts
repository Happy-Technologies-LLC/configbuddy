// packages/database/src/redis/client.ts

import Redis from 'ioredis';
import { logger } from '@cmdb/common';

export class RedisClient {
  private client: Redis;

  constructor(config?: { host?: string; port?: number; password?: string }) {
    this.client = new Redis({
      host: config?.host || process.env['REDIS_HOST'] || 'localhost',
      port: config?.port || parseInt(process.env['REDIS_PORT'] || '6379'),
      password: config?.password || process.env['REDIS_PASSWORD'],
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('error', (err) => {
      logger.error('Redis client error', err);
    });

    this.client.on('connect', () => {
      logger.info('Redis client connected');
    });
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    return value ? JSON.parse(value) : null;
  }

  async setJSON<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttl);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async close(): Promise<void> {
    await this.client.quit();
  }

  /**
   * Get the underlying Redis connection (for BullMQ workers)
   */
  getConnection(): Redis {
    return this.client;
  }
}

// Singleton
let redisClient: RedisClient | null = null;

export function getRedisClient(): RedisClient {
  if (!redisClient) {
    redisClient = new RedisClient();
  }
  return redisClient;
}
