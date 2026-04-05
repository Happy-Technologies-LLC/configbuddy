// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Connector Configuration Metrics Controller
 * Handles metrics and run history for connector configurations
 */

import { Request, Response } from 'express';
import { Pool } from 'pg';
import { logger } from '@cmdb/common';
import { buildRunsQuery } from './queries';

export class ConnectorConfigMetricsController {
  constructor(private pool: Pool) {}

  async getConfigurationMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const statsResult = await this.pool.query(
        `SELECT
          COUNT(*) as total_runs,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_runs,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_runs,
          AVG(duration_ms) as avg_duration_ms,
          SUM(records_extracted) as total_records_extracted,
          SUM(records_loaded) as total_records_loaded
         FROM connector_run_history
         WHERE config_id = $1`,
        [id]
      );

      const stats = statsResult.rows[0];
      const successRate = stats.total_runs > 0
        ? (parseFloat(stats.successful_runs) / parseFloat(stats.total_runs)) * 100
        : 0;

      res.json({
        success: true,
        data: {
          config_id: id,
          total_runs: parseInt(stats.total_runs),
          successful_runs: parseInt(stats.successful_runs),
          failed_runs: parseInt(stats.failed_runs),
          success_rate: Math.round(successRate * 100) / 100,
          avg_duration_ms: stats.avg_duration_ms ? Math.round(parseFloat(stats.avg_duration_ms)) : 0,
          total_records_extracted: parseInt(stats.total_records_extracted || 0),
          total_records_loaded: parseInt(stats.total_records_loaded || 0),
        },
      });
    } catch (error) {
      logger.error('Error getting configuration metrics', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get configuration metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getResourceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { id, resourceId } = req.params;

      const result = await this.pool.query(
        `SELECT * FROM connector_resource_metrics
         WHERE config_id = $1 AND resource_id = $2
         ORDER BY measured_at DESC
         LIMIT 1`,
        [id, resourceId]
      );

      res.json({
        success: true,
        data: result.rows[0] || null,
      });
    } catch (error) {
      logger.error('Error getting resource metrics', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get resource metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getConfigurationRuns(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        resource_id,
        status,
        limit = 100,
        offset = 0,
        sort_by = 'started_at',
        sort_order = 'desc'
      } = req.query;

      const { query, params, countQuery, countParams } = buildRunsQuery({
        config_id: id,
        resource_id: resource_id as string,
        status: status as string,
        limit: Number(limit),
        offset: Number(offset),
        sort_by: sort_by as string,
        sort_order: sort_order as string,
      });

      const countResult = await this.pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);

      const result = await this.pool.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          total,
          count: result.rows.length,
          limit: Number(limit),
          offset: Number(offset),
        },
      });
    } catch (error) {
      logger.error('Error getting configuration runs', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get configuration runs',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getAllRuns(req: Request, res: Response): Promise<void> {
    try {
      const {
        config_id,
        connector_type,
        resource_id,
        status,
        limit = 100,
        offset = 0,
        sort_by = 'started_at',
        sort_order = 'desc'
      } = req.query;

      const { query, params, countQuery, countParams } = buildRunsQuery({
        config_id: config_id as string,
        connector_type: connector_type as string,
        resource_id: resource_id as string,
        status: status as string,
        limit: Number(limit),
        offset: Number(offset),
        sort_by: sort_by as string,
        sort_order: sort_order as string,
      });

      const countResult = await this.pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);

      const result = await this.pool.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          total,
          count: result.rows.length,
          limit: Number(limit),
          offset: Number(offset),
        },
      });
    } catch (error) {
      logger.error('Error getting all runs', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get runs',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getRunDetails(req: Request, res: Response): Promise<void> {
    try {
      const { runId } = req.params;

      const result = await this.pool.query(
        'SELECT * FROM connector_run_history WHERE id = $1',
        [runId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Run with ID '${runId}' not found`
        });
        return;
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      logger.error('Error getting run details', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get run details',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async cancelRun(req: Request, res: Response): Promise<void> {
    try {
      const { runId } = req.params;

      const runResult = await this.pool.query(
        'SELECT * FROM connector_run_history WHERE id = $1',
        [runId]
      );

      if (runResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Run with ID '${runId}' not found`
        });
        return;
      }

      const run = runResult.rows[0];
      if (!['queued', 'running'].includes(run.status)) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: `Run is in '${run.status}' status and cannot be cancelled`
        });
        return;
      }

      // TODO: Cancel BullMQ job
      await this.pool.query(
        'UPDATE connector_run_history SET status = $1, completed_at = NOW() WHERE id = $2',
        ['cancelled', runId]
      );

      logger.info(`Run '${runId}' cancelled successfully`);

      res.json({
        success: true,
        message: 'Run cancelled successfully'
      });
    } catch (error) {
      logger.error('Error cancelling run', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel run',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
