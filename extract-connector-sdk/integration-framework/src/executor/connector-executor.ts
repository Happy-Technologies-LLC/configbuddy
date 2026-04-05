// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * ConnectorExecutor (v3.0)
 * Executes connector runs with resource-level tracking and metrics
 */

import { logger } from '@cmdb/common';
import { getPostgresClient } from '@cmdb/database';
import { getConnectorRegistry } from '../registry/connector-registry';
import {
  ConnectorConfiguration,
  ResourceRunResult,
  ConnectorRunResult,
} from '../types/connector.types';

export interface ExecutionOptions {
  resources?: string[]; // Specific resources to execute (overrides config)
  timeout?: number; // Execution timeout in milliseconds
  retries?: number; // Number of retries on failure
}

export class ConnectorExecutor {
  private static instance: ConnectorExecutor;
  private registry = getConnectorRegistry();
  private postgresClient = getPostgresClient();

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ConnectorExecutor {
    if (!ConnectorExecutor.instance) {
      ConnectorExecutor.instance = new ConnectorExecutor();
    }
    return ConnectorExecutor.instance;
  }

  /**
   * Execute connector with all enabled resources
   * @param configId Connector configuration ID
   * @param options Execution options
   */
  async executeConnector(
    configId: string,
    options?: ExecutionOptions
  ): Promise<ConnectorRunResult> {
    const startTime = Date.now();
    const runId = this.generateRunId();

    try {
      logger.info('Executing connector', { configId, runId, options });

      // Load configuration from database
      const config = await this.loadConfiguration(configId);
      if (!config) {
        throw new Error(`Connector configuration not found: ${configId}`);
      }

      // Get enabled resources (use options override if provided)
      const resourcesToExecute =
        options?.resources || config.enabled_resources || [];

      if (resourcesToExecute.length === 0) {
        throw new Error('No resources enabled for execution');
      }

      logger.info('Executing resources', {
        config: config.name,
        resources: resourcesToExecute,
      });

      // Track overall run metrics
      let totalExtracted = 0;
      let totalTransformed = 0;
      let totalLoaded = 0;
      const errors: string[] = [];

      // Execute each resource sequentially (considering dependencies)
      for (const resourceId of resourcesToExecute) {
        try {
          const result = await this.executeResource(configId, resourceId, {
            timeout: options?.timeout,
            retries: options?.retries,
          });

          totalExtracted += result.records_extracted;
          totalTransformed += result.records_transformed;
          totalLoaded += result.records_loaded;

          if (result.status === 'failed' && result.errors) {
            errors.push(
              ...result.errors.map((e: any) =>
                typeof e === 'string' ? e : JSON.stringify(e)
              )
            );
          }
        } catch (error) {
          logger.error('Resource execution failed', {
            config: config.name,
            resource: resourceId,
            error,
          });
          errors.push(
            `Resource ${resourceId}: ${(error as Error).message}`
          );
        }
      }

      const duration = Date.now() - startTime;
      const status = errors.length === 0 ? 'completed' : 'failed';

      // Save overall run result
      const runResult: ConnectorRunResult = {
        run_id: runId,
        connector_name: config.name,
        started_at: new Date(startTime),
        completed_at: new Date(),
        status,
        records_extracted: totalExtracted,
        records_transformed: totalTransformed,
        records_loaded: totalLoaded,
        errors: errors.length > 0 ? errors : undefined,
      };

      await this.saveConnectorRun(configId, runResult);

      logger.info('Connector execution completed', {
        config: config.name,
        runId,
        duration_ms: duration,
        status,
        metrics: {
          extracted: totalExtracted,
          transformed: totalTransformed,
          loaded: totalLoaded,
        },
      });

      return runResult;
    } catch (error) {
      logger.error('Connector execution failed', { configId, runId, error });

      const runResult: ConnectorRunResult = {
        run_id: runId,
        connector_name: 'unknown',
        started_at: new Date(startTime),
        completed_at: new Date(),
        status: 'failed',
        records_extracted: 0,
        records_transformed: 0,
        records_loaded: 0,
        errors: [(error as Error).message],
      };

      await this.saveConnectorRun(configId, runResult).catch(() => {
        // Ignore save errors during error handling
      });

      throw error;
    }
  }

