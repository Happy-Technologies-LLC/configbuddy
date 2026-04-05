// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Queue Monitoring Controller
 *
 * This module provides REST API endpoints for queue monitoring and metrics:
 * - Queue statistics and health
 * - Worker status
 * - Job latency metrics
 * - Failed job inspection
 */

import { Request, Response } from 'express';
import { getQueueManager, QUEUE_NAMES, logger } from '@cmdb/common';
import { getDiscoveryWorkerManager } from '@cmdb/discovery-engine';
import { getETLWorkerManager } from '@cmdb/etl-processor';

/**
 * Queue Monitoring Controller
 */
export class QueueController {
  private queueManager = getQueueManager();

  /**
   * GET /api/v1/queues/stats
   * Get statistics for all queues
   */
  async getAllQueueStats(_req: Request, res: Response): Promise<void> {
    try {
      const queueNames = Object.values(QUEUE_NAMES);

      const stats = await Promise.all(
        queueNames.map(async (queueName) => {
          try {
            const queueStats = await this.queueManager.getQueueStats(queueName);
            const queue = this.queueManager.getQueue(queueName);

            // Get additional metrics
            const isPaused = await queue.isPaused();
            const jobCounts = await queue.getJobCounts();

            return {
              ...queueStats,
              isPaused,
              jobCounts,
            };
          } catch (err: any) {
            logger.error(`Error getting stats for ${queueName}`, err);
            return {
              queueName,
              _error: err.message,
            };
          }
        })
      );

      // Calculate aggregate statistics
      const aggregate = {
        _totalQueues: queueNames.length,
        _totalWaiting: stats.reduce((sum: number, s: any) => sum + (s['waiting'] || 0), 0),
        _totalActive: stats.reduce((sum: number, s: any) => sum + (s['active'] || 0), 0),
        _totalCompleted: stats.reduce((sum: number, s: any) => sum + (s['completed'] || 0), 0),
        _totalFailed: stats.reduce((sum: number, s: any) => sum + (s['failed'] || 0), 0),
        _totalDelayed: stats.reduce((sum: number, s: any) => sum + (s['delayed'] || 0), 0),
      };

      res.json({
        _success: true,
        _data: {
          _queues: stats,
          aggregate,
        },
      });
    } catch (err: any) {
      logger.error('Error getting queue stats', err);
      res.status(500).json({
        _success: false,
        _error: err.message,
      });
    }
  }

  /**
   * GET /api/v1/queues/:queueName/stats
   * Get statistics for a specific queue
   */
  async getQueueStats(req: Request, res: Response): Promise<void> {
    try {
      const { queueName } = req.params;

      if (!queueName) {
        res.status(400).json({
          success: false,
          error: 'Queue name is required',
        });
        return;
      }

      const queueStats = await this.queueManager.getQueueStats(queueName);
      const queue = this.queueManager.getQueue(queueName);

      // Get detailed metrics
      const isPaused = await queue.isPaused();
      const jobCounts = await queue.getJobCounts();
      const repeatableJobs = await queue.getRepeatableJobs();

      // Get recent jobs
      const recentCompleted = await queue.getCompleted(0, 9);
      const recentFailed = await queue.getFailed(0, 9);

      res.json({
        _success: true,
        _data: {
          queueName,
          _stats: queueStats,
          isPaused,
          jobCounts,
          _repeatableJobs: repeatableJobs.map((job: any) => ({
            _key: job.key,
            _name: job.name,
            _pattern: job.pattern,
            _next: job.next,
          })),
          _recentCompleted: recentCompleted.map((job: any) => ({
            _id: job.id,
            _name: job.name,
            _timestamp: job.timestamp,
            _finishedOn: job.finishedOn,
          })),
          _recentFailed: recentFailed.map((job: any) => ({
            _id: job.id,
            _name: job.name,
            _failedReason: job.failedReason,
            _timestamp: job.timestamp,
            _finishedOn: job.finishedOn,
          })),
        },
      });
    } catch (err: any) {
      logger.error('Error getting queue stats', err);
      res.status(500).json({
        _success: false,
        _error: err.message,
      });
    }
  }

