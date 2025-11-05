/**
 * ConnectorExecutor Tests
 *
 * Tests for ConnectorExecutor including:
 * - Connector execution orchestration
 * - Resource-level execution
 * - Timeout and retry handling
 * - Metrics tracking
 * - Error handling and recovery
 * - Database persistence
 */

import { ConnectorExecutor, ExecutionOptions } from '../../src/executor/connector-executor';
import { getConnectorRegistry } from '../../src/registry/connector-registry';
import { getPostgresClient } from '@cmdb/database';
import {
  ConnectorConfiguration,
  ConnectorRunResult,
  ResourceRunResult,
  ExtractedData,
  TransformedCI,
} from '../../src/types/connector.types';

// Mock dependencies
jest.mock('@cmdb/common', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));
jest.mock('../../src/registry/connector-registry');
jest.mock('@cmdb/database');

describe('ConnectorExecutor', () => {
  let executor: ConnectorExecutor;
  let mockRegistry: any;
  let mockPostgresClient: any;
  let mockConnector: any;

  const sampleConfig: ConnectorConfiguration = {
    id: 'config-123',
    name: 'Test Connector Instance',
    type: 'test-connector',
    enabled: true,
    connection: { api_key: 'test-key' },
    enabled_resources: ['servers', 'databases'],
    resource_configs: {
      servers: { region: 'us-east-1' },
      databases: { include_read_replicas: true },
    },
  };

  const sampleExtractedData: ExtractedData[] = [
    {
      external_id: 'srv-001',
      data: { name: 'Server 1', state: 'running' },
      source_type: 'test',
      extracted_at: new Date(),
    },
    {
      external_id: 'srv-002',
      data: { name: 'Server 2', state: 'stopped' },
      source_type: 'test',
      extracted_at: new Date(),
    },
  ];

  const sampleTransformedCI: TransformedCI = {
    name: 'Server 1',
    ci_type: 'server',
    status: 'active',
    attributes: { state: 'running' },
    identifiers: { external_id: 'srv-001' },
    source: 'test-connector',
    source_id: 'srv-001',
    confidence_score: 0.95,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock connector instance
    mockConnector = {
      initialize: jest.fn().mockResolvedValue(undefined),
      extractResource: jest.fn(),
      transformResource: jest.fn(),
      cleanup: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      emit: jest.fn(),
      getAvailableResources: jest.fn().mockReturnValue([
        { id: 'servers', name: 'Servers' },
        { id: 'databases', name: 'Databases' },
      ]),
    };

    // Mock registry
    mockRegistry = {
      createConnector: jest.fn().mockReturnValue(mockConnector),
    };
    (getConnectorRegistry as jest.Mock).mockReturnValue(mockRegistry);

    // Mock PostgreSQL client
    mockPostgresClient = {
      query: jest.fn(),
    };
    (getPostgresClient as jest.Mock).mockReturnValue(mockPostgresClient);

    // Reset singleton
    (ConnectorExecutor as any).instance = null;
    executor = ConnectorExecutor.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ConnectorExecutor.getInstance();
      const instance2 = ConnectorExecutor.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('executeConnector', () => {
    beforeEach(() => {
      // Mock config loading
      mockPostgresClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM connector_configurations')) {
          return Promise.resolve({
            rows: [
              {
                id: sampleConfig.id,
                name: sampleConfig.name,
                connector_type: sampleConfig.type,
                enabled: sampleConfig.enabled,
                connection: sampleConfig.connection,
                enabled_resources: sampleConfig.enabled_resources,
                resource_configs: sampleConfig.resource_configs,
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });
    });

    it('should execute all enabled resources', async () => {
      mockConnector.extractResource.mockResolvedValue(sampleExtractedData);
      mockConnector.transformResource.mockResolvedValue(sampleTransformedCI);

      const result = await executor.executeConnector('config-123');

      expect(result.status).toBe('completed');
      expect(result.records_extracted).toBeGreaterThan(0);
      expect(mockConnector.initialize).toHaveBeenCalled();
      expect(mockConnector.extractResource).toHaveBeenCalledTimes(2); // servers + databases
      expect(mockConnector.cleanup).toHaveBeenCalled();
    });

    it('should use resource override from options', async () => {
      mockConnector.extractResource.mockResolvedValue([]);

      const options: ExecutionOptions = {
        resources: ['servers'], // Only execute servers
      };

      await executor.executeConnector('config-123', options);

      expect(mockConnector.extractResource).toHaveBeenCalledTimes(1);
      expect(mockConnector.extractResource).toHaveBeenCalledWith(
        'servers',
        expect.anything()
      );
    });

    it('should throw error when no resources enabled', async () => {
      mockPostgresClient.query.mockResolvedValueOnce({
        rows: [
          {
            ...sampleConfig,
            enabled_resources: [], // No resources enabled
          },
        ],
      });

      await expect(executor.executeConnector('config-123')).rejects.toThrow(
        'No resources enabled'
      );
    });

    it('should throw error when configuration not found', async () => {
      mockPostgresClient.query.mockResolvedValue({ rows: [] });

      await expect(executor.executeConnector('nonexistent')).rejects.toThrow(
        'Connector configuration not found'
      );
    });

    it('should track overall metrics across resources', async () => {
      mockConnector.extractResource
        .mockResolvedValueOnce([sampleExtractedData[0]!]) // servers: 1 record
        .mockResolvedValueOnce([
          sampleExtractedData[0]!,
          sampleExtractedData[1]!,
        ]); // databases: 2 records

      mockConnector.transformResource.mockResolvedValue(sampleTransformedCI);

      const result = await executor.executeConnector('config-123');

      expect(result.records_extracted).toBe(3); // Total from both resources
    });

    it('should continue execution if one resource fails', async () => {
      mockConnector.extractResource
        .mockRejectedValueOnce(new Error('Servers failed'))
        .mockResolvedValueOnce(sampleExtractedData); // databases succeeds

      const result = await executor.executeConnector('config-123');

      expect(result.status).toBe('failed');
      expect(result.errors).toContain('Resource servers: Servers failed');
      expect(mockConnector.extractResource).toHaveBeenCalledTimes(2);
    });

    it('should save run result to database', async () => {
      mockConnector.extractResource.mockResolvedValue([]);

      await executor.executeConnector('config-123');

      expect(mockPostgresClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO connector_runs'),
        expect.arrayContaining([
          expect.stringContaining('run_'),
          'config-123',
          sampleConfig.name,
        ])
      );
    });
  });

  describe('executeResource', () => {
    beforeEach(() => {
      mockPostgresClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM connector_configurations')) {
          return Promise.resolve({
            rows: [
              {
                id: sampleConfig.id,
                name: sampleConfig.name,
                connector_type: sampleConfig.type,
                enabled: sampleConfig.enabled,
                connection: sampleConfig.connection,
                enabled_resources: sampleConfig.enabled_resources,
                resource_configs: sampleConfig.resource_configs,
              },
            ],
          });
        }
        if (sql.includes('INSERT INTO connector_run_history')) {
          return Promise.resolve({});
        }
        if (sql.includes('UPDATE connector_run_history')) {
          return Promise.resolve({});
        }
        return Promise.resolve({ rows: [] });
      });
    });

    it('should execute single resource successfully', async () => {
      mockConnector.extractResource.mockResolvedValue(sampleExtractedData);
      mockConnector.transformResource.mockResolvedValue(sampleTransformedCI);

      const result = await executor.executeResource('config-123', 'servers');

      expect(result.status).toBe('completed');
      expect(result.resource_id).toBe('servers');
      expect(result.records_extracted).toBe(2);
      expect(mockConnector.initialize).toHaveBeenCalled();
      expect(mockConnector.extractResource).toHaveBeenCalledWith(
        'servers',
        sampleConfig.resource_configs?.servers
      );
    });

    it('should throw error for unknown resource', async () => {
      mockConnector.getAvailableResources.mockReturnValue([
        { id: 'servers', name: 'Servers' },
      ]);

      await expect(
        executor.executeResource('config-123', 'unknown-resource')
      ).rejects.toThrow('Resource unknown-resource not found');
    });

    it('should emit events during execution', async () => {
      mockConnector.extractResource.mockResolvedValue(sampleExtractedData);
      mockConnector.transformResource.mockResolvedValue(sampleTransformedCI);

      await executor.executeResource('config-123', 'servers');

      // Check that connector.on was called to listen to events
      expect(mockConnector.on).toHaveBeenCalledWith(
        'extraction_completed',
        expect.any(Function)
      );
      expect(mockConnector.on).toHaveBeenCalledWith(
        'ci_discovered',
        expect.any(Function)
      );
      expect(mockConnector.on).toHaveBeenCalledWith(
        'extraction_failed',
        expect.any(Function)
      );
    });

    it('should track transformation errors without failing', async () => {
      mockConnector.extractResource.mockResolvedValue(sampleExtractedData);
      mockConnector.transformResource
        .mockRejectedValueOnce(new Error('Transform failed'))
        .mockResolvedValueOnce(sampleTransformedCI);

      const result = await executor.executeResource('config-123', 'servers');

      expect(result.status).toBe('completed'); // Still completed
      expect(result.errors).toBeDefined();
      expect(result.records_transformed).toBeLessThan(
        result.records_extracted
      );
    });

    it('should handle timeout with configured value', async () => {
      mockConnector.extractResource.mockImplementation(() => {
        return new Promise((resolve) => setTimeout(resolve, 10000)); // 10 seconds
      });

      const options: ExecutionOptions = {
        timeout: 100, // 100ms timeout
      };

      await expect(
        executor.executeResource('config-123', 'servers', options)
      ).rejects.toThrow('timeout');
    }, 10000);

    it('should retry on failure with exponential backoff', async () => {
      mockConnector.extractResource
        .mockRejectedValueOnce(new Error('Temp failure'))
        .mockRejectedValueOnce(new Error('Temp failure'))
        .mockResolvedValueOnce(sampleExtractedData); // Succeeds on 3rd attempt

      const options: ExecutionOptions = {
        retries: 2,
      };

      const result = await executor.executeResource(
        'config-123',
        'servers',
        options
      );

      expect(result.status).toBe('completed');
      expect(mockConnector.extractResource).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries exceeded', async () => {
      mockConnector.extractResource.mockRejectedValue(
        new Error('Persistent failure')
      );

      const options: ExecutionOptions = {
        retries: 2,
      };

      const result = await executor.executeResource(
        'config-123',
        'servers',
        options
      );

      expect(result.status).toBe('failed');
      expect(mockConnector.extractResource).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should save resource run to database', async () => {
      mockConnector.extractResource.mockResolvedValue([]);

      await executor.executeResource('config-123', 'servers');

      expect(mockPostgresClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO connector_run_history'),
        expect.arrayContaining([
          expect.stringContaining('run_'),
          'config-123',
          sampleConfig.type,
          'servers',
        ])
      );
    });

    it('should update resource run on completion', async () => {
      mockConnector.extractResource.mockResolvedValue(sampleExtractedData);
      mockConnector.transformResource.mockResolvedValue(sampleTransformedCI);

      await executor.executeResource('config-123', 'servers');

      expect(mockPostgresClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE connector_run_history'),
        expect.arrayContaining([
          expect.stringContaining('run_'),
          'config-123',
          expect.any(Date), // completed_at
          'completed',
        ])
      );
    });

    it('should call cleanup even on error', async () => {
      mockConnector.extractResource.mockRejectedValue(new Error('Fatal error'));

      await expect(
        executor.executeResource('config-123', 'servers')
      ).rejects.toThrow();

      expect(mockConnector.cleanup).toHaveBeenCalled();
    });
  });

  describe('getResourceRunHistory', () => {
    it('should retrieve run history for specific resource', async () => {
      const mockHistory = [
        {
          run_id: 'run-1',
          config_id: 'config-123',
          connector_type: 'test',
          resource_id: 'servers',
          started_at: new Date(),
          completed_at: new Date(),
          status: 'completed',
          records_extracted: 10,
          records_transformed: 10,
          records_loaded: 10,
          duration_ms: 5000,
        },
      ];

      mockPostgresClient.query.mockResolvedValue({ rows: mockHistory });

      const history = await executor.getResourceRunHistory(
        'config-123',
        'servers',
        25
      );

      expect(history).toEqual(mockHistory);
      expect(mockPostgresClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE config_id = $1 AND resource_id = $2'),
        ['config-123', 'servers', 25]
      );
    });

    it('should retrieve all resources if resource not specified', async () => {
      mockPostgresClient.query.mockResolvedValue({ rows: [] });

      await executor.getResourceRunHistory('config-123', undefined, 50);

      expect(mockPostgresClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE config_id = $1'),
        ['config-123', 50]
      );
    });

    it('should use default limit of 50', async () => {
      mockPostgresClient.query.mockResolvedValue({ rows: [] });

      await executor.getResourceRunHistory('config-123');

      expect(mockPostgresClient.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining([50])
      );
    });

    it('should handle database errors gracefully', async () => {
      mockPostgresClient.query.mockRejectedValue(new Error('DB error'));

      const history = await executor.getResourceRunHistory('config-123');

      expect(history).toEqual([]);
    });
  });

  describe('getResourceMetrics', () => {
    it('should calculate metrics for resource', async () => {
      mockPostgresClient.query.mockResolvedValue({
        rows: [
          {
            total_runs: '100',
            successful_runs: '95',
            failed_runs: '5',
            avg_duration_ms: '3500.5',
            total_records_extracted: '1000',
            total_records_loaded: '980',
          },
        ],
      });

      const metrics = await executor.getResourceMetrics(
        'config-123',
        'servers'
      );

      expect(metrics.total_runs).toBe(100);
      expect(metrics.successful_runs).toBe(95);
      expect(metrics.failed_runs).toBe(5);
      expect(metrics.avg_duration_ms).toBe(3500.5);
      expect(metrics.error_rate).toBeCloseTo(0.05);
    });

    it('should support time range filtering', async () => {
      mockPostgresClient.query.mockResolvedValue({
        rows: [
          {
            total_runs: '10',
            successful_runs: '10',
            failed_runs: '0',
            avg_duration_ms: '2000',
            total_records_extracted: '100',
            total_records_loaded: '100',
          },
        ],
      });

      const timeRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      await executor.getResourceMetrics('config-123', 'servers', timeRange);

      expect(mockPostgresClient.query).toHaveBeenCalledWith(
        expect.stringContaining('started_at >= $3 AND started_at <= $4'),
        ['config-123', 'servers', timeRange.start, timeRange.end]
      );
    });

    it('should return zero metrics on error', async () => {
      mockPostgresClient.query.mockRejectedValue(new Error('DB error'));

      const metrics = await executor.getResourceMetrics(
        'config-123',
        'servers'
      );

      expect(metrics.total_runs).toBe(0);
      expect(metrics.error_rate).toBe(0);
    });

    it('should handle null/undefined values in results', async () => {
      mockPostgresClient.query.mockResolvedValue({
        rows: [
          {
            total_runs: null,
            successful_runs: null,
            failed_runs: null,
            avg_duration_ms: null,
            total_records_extracted: null,
            total_records_loaded: null,
          },
        ],
      });

      const metrics = await executor.getResourceMetrics(
        'config-123',
        'servers'
      );

      expect(metrics.total_runs).toBe(0);
      expect(metrics.avg_duration_ms).toBe(0);
      expect(metrics.error_rate).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle connector initialization failure', async () => {
      mockPostgresClient.query.mockResolvedValue({
        rows: [sampleConfig],
      });
      mockConnector.initialize.mockRejectedValue(
        new Error('Init failed')
      );

      await expect(
        executor.executeResource('config-123', 'servers')
      ).rejects.toThrow();

      expect(mockConnector.cleanup).toHaveBeenCalled();
    });

    it('should handle database save errors gracefully during execution', async () => {
      mockPostgresClient.query
        .mockResolvedValueOnce({ rows: [sampleConfig] }) // Load config
        .mockRejectedValueOnce(new Error('Save failed')); // Insert run fails

      mockConnector.extractResource.mockResolvedValue([]);

      // Should not throw, just log error
      await expect(
        executor.executeResource('config-123', 'servers')
      ).resolves.toBeDefined();
    });

    it('should handle malformed database configuration', async () => {
      mockPostgresClient.query.mockResolvedValue({
        rows: [
          {
            id: 'config-123',
            // Missing required fields
          },
        ],
      });

      await expect(
        executor.executeConnector('config-123')
      ).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should execute large batches efficiently', async () => {
      const largeBatch = Array(1000)
        .fill(null)
        .map((_, i) => ({
          external_id: `item-${i}`,
          data: { name: `Item ${i}` },
          source_type: 'test',
          extracted_at: new Date(),
        }));

      mockConnector.extractResource.mockResolvedValue(largeBatch);
      mockConnector.transformResource.mockResolvedValue(sampleTransformedCI);

      mockPostgresClient.query.mockResolvedValue({ rows: [sampleConfig] });

      const startTime = Date.now();
      const result = await executor.executeResource('config-123', 'servers');
      const duration = Date.now() - startTime;

      expect(result.records_extracted).toBe(1000);
      expect(duration).toBeLessThan(30000); // Should complete in under 30 seconds
    }, 35000);

    it('should handle concurrent resource executions', async () => {
      mockConnector.extractResource.mockResolvedValue([]);
      mockPostgresClient.query.mockResolvedValue({ rows: [sampleConfig] });

      const promises = ['servers', 'databases'].map((resource) =>
        executor.executeResource('config-123', resource)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.status === 'completed')).toBe(true);
    });
  });

  describe('Event Tracking', () => {
    it('should track extraction events', async () => {
      let extractionCompletedData: any;

      mockConnector.on.mockImplementation((event: string, handler: any) => {
        if (event === 'extraction_completed') {
          extractionCompletedData = { resource: 'servers', records: 2 };
          handler(extractionCompletedData);
        }
      });

      mockConnector.extractResource.mockResolvedValue(sampleExtractedData);
      mockConnector.transformResource.mockResolvedValue(sampleTransformedCI);
      mockPostgresClient.query.mockResolvedValue({ rows: [sampleConfig] });

      await executor.executeResource('config-123', 'servers');

      expect(mockConnector.on).toHaveBeenCalledWith(
        'extraction_completed',
        expect.any(Function)
      );
    });

    it('should track transformation events', async () => {
      mockConnector.on.mockImplementation((event: string, handler: any) => {
        if (event === 'ci_discovered') {
          handler({ resource: 'servers' });
        }
      });

      mockConnector.extractResource.mockResolvedValue([sampleExtractedData[0]!]);
      mockConnector.transformResource.mockResolvedValue(sampleTransformedCI);
      mockPostgresClient.query.mockResolvedValue({ rows: [sampleConfig] });

      await executor.executeResource('config-123', 'servers');

      expect(mockConnector.on).toHaveBeenCalledWith(
        'ci_discovered',
        expect.any(Function)
      );
    });
  });
});
