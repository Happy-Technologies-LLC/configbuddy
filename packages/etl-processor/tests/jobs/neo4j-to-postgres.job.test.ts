// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Neo4j to PostgreSQL ETL Job Tests
 *
 * Tests for the ETL pipeline that extracts CIs from Neo4j,
 * transforms them to dimensional model, and loads to PostgreSQL.
 *
 * Tests include:
 * - Full ETL execution flow
 * - Batch processing with pagination
 * - SCD Type 2 dimension handling
 * - Incremental vs full refresh
 * - Error handling and retry logic
 * - Relationship processing
 */

import { Neo4jToPostgresJob } from '../../src/jobs/neo4j-to-postgres.job';
import { Neo4jClient, PostgresClient } from '@cmdb/database';
import { CITransformer } from '../../src/transformers/ci-transformer';
import { DimensionTransformer } from '../../src/transformers/dimension-transformer';
import { Job } from 'bullmq';

// Mock transformers
jest.mock('../../src/transformers/ci-transformer');
jest.mock('../../src/transformers/dimension-transformer');

describe('Neo4jToPostgresJob', () => {
  let etlJob: Neo4jToPostgresJob;
  let mockNeo4jClient: jest.Mocked<Neo4jClient>;
  let mockPostgresClient: jest.Mocked<PostgresClient>;
  let mockSession: any;
  let mockPoolClient: any;
  let mockBullJob: jest.Mocked<Job>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Neo4j session
    mockSession = {
      _run: jest.fn(),
      _close: jest.fn(),
    };

    // Mock Neo4j client
    mockNeo4jClient = {
      _getSession: jest.fn().mockReturnValue(mockSession),
      _getRelationships: jest.fn(),
    } as any;

    // Mock PostgreSQL pool client
    mockPoolClient = {
      _query: jest.fn(),
      _release: jest.fn(),
    };

    // Mock PostgreSQL client
    mockPostgresClient = {
      _transaction: jest.fn(async (callback) => {
        return await callback(mockPoolClient);
      }),
      _query: jest.fn(),
    } as any;

    // Mock BullMQ job
    mockBullJob = {
      _id: 'test-job-id',
      _data: {
        _batchSize: 100,
        _fullRefresh: false,
      },
      _updateProgress: jest.fn(),
    } as any;

    // Mock transformers
    const mockCITransformer = new CITransformer();
    const mockDimensionTransformer = new DimensionTransformer();

    (mockDimensionTransformer.toDimension as jest.Mock) = jest.fn((ci) => ({
      _ci_id: ci.id,
      _ci_name: ci.name,
      _ci_type: ci.type,
      _ci_status: ci.status,
      _environment: ci.environment,
      _external_id: ci.external_id,
      _created_at: ci.created_at,
    }));

    (mockDimensionTransformer.toDiscoveryFact as jest.Mock) = jest.fn((ci, ciKey = null) => ({
      _ci_key: ciKey,
      _date_key: 20250115,
      _discovered_at: new Date(ci.discovered_at),
      _discovery_method: 'agentless',
      _discovery_source: 'aws',
    }));

    // Create ETL job instance
    etlJob = new Neo4jToPostgresJob(mockNeo4jClient, mockPostgresClient);
  });

  describe('execute - Full ETL Flow', () => {
    it('should execute complete ETL job successfully', async () => {
      // Mock Neo4j extraction
      mockSession.run.mockResolvedValueOnce({
        _records: [
          {
            _get: jest.fn().mockReturnValue({
              _properties: {
                _id: 'ci-1',
                _name: 'Server 1',
                _type: 'server',
                _status: 'active',
                _environment: 'production',
                _created_at: '2025-01-15T10:00:00Z',
                _updated_at: '2025-01-15T10:00:00Z',
                _discovered_at: '2025-01-15T10:00:00Z',
                _metadata: '{}',
              },
            }),
          },
        ],
      });

      // Mock PostgreSQL operations - new CI
      mockPoolClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Check if exists
        .mockResolvedValueOnce({ rows: [{ ci_key: 1 }], rowCount: 1 }) // Insert dimension
        .mockResolvedValueOnce({ rowCount: 1 }); // Insert fact

      const result = await etlJob.execute(mockBullJob);

      expect(result.cisProcessed).toBe(1);
      expect(result.recordsInserted).toBe(1);
      expect(result.recordsUpdated).toBe(0);
      expect(result.errors).toBe(0);
      expect(result.durationMs).toBeGreaterThan(0);
      expect(mockBullJob.updateProgress).toHaveBeenCalled();
    });

    it('should handle empty result set', async () => {
      mockSession.run.mockResolvedValueOnce({ records: [] });

      const result = await etlJob.execute(mockBullJob);

      expect(result.cisProcessed).toBe(0);
      expect(result.recordsInserted).toBe(0);
      expect(result.errors).toBe(0);
    });

    it('should process CIs in batches', async () => {
      // Create 250 CIs to test batching (batch size = 100)
      const records = Array.from({ length: 250 }, (_, i) => ({
        _get: jest.fn().mockReturnValue({
          _properties: {
            _id: `ci-${i}`,
            _name: `Server ${i}`,
            _type: 'server',
            _status: 'active',
            _created_at: '2025-01-15T10:00:00Z',
            _updated_at: '2025-01-15T10:00:00Z',
            _discovered_at: '2025-01-15T10:00:00Z',
            _metadata: '{}',
          },
        }),
      }));

      mockSession.run.mockResolvedValueOnce({ records });
      mockPoolClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

      mockBullJob.data.batchSize = 100;

      const result = await etlJob.execute(mockBullJob);

      expect(result.cisProcessed).toBe(250);
      // Should process in 3 batches (100, 100, 50)
      expect(mockBullJob.updateProgress).toHaveBeenCalledTimes(3);
    });
  });

  describe('extractCIs', () => {
    it('should extract all CIs without filters', async () => {
      mockSession.run.mockResolvedValueOnce({
        _records: [
          {
            _get: jest.fn().mockReturnValue({
              _properties: {
                _id: 'ci-1',
                _name: 'Test CI',
                _type: 'server',
                _status: 'active',
                _created_at: '2025-01-15T10:00:00Z',
                _updated_at: '2025-01-15T10:00:00Z',
                _discovered_at: '2025-01-15T10:00:00Z',
                _metadata: '{"key": "value"}',
              },
            }),
          },
        ],
      });

      const cis = await (etlJob as any).extractCIs({});

      expect(mockSession.run).toHaveBeenCalled();
      const query = mockSession.run.mock.calls[0][0];
      expect(query).toContain('MATCH (ci:CI)');
      expect(query).toContain('RETURN ci');
      expect(cis).toHaveLength(1);
      expect(cis[0].id).toBe('ci-1');
      expect(cis[0].metadata).toEqual({ key: 'value' });
    });

    it('should filter by CI types', async () => {
      mockSession.run.mockResolvedValueOnce({ records: [] });

      await (etlJob as any).extractCIs({
        _ciTypes: ['server', 'database'],
      });

      const query = mockSession.run.mock.calls[0][0];
      const params = mockSession.run.mock.calls[0][1];
      expect(query).toContain('WHERE ci.type IN $ciTypes');
      expect(params.ciTypes).toEqual(['server', 'database']);
    });

    it('should perform incremental sync based on timestamp', async () => {
      mockSession.run.mockResolvedValueOnce({ records: [] });

      await (etlJob as any).extractCIs({
        _incrementalSince: '2025-01-14T00:00:00Z',
      });

      const query = mockSession.run.mock.calls[0][0];
      const params = mockSession.run.mock.calls[0][1];
      expect(query).toContain('ci.updated_at >= datetime($since)');
      expect(params.since).toBe('2025-01-14T00:00:00Z');
    });

    it('should ignore incremental flag during full refresh', async () => {
      mockSession.run.mockResolvedValueOnce({ records: [] });

      await (etlJob as any).extractCIs({
        _incrementalSince: '2025-01-14T00:00:00Z',
        _fullRefresh: true,
      });

      const query = mockSession.run.mock.calls[0][0];
      expect(query).not.toContain('updated_at');
    });

    it('should close session after extraction', async () => {
      mockSession.run.mockResolvedValueOnce({ records: [] });

      await (etlJob as any).extractCIs({});

      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should close session even on error', async () => {
      mockSession.run.mockRejectedValueOnce(new Error('Query failed'));

      await expect((etlJob as any).extractCIs({})).rejects.toThrow('Query failed');

      expect(mockSession.close).toHaveBeenCalled();
    });
  });

  describe('processBatch - SCD Type 2', () => {
    it('should insert new CI dimension', async () => {
      const cis = [
        {
          _id: 'ci-new',
          _name: 'New Server',
          _type: 'server',
          _status: 'active',
          _created_at: '2025-01-15T10:00:00Z',
          _updated_at: '2025-01-15T10:00:00Z',
          _discovered_at: '2025-01-15T10:00:00Z',
          _metadata: {},
        },
      ];

      mockPoolClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Check if exists
        .mockResolvedValueOnce({ rows: [{ ci_key: 1 }], rowCount: 1 }) // Insert dimension
        .mockResolvedValueOnce({ rowCount: 1 }); // Insert fact

      const result = await (etlJob as any).processBatch(cis, false);

      expect(result.cisProcessed).toBe(1);
      expect(result.recordsInserted).toBe(1);
      expect(result.recordsUpdated).toBe(0);

      // Verify INSERT query was called
      const insertCall = mockPoolClient.query.mock.calls.find(call =>
        call[0].includes('INSERT INTO dim_ci')
      );
      expect(insertCall).toBeDefined();
    });

    it('should update existing CI dimension with Type 2 SCD', async () => {
      const cis = [
        {
          _id: 'ci-existing',
          _name: 'Updated Server',
          _type: 'server',
          _status: 'maintenance',
          _environment: 'production',
          _created_at: '2025-01-15T10:00:00Z',
          _updated_at: '2025-01-15T11:00:00Z',
          _discovered_at: '2025-01-15T10:00:00Z',
          _metadata: {},
        },
      ];

      mockPoolClient.query
        .mockResolvedValueOnce({
          // Check if exists - found with different values
          _rows: [{
            _ci_key: 5,
            _ci_name: 'Old Server',
            _ci_type: 'server',
            _status: 'active',
            _environment: 'production',
          }],
          _rowCount: 1,
        })
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE (expire old)
        .mockResolvedValueOnce({ rows: [{ ci_key: 6 }], rowCount: 1 }) // INSERT (new version)
        .mockResolvedValueOnce({ rowCount: 1 }); // Insert fact

      const result = await (etlJob as any).processBatch(cis, false);

      expect(result.cisProcessed).toBe(1);
      expect(result.recordsInserted).toBe(0);
      expect(result.recordsUpdated).toBe(1);

      // Verify UPDATE to expire old record
      const updateCall = mockPoolClient.query.mock.calls.find(call =>
        call[0].includes('UPDATE dim_ci') && call[0].includes('is_current = false')
      );
      expect(updateCall).toBeDefined();

      // Verify INSERT for new version
      const insertCall = mockPoolClient.query.mock.calls.find((call, index) =>
        call[0].includes('INSERT INTO dim_ci') && index > 1
      );
      expect(insertCall).toBeDefined();
    });

    it('should skip update if CI data has not changed', async () => {
      const cis = [
        {
          _id: 'ci-unchanged',
          _name: 'Unchanged Server',
          _type: 'server',
          _status: 'active',
          _environment: 'production',
          _created_at: '2025-01-15T10:00:00Z',
          _updated_at: '2025-01-15T10:00:00Z',
          _discovered_at: '2025-01-15T10:00:00Z',
          _metadata: {},
        },
      ];

      mockPoolClient.query.mockResolvedValueOnce({
        _rows: [{
          _ci_key: 5,
          _ci_name: 'Unchanged Server',
          _ci_type: 'server',
          _status: 'active',
          _environment: 'production',
        }],
        _rowCount: 1,
      });

      const result = await (etlJob as any).processBatch(cis, false);

      expect(result.cisProcessed).toBe(1);
      expect(result.recordsInserted).toBe(0);
      expect(result.recordsUpdated).toBe(0);

      // Should only have checked if exists, no updates
      expect(mockPoolClient.query).toHaveBeenCalledTimes(1);
    });

    it('should force update during full refresh even if unchanged', async () => {
      const cis = [
        {
          _id: 'ci-unchanged',
          _name: 'Server',
          _type: 'server',
          _status: 'active',
          _created_at: '2025-01-15T10:00:00Z',
          _updated_at: '2025-01-15T10:00:00Z',
          _discovered_at: '2025-01-15T10:00:00Z',
          _metadata: {},
        },
      ];

      mockPoolClient.query
        .mockResolvedValueOnce({
          _rows: [{
            _ci_key: 5,
            _ci_name: 'Server',
            _ci_type: 'server',
            _status: 'active',
            _environment: undefined,
          }],
          _rowCount: 1,
        })
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [{ ci_key: 6 }], rowCount: 1 }) // INSERT
        .mockResolvedValueOnce({ rowCount: 1 }); // Fact

      const result = await (etlJob as any).processBatch(cis, true);

      expect(result.recordsUpdated).toBe(1);
    });

    it('should handle transaction errors', async () => {
      const cis = [{ id: 'ci-1', name: 'Test', type: 'server', status: 'active' }];

      mockPoolClient.query.mockRejectedValueOnce(new Error('Transaction failed'));

      await expect((etlJob as any).processBatch(cis, false)).rejects.toThrow('Transaction failed');
    });
  });

  describe('processRelationships', () => {
    it('should process relationships for CIs', async () => {
      const cis = [
        {
          _id: 'ci-1',
          _name: 'Server 1',
          _type: 'server',
          _status: 'active',
          _created_at: '2025-01-15T10:00:00Z',
          _updated_at: '2025-01-15T10:00:00Z',
          _discovered_at: '2025-01-15T10:00:00Z',
          _metadata: {},
        },
      ];

      mockNeo4jClient.getRelationships.mockResolvedValueOnce([
        {
          _type: 'DEPENDS_ON',
          _ci: {
            _id: 'ci-2',
            _name: 'Database 1',
            _type: 'database',
            _status: 'active',
            _created_at: '2025-01-15T10:00:00Z',
            _updated_at: '2025-01-15T10:00:00Z',
            _discovered_at: '2025-01-15T10:00:00Z',
            _metadata: {},
          },
          _properties: {},
        },
      ]);

      mockPostgresClient.query.mockResolvedValue({ rowCount: 1 });

      const result = await (etlJob as any).processRelationships(cis);

      expect(result.processed).toBe(1);
      expect(result.inserted).toBe(1);
      expect(mockNeo4jClient.getRelationships).toHaveBeenCalledWith('ci-1', 'out');
      expect(mockPostgresClient.query).toHaveBeenCalled();

      const call = mockPostgresClient.query.mock.calls[0];
      expect(call[0]).toContain('INSERT INTO fact_ci_relationships');
      expect(call[0]).toContain('ON CONFLICT');
    });

    it('should handle CIs with no relationships', async () => {
      const cis = [{ id: 'ci-isolated', name: 'Isolated', type: 'server', status: 'active' }];

      mockNeo4jClient.getRelationships.mockResolvedValueOnce([]);

      const result = await (etlJob as any).processRelationships(cis);

      expect(result.processed).toBe(1);
      expect(result.inserted).toBe(0);
    });

    it('should continue processing on individual relationship errors', async () => {
      const cis = [
        { id: 'ci-1', name: 'CI 1', type: 'server', status: 'active' },
        { id: 'ci-2', name: 'CI 2', type: 'server', status: 'active' },
      ];

      mockNeo4jClient.getRelationships
        .mockRejectedValueOnce(new Error('Neo4j error'))
        .mockResolvedValueOnce([]);

      const result = await (etlJob as any).processRelationships(cis);

      expect(result.processed).toBe(1);
    });
  });

  describe('Error Handling and Retries', () => {
    it('should report errors in result', async () => {
      mockSession.run.mockResolvedValueOnce({
        _records: [
          {
            _get: jest.fn().mockReturnValue({
              _properties: {
                _id: 'ci-1',
                _name: 'Test',
                _type: 'server',
                _status: 'active',
                _created_at: '2025-01-15T10:00:00Z',
                _updated_at: '2025-01-15T10:00:00Z',
                _discovered_at: '2025-01-15T10:00:00Z',
                _metadata: '{}',
              },
            }),
          },
        ],
      });

      mockPoolClient.query.mockRejectedValue(new Error('Database error'));

      const result = await etlJob.execute(mockBullJob);

      expect(result.errors).toBeGreaterThan(0);
    });

    it('should throw error on extraction failure', async () => {
      mockSession.run.mockRejectedValueOnce(new Error('Neo4j connection lost'));

      await expect(etlJob.execute(mockBullJob)).rejects.toThrow('Neo4j connection lost');
    });
  });

  describe('Job Progress Tracking', () => {
    it('should update progress during batch processing', async () => {
      const records = Array.from({ length: 200 }, (_, i) => ({
        _get: jest.fn().mockReturnValue({
          _properties: {
            _id: `ci-${i}`,
            _name: `Server ${i}`,
            _type: 'server',
            _status: 'active',
            _created_at: '2025-01-15T10:00:00Z',
            _updated_at: '2025-01-15T10:00:00Z',
            _discovered_at: '2025-01-15T10:00:00Z',
            _metadata: '{}',
          },
        }),
      }));

      mockSession.run.mockResolvedValueOnce({ records });
      mockPoolClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await etlJob.execute(mockBullJob);

      expect(mockBullJob.updateProgress).toHaveBeenCalled();
      // Check progress was called with percentage
      const progressCalls = (mockBullJob.updateProgress as jest.Mock).mock.calls;
      expect(progressCalls.length).toBeGreaterThan(0);
      expect(progressCalls[0][0]).toBeGreaterThanOrEqual(0);
      expect(progressCalls[0][0]).toBeLessThanOrEqual(100);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle mixed new and existing CIs', async () => {
      mockSession.run.mockResolvedValueOnce({
        _records: [
          {
            _get: jest.fn().mockReturnValue({
              _properties: {
                _id: 'ci-new',
                _name: 'New',
                _type: 'server',
                _status: 'active',
                _created_at: '2025-01-15T10:00:00Z',
                _updated_at: '2025-01-15T10:00:00Z',
                _discovered_at: '2025-01-15T10:00:00Z',
                _metadata: '{}',
              },
            }),
          },
          {
            _get: jest.fn().mockReturnValue({
              _properties: {
                _id: 'ci-existing',
                _name: 'Existing',
                _type: 'server',
                _status: 'maintenance',
                _created_at: '2025-01-14T10:00:00Z',
                _updated_at: '2025-01-15T10:00:00Z',
                _discovered_at: '2025-01-14T10:00:00Z',
                _metadata: '{}',
              },
            }),
          },
        ],
      });

      mockPoolClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // New CI check
        .mockResolvedValueOnce({ rows: [{ ci_key: 1 }], rowCount: 1 }) // Insert new
        .mockResolvedValueOnce({ rowCount: 1 }) // Insert fact
        .mockResolvedValueOnce({ rows: [{ ci_key: 2, ci_name: 'Old', status: 'active' }], rowCount: 1 }) // Existing CI check
        .mockResolvedValueOnce({ rowCount: 1 }) // Update expire
        .mockResolvedValueOnce({ rows: [{ ci_key: 3 }], rowCount: 1 }) // Insert new version
        .mockResolvedValueOnce({ rowCount: 1 }); // Insert fact

      const result = await etlJob.execute(mockBullJob);

      expect(result.cisProcessed).toBe(2);
      expect(result.recordsInserted).toBe(1);
      expect(result.recordsUpdated).toBe(1);
    });
  });
});