  /**
   * Execute a specific resource within a connector
   * @param configId Connector configuration ID
   * @param resourceId Resource identifier
   * @param options Execution options
   */
  async executeResource(
    configId: string,
    resourceId: string,
    options?: Omit<ExecutionOptions, 'resources'>
  ): Promise<ResourceRunResult> {
    const startTime = Date.now();
    const runId = this.generateRunId();

    try {
      logger.info('Executing resource', {
        configId,
        resourceId,
        runId,
        options,
      });

      // Load configuration
      const config = await this.loadConfiguration(configId);
      if (!config) {
        throw new Error(`Connector configuration not found: ${configId}`);
      }

      // Create connector instance
      const connector = this.registry.createConnector(config);

      // Validate resource exists
      const availableResources = connector.getAvailableResources();
      const resource = availableResources.find((r) => r.id === resourceId);
      if (!resource) {
        throw new Error(
          `Resource ${resourceId} not found in connector ${config.type}`
        );
      }

      // Initialize resource run tracking
      const resourceRun: ResourceRunResult = {
        run_id: runId,
        config_id: configId,
        connector_type: config.type,
        resource_id: resourceId,
        started_at: new Date(startTime),
        status: 'running',
        records_extracted: 0,
        records_transformed: 0,
        records_loaded: 0,
        errors: [],
      };

      await this.saveResourceRun(resourceRun);

      // Set up metrics tracking
      let recordsExtracted = 0;
      let recordsTransformed = 0;
      let recordsLoaded = 0;
      const errors: any[] = [];

      // Listen to connector events for metrics
      connector.on('extraction_completed', (data: any) => {
        if (data.resource === resourceId) {
          recordsExtracted = data.records || 0;
        }
      });

      connector.on('ci_discovered', (data: any) => {
        if (data.resource === resourceId) {
          recordsTransformed++;
          recordsLoaded++;
        }
      });

      connector.on('extraction_failed', (data: any) => {
        if (data.resource === resourceId) {
          errors.push({
            message: data.error,
            timestamp: new Date(),
          });
        }
      });

      // Initialize connector
      await connector.initialize();

      // Get resource-specific configuration
      const resourceConfig = config.resource_configs?.[resourceId];

      // Execute resource extraction with timeout and retries
      const maxRetries = options?.retries || 0;
      const timeout = options?.timeout || 300000; // 5 minutes default

      let attempt = 0;

      while (attempt <= maxRetries) {
        try {
          logger.info('Extracting resource', {
            config: config.name,
            resource: resourceId,
            attempt: attempt + 1,
            maxAttempts: maxRetries + 1,
          });

          // Execute with timeout
          await this.executeWithTimeout(
            async () => {
              const extractedData = await connector.extractResource(
                resourceId,
                resourceConfig
              );

              // Transform each record
              for (const data of extractedData) {
                try {
                  const transformedCI = await connector.transformResource(
                    resourceId,
                    data.data
                  );

                  // Emit event for downstream processing
                  connector.emit('ci_discovered', {
                    connector: config.name,
                    resource: resourceId,
                    ci: transformedCI,
                    source_data: data,
                  });
                } catch (error) {
                  logger.error('Transformation failed', {
                    config: config.name,
                    resource: resourceId,
                    external_id: data.external_id,
                    error,
                  });
                  errors.push({
                    message: (error as Error).message,
                    external_id: data.external_id,
                    timestamp: new Date(),
                  });
                }
              }
            },
            timeout
          );

          // Success - break retry loop
          break;
        } catch (error) {
          attempt++;

          if (attempt <= maxRetries) {
            const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
            logger.warn('Resource execution failed, retrying', {
              config: config.name,
              resource: resourceId,
              attempt,
              maxRetries,
              backoffMs,
              error: (error as Error).message,
            });
            await this.sleep(backoffMs);
          } else {
            logger.error('Resource execution failed after retries', {
              config: config.name,
              resource: resourceId,
              attempts: attempt,
              error: (error as Error).message,
            });
            errors.push({
              message: (error as Error).message,
              timestamp: new Date(),
            });
          }
        }
      }

      // Cleanup connector
      await connector.cleanup();

      // Update resource run result
      const duration = Date.now() - startTime;
      const finalStatus =
        errors.length > 0 && recordsExtracted === 0 ? 'failed' : 'completed';

      const finalResult: ResourceRunResult = {
        ...resourceRun,
        completed_at: new Date(),
        status: finalStatus,
        records_extracted: recordsExtracted,
        records_transformed: recordsTransformed,
        records_loaded: recordsLoaded,
        errors: errors.length > 0 ? errors : undefined,
        duration_ms: duration,
      };

      await this.updateResourceRun(finalResult);

      logger.info('Resource execution completed', {
        config: config.name,
        resource: resourceId,
        runId,
        status: finalStatus,
        duration_ms: duration,
        metrics: {
          extracted: recordsExtracted,
          transformed: recordsTransformed,
          loaded: recordsLoaded,
          errors: errors.length,
        },
      });

      return finalResult;
    } catch (error) {
      logger.error('Resource execution failed', {
        configId,
        resourceId,
        runId,
        error,
      });

      const duration = Date.now() - startTime;

      const failedResult: ResourceRunResult = {
        run_id: runId,
        config_id: configId,
        connector_type: 'unknown',
        resource_id: resourceId,
        started_at: new Date(startTime),
        completed_at: new Date(),
        status: 'failed',
        records_extracted: 0,
        records_transformed: 0,
        records_loaded: 0,
        errors: [
          {
            message: (error as Error).message,
            timestamp: new Date(),
          },
        ],
        duration_ms: duration,
      };

      await this.updateResourceRun(failedResult).catch(() => {
        // Ignore save errors during error handling
      });

      throw error;
    }
  }

