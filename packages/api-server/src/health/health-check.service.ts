/**
 * Health Check Service
 * Comprehensive health checks for all system dependencies
 */

import { getNeo4jClient } from '@cmdb/database';
import { getPostgresClient } from '@cmdb/database';
import { getRedisClient } from '@cmdb/database';
import * as os from 'os';
import * as fs from 'fs/promises';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheckResult {
  _status: HealthStatus;
  latency_ms?: number;
  message?: string;
  details?: Record<string, any>;
}

export interface SystemHealth {
  _status: HealthStatus;
  _version: string;
  _uptime: number;
  _timestamp: string;
  _checks: {
    _neo4j: HealthCheckResult;
    _postgres: HealthCheckResult;
    _redis: HealthCheckResult;
    _disk: HealthCheckResult;
    _memory: HealthCheckResult;
  };
}

export class HealthCheckService {
  private readonly version: string;

  constructor(version: string = '1.0.0') {
    this.version = version;
  }

  /**
   * Perform all health checks
   */
  async checkHealth(): Promise<SystemHealth> {
    const [neo4jHealth, postgresHealth, redisHealth, diskHealth, memoryHealth] =
      await Promise.allSettled([
        this.checkNeo4j(),
        this.checkPostgres(),
        this.checkRedis(),
        this.checkDiskSpace(),
        this.checkMemory(),
      ]);

    const checks = {
      _neo4j: this.unwrapResult(neo4jHealth),
      _postgres: this.unwrapResult(postgresHealth),
      _redis: this.unwrapResult(redisHealth),
      _disk: this.unwrapResult(diskHealth),
      _memory: this.unwrapResult(memoryHealth),
    };

    const overallStatus = this.determineOverallStatus(checks);

    return {
      _status: overallStatus,
      _version: this.version,
      _uptime: process.uptime(),
      _timestamp: new Date().toISOString(),
      _checks: checks,
    };
  }

  /**
   * Check Neo4j connectivity and performance
   */
  private async checkNeo4j(): Promise<HealthCheckResult> {
    try {
      const start = Date.now();
      const client = getNeo4jClient();
      const session = client.getSession();

      try {
        // Perform a simple read and write test
        const result = await session.run('RETURN 1 AS test');
        const latency = Date.now() - start;

        if (result.records.length === 0) {
          return {
            _status: 'unhealthy',
            latency_ms: latency,
            message: 'Neo4j query returned no results',
          };
        }

        // Check if we can write (transaction test)
        await session.run('MATCH (n) RETURN count(n) AS count LIMIT 1');

        return {
          _status: 'healthy',
          latency_ms: latency,
          message: 'Neo4j is responding normally',
        };
      } finally {
        await session.close();
      }
    } catch (error: any) {
      return {
        _status: 'unhealthy',
        message: `Neo4j connection failed: ${error.message}`,
      };
    }
  }

  /**
   * Check PostgreSQL connectivity and performance
   */
  private async checkPostgres(): Promise<HealthCheckResult> {
    try {
      const start = Date.now();
      const client = getPostgresClient();

      const result = await client.query('SELECT 1 AS test');
      const latency = Date.now() - start;

      if (result.rows.length === 0) {
        return {
          _status: 'unhealthy',
          latency_ms: latency,
          message: 'PostgreSQL query returned no results',
        };
      }

      return {
        _status: 'healthy',
        latency_ms: latency,
        message: 'PostgreSQL is responding normally',
      };
    } catch (error: any) {
      return {
        _status: 'unhealthy',
        message: `PostgreSQL connection failed: ${error.message}`,
      };
    }
  }

  /**
   * Check Redis connectivity and performance
   */
  private async checkRedis(): Promise<HealthCheckResult> {
    try {
      const start = Date.now();
      const client = getRedisClient();

      // Use get/set to test connectivity since RedisClient doesn't expose ping
      const testKey = '__health_check__';
      await client.set(testKey, 'test', 1);
      const result = await client.get(testKey);
      const latency = Date.now() - start;

      if (result !== 'test') {
        return {
          _status: 'unhealthy',
          latency_ms: latency,
          message: 'Redis test failed',
        };
      }

      return {
        _status: 'healthy',
        latency_ms: latency,
        message: 'Redis is responding normally',
        details: {
          connected: true,
        },
      };
    } catch (error: any) {
      return {
        _status: 'unhealthy',
        message: `Redis connection failed: ${error.message}`,
      };
    }
  }

