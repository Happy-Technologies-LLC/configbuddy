// packages/api-server/src/graphql/resolvers/connector-fields.resolvers.ts

import { GraphQLError } from 'graphql';
import { logger } from '@cmdb/common';
import { getPostgresClient } from '@cmdb/database';

/**
 * ConnectorConfiguration field resolvers
 */
export const ConnectorConfigurationFieldResolvers = {
  /**
   * Resolve associated connector (join to InstalledConnector)
   */
  connector: async (parent: any): Promise<any> => {
    try {
      const pgClient = getPostgresClient();

      const query = `
        SELECT
          id,
          connector_type,
          category,
          name,
          description,
          installed_version,
          latest_available_version,
          installed_at,
          updated_at,
          enabled,
          verified,
          install_path,
          metadata,
          capabilities,
          resources,
          configuration_schema,
          total_runs,
          successful_runs,
          failed_runs,
          last_run_at,
          last_run_status,
          tags
        FROM installed_connectors
        WHERE connector_type = $1
      `;

      const result = await pgClient.query(query, [parent.connectorType]);

      if (result.rows.length === 0) {
        throw new GraphQLError('Associated connector not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      const row = result.rows[0];

      return {
        id: row.id,
        connectorType: row.connector_type,
        category: row.category.toUpperCase(),
        name: row.name,
        description: row.description,
        installedVersion: row.installed_version,
        latestAvailableVersion: row.latest_available_version,
        installedAt: row.installed_at,
        updatedAt: row.updated_at,
        enabled: row.enabled,
        verified: row.verified,
        installPath: row.install_path,
        metadata: row.metadata || {},
        capabilities: row.capabilities || { extraction: false, relationships: false, incremental: false, bidirectional: false },
        resources: row.resources || [],
        configurationSchema: row.configuration_schema || {},
        totalRuns: row.total_runs,
        successfulRuns: row.successful_runs,
        failedRuns: row.failed_runs,
        lastRunAt: row.last_run_at,
        lastRunStatus: row.last_run_status,
        tags: row.tags || [],
      };
    } catch (error: any) {
      logger.error('GraphQL: Error resolving connector field', error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      throw new GraphQLError('Failed to resolve connector', {
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          originalError: error.message,
        },
      });
    }
  },

  /**
   * Resolve run history for configuration
   */
  runs: async (
    parent: any,
    args: { first?: number; offset?: number }
  ): Promise<any[]> => {
    try {
      const pgClient = getPostgresClient();
      const limit = Math.min(args.first || 50, 1000);
      const offset = args.offset || 0;

      const query = `
        SELECT
          id,
          config_id,
          connector_type,
          config_name,
          resource_id,
          started_at,
          completed_at,
          status,
          records_extracted,
          records_transformed,
          records_loaded,
          records_failed,
          duration_ms,
          errors,
          error_message,
          triggered_by,
          triggered_by_user,
          job_id
        FROM connector_run_history
        WHERE config_id = $1
        ORDER BY started_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await pgClient.query(query, [parent.id, limit, offset]);

      return result.rows.map(row => ({
        id: row.id,
        configId: row.config_id,
        connectorType: row.connector_type,
        configName: row.config_name,
        resourceId: row.resource_id,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        status: row.status.toUpperCase(),
        recordsExtracted: row.records_extracted,
        recordsTransformed: row.records_transformed,
        recordsLoaded: row.records_loaded,
        recordsFailed: row.records_failed,
        durationMs: row.duration_ms,
        errors: row.errors || [],
        errorMessage: row.error_message,
        triggeredBy: row.triggered_by,
        triggeredByUser: row.triggered_by_user,
        jobId: row.job_id,
      }));
    } catch (error: any) {
      logger.error('GraphQL: Error resolving runs field', error);
      throw new GraphQLError('Failed to resolve runs', {
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          originalError: error.message,
        },
      });
    }
  },

  /**
   * Resolve computed metrics for configuration
   */
  metrics: async (parent: any): Promise<any> => {
    try {
      const pgClient = getPostgresClient();

      // Get overall run metrics
      const metricsQuery = `
        SELECT
          COUNT(*) as total_runs,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_runs,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_runs,
          ROUND(
            100.0 * COUNT(CASE WHEN status = 'completed' THEN 1 END) /
            NULLIF(COUNT(*), 0),
            2
          ) as success_rate,
          AVG(CASE WHEN duration_ms IS NOT NULL THEN duration_ms END)::integer as avg_duration_ms,
          SUM(records_extracted + records_loaded) as total_records_processed
        FROM connector_run_history
        WHERE config_id = $1
      `;

      const metricsResult = await pgClient.query(metricsQuery, [parent.id]);
      const metrics = metricsResult.rows[0];

      // Get per-resource metrics
      const resourceMetricsQuery = `
        SELECT
          resource_id,
          SUM(records_extracted) as total_records_extracted,
          SUM(records_loaded) as total_records_loaded,
          ROUND(
            100.0 * COUNT(CASE WHEN status = 'completed' THEN 1 END) /
            NULLIF(COUNT(*), 0),
            2
          ) as success_rate,
          AVG(CASE WHEN duration_ms IS NOT NULL THEN duration_ms / 3 END)::integer as avg_extraction_time_ms,
          AVG(CASE WHEN duration_ms IS NOT NULL THEN duration_ms / 3 END)::integer as avg_transformation_time_ms,
          AVG(CASE WHEN duration_ms IS NOT NULL THEN duration_ms / 3 END)::integer as avg_load_time_ms
        FROM connector_run_history
        WHERE config_id = $1 AND resource_id IS NOT NULL
        GROUP BY resource_id
        ORDER BY total_records_extracted DESC
      `;

      const resourceMetricsResult = await pgClient.query(resourceMetricsQuery, [parent.id]);

      return {
        totalRuns: parseInt(metrics.total_runs) || 0,
        successfulRuns: parseInt(metrics.successful_runs) || 0,
        failedRuns: parseInt(metrics.failed_runs) || 0,
        successRate: parseFloat(metrics.success_rate) || 0,
        avgDurationMs: parseInt(metrics.avg_duration_ms) || 0,
        totalRecordsProcessed: parseInt(metrics.total_records_processed) || 0,
        resourceMetrics: resourceMetricsResult.rows.map(row => ({
          resourceId: row.resource_id,
          totalRecordsExtracted: parseInt(row.total_records_extracted) || 0,
          totalRecordsLoaded: parseInt(row.total_records_loaded) || 0,
          successRate: parseFloat(row.success_rate) || 0,
          avgExtractionTimeMs: parseInt(row.avg_extraction_time_ms) || 0,
          avgTransformationTimeMs: parseInt(row.avg_transformation_time_ms) || 0,
          avgLoadTimeMs: parseInt(row.avg_load_time_ms) || 0,
        })),
      };
    } catch (error: any) {
      logger.error('GraphQL: Error resolving metrics field', error);
      throw new GraphQLError('Failed to resolve metrics', {
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          originalError: error.message,
        },
      });
    }
  },
};

/**
 * Export field resolvers
 */
export const connectorFieldResolvers = {
  ConnectorConfiguration: ConnectorConfigurationFieldResolvers,
};
