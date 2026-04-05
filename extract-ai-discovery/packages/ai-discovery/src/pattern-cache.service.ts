// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

import { getRedisClient } from '@cmdb/database';
import { logger } from '@cmdb/common';
import { DiscoveryPattern } from './types';

/**
 * Pattern Cache Service
 * Caches patterns in Redis for fast retrieval
 */
export class PatternCacheService {
  private redis = getRedisClient();
  private readonly CACHE_PREFIX = 'ai:pattern:';
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly PATTERN_LIST_KEY = 'ai:patterns:all';
  private readonly PATTERN_LIST_TTL = 600; // 10 minutes

  /**
   * Get pattern from cache
   */
  async getPattern(patternId: string): Promise<DiscoveryPattern | null> {
    try {
      const key = `${this.CACHE_PREFIX}${patternId}`;
      const cached = await this.redis.get(key);

      if (!cached) {
        return null;
      }

      return JSON.parse(cached);
    } catch (error) {
      logger.error('Error getting pattern from cache', { patternId, error });
      return null;
    }
  }

  /**
   * Set pattern in cache
   */
  async setPattern(pattern: DiscoveryPattern): Promise<void> {
    try {
      const key = `${this.CACHE_PREFIX}${pattern.patternId}`;
      await this.redis.setex(key, this.CACHE_TTL, JSON.stringify(pattern));
      logger.debug('Pattern cached', { patternId: pattern.patternId });
    } catch (error) {
      logger.error('Error setting pattern in cache', { patternId: pattern.patternId, error });
    }
  }

  /**
   * Get all active patterns from cache
   */
  async getActivePatterns(): Promise<DiscoveryPattern[] | null> {
    try {
      const cached = await this.redis.get(this.PATTERN_LIST_KEY);

      if (!cached) {
        return null;
      }

      return JSON.parse(cached);
    } catch (error) {
      logger.error('Error getting pattern list from cache', { error });
      return null;
    }
  }

  /**
   * Set active patterns in cache
   */
  async setActivePatterns(patterns: DiscoveryPattern[]): Promise<void> {
    try {
      await this.redis.setex(
        this.PATTERN_LIST_KEY,
        this.PATTERN_LIST_TTL,
        JSON.stringify(patterns)
      );
      logger.debug('Pattern list cached', { count: patterns.length });
    } catch (error) {
      logger.error('Error setting pattern list in cache', { error });
    }
  }

  /**
   * Invalidate pattern cache
   */
  async invalidatePattern(patternId: string): Promise<void> {
    try {
      const key = `${this.CACHE_PREFIX}${patternId}`;
      await this.redis.del(key);
      // Also invalidate the pattern list
      await this.redis.del(this.PATTERN_LIST_KEY);
      logger.debug('Pattern cache invalidated', { patternId });
    } catch (error) {
      logger.error('Error invalidating pattern cache', { patternId, error });
    }
  }

  /**
   * Invalidate all pattern caches
   */
  async invalidateAll(): Promise<void> {
    try {
      const keys = await this.redis.keys(`${this.CACHE_PREFIX}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      await this.redis.del(this.PATTERN_LIST_KEY);
      logger.info('All pattern caches invalidated', { count: keys.length });
    } catch (error) {
      logger.error('Error invalidating all pattern caches', { error });
    }
  }

  /**
   * Warm up cache with active patterns
   */
  async warmup(patterns: DiscoveryPattern[]): Promise<void> {
    try {
      // Cache individual patterns
      const promises = patterns.map(pattern => this.setPattern(pattern));
      await Promise.all(promises);

      // Cache the pattern list
      await this.setActivePatterns(patterns);

      logger.info('Pattern cache warmed up', { count: patterns.length });
    } catch (error) {
      logger.error('Error warming up pattern cache', { error });
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    patterns: number;
    lists: number;
  }> {
    try {
      const patternKeys = await this.redis.keys(`${this.CACHE_PREFIX}*`);
      const listKeys = await this.redis.keys(`${this.PATTERN_LIST_KEY}*`);

      return {
        totalKeys: patternKeys.length + listKeys.length,
        patterns: patternKeys.length,
        lists: listKeys.length,
      };
    } catch (error) {
      logger.error('Error getting cache stats', { error });
      return { totalKeys: 0, patterns: 0, lists: 0 };
    }
  }
}
