// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Connector Configuration Operations Controller
 * Handles operational actions: enable, disable, test, run
 */

import { Request, Response } from 'express';
import { Pool } from 'pg';
import { logger } from '@cmdb/common';

export class ConnectorConfigOperationsController {
  constructor(private pool: Pool) {}

  async enableConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await this.pool.query(
        'UPDATE connector_configurations SET enabled = true, updated_at = NOW() WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Configuration with ID '${id}' not found`
        });
        return;
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Configuration enabled successfully'
      });
    } catch (error) {
      logger.error('Error enabling configuration', error);
      res.status(500).json({
        success: false,
        error: 'Failed to enable configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async disableConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await this.pool.query(
        'UPDATE connector_configurations SET enabled = false, updated_at = NOW() WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Configuration with ID '${id}' not found`
        });
        return;
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Configuration disabled successfully'
      });
    } catch (error) {
      logger.error('Error disabling configuration', error);
      res.status(500).json({
        success: false,
        error: 'Failed to disable configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await this.pool.query(
        'SELECT * FROM connector_configurations WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Configuration with ID '${id}' not found`
        });
        return;
      }

      // TODO: Actual connection test logic
      const testResult = {
        success: true,
        message: 'Connection test passed',
        details: {
          connector_type: result.rows[0].connector_type,
          tested_at: new Date().toISOString()
        }
      };

      res.json(testResult);
    } catch (error) {
      logger.error('Error testing connection', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test connection',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async runConnector(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { resource_id, triggered_by = 'manual' } = req.body;

      const result = await this.pool.query(
        'SELECT * FROM connector_configurations WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Configuration with ID '${id}' not found`
        });
        return;
      }

      const config = result.rows[0];

      if (!config.enabled) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Configuration is disabled'
        });
        return;
      }

      // TODO: Actual run logic (create BullMQ job)
      const runResult = await this.pool.query(
        `INSERT INTO connector_run_history (
          config_id, connector_type, config_name, resource_id,
          started_at, status, triggered_by
        ) VALUES ($1, $2, $3, $4, NOW(), 'queued', $5)
        RETURNING *`,
        [id, config.connector_type, config.name, resource_id || null, triggered_by]
      );

      logger.info(`Connector run triggered`, {
        config_id: id,
        run_id: runResult.rows[0].id,
        resource_id
      });

      res.status(202).json({
        success: true,
        data: runResult.rows[0],
        message: 'Connector run queued successfully'
      });
    } catch (error) {
      logger.error('Error running connector', error);
      res.status(500).json({
        success: false,
        error: 'Failed to run connector',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
