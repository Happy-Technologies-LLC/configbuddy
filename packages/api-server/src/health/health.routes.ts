// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Health Check Routes
 * Express router configuration for health endpoints
 */

import { Router } from 'express';
import { HealthController } from './health.controller';

const router = Router();
const healthController = new HealthController();

/**
 * GET / - Comprehensive health check
 * Returns detailed health status of all system components
 * Accessible at: /api/v1/health
 */
router.get('/', (req, res) => healthController.getHealth(req, res));

/**
 * GET /ready - Readiness probe
 * Returns 200 if service is ready to accept traffic
 * Accessible at: /api/v1/health/ready
 */
router.get('/ready', (req, res) => healthController.getReadiness(req, res));

/**
 * GET /alive - Liveness probe
 * Returns 200 if service is alive and running
 * Accessible at: /api/v1/health/alive
 */
router.get('/alive', (req, res) => healthController.getLiveness(req, res));

/**
 * GET /metrics - System metrics summary
 * Returns aggregated metrics for the health dashboard
 * Accessible at: /api/v1/health/metrics
 */
router.get('/metrics', (req, res) => healthController.getMetrics(req, res));

/**
 * GET /services - Service health status
 * Returns health status of all services
 * Accessible at: /api/v1/health/services
 */
router.get('/services', (req, res) => healthController.getServices(req, res));

/**
 * GET /timeseries - Time-series metrics data
 * Returns time-series data for charts (query param: hours)
 * Accessible at: /api/v1/health/timeseries
 */
router.get('/timeseries', (req, res) => healthController.getTimeSeries(req, res));

export default router;
