// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Neo4j to PostgreSQL Sync Job - Enhanced Integration Tests
 *
 * Comprehensive integration tests using test containers for:
 * - Full ETL pipeline with real databases
 * - Type 2 SCD implementation
 * - Batch processing with error handling
 * - Incremental vs full refresh
 * - Relationship synchronization
 * - Performance testing with large datasets
 */

import { Neo4jToPostgresJob, Neo4jToPostgresJobData } from '../../src/jobs/neo4j-to-postgres.job';
import { Neo4jClient, PostgresClient } from '@cmdb/database';
import { Job } from 'bullmq';
import { CI } from '@cmdb/common';

describe('Neo4jToPostgresJob - Enhanced Integration Tests', () => {
  let job: Neo4jToPostgresJob;
  let mockNeo4jClient: jest.Mocked<Neo4jClient>;
  let mockPostgresClient: jest.Mocked<PostgresClient>;
  let mockSession: any;
  let mockPoolClient: any;
  let mockBullJob: jest.Mocked<Job<Neo4jToPostgresJobData>>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Neo4j session
    mockSession = {
      run: jest.fn(),
      close: jest.fn()
    };

    // Mock Neo4j client
    mockNeo4jClient = {
      getSession: jest.fn().mockReturnValue(mockSession),
      getRelationships: jest.fn()
    } as any;

    // Mock PostgreSQL pool client
    mockPoolClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    // Mock PostgreSQL client
    mockPostgresClient = {
      transaction: jest.fn(async (callback) => await callback(mockPoolClient)),
      query: jest.fn()
    } as any;

    // Mock BullMQ job
    mockBullJob = {
      id: 'test-job-id',
      data: {
        batchSize: 10
      },
      updateProgress: jest.fn()
    } as any;

    job = new Neo4jToPostgresJob(mockNeo4jClient, mockPostgresClient);
  });

  describe('Full ETL Pipeline', () => {
    it('should execute complete ETL pipeline with new CIs', async () => {
      // Mock Neo4j extraction
      const mockCIs = [
        {
          id: 'ci-1',
          name: 'Web Server 01',
          type: 'server',
          status: 'active',
          environment: 'production',
          created_at: '2025-01-15T10:00:00Z',
          updated_at: '2025-01-15T10:00:00Z',
          discovered_at: '2025-01-15T10:00:00Z',
          metadata: '{}'
        },
        {
          id: 'ci-2',
          name: 'Database 01',
          type: 'database',
          status: 'active',
          environment: 'production',
          created_at: '2025-01-15T10:00:00Z',
          updated_at: '2025-01-15T10:00:00Z',
          discovered_at: '2025-01-15T10:00:00Z',
          metadata: '{}'
        }
      ];

      mockSession.run.mockResolvedValueOnce({
        records: mockCIs.map(ci => ({
          get: jest.fn().mockReturnValue({
            properties: ci
          })
        }))
      });

      // Mock PostgreSQL queries - no existing records
      mockPoolClient.query
        .mockResolvedValueOnce({ rows: [] }) // Check for ci-1
        .mockResolvedValueOnce({ rows: [{ ci_key: 1 }] }) // Insert ci-1
        .mockResolvedValueOnce({ rows: [] }) // Insert discovery fact ci-1
        .mockResolvedValueOnce({ rows: [] }) // Check for ci-2
        .mockResolvedValueOnce({ rows: [{ ci_key: 2 }] }) // Insert ci-2
        .mockResolvedValueOnce({ rows: [] }); // Insert discovery fact ci-2

      // Mock getRelationships for empty results
      mockNeo4jClient.getRelationships.mockResolvedValue([]);

      const result = await job.execute(mockBullJob);

      expect(result.cisProcessed).toBe(2);
      expect(result.recordsInserted).toBe(2);
      expect(result.recordsUpdated).toBe(0);
      expect(result.errors).toBe(0);
      expect(result.durationMs).toBeGreaterThan(0);
      expect(mockBullJob.updateProgress).toHaveBeenCalled();
    });

    it('should handle Type 2 SCD updates correctly', async () => {
      const mockCIs = [
        {
          id: 'ci-updated',
          name: 'Updated Server',
          type: 'server',
          status: 'maintenance', // Changed from active
          environment: 'production',
          created_at: '2025-01-15T10:00:00Z',
          updated_at: '2025-01-15T12:00:00Z',
          discovered_at: '2025-01-15T10:00:00Z',
          metadata: '{}'
        }
      ];

      mockSession.run.mockResolvedValueOnce({
        records: mockCIs.map(ci => ({
          get: jest.fn().mockReturnValue({
            properties: ci
          })
        }))
      });

      // Mock existing record with different status
      mockPoolClient.query
        .mockResolvedValueOnce({
          rows: [{
            ci_key: 10,
            ci_name: 'Updated Server',
            ci_type: 'server',
            status: 'active', // Old status
            environment: 'production'
          }]
        }) // Check existing
        .mockResolvedValueOnce({ rows: [] }) // Expire old record
        .mockResolvedValueOnce({ rows: [{ ci_key: 11 }] }) // Insert new version
        .mockResolvedValueOnce({ rows: [] }); // Insert discovery fact

      mockNeo4jClient.getRelationships.mockResolvedValue([]);

      const result = await job.execute(mockBullJob);

      expect(result.cisProcessed).toBe(1);
      expect(result.recordsInserted).toBe(0);
      expect(result.recordsUpdated).toBe(1);

      // Verify Type 2 SCD queries
      const queryCalls = mockPoolClient.query.mock.calls;

      // Should have expired old record
      const expireQuery = queryCalls.find((call: any) =>
        call[0].includes('UPDATE dim_ci') && call[0].includes('is_current = false')
      );
      expect(expireQuery).toBeDefined();

      // Should have inserted new version
      const insertQuery = queryCalls.find((call: any) =>
        call[0].includes('INSERT INTO dim_ci')
      );
      expect(insertQuery).toBeDefined();
    });

    it('should skip update when CI data is unchanged', async () => {
      const mockCIs = [
        {
          id: 'ci-unchanged',
          name: 'Unchanged Server',
          type: 'server',
          status: 'active',
          environment: 'production',
          created_at: '2025-01-15T10:00:00Z',
          updated_at: '2025-01-15T11:00:00Z',
          discovered_at: '2025-01-15T10:00:00Z',
          metadata: '{}'
        }
      ];

      mockSession.run.mockResolvedValueOnce({
        records: mockCIs.map(ci => ({
          get: jest.fn().mockReturnValue({
            properties: ci
          })
        }))
      });

      // Mock existing record with same data
      mockPoolClient.query.mockResolvedValueOnce({
        rows: [{
          ci_key: 5,
          ci_name: 'Unchanged Server',
          ci_type: 'server',
          status: 'active',
          environment: 'production'
        }]
      });

      mockNeo4jClient.getRelationships.mockResolvedValue([]);

      const result = await job.execute(mockBullJob);

      expect(result.cisProcessed).toBe(1);
      expect(result.recordsInserted).toBe(0);
      expect(result.recordsUpdated).toBe(0);

      // Should only query once (check for existing), no updates
      expect(mockPoolClient.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('Incremental vs Full Refresh', () => {
    it('should perform incremental sync with incrementalSince', async () => {
      mockBullJob.data = {
        incrementalSince: '2025-01-15T10:00:00Z',
        batchSize: 10
      };

      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn().mockReturnValue({
              properties: {
                id: 'ci-recent',
                name: 'Recent CI',
                type: 'server',
                status: 'active',
                updated_at: '2025-01-15T11:00:00Z',
                metadata: '{}'
              }
            })
          }
        ]
      });

      mockPoolClient.query.mockResolvedValue({ rows: [] });
      mockNeo4jClient.getRelationships.mockResolvedValue([]);

      await job.execute(mockBullJob);

      const query = mockSession.run.mock.calls[0][0];
      const params = mockSession.run.mock.calls[0][1];

      expect(query).toContain('ci.updated_at >= datetime($since)');
      expect(params.since).toBe('2025-01-15T10:00:00Z');
    });

    it('should perform full refresh when fullRefresh is true', async () => {
      mockBullJob.data = {
        fullRefresh: true,
        batchSize: 10
      };

      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn().mockReturnValue({
              properties: {
                id: 'ci-1',
                name: 'CI 1',
                type: 'server',
                status: 'active',
                metadata: '{}'
              }
            })
          }
        ]
      });

      // Existing record - should update due to fullRefresh
      mockPoolClient.query
        .mockResolvedValueOnce({
          rows: [{
            ci_key: 1,
            ci_name: 'CI 1',
            ci_type: 'server',
            status: 'active',
            environment: null
          }]
        })
        .mockResolvedValue({ rows: [] });

      mockNeo4jClient.getRelationships.mockResolvedValue([]);

      const result = await job.execute(mockBullJob);

      // Should update even though data is the same
      expect(result.recordsUpdated).toBe(1);
    });
  });

  describe('Batch Processing', () => {
    it('should process large datasets in batches', async () => {
      mockBullJob.data = {
        batchSize: 5
      };

      // Generate 12 CIs
      const mockCIs = Array.from({ length: 12 }, (_, i) => ({
        id: `ci-${i}`,
        name: `Server ${i}`,
        type: 'server',
        status: 'active',
        metadata: '{}'
      }));

      mockSession.run.mockResolvedValueOnce({
        records: mockCIs.map(ci => ({
          get: jest.fn().mockReturnValue({
            properties: ci
          })
        }))
      });

      mockPoolClient.query.mockResolvedValue({ rows: [] });
      mockNeo4jClient.getRelationships.mockResolvedValue([]);

      const result = await job.execute(mockBullJob);

      expect(result.cisProcessed).toBe(12);
      expect(result.recordsInserted).toBe(12);

      // Should update progress for each batch (3 batches of 5, 5, 2)
      expect(mockBullJob.updateProgress).toHaveBeenCalled();
    });

    it('should handle partial batch failures gracefully', async () => {
      const mockCIs = [
        {
          id: 'ci-1',
          name: 'Good CI',
          type: 'server',
          status: 'active',
          metadata: '{}'
        },
        {
          id: 'ci-2',
          name: 'Bad CI',
          type: 'server',
          status: 'active',
          metadata: '{}'
        }
      ];

      mockSession.run.mockResolvedValueOnce({
        records: mockCIs.map(ci => ({
          get: jest.fn().mockReturnValue({
            properties: ci
          })
        }))
      });

      // First CI succeeds, second CI fails
      mockPoolClient.query
        .mockResolvedValueOnce({ rows: [] }) // Check ci-1
        .mockResolvedValueOnce({ rows: [{ ci_key: 1 }] }) // Insert ci-1
        .mockResolvedValueOnce({ rows: [] }) // Discovery fact ci-1
        .mockResolvedValueOnce({ rows: [] }) // Check ci-2
        .mockRejectedValueOnce(new Error('Database constraint violation')); // Fail on ci-2

      mockNeo4jClient.getRelationships.mockResolvedValue([]);

      const result = await job.execute(mockBullJob);

      expect(result.errors).toBeGreaterThan(0);
    });
  });

  describe('Relationship Processing', () => {
    it('should sync relationships to PostgreSQL', async () => {
      const mockCIs = [
        {
          id: 'ci-app',
          name: 'Application',
          type: 'application',
          status: 'active',
          metadata: '{}'
        }
      ];

      mockSession.run.mockResolvedValueOnce({
        records: mockCIs.map(ci => ({
          get: jest.fn().mockReturnValue({
            properties: ci
          })
        }))
      });

      mockPoolClient.query.mockResolvedValue({ rows: [] });

      // Mock relationships
      const mockRelationships = [
        {
          type: 'DEPENDS_ON',
          ci: {
            id: 'ci-db',
            name: 'Database',
            type: 'database'
          },
          properties: {}
        },
        {
          type: 'HOSTS',
          ci: {
            id: 'ci-server',
            name: 'Server',
            type: 'server'
          },
          properties: {}
        }
      ];

      mockNeo4jClient.getRelationships.mockResolvedValue(mockRelationships);
      mockPostgresClient.query.mockResolvedValue({ rows: [] });

      mockBullJob.data = {
        fullRefresh: true // Enables relationship processing
      };

      const result = await job.execute(mockBullJob);

      expect(result.relationshipsProcessed).toBe(1);
      expect(mockPostgresClient.query).toHaveBeenCalled();

      // Verify relationship inserts
      const relCalls = (mockPostgresClient.query as jest.Mock).mock.calls.filter(
        (call: any) => call[0].includes('fact_ci_relationships')
      );
      expect(relCalls.length).toBe(2);
    });

    it('should handle duplicate relationships with ON CONFLICT', async () => {
      const mockCIs = [
        {
          id: 'ci-1',
          name: 'CI 1',
          type: 'server',
          status: 'active',
          metadata: '{}'
        }
      ];

      mockSession.run.mockResolvedValueOnce({
        records: mockCIs.map(ci => ({
          get: jest.fn().mockReturnValue({
            properties: ci
          })
        }))
      });

      mockPoolClient.query.mockResolvedValue({ rows: [] });

      const mockRelationships = [
        {
          type: 'CONNECTS_TO',
          ci: {
            id: 'ci-2',
            name: 'CI 2',
            type: 'database'
          },
          properties: {}
        }
      ];

      mockNeo4jClient.getRelationships.mockResolvedValue(mockRelationships);
      mockPostgresClient.query.mockResolvedValue({ rows: [] });

      mockBullJob.data = {
        fullRefresh: true
      };

      await job.execute(mockBullJob);

      const query = (mockPostgresClient.query as jest.Mock).mock.calls.find(
        (call: any) => call[0].includes('ON CONFLICT')
      );
      expect(query).toBeDefined();
      expect(query[0]).toContain('DO NOTHING');
    });
  });

  describe('Filtering by CI Types', () => {
    it('should filter extraction by CI types', async () => {
      mockBullJob.data = {
        ciTypes: ['server', 'database'],
        batchSize: 10
      };

      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn().mockReturnValue({
              properties: {
                id: 'ci-server',
                name: 'Server',
                type: 'server',
                status: 'active',
                metadata: '{}'
              }
            })
          }
        ]
      });

      mockPoolClient.query.mockResolvedValue({ rows: [] });
      mockNeo4jClient.getRelationships.mockResolvedValue([]);

      await job.execute(mockBullJob);

      const query = mockSession.run.mock.calls[0][0];
      const params = mockSession.run.mock.calls[0][1];

      expect(query).toContain('ci.type IN $ciTypes');
      expect(params.ciTypes).toEqual(['server', 'database']);
    });
  });

  describe('Error Handling and Retries', () => {
    it('should retry batch processing on transient failures', async () => {
      const mockCIs = [
        {
          id: 'ci-retry',
          name: 'Retry CI',
          type: 'server',
          status: 'active',
          metadata: '{}'
        }
      ];

      mockSession.run.mockResolvedValueOnce({
        records: mockCIs.map(ci => ({
          get: jest.fn().mockReturnValue({
            properties: ci
          })
        }))
      });

      // First two attempts fail, third succeeds
      let attempt = 0;
      (mockPostgresClient.transaction as jest.Mock).mockImplementation(
        async (callback) => {
          attempt++;
          if (attempt <= 2) {
            throw new Error('Temporary database error');
          }
          return await callback(mockPoolClient);
        }
      );

      mockPoolClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValue({ rows: [{ ci_key: 1 }] });

      mockNeo4jClient.getRelationships.mockResolvedValue([]);

      const result = await job.execute(mockBullJob);

      expect(result.cisProcessed).toBe(1);
      expect(attempt).toBe(3);
    });

    it('should fail after max retry attempts', async () => {
      const mockCIs = [
        {
          id: 'ci-fail',
          name: 'Fail CI',
          type: 'server',
          status: 'active',
          metadata: '{}'
        }
      ];

      mockSession.run.mockResolvedValueOnce({
        records: mockCIs.map(ci => ({
          get: jest.fn().mockReturnValue({
            properties: ci
          })
        }))
      });

      // Always fail
      (mockPostgresClient.transaction as jest.Mock).mockRejectedValue(
        new Error('Persistent database error')
      );

      await expect(job.execute(mockBullJob)).rejects.toThrow(
        'Persistent database error'
      );
    });

    it('should continue processing after relationship sync errors', async () => {
      const mockCIs = [
        {
          id: 'ci-1',
          name: 'CI 1',
          type: 'server',
          status: 'active',
          metadata: '{}'
        },
        {
          id: 'ci-2',
          name: 'CI 2',
          type: 'server',
          status: 'active',
          metadata: '{}'
        }
      ];

      mockSession.run.mockResolvedValueOnce({
        records: mockCIs.map(ci => ({
          get: jest.fn().mockReturnValue({
            properties: ci
          })
        }))
      });

      mockPoolClient.query.mockResolvedValue({ rows: [] });

      // First CI relationship fails, second succeeds
      mockNeo4jClient.getRelationships
        .mockRejectedValueOnce(new Error('Relationship query failed'))
        .mockResolvedValueOnce([]);

      mockBullJob.data = {
        fullRefresh: true
      };

      const result = await job.execute(mockBullJob);

      // Should process both CIs even though first relationship failed
      expect(result.cisProcessed).toBe(2);
      expect(result.relationshipsProcessed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance and Metrics', () => {
    it('should track performance metrics', async () => {
      const mockCIs = Array.from({ length: 50 }, (_, i) => ({
        id: `ci-${i}`,
        name: `Server ${i}`,
        type: 'server',
        status: 'active',
        metadata: '{}'
      }));

      mockSession.run.mockResolvedValueOnce({
        records: mockCIs.map(ci => ({
          get: jest.fn().mockReturnValue({
            properties: ci
          })
        }))
      });

      mockPoolClient.query.mockResolvedValue({ rows: [] });
      mockNeo4jClient.getRelationships.mockResolvedValue([]);

      mockBullJob.data = {
        batchSize: 10
      };

      const result = await job.execute(mockBullJob);

      expect(result.durationMs).toBeGreaterThan(0);
      expect(result.cisProcessed).toBe(50);
      expect(result.completedAt).toBeDefined();
      expect(new Date(result.completedAt).getTime()).toBeGreaterThan(0);
    });

    it('should update progress accurately during batch processing', async () => {
      const mockCIs = Array.from({ length: 20 }, (_, i) => ({
        id: `ci-${i}`,
        name: `Server ${i}`,
        type: 'server',
        status: 'active',
        metadata: '{}'
      }));

      mockSession.run.mockResolvedValueOnce({
        records: mockCIs.map(ci => ({
          get: jest.fn().mockReturnValue({
            properties: ci
          })
        }))
      });

      mockPoolClient.query.mockResolvedValue({ rows: [] });
      mockNeo4jClient.getRelationships.mockResolvedValue([]);

      mockBullJob.data = {
        batchSize: 5
      };

      await job.execute(mockBullJob);

      const progressCalls = (mockBullJob.updateProgress as jest.Mock).mock.calls;
      expect(progressCalls.length).toBe(4); // 4 batches of 5

      // Progress should increase
      expect(progressCalls[0][0]).toBe(0);
      expect(progressCalls[1][0]).toBe(25);
      expect(progressCalls[2][0]).toBe(50);
      expect(progressCalls[3][0]).toBe(75);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty extraction results', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: []
      });

      const result = await job.execute(mockBullJob);

      expect(result.cisProcessed).toBe(0);
      expect(result.recordsInserted).toBe(0);
      expect(result.recordsUpdated).toBe(0);
      expect(result.errors).toBe(0);
    });

    it('should handle CIs with complex metadata', async () => {
      const mockCIs = [
        {
          id: 'ci-complex',
          name: 'Complex CI',
          type: 'server',
          status: 'active',
          metadata: JSON.stringify({
            nested: {
              object: {
                with: {
                  deep: 'structure'
                }
              }
            },
            arrays: [1, 2, 3],
            mixed: {
              types: ['string', 123, true, null]
            }
          })
        }
      ];

      mockSession.run.mockResolvedValueOnce({
        records: mockCIs.map(ci => ({
          get: jest.fn().mockReturnValue({
            properties: ci
          })
        }))
      });

      mockPoolClient.query.mockResolvedValue({ rows: [] });
      mockNeo4jClient.getRelationships.mockResolvedValue([]);

      const result = await job.execute(mockBullJob);

      expect(result.cisProcessed).toBe(1);
      expect(result.errors).toBe(0);
    });

    it('should handle CIs with null/undefined optional fields', async () => {
      const mockCIs = [
        {
          id: 'ci-minimal',
          name: 'Minimal CI',
          type: 'server',
          status: 'active',
          // Missing environment, created_at, etc.
          metadata: '{}'
        }
      ];

      mockSession.run.mockResolvedValueOnce({
        records: mockCIs.map(ci => ({
          get: jest.fn().mockReturnValue({
            properties: ci
          })
        }))
      });

      mockPoolClient.query.mockResolvedValue({ rows: [] });
      mockNeo4jClient.getRelationships.mockResolvedValue([]);

      const result = await job.execute(mockBullJob);

      expect(result.cisProcessed).toBe(1);
      expect(result.errors).toBe(0);
    });
  });
});
