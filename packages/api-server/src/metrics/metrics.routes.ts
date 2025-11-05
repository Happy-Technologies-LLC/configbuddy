/**
 * Metrics Endpoint Routes
 * Exposes Prometheus metrics endpoint
 */

import { Router, Request, Response } from 'express';
import { getMetricsRegistry } from '@cmdb/common';

const router = Router();

/**
 * GET /metrics - Prometheus metrics endpoint
 * Returns all metrics in Prometheus text format
 */
router.get('/metrics', async (_req: Request, res: Response): Promise<void> => {
  try {
    const metricsRegistry = getMetricsRegistry();
    const metrics = await metricsRegistry.getMetrics();

    res.set('Content-Type', metricsRegistry.getContentType());
    res.send(metrics);
  } catch (error: any) {
    res.status(500).json({
      _error: 'Failed to collect metrics',
      _message: error.message,
    });
  }
});

export default router;
