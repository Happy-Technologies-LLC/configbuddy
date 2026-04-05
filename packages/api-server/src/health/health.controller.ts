// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Health Check Controller
 * Express routes for health, readiness, liveness, and metrics endpoints
 */

import { Request, Response } from 'express';
import { HealthCheckService } from './health-check.service';
import { getNeo4jClient } from '@cmdb/database';
import { getRedisClient } from '@cmdb/database';
import { getLogger } from '@cmdb/common';

const logger = getLogger();

export class HealthController {
  private healthService: HealthCheckService;

  constructor() {
    this.healthService = new HealthCheckService(process.env['APP_VERSION'] || '1.0.0');
  }

  /**
   * GET /health - Comprehensive health check
   */
  async getHealth(_req: Request, res: Response): Promise<void> {
    try {
      const health = await this.healthService.checkHealth();

      const statusCode = this.getStatusCode(health._status);
      res.status(statusCode).json(health);
    } catch (error: any) {
      res.status(503).json({
        _status: 'unhealthy',
        _message: `Health check failed: ${error.message}`,
        _timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /ready - Readiness check (can accept traffic)
   */
  async getReadiness(_req: Request, res: Response): Promise<void> {
    try {
      const readiness = await this.healthService.checkReadiness();

      res.status(readiness.ready ? 200 : 503).json({
        _ready: readiness.ready,
        _message: readiness.message,
        _timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(503).json({
        _ready: false,
        _message: `Readiness check failed: ${error.message}`,
        _timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /alive - Liveness check (still running)
   */
  async getLiveness(_req: Request, res: Response): Promise<void> {
    try {
      const liveness = await this.healthService.checkLiveness();

      res.status(liveness.alive ? 200 : 503).json({
        _alive: liveness.alive,
        _message: liveness.message,
        _timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(503).json({
        _alive: false,
        _message: `Liveness check failed: ${error.message}`,
        _timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /health/metrics - System metrics summary
   */
  async getMetrics(_req: Request, res: Response): Promise<void> {
    try {
      const neo4j = getNeo4jClient();
      const session = neo4j.getSession();

      try {
        // Get total CIs and relationships
        const ciResult = await session.run(`
          MATCH (ci:CI)
          RETURN count(ci) as totalCIs
        `);

        const relResult = await session.run(`
          MATCH ()-[r]->()
          RETURN count(r) as totalRelationships
        `);

        // Get anomalies count (from last 24 hours)
        const anomalyResult = await session.run(`
          MATCH (a:Anomaly)
          WHERE a.detected_at > datetime() - duration({hours: 24})
          RETURN count(a) as recentAnomalies
        `);

        // Get drift count
        const driftResult = await session.run(`
          MATCH (d:ConfigurationDrift)
          WHERE d.detected_at > datetime() - duration({hours: 24})
          RETURN count(d) as driftDetected
        `);

        // Get high risk changes
        const highRiskResult = await session.run(`
          MATCH (c:Change)
          WHERE c.risk_level = 'high' AND c.created_at > datetime() - duration({hours: 24})
          RETURN count(c) as highRiskChanges
        `);

        const totalCIs = ciResult.records[0]?.get('totalCIs').toNumber() || 0;
        const totalRelationships = relResult.records[0]?.get('totalRelationships').toNumber() || 0;
        const recentAnomalies = anomalyResult.records[0]?.get('recentAnomalies').toNumber() || 0;
        const driftDetected = driftResult.records[0]?.get('driftDetected').toNumber() || 0;
        const highRiskChanges = highRiskResult.records[0]?.get('highRiskChanges').toNumber() || 0;

        // Mock connector data (would come from discovery service in real implementation)
        const activeConnectors = 5;
        const connectorSuccessRate = 94.5;

        res.json({
          total_cis: totalCIs,
          total_relationships: totalRelationships,
          active_connectors: activeConnectors,
          recent_anomalies: recentAnomalies,
          high_risk_changes: highRiskChanges,
          drift_detected: driftDetected,
          connector_success_rate: connectorSuccessRate,
          last_updated: new Date().toISOString(),
        });
      } finally {
        await session.close();
      }
    } catch (error: any) {
      logger.error('Failed to fetch metrics', error, {
        operation: 'getMetrics',
        endpoint: '/health/metrics',
      });
      res.status(500).json({
        error: 'Failed to fetch metrics',
        message: error.message,
      });
    }
  }

  /**
   * GET /health/services - Service health status
   */
  async getServices(_req: Request, res: Response): Promise<void> {
    try {
      const services = [];

      // Check Neo4j
      try {
        const neo4j = getNeo4jClient();
        const session = neo4j.getSession();
        const start = Date.now();
        await session.run('RETURN 1');
        const responseTime = Date.now() - start;
        await session.close();

        services.push({
          service: 'Neo4j',
          status: 'healthy' as const,
          last_check: new Date().toISOString(),
          response_time_ms: responseTime,
        });
      } catch (error) {
        services.push({
          service: 'Neo4j',
          status: 'down' as const,
          last_check: new Date().toISOString(),
        });
      }

      // Check Redis
      try {
        const redis = getRedisClient();
        const start = Date.now();
        await redis.set('health:check', 'ok', 10);
        await redis.get('health:check');
        const responseTime = Date.now() - start;

        services.push({
          service: 'Redis',
          status: 'healthy' as const,
          last_check: new Date().toISOString(),
          response_time_ms: responseTime,
        });
      } catch (error) {
        services.push({
          service: 'Redis',
          status: 'down' as const,
          last_check: new Date().toISOString(),
        });
      }

      // Add other services (mock data for now)
      services.push(
        {
          service: 'PostgreSQL',
          status: 'healthy' as const,
          last_check: new Date().toISOString(),
          response_time_ms: 15,
        },
        {
          service: 'Discovery Engine',
          status: 'healthy' as const,
          last_check: new Date().toISOString(),
          response_time_ms: 8,
        },
        {
          service: 'ETL Processor',
          status: 'healthy' as const,
          last_check: new Date().toISOString(),
          response_time_ms: 12,
        }
      );

      res.json(services);
    } catch (error: any) {
      logger.error('Failed to fetch service health', error, {
        operation: 'getServices',
        endpoint: '/health/services',
      });
      res.status(500).json({
        error: 'Failed to fetch service health',
        message: error.message,
      });
    }
  }

  /**
   * GET /health/timeseries - Time-series metrics data
   */
  async getTimeSeries(req: Request, res: Response): Promise<void> {
    try {
      const hours = parseInt(req.query['hours'] as string) || 24;
      const neo4j = getNeo4jClient();
      const session = neo4j.getSession();

      try {
        // Determine interval and format based on time range
        let interval: number; // in hours
        let formatType: 'hour' | 'date' | 'month';

        if (hours <= 24) {
          // 24 hours: show hourly data with time format (HH:MM)
          interval = 4;
          formatType = 'hour';
        } else if (hours <= 2160) {
          // 90 days: show data every 3 days with date format (MM/DD)
          interval = 24 * 3; // every 3 days (30 data points over 90 days)
          formatType = 'date';
        } else {
          // 1 year: show monthly data with month format (MMM YYYY)
          interval = 24 * 30; // monthly (approximate)
          formatType = 'month';
        }

        const timeSeries = [];
        const now = new Date();

        for (let i = hours; i >= 0; i -= interval) {
          const time = new Date(now.getTime() - i * 60 * 60 * 1000);

          // Format time label based on range
          let timeLabel: string;
          if (formatType === 'hour') {
            timeLabel = time.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            });
          } else if (formatType === 'date') {
            timeLabel = time.toLocaleDateString('en-US', {
              month: '2-digit',
              day: '2-digit'
            });
          } else {
            timeLabel = time.toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric'
            });
          }

          // Get CI count at this time (simplified - would use time-series table in production)
          const ciResult = await session.run(`
            MATCH (ci:CI)
            WHERE ci.created_at <= datetime($time)
            RETURN count(ci) as cis
          `, { time: time.toISOString() });

          // Get anomalies detected around this time
          const windowSize = interval * 60 * 60 * 1000; // Convert interval to milliseconds
          const anomalyResult = await session.run(`
            MATCH (a:Anomaly)
            WHERE a.detected_at >= datetime($startTime)
              AND a.detected_at < datetime($endTime)
            RETURN count(a) as anomalies
          `, {
            startTime: new Date(time.getTime() - windowSize).toISOString(),
            endTime: time.toISOString(),
          });

          timeSeries.push({
            time: timeLabel,
            cis: ciResult.records[0]?.get('cis').toNumber() || 0,
            anomalies: anomalyResult.records[0]?.get('anomalies').toNumber() || 0,
          });
        }

        res.json(timeSeries);
      } finally {
        await session.close();
      }
    } catch (error: any) {
      logger.error('Failed to fetch time-series data', error, {
        operation: 'getTimeSeries',
        endpoint: '/health/timeseries',
        hours: parseInt((error as any).req?.query?.hours) || 'unknown',
      });
      res.status(500).json({
        error: 'Failed to fetch time-series data',
        message: error.message,
      });
    }
  }

  /**
   * Map health status to HTTP status code
   */
  private getStatusCode(status: string): number {
    switch (status) {
      case 'healthy':
        return 200;
      case 'degraded':
        return 200; // Still accepting traffic
      case 'unhealthy':
        return 503;
      default:
        return 500;
    }
  }
}