  /**
   * Load connector configuration from database
   */
  private async loadConfiguration(
    configId: string
  ): Promise<ConnectorConfiguration | null> {
    try {
      const result = await this.postgresClient.query(
        'SELECT * FROM connector_configurations WHERE id = $1',
        [configId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        type: row.connector_type,
        enabled: row.enabled,
        schedule: row.schedule,
        connection: row.connection,
        options: row.options,
        enabled_resources: row.enabled_resources,
        resource_configs: row.resource_configs,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    } catch (error) {
      logger.error('Failed to load configuration', { configId, error });
      return null;
    }
  }

  /**
   * Save connector run result to database
   */
  private async saveConnectorRun(
    configId: string,
    result: ConnectorRunResult
  ): Promise<void> {
    try {
      await this.postgresClient.query(
        `
        INSERT INTO connector_runs
        (run_id, config_id, connector_name, started_at, completed_at,
         status, records_extracted, records_transformed, records_loaded, errors)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (run_id) DO UPDATE SET
          completed_at = EXCLUDED.completed_at,
          status = EXCLUDED.status,
          records_extracted = EXCLUDED.records_extracted,
          records_transformed = EXCLUDED.records_transformed,
          records_loaded = EXCLUDED.records_loaded,
          errors = EXCLUDED.errors
        `,
        [
          result.run_id,
          configId,
          result.connector_name,
          result.started_at,
          result.completed_at,
          result.status,
          result.records_extracted,
          result.records_transformed,
          result.records_loaded,
          result.errors ? JSON.stringify(result.errors) : null,
        ]
      );
    } catch (error) {
      logger.error('Failed to save connector run', { result, error });
    }
  }

  /**
   * Save resource run result to database
   */
  private async saveResourceRun(result: ResourceRunResult): Promise<void> {
    try {
      await this.postgresClient.query(
        `
        INSERT INTO connector_run_history
        (run_id, config_id, connector_type, resource_id, started_at,
         status, records_extracted, records_transformed, records_loaded, errors)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          result.run_id,
          result.config_id,
          result.connector_type,
          result.resource_id,
          result.started_at,
          result.status,
          result.records_extracted,
          result.records_transformed,
          result.records_loaded,
          result.errors ? JSON.stringify(result.errors) : null,
        ]
      );
    } catch (error) {
      logger.error('Failed to save resource run', { result, error });
    }
  }

  /**
   * Update resource run result in database
   */
  private async updateResourceRun(result: ResourceRunResult): Promise<void> {
    try {
      await this.postgresClient.query(
        `
        UPDATE connector_run_history
        SET completed_at = $3,
            status = $4,
            records_extracted = $5,
            records_transformed = $6,
            records_loaded = $7,
            errors = $8,
            duration_ms = $9
        WHERE run_id = $1 AND config_id = $2
        `,
        [
          result.run_id,
          result.config_id,
          result.completed_at,
          result.status,
          result.records_extracted,
          result.records_transformed,
          result.records_loaded,
          result.errors ? JSON.stringify(result.errors) : null,
          result.duration_ms,
        ]
      );
    } catch (error) {
      logger.error('Failed to update resource run', { result, error });
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Execution timeout after ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ]);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate unique run ID
   */
  private generateRunId(): string {
    return `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get resource run history
   */
  async getResourceRunHistory(
    configId: string,
    resourceId?: string,
    limit: number = 50
  ): Promise<ResourceRunResult[]> {
    try {
      const query = resourceId
        ? `
          SELECT * FROM connector_run_history
          WHERE config_id = $1 AND resource_id = $2
          ORDER BY started_at DESC
          LIMIT $3
        `
        : `
          SELECT * FROM connector_run_history
          WHERE config_id = $1
          ORDER BY started_at DESC
          LIMIT $2
        `;

      const params = resourceId
        ? [configId, resourceId, limit]
        : [configId, limit];

      const result = await this.postgresClient.query(query, params);

      return result.rows.map((row: any) => ({
        run_id: row.run_id,
        config_id: row.config_id,
        connector_type: row.connector_type,
        resource_id: row.resource_id,
        started_at: row.started_at,
        completed_at: row.completed_at,
        status: row.status,
        records_extracted: row.records_extracted,
        records_transformed: row.records_transformed,
        records_loaded: row.records_loaded,
        errors: row.errors,
        duration_ms: row.duration_ms,
      }));
    } catch (error) {
      logger.error('Failed to get resource run history', {
        configId,
        resourceId,
        error,
      });
      return [];
    }
  }

  /**
   * Get resource execution metrics
   */
  async getResourceMetrics(
    configId: string,
    resourceId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    total_runs: number;
    successful_runs: number;
    failed_runs: number;
    avg_duration_ms: number;
    total_records_extracted: number;
    total_records_loaded: number;
    error_rate: number;
  }> {
    try {
      const query = timeRange
        ? `
          SELECT
            COUNT(*) as total_runs,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_runs,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_runs,
            AVG(duration_ms) as avg_duration_ms,
            SUM(records_extracted) as total_records_extracted,
            SUM(records_loaded) as total_records_loaded
          FROM connector_run_history
          WHERE config_id = $1 AND resource_id = $2
            AND started_at >= $3 AND started_at <= $4
        `
        : `
          SELECT
            COUNT(*) as total_runs,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_runs,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_runs,
            AVG(duration_ms) as avg_duration_ms,
            SUM(records_extracted) as total_records_extracted,
            SUM(records_loaded) as total_records_loaded
          FROM connector_run_history
          WHERE config_id = $1 AND resource_id = $2
        `;

      const params = timeRange
        ? [configId, resourceId, timeRange.start, timeRange.end]
        : [configId, resourceId];

      const result = await this.postgresClient.query(query, params);
      const row = result.rows[0];

      const totalRuns = parseInt(row.total_runs) || 0;
      const failedRuns = parseInt(row.failed_runs) || 0;

      return {
        total_runs: totalRuns,
        successful_runs: parseInt(row.successful_runs) || 0,
        failed_runs: failedRuns,
        avg_duration_ms: parseFloat(row.avg_duration_ms) || 0,
        total_records_extracted: parseInt(row.total_records_extracted) || 0,
        total_records_loaded: parseInt(row.total_records_loaded) || 0,
        error_rate: totalRuns > 0 ? failedRuns / totalRuns : 0,
      };
    } catch (error) {
      logger.error('Failed to get resource metrics', {
        configId,
        resourceId,
        error,
      });

      return {
        total_runs: 0,
        successful_runs: 0,
        failed_runs: 0,
        avg_duration_ms: 0,
        total_records_extracted: 0,
        total_records_loaded: 0,
        error_rate: 0,
      };
    }
  }
}

/**
 * Get singleton instance
 */
export function getConnectorExecutor(): ConnectorExecutor {
  return ConnectorExecutor.getInstance();
}
