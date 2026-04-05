// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Jobs API Routes
 *
 * This module defines all REST API routes for job management and queue monitoring.
 */

import { Router } from 'express';
import { jobsController } from '../controllers/jobs.controller';
import { queueController } from '../controllers/queue.controller';

const router = Router();

// Job Management Routes
// IMPORTANT: More specific routes must come BEFORE generic parameterized routes
// to avoid route conflicts (e.g., /jobs/stats vs /jobs/:queueName)

// Job statistics (specific routes first)
router.get('/jobs/stats', (req, res) => jobsController.getJobStats(req, res));

// Schedule management (specific routes)
router.get('/jobs/schedules/discovery', (req, res) =>
  jobsController.getDiscoverySchedules(req, res)
);
router.get('/jobs/schedules/etl', (req, res) =>
  jobsController.getETLSchedules(req, res)
);
router.put('/jobs/schedules/discovery/:provider', (req, res) =>
  jobsController.updateDiscoverySchedule(req, res)
);
router.put('/jobs/schedules/etl/:type', (req, res) =>
  jobsController.updateETLSchedule(req, res)
);

// Discovery jobs (specific routes)
router.get('/jobs/discovery/stats', (req, res) =>
  jobsController.getDiscoveryStats(req, res)
);
router.get('/jobs/discovery', (req, res) =>
  jobsController.listDiscoveryJobs(req, res)
);
router.post('/jobs/discovery/:provider', (req, res) =>
  jobsController.triggerDiscovery(req, res)
);

// ETL jobs (specific routes)
router.post('/jobs/etl/:type', (req, res) => jobsController.triggerETL(req, res));

// Queue-specific routes (must come after /jobs/discovery/stats to avoid conflicts)
router.get('/jobs/:queueName/failed', (req, res) =>
  jobsController.getFailedJobs(req, res)
);
router.post('/jobs/:queueName/clean', (req, res) =>
  jobsController.cleanQueue(req, res)
);

// Generic job routes (MUST be last due to :queueName and :jobId parameters)
router.get('/jobs/:queueName/:jobId', (req, res) =>
  jobsController.getJobStatus(req, res)
);
router.get('/jobs/:queueName', (req, res) => jobsController.listJobs(req, res));
router.delete('/jobs/:queueName/:jobId', (req, res) =>
  jobsController.cancelJob(req, res)
);
router.post('/jobs/:queueName/:jobId/retry', (req, res) =>
  jobsController.retryJob(req, res)
);

// Queue Monitoring Routes
router.get('/queues/stats', (req, res) =>
  queueController.getAllQueueStats(req, res)
);
router.get('/queues/:queueName/stats', (req, res) =>
  queueController.getQueueStats(req, res)
);
router.get('/queues/:queueName/metrics', (req, res) =>
  queueController.getQueueMetrics(req, res)
);
router.get('/queues/workers/status', (req, res) =>
  queueController.getAllWorkerStatus(req, res)
);
router.get('/queues/health', (req, res) =>
  queueController.getQueueHealth(req, res)
);

// Queue control
router.post('/queues/:queueName/pause', (req, res) =>
  queueController.pauseQueue(req, res)
);
router.post('/queues/:queueName/resume', (req, res) =>
  queueController.resumeQueue(req, res)
);

// Job logs
router.get('/queues/:queueName/jobs/:jobId/logs', (req, res) =>
  queueController.getJobLogs(req, res)
);

export default router;
