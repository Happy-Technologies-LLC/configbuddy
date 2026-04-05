// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Pattern Storage Service
 * Manages discovery patterns in PostgreSQL with Redis caching
 */

import { getPostgresClient } from '@cmdb/database';
import { DiscoveryPattern } from './types';
import { logger } from '@cmdb/common';
import { PatternCacheService } from './pattern-cache.service';

export class PatternStorageService {
  private patterns: Map<string, DiscoveryPattern> = new Map();
  private postgresClient = getPostgresClient();
  private cache: PatternCacheService;

  constructor() {
    this.cache = new PatternCacheService();
  }

  /**
   * Load all active patterns from database
   * Checks Redis cache first, then falls back to database
   */
  async loadPatterns(): Promise<DiscoveryPattern[]> {
    // Check Redis cache first
    const cached = await this.cache.getActivePatterns();
    if (cached) {
      // Update in-memory cache
      this.patterns.clear();
      for (const pattern of cached) {
        this.patterns.set(pattern.patternId, pattern);
      }
      logger.debug('Loaded patterns from Redis cache', { count: cached.length });
      return cached;
    }
    const client = await this.postgresClient.getClient();

    try {
      const result = await client.query(
        `SELECT
          id, pattern_id, name, version, category,
          detection_code, discovery_code,
          description, author, license,
          confidence_score, usage_count, success_count, failure_count,
          avg_execution_time_ms,
          learned_from_sessions, ai_model,
          status, is_active,
          registry_url, community_upvotes, community_downvotes,
          test_cases,
          created_at, updated_at, approved_at, approved_by
        FROM ai_discovery_patterns
        WHERE is_active = true
        ORDER BY confidence_score DESC, usage_count DESC`
      );

      const patterns = result.rows.map(row => this.rowToPattern(row));

      // Cache patterns in memory
      this.patterns.clear();
      for (const pattern of patterns) {
        this.patterns.set(pattern.patternId, pattern);
      }

      // Cache in Redis for next time
      await this.cache.setActivePatterns(patterns);

      logger.info(`Loaded ${patterns.length} active patterns from database`);

      return patterns;
    } catch (error) {
      logger.error('Failed to load patterns', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get pattern by ID
   * Checks in-memory cache, then Redis, then database
   */
  async getPattern(patternId: string): Promise<DiscoveryPattern | null> {
    // Check in-memory cache first (fastest)
    if (this.patterns.has(patternId)) {
      return this.patterns.get(patternId)!;
    }

    // Check Redis cache second
    const cached = await this.cache.getPattern(patternId);
    if (cached) {
      // Update in-memory cache
      this.patterns.set(patternId, cached);
      logger.debug('Pattern loaded from Redis cache', { patternId });
      return cached;
    }

    // Load from database as last resort
    const client = await this.postgresClient.getClient();

    try {
      const result = await client.query(
        `SELECT * FROM ai_discovery_patterns WHERE pattern_id = $1`,
        [patternId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const pattern = this.rowToPattern(result.rows[0]);

      // Cache in Redis and memory for next time
      await this.cache.setPattern(pattern);
      this.patterns.set(patternId, pattern);

      return pattern;
    } catch (error) {
      logger.error('Failed to get pattern', { patternId, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Save new pattern
   */
  async savePattern(pattern: Omit<DiscoveryPattern, 'id'>): Promise<DiscoveryPattern> {
    const client = await this.postgresClient.getClient();

    try {
      const result = await client.query(
        `INSERT INTO ai_discovery_patterns (
          pattern_id, name, version, category,
          detection_code, discovery_code,
          description, author, license,
          confidence_score,
          learned_from_sessions, ai_model,
          status, is_active,
          test_cases
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          pattern.patternId,
          pattern.name,
          pattern.version,
          pattern.category,
          pattern.detectionCode,
          pattern.discoveryCode,
          pattern.description,
          pattern.author,
          pattern.license,
          pattern.confidenceScore,
          pattern.learnedFromSessions ? JSON.stringify(pattern.learnedFromSessions) : null,
          pattern.aiModel,
          pattern.status,
          pattern.isActive,
          pattern.testCases ? JSON.stringify(pattern.testCases) : null,
        ]
      );

      const savedPattern = this.rowToPattern(result.rows[0]);

      // Update in-memory and Redis cache
      this.patterns.set(savedPattern.patternId, savedPattern);
      await this.cache.setPattern(savedPattern);

      // Invalidate the pattern list cache (so it gets refreshed with new pattern)
      await this.cache.invalidatePattern(savedPattern.patternId);

      logger.info('Pattern saved', {
        patternId: savedPattern.patternId,
        version: savedPattern.version,
      });

      return savedPattern;
    } catch (error) {
      logger.error('Failed to save pattern', { pattern, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update pattern
   */
  async updatePattern(
    patternId: string,
    updates: Partial<DiscoveryPattern>
  ): Promise<void> {
    const client = await this.postgresClient.getClient();

    try {
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        setClauses.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }
      if (updates.detectionCode !== undefined) {
        setClauses.push(`detection_code = $${paramIndex++}`);
        values.push(updates.detectionCode);
      }
      if (updates.discoveryCode !== undefined) {
        setClauses.push(`discovery_code = $${paramIndex++}`);
        values.push(updates.discoveryCode);
      }
      if (updates.status !== undefined) {
        setClauses.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }
      if (updates.isActive !== undefined) {
        setClauses.push(`is_active = $${paramIndex++}`);
        values.push(updates.isActive);
      }

      setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

      values.push(patternId);

      await client.query(
        `UPDATE ai_discovery_patterns
         SET ${setClauses.join(', ')}
         WHERE pattern_id = $${paramIndex}`,
        values
      );

      // Invalidate in-memory and Redis cache
      this.patterns.delete(patternId);
      await this.cache.invalidatePattern(patternId);

      logger.info('Pattern updated', { patternId });
    } catch (error) {
      logger.error('Failed to update pattern', { patternId, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Record pattern usage
   */
  async recordUsage(
    patternId: string,
    sessionId: string,
    success: boolean,
    executionTimeMs: number,
    confidenceScore?: number,
    errorMessage?: string
  ): Promise<void> {
    const client = await this.postgresClient.getClient();

    try {
      await client.query(
        `INSERT INTO ai_pattern_usage (
          pattern_id, session_id, success, execution_time_ms,
          confidence_score, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [patternId, sessionId, success, executionTimeMs, confidenceScore, errorMessage]
      );

      logger.debug('Pattern usage recorded', {
        patternId,
        sessionId,
        success,
        executionTimeMs,
      });
    } catch (error) {
      logger.error('Failed to record pattern usage', { patternId, sessionId, error });
      // Don't throw - this is non-critical
    } finally {
      client.release();
    }
  }

  /**
   * Get patterns by category
   */
  async getPatternsByCategory(category: string): Promise<DiscoveryPattern[]> {
    const client = await this.postgresClient.getClient();

    try {
      const result = await client.query(
        `SELECT * FROM ai_discovery_patterns
         WHERE category = $1 AND is_active = true
         ORDER BY confidence_score DESC`,
        [category]
      );

      return result.rows.map(row => this.rowToPattern(row));
    } catch (error) {
      logger.error('Failed to get patterns by category', { category, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Convert database row to DiscoveryPattern
   */
  private rowToPattern(row: any): DiscoveryPattern {
    return {
      id: row.id,
      patternId: row.pattern_id,
      name: row.name,
      version: row.version,
      category: row.category,
      detectionCode: row.detection_code,
      discoveryCode: row.discovery_code,
      description: row.description,
      author: row.author,
      license: row.license,
      confidenceScore: parseFloat(row.confidence_score),
      usageCount: row.usage_count,
      successCount: row.success_count,
      failureCount: row.failure_count,
      avgExecutionTimeMs: row.avg_execution_time_ms,
      learnedFromSessions: row.learned_from_sessions || [],
      aiModel: row.ai_model,
      status: row.status,
      isActive: row.is_active,
      registryUrl: row.registry_url,
      communityUpvotes: row.community_upvotes,
      communityDownvotes: row.community_downvotes,
      testCases: row.test_cases || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      approvedAt: row.approved_at,
      approvedBy: row.approved_by,
    };
  }

  /**
   * Get all cached patterns (for quick access)
   */
  getCachedPatterns(): DiscoveryPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Warm up cache with active patterns
   * Call this during application startup for better initial performance
   */
  async warmupCache(): Promise<void> {
    try {
      const patterns = await this.loadPatterns();
      await this.cache.warmup(patterns);
      logger.info('Pattern cache warmed up', { count: patterns.length });
    } catch (error) {
      logger.error('Failed to warm up cache', { error });
      // Don't throw - this is optional optimization
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    return this.cache.getStats();
  }
}