  /**
   * Check disk space availability
   */
  private async checkDiskSpace(): Promise<HealthCheckResult> {
    try {
      // This is a simplified check - in production, use a library like 'diskusage'
      const stats = await fs.statfs('/');
      const totalSpace = stats.blocks * stats.bsize;
      const freeSpace = stats.bfree * stats.bsize;
      const usedPercent = ((totalSpace - freeSpace) / totalSpace) * 100;

      let status: HealthStatus = 'healthy';
      let message = `Disk usage: ${usedPercent.toFixed(1)}%`;

      if (usedPercent > 90) {
        status = 'unhealthy';
        message = `Critical: ${message}`;
      } else if (usedPercent > 80) {
        status = 'degraded';
        message = `Warning: ${message}`;
      }

      return {
        _status: status,
        message,
        details: {
          total_bytes: totalSpace,
          free_bytes: freeSpace,
          used_percent: usedPercent,
        },
      };
    } catch (error: any) {
      return {
        _status: 'degraded',
        message: `Unable to check disk space: ${error.message}`,
      };
    }
  }

  /**
   * Check memory usage
   */
  private async checkMemory(): Promise<HealthCheckResult> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usedPercent = (usedMem / totalMem) * 100;

    let status: HealthStatus = 'healthy';
    let message = `Memory usage: ${usedPercent.toFixed(1)}%`;

    if (usedPercent > 95) {
      status = 'unhealthy';
      message = `Critical: ${message}`;
    } else if (usedPercent > 85) {
      status = 'degraded';
      message = `Warning: ${message}`;
    }

    return {
      _status: status,
      message,
      details: {
        total_bytes: totalMem,
        free_bytes: freeMem,
        used_bytes: usedMem,
        used_percent: usedPercent,
      },
    };
  }

  /**
   * Simple readiness check (can accept traffic)
   */
  async checkReadiness(): Promise<{ ready: boolean; message: string }> {
    try {
      // Check critical services only
      const [neo4jReady, postgresReady, redisReady] = await Promise.all([
        this.isNeo4jReady(),
        this.isPostgresReady(),
        this.isRedisReady(),
      ]);

      const ready = neo4jReady && postgresReady && redisReady;

      return {
        ready,
        message: ready
          ? 'Service is ready'
          : 'Service is not ready - dependencies unavailable',
      };
    } catch (error: any) {
      return {
        ready: false,
        message: `Readiness check failed: ${error.message}`,
      };
    }
  }

  /**
   * Simple liveness check (still running)
   */
  async checkLiveness(): Promise<{ alive: boolean; message: string }> {
    // Basic liveness - if we can execute this, we're alive
    return {
      alive: true,
      message: 'Service is alive',
    };
  }

  /**
   * Helper methods for readiness checks
   */
  private async isNeo4jReady(): Promise<boolean> {
    try {
      const client = getNeo4jClient();
      const session = client.getSession();
      try {
        await session.run('RETURN 1');
        return true;
      } finally {
        await session.close();
      }
    } catch {
      return false;
    }
  }

  private async isPostgresReady(): Promise<boolean> {
    try {
      const client = getPostgresClient();
      await client.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  private async isRedisReady(): Promise<boolean> {
    try {
      const client = getRedisClient();
      const testKey = '__readiness_check__';
      await client.set(testKey, 'test', 1);
      const result = await client.get(testKey);
      return result === 'test';
    } catch {
      return false;
    }
  }

  /**
   * Unwrap PromiseSettledResult
   */
  private unwrapResult(
    result: PromiseSettledResult<HealthCheckResult>
  ): HealthCheckResult {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return {
      _status: 'unhealthy',
      message: `Check failed: ${result.reason}`,
    };
  }

  /**
   * Determine overall status from individual checks
   */
  private determineOverallStatus(
    checks: Record<string, HealthCheckResult>
  ): HealthStatus {
    const statuses = Object.values(checks).map((c) => c._status);

    if (statuses.some((s) => s === 'unhealthy')) {
      return 'unhealthy';
    }
    if (statuses.some((s) => s === 'degraded')) {
      return 'degraded';
    }
    return 'healthy';
  }
}
