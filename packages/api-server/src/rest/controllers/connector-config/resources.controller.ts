// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Connector Configuration Resources Controller
 * Handles resource management for connector configurations
 */

import { Request, Response } from 'express';
import { Pool } from 'pg';
import { logger } from '@cmdb/common';

export class ConnectorConfigResourcesController {
  constructor(private pool: Pool) {}

  async getAvailableResources(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await this.pool.query(
        `SELECT cc.*, ic.resources, ic.metadata
         FROM connector_configurations cc
         JOIN installed_connectors ic ON cc.connector_type = ic.connector_type
         WHERE cc.id = $1`,
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
      const resources = config.resources || [];

      res.json({
        success: true,
        data: {
          config_id: id,
          connector_type: config.connector_type,
          available_resources: resources,
          enabled_resources: config.enabled_resources || [],
        },
      });
    } catch (error) {
      logger.error('Error getting available resources', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get available resources',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateEnabledResources(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { enabled_resources, resource_configs } = req.body;

      const result = await this.pool.query(
        `UPDATE connector_configurations
         SET enabled_resources = $1, resource_configs = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [enabled_resources, JSON.stringify(resource_configs || {}), id]
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
        message: 'Enabled resources updated successfully'
      });
    } catch (error) {
      logger.error('Error updating enabled resources', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update enabled resources',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getResourceConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id, resourceId } = req.params;

      const result = await this.pool.query(
        'SELECT resource_configs FROM connector_configurations WHERE id = $1',
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

      const resourceConfigs = result.rows[0].resource_configs || {};
      const resourceConfig = (resourceId && resourceConfigs[resourceId]) ? resourceConfigs[resourceId] : {};

      res.json({
        success: true,
        data: {
          config_id: id,
          resource_id: resourceId,
          config: resourceConfig
        },
      });
    } catch (error) {
      logger.error('Error getting resource config', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get resource config',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
