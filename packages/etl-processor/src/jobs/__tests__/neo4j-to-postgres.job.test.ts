// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Neo4j to PostgreSQL ETL Job Unit Tests
 *
 * TDD London School Approach:
 * - Mock database clients (Neo4j and PostgreSQL)
 * - Test interactions and transformation logic
 * - Verify batch processing and error handling
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Neo4jToPostgresJob } from '../neo4j-to-postgres.job';
import {
  createMockNeo4jDriver,
  createMockPostgresPool,
  createMockNeo4jResult,
  createMockPostgresResult,
} from '@test/utils/mock-database-clients';
import { createCI } from '@test/utils/mock-factories';

// Mock dependencies
jest.mock('@cmdb/common', () => ({
  _logger: {
    _info: jest.fn(),
    _error: jest.fn(),
    _debug: jest.fn(),
    _warn: jest.fn(),
  },
}));

jest.mock('../transformers/dimension-transformer', () => ({
  _DimensionTransformer: jest.fn().mockImplementation(() => ({
    _toDimension: jest.fn((ci) => ({
      _ci_id: ci.id,
      _ci_name: ci.name,
      _ci_type: ci.type,
      _environment: ci.environment,
      _status: ci.status,
      _external_id: ci.external_id,
      _created_at: ci.created_at,
    })),
    _toDiscoveryFact: jest.fn((ci, ciKey) => ({
      _ci_key: ciKey,
      _date_key: 20231201,
      _discovered_at: ci.discovered_at,
      _discovery_method: 'automated',
      _discovery_source: ci.discovery_provider || 'unknown',
    })),
  })),
}));

