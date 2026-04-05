// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Rate Limit Metrics Routes
 * Provides endpoints for monitoring rate limiting
 */

import { Router } from 'express';
import { RateLimitMetricsController } from '../controllers/rate-limit-metrics.controller';
import { RateLimitMiddleware } from '../../middleware/rate-limit.middleware';

export function createRateLimitMetricsRoutes(
  rateLimitMiddleware: RateLimitMiddleware
): Router {
  const router = Router();
  const controller = new RateLimitMetricsController(rateLimitMiddleware);

  /**
   * @route GET /api/v1/metrics/rate-limits
   * @desc Get current rate limit metrics
   * @access Admin only (should be protected by auth middleware)
   */
  router.get('/', controller.getMetrics);

  /**
   * @route GET /api/v1/metrics/rate-limits/config
   * @desc Get rate limit configuration summary
   * @access Admin only (should be protected by auth middleware)
   */
  router.get('/config', controller.getConfiguration);

  return router;
}