  /**
   * GET /api/v1/queues/workers/status
   * Get status of all workers
   */
  async getAllWorkerStatus(_req: Request, res: Response): Promise<void> {
    try {
      const discoveryWorkerManager = getDiscoveryWorkerManager();
      const etlWorkerManager = getETLWorkerManager();

      const discoveryHealth = await discoveryWorkerManager.getAllWorkerStatuses();
      const etlHealth = await etlWorkerManager.getAllWorkerStatuses();

      // DiscoveryWorkerManager returns an array, ETLWorkerManager returns WorkerHealthStatus
      // Calculate overall health based on the structure
      const discoveryHealthy = Array.isArray(discoveryHealth)
        ? discoveryHealth.every((w: any) => w._isRunning)
        : (discoveryHealth as any).healthy;
      const etlHealthy = (etlHealth as any).healthy;

      res.json({
        success: true,
        data: {
          discovery: discoveryHealth,
          etl: etlHealth,
          overallHealthy: discoveryHealthy && etlHealthy,
        },
      });
    } catch (err: any) {
      logger.error('Error getting worker status', err);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }

  /**
   * GET /api/v1/queues/:queueName/metrics
   * Get detailed metrics for a queue (latency, throughput)
   */
  async getQueueMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { queueName } = req.params;

      if (!queueName) {
        res.status(400).json({
          success: false,
          error: 'Queue name is required',
        });
        return;
      }

      const queue = this.queueManager.getQueue(queueName);

      // Get completed jobs for metrics calculation
      const completedJobs = await queue.getCompleted(0, 99);

      // Calculate latency metrics
      const latencies = completedJobs
        .filter((job: any) => job['processedOn'] && job['finishedOn'])
        .map((job: any) => job['finishedOn'] - job['processedOn']);

      const avgLatency =
        latencies.length > 0
          ? latencies.reduce((sum: number, lat: number) => sum + lat, 0) / latencies.length
          : 0;

      const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
      const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;

      // Calculate throughput (jobs per minute)
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const recentJobs = completedJobs.filter(
        (job: any) => job['finishedOn'] && job['finishedOn'] > oneHourAgo
      );
      const throughput = (recentJobs.length / 60).toFixed(2); // jobs per minute

      res.json({
        _success: true,
        _data: {
          queueName,
          _metrics: {
            _latency: {
              _avg: Math.round(avgLatency),
              _min: Math.round(minLatency),
              _max: Math.round(maxLatency),
              _unit: 'ms',
            },
            _throughput: {
              _value: parseFloat(throughput),
              _unit: 'jobs/min',
            },
            _completedJobs: completedJobs.length,
            _timeWindow: '1 hour',
          },
        },
      });
    } catch (err: any) {
      logger.error('Error getting queue metrics', err);
      res.status(500).json({
        _success: false,
        _error: err.message,
      });
    }
  }

  /**
   * POST /api/v1/queues/:queueName/pause
   * Pause a queue
   */
  async pauseQueue(req: Request, res: Response): Promise<void> {
    try {
      const { queueName } = req.params;

      if (!queueName) {
        res.status(400).json({
          success: false,
          error: 'Queue name is required',
        });
        return;
      }

      const queue = this.queueManager.getQueue(queueName);

      await queue.pause();

      logger.info(`Queue ${queueName} paused`);

      res.json({
        _success: true,
        _data: {
          queueName,
          _message: 'Queue paused successfully',
        },
      });
    } catch (err: any) {
      logger.error('Error pausing queue', err);
      res.status(500).json({
        _success: false,
        _error: err.message,
      });
    }
  }

  /**
   * POST /api/v1/queues/:queueName/resume
   * Resume a paused queue
   */
  async resumeQueue(req: Request, res: Response): Promise<void> {
    try {
      const { queueName } = req.params;

      if (!queueName) {
        res.status(400).json({
          success: false,
          error: 'Queue name is required',
        });
        return;
      }

      const queue = this.queueManager.getQueue(queueName);

      await queue.resume();

      logger.info(`Queue ${queueName} resumed`);

      res.json({
        _success: true,
        _data: {
          queueName,
          _message: 'Queue resumed successfully',
        },
      });
    } catch (err: any) {
      logger.error('Error resuming queue', err);
      res.status(500).json({
        _success: false,
        _error: err.message,
      });
    }
  }

  /**
   * GET /api/v1/queues/health
   * Get overall queue system health
   */
  async getQueueHealth(_req: Request, res: Response): Promise<void> {
    try {
      const queueNames = Object.values(QUEUE_NAMES);

      const healthChecks = await Promise.all(
        queueNames.map(async (queueName) => {
          try {
            const queue = this.queueManager.getQueue(queueName);
            const jobCounts = await queue.getJobCounts();
            const isPaused = await queue.isPaused();

            // Determine health status
            let status = 'healthy';
            const issues: string[] = [];

            if (isPaused) {
              status = 'warning';
              issues.push('Queue is paused');
            }

            if ((jobCounts['failed'] as number) > 100) {
              status = 'degraded';
              issues.push(`High number of failed jobs: ${jobCounts['failed']}`);
            }

            if ((jobCounts['waiting'] as number) > 1000) {
              status = 'warning';
              issues.push(`High number of waiting jobs: ${jobCounts['waiting']}`);
            }

            return {
              queueName,
              status,
              issues,
              jobCounts,
            };
          } catch (err: any) {
            return {
              queueName,
              _status: 'unhealthy',
              _issues: [err.message],
            };
          }
        })
      );

      // Determine overall health
      const unhealthyCount = healthChecks.filter(
        (hc) => hc.status === 'unhealthy'
      ).length;
      const degradedCount = healthChecks.filter(
        (hc) => hc.status === 'degraded'
      ).length;

      let overallStatus = 'healthy';
      if (unhealthyCount > 0) {
        overallStatus = 'unhealthy';
      } else if (degradedCount > 0) {
        overallStatus = 'degraded';
      }

      res.json({
        _success: true,
        _data: {
          overallStatus,
          _queues: healthChecks,
          _summary: {
            _total: queueNames.length,
            _healthy: healthChecks.filter((hc) => hc.status === 'healthy')
              .length,
            _warning: healthChecks.filter((hc) => hc.status === 'warning')
              .length,
            _degraded: degradedCount,
            _unhealthy: unhealthyCount,
          },
        },
      });
    } catch (err: any) {
      logger.error('Error getting queue health', err);
      res.status(500).json({
        _success: false,
        _error: err.message,
      });
    }
  }

  /**
   * GET /api/v1/queues/:queueName/jobs/:jobId/logs
   * Get logs for a specific job
   */
  async getJobLogs(req: Request, res: Response): Promise<void> {
    try {
      const { queueName, jobId } = req.params;

      if (!queueName || !jobId) {
        res.status(400).json({
          success: false,
          error: 'Queue name and job ID are required',
        });
        return;
      }

      const job = await this.queueManager.getJob(queueName, jobId);

      if (!job) {
        res.status(404).json({
          _success: false,
          _error: `Job ${jobId} not found in queue ${queueName}`,
        });
        return;
      }

      // Get job logs (if available)
      const logs = await job.log;

      res.json({
        _success: true,
        _data: {
          jobId,
          queueName,
          logs,
        },
      });
    } catch (err: any) {
      logger.error('Error getting job logs', err);
      res.status(500).json({
        _success: false,
        _error: err.message,
      });
    }
  }
}

// Export singleton instance
export const queueController = new QueueController();