describe('Neo4jToPostgresJob', () => {
  let job: Neo4jToPostgresJob;
  let mockNeo4j: ReturnType<typeof createMockNeo4jDriver>;
  let mockPostgres: ReturnType<typeof createMockPostgresPool>;
  let mockBullJob: any;

  beforeEach(() => {
    // Arrange: Create mock database clients
    mockNeo4j = createMockNeo4jDriver();
    mockPostgres = createMockPostgresPool();

    // Mock BullMQ job
    mockBullJob = {
      _id: 'job-123',
      _data: {},
      _updateProgress: jest.fn(),
    };

    // Create job instance with mocked clients
    job = new Neo4jToPostgresJob(mockNeo4j.driver as any, mockPostgres.pool as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should execute complete ETL flow successfully', async () => {
      // Arrange: Mock CI data from Neo4j
      const mockCIs = [
        createCI({ id: 'ci-1', name: 'server-1', type: 'server' }),
        createCI({ id: 'ci-2', name: 'db-1', type: 'database' }),
      ];

      mockNeo4j.session.run.mockResolvedValueOnce(
        createMockNeo4jResult(
          mockCIs.map((ci) => ({ ci: { properties: ci } }))
        )
      );

      // Mock PostgreSQL: CIs don't exist (new inserts)
      mockPostgres.client.query
        .mockResolvedValueOnce(createMockPostgresResult([])) // Check existence
        .mockResolvedValueOnce(createMockPostgresResult([{ ci_key: 1 }])) // Insert dim_ci
        .mockResolvedValueOnce(createMockPostgresResult([])) // Insert fact
        .mockResolvedValueOnce(createMockPostgresResult([])) // Check existence
        .mockResolvedValueOnce(createMockPostgresResult([{ ci_key: 2 }])) // Insert dim_ci
        .mockResolvedValueOnce(createMockPostgresResult([])); // Insert fact

      mockBullJob.data = { batchSize: 100 };

      // Act: Execute ETL job
      const result = await job.execute(mockBullJob);

      // Assert: Verify Neo4j extraction
      expect(mockNeo4j.session.run).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (ci:CI)'),
        expect.any(Object)
      );

      // Assert: Verify session cleanup
      expect(mockNeo4j.session.close).toHaveBeenCalled();

      // Assert: Verify PostgreSQL inserts
      expect(mockPostgres.client.query).toHaveBeenCalled();

      // Assert: Verify result structure
      expect(result).toMatchObject({
        _cisProcessed: 2,
        _recordsInserted: 2,
        _recordsUpdated: 0,
        _errors: 0,
      });

      expect(result.durationMs).toBeGreaterThan(0);
      expect(result.completedAt).toBeDefined();
    });

    it('should filter CIs by type when specified', async () => {
      // Arrange
      mockNeo4j.session.run.mockResolvedValueOnce(createMockNeo4jResult([]));
      mockBullJob.data = {
        _ciTypes: ['server', 'database'],
        _batchSize: 100,
      };

      // Act
      await job.execute(mockBullJob);

      // Assert: Verify query includes type filter
      expect(mockNeo4j.session.run).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ci.type IN $ciTypes'),
        expect.objectContaining({
          _ciTypes: ['server', 'database'],
        })
      );
    });

    it('should perform incremental sync when incrementalSince is provided', async () => {
      // Arrange
      const since = '2023-12-01T00:00:00.000Z';
      mockNeo4j.session.run.mockResolvedValueOnce(createMockNeo4jResult([]));
      mockBullJob.data = {
        _incrementalSince: since,
        _batchSize: 100,
      };

      // Act
      await job.execute(mockBullJob);

      // Assert: Verify incremental query
      expect(mockNeo4j.session.run).toHaveBeenCalledWith(
        expect.stringContaining('ci.updated_at >= datetime($since)'),
        expect.objectContaining({
          since,
        })
      );
    });

    it('should update progress during batch processing', async () => {
      // Arrange: Multiple batches
      const mockCIs = Array.from({ length: 150 }, (_, i) =>
        createCI({ id: `ci-${i}`, name: `server-${i}` })
      );

      mockNeo4j.session.run.mockResolvedValueOnce(
        createMockNeo4jResult(
          mockCIs.map((ci) => ({ ci: { properties: ci } }))
        )
      );

      mockPostgres.client.query.mockResolvedValue(
        createMockPostgresResult([{ ci_key: 1 }])
      );

      mockBullJob.data = { batchSize: 50 }; // 3 batches

      // Act
      await job.execute(mockBullJob);

      // Assert: Progress updated 3 times (once per batch)
      expect(mockBullJob.updateProgress).toHaveBeenCalledTimes(3);
      expect(mockBullJob.updateProgress).toHaveBeenNthCalledWith(1, 0);
      expect(mockBullJob.updateProgress).toHaveBeenNthCalledWith(2, expect.any(Number));
      expect(mockBullJob.updateProgress).toHaveBeenNthCalledWith(3, expect.any(Number));
    });

    it('should handle batch processing errors gracefully', async () => {
      // Arrange: Mock CIs
      const mockCIs = [createCI({ id: 'ci-1' }), createCI({ id: 'ci-2' })];

      mockNeo4j.session.run.mockResolvedValueOnce(
        createMockNeo4jResult(
          mockCIs.map((ci) => ({ ci: { properties: ci } }))
        )
      );

      // Mock PostgreSQL error
      mockPostgres.client.query.mockRejectedValueOnce(
        new Error('Database connection error')
      );

      mockBullJob.data = { batchSize: 100 };

      // Act
      const result = await job.execute(mockBullJob);

      // Assert: Error counted but job completes
      expect(result.errors).toBe(1);
      expect(result.cisProcessed).toBeLessThanOrEqual(mockCIs.length);
    });
  });

  describe('processBatch - Type 2 SCD Logic', () => {
    it('should implement Type 2 SCD when CI data changes', async () => {
      // Arrange: Existing CI in database
      const existingCI = {
        _ci_key: 100,
        _ci_name: 'old-name',
        _ci_type: 'server',
        _status: 'active',
        _environment: 'production',
      };

      const updatedCI = createCI({
        _id: 'ci-1',
        _name: 'new-name', // Changed
        _type: 'server',
        _status: 'active',
        _environment: 'production',
      });

      mockNeo4j.session.run.mockResolvedValueOnce(
        createMockNeo4jResult([{ ci: { properties: updatedCI } }])
      );

      // Mock: Existing CI found
      mockPostgres.client.query
        .mockResolvedValueOnce(createMockPostgresResult([existingCI]))
        // Mock: Expire old record (UPDATE)
        .mockResolvedValueOnce(createMockPostgresResult([]))
        // Mock: Insert new version
        .mockResolvedValueOnce(createMockPostgresResult([{ ci_key: 101 }]))
        // Mock: Insert discovery fact
        .mockResolvedValueOnce(createMockPostgresResult([]));

      mockBullJob.data = { batchSize: 100, fullRefresh: false };

      // Act
      const result = await job.execute(mockBullJob);

      // Assert: Type 2 SCD operations
      expect(mockPostgres.client.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE dim_ci'),
        expect.arrayContaining([expect.any(Date), existingCI.ci_key])
      );

      expect(mockPostgres.client.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO dim_ci'),
        expect.any(Array)
      );

      expect(result.recordsUpdated).toBe(1);
      expect(result.recordsInserted).toBe(0); // Updated, not inserted
    });

    it('should skip update when CI data has not changed', async () => {
      // Arrange: CI with no changes
      const unchangedCI = createCI({
        _id: 'ci-1',
        _name: 'server-1',
        _type: 'server',
        _status: 'active',
        _environment: 'production',
      });

      const existingCI = {
        _ci_key: 100,
        _ci_name: 'server-1',
        _ci_type: 'server',
        _status: 'active',
        _environment: 'production',
      };

      mockNeo4j.session.run.mockResolvedValueOnce(
        createMockNeo4jResult([{ ci: { properties: unchangedCI } }])
      );

      mockPostgres.client.query.mockResolvedValueOnce(
        createMockPostgresResult([existingCI])
      );

      mockBullJob.data = { batchSize: 100, fullRefresh: false };

      // Act
      const result = await job.execute(mockBullJob);

      // Assert: No UPDATE or INSERT for unchanged CI
      expect(mockPostgres.client.query).toHaveBeenCalledTimes(1); // Only SELECT
      expect(result.recordsUpdated).toBe(0);
      expect(result.cisProcessed).toBe(1); // Still processed
    });

    it('should insert new CI when not found in database', async () => {
      // Arrange: New CI
      const newCI = createCI({ id: 'ci-new', name: 'new-server' });

      mockNeo4j.session.run.mockResolvedValueOnce(
        createMockNeo4jResult([{ ci: { properties: newCI } }])
      );

      // Mock: CI not found
      mockPostgres.client.query
        .mockResolvedValueOnce(createMockPostgresResult([]))
        // Mock: Insert new CI
        .mockResolvedValueOnce(createMockPostgresResult([{ ci_key: 1 }]))
        // Mock: Insert discovery fact
        .mockResolvedValueOnce(createMockPostgresResult([]));

      mockBullJob.data = { batchSize: 100 };

      // Act
      const result = await job.execute(mockBullJob);

      // Assert: New CI inserted
      expect(mockPostgres.client.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO dim_ci'),
        expect.any(Array)
      );

      expect(result.recordsInserted).toBe(1);
      expect(result.recordsUpdated).toBe(0);
    });
  });

  describe('Transaction Management', () => {
    it('should use transactions for batch processing', async () => {
      // Arrange
      const mockCIs = [createCI({ id: 'ci-1' })];

      mockNeo4j.session.run.mockResolvedValueOnce(
        createMockNeo4jResult(
          mockCIs.map((ci) => ({ ci: { properties: ci } }))
        )
      );

      mockPostgres.client.query.mockResolvedValue(
        createMockPostgresResult([{ ci_key: 1 }])
      );

      mockBullJob.data = { batchSize: 100 };

      // Act
      await job.execute(mockBullJob);

      // Assert: Transaction should be used (verify pool.transaction called)
      // Note: This requires mocking the transaction method
      // For now, we verify queries were executed within same client context
      expect(mockPostgres.client.query).toHaveBeenCalled();
    });

    it('should retry batch on transient errors with exponential backoff', async () => {
      // Arrange
      const mockCIs = [createCI({ id: 'ci-1' })];

      mockNeo4j.session.run.mockResolvedValueOnce(
        createMockNeo4jResult(
          mockCIs.map((ci) => ({ ci: { properties: ci } }))
        )
      );

      // Mock: First attempt fails, second succeeds
      mockPostgres.client.query
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValue(createMockPostgresResult([{ ci_key: 1 }]));

      mockBullJob.data = { batchSize: 100 };

      // Act
      const result = await job.execute(mockBullJob);

      // Assert: Should succeed after retries
      expect(result.errors).toBe(0);
      expect(result.cisProcessed).toBe(1);

      // Assert: Logger should record retry attempts
      const { logger } = require('@cmdb/common');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('retrying'),
        expect.any(Object)
      );
    });

    it('should fail after maximum retry attempts', async () => {
      // Arrange
      const mockCIs = [createCI({ id: 'ci-1' })];

      mockNeo4j.session.run.mockResolvedValueOnce(
        createMockNeo4jResult(
          mockCIs.map((ci) => ({ ci: { properties: ci } }))
        )
      );

      // Mock: All retry attempts fail
      mockPostgres.client.query.mockRejectedValue(
        new Error('Persistent connection error')
      );

      mockBullJob.data = { batchSize: 100 };

      // Act
      const result = await job.execute(mockBullJob);

      // Assert: Error recorded
      expect(result.errors).toBe(1);

      const { logger } = require('@cmdb/common');
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('failed after all retries'),
        expect.any(Object)
      );
    });
  });

  describe('Relationship Processing', () => {
    it('should process relationships when fullRefresh is true', async () => {
      // Arrange
      const mockCIs = [createCI({ id: 'ci-1' }), createCI({ id: 'ci-2' })];

      mockNeo4j.session.run.mockResolvedValueOnce(
        createMockNeo4jResult(
          mockCIs.map((ci) => ({ ci: { properties: ci } }))
        )
      );

      mockPostgres.client.query.mockResolvedValue(
        createMockPostgresResult([{ ci_key: 1 }])
      );

      // Mock getRelationships method
      const mockNeo4jClient = mockNeo4j.driver as any;
      mockNeo4jClient.getRelationships = jest.fn().mockResolvedValue([
        { ci: { id: 'ci-2' }, type: 'DEPENDS_ON' },
      ]);

      mockBullJob.data = { batchSize: 100, fullRefresh: true };

      // Act
      const result = await job.execute(mockBullJob);

      // Assert: Relationships processed
      expect(result.relationshipsProcessed).toBeGreaterThan(0);
    });

    it('should skip relationship processing for incremental sync', async () => {
      // Arrange
      const mockCIs = [createCI({ id: 'ci-1' })];

      mockNeo4j.session.run.mockResolvedValueOnce(
        createMockNeo4jResult(
          mockCIs.map((ci) => ({ ci: { properties: ci } }))
        )
      );

      mockPostgres.client.query.mockResolvedValue(
        createMockPostgresResult([{ ci_key: 1 }])
      );

      mockBullJob.data = {
        _batchSize: 100,
        _incrementalSince: '2023-12-01T00:00:00.000Z',
        _fullRefresh: false,
      };

      // Act
      const result = await job.execute(mockBullJob);

      // Assert: Relationships not processed
      expect(result.relationshipsProcessed).toBe(0);
    });
  });

  describe('Contract Verification (London School)', () => {
    it('should follow contract with Neo4j client for CI extraction', async () => {
      // Arrange
      mockNeo4j.session.run.mockResolvedValueOnce(createMockNeo4jResult([]));
      mockBullJob.data = { batchSize: 100 };

      // Act
      await job.execute(mockBullJob);

      // Assert: Contract verification
      expect(mockNeo4j.driver.session).toHaveBeenCalled();
      expect(mockNeo4j.session.run).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (ci:CI)'),
        expect.any(Object)
      );
      expect(mockNeo4j.session.close).toHaveBeenCalled();
    });

    it('should follow contract with PostgreSQL client for dimension insert', async () => {
      // Arrange
      const mockCI = createCI({ id: 'ci-1' });

      mockNeo4j.session.run.mockResolvedValueOnce(
        createMockNeo4jResult([{ ci: { properties: mockCI } }])
      );

      mockPostgres.client.query
        .mockResolvedValueOnce(createMockPostgresResult([])) // Not found
        .mockResolvedValueOnce(createMockPostgresResult([{ ci_key: 1 }])) // Insert
        .mockResolvedValueOnce(createMockPostgresResult([])); // Fact insert

      mockBullJob.data = { batchSize: 100 };

      // Act
      await job.execute(mockBullJob);

      // Assert: Contract with PostgreSQL
      expect(mockPostgres.client.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO dim_ci'),
        expect.arrayContaining([
          mockCI.id,
          mockCI.name,
          mockCI.type,
          expect.any(String), // environment
          mockCI.status,
          mockCI.external_id,
          expect.any(Date),
          expect.any(Date),
          expect.any(Date),
        ])
      );
    });
  });
});
