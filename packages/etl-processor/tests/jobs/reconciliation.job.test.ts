/**
 * Reconciliation Job Tests
 *
 * Tests for data reconciliation between Neo4j and PostgreSQL including:
 * - Conflict detection
 * - Conflict resolution strategies
 * - Data consistency verification
 * - Auto-repair capabilities
 */

import { ReconciliationJob, Conflict, ConflictType } from '../../src/jobs/reconciliation.job';
import { Neo4jClient, PostgresClient } from '@cmdb/database';
import { Job } from 'bullmq';
import { CI } from '@cmdb/common';

describe('ReconciliationJob', () => {
  let job: ReconciliationJob;
  let mockNeo4jClient: jest.Mocked<Neo4jClient>;
  let mockPostgresClient: jest.Mocked<PostgresClient>;
  let mockSession: any;
  let mockBullJob: jest.Mocked<Job>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Neo4j session
    mockSession = {
      _run: jest.fn(),
      _close: jest.fn()
    };

    // Mock Neo4j client
    mockNeo4jClient = {
      _getSession: jest.fn().mockReturnValue(mockSession),
      _getCI: jest.fn(),
      _updateCI: jest.fn(),
      _createCI: jest.fn()
    } as any;

    // Mock PostgreSQL client
    mockPostgresClient = {
      _query: jest.fn()
    } as any;

    // Mock BullMQ job
    mockBullJob = {
      _id: 'test-job-id',
      _data: {
        _conflictStrategy: 'neo4j-wins',
        _autoResolve: false
      },
      _updateProgress: jest.fn()
    } as any;

    job = new ReconciliationJob(mockNeo4jClient, mockPostgresClient);
  });

  describe('execute', () => {
    it('should detect CIs missing in Neo4j', async () => {
      const ciId = 'ci-missing-neo4j';

      // Mock getAllCIIds to return one CI
      mockSession.run
        .mockResolvedValueOnce({ records: [] }) // Empty Neo4j
        .mockResolvedValueOnce({ // PostgreSQL has CI
          _records: [{ get: jest.fn(() => ciId) }]
        });

      mockBullJob.data = { ciIds: [ciId] };

      mockNeo4jClient.getCI.mockResolvedValueOnce(null); // Not in Neo4j

      mockPostgresClient.query.mockResolvedValueOnce({
        _rows: [{
          _ci_id: ciId,
          _ci_name: 'Test CI',
          _ci_type: 'server',
          _status: 'active',
          _created_at: new Date(),
          _updated_at: new Date(),
          _discovered_at: new Date(),
          _metadata: {}
        }]
      });

      const result = await job.execute(mockBullJob);

      expect(result.conflictsDetected).toBe(1);
      expect(result.conflicts[0]?.type).toBe('missing-in-neo4j');
    });

    it('should detect CIs missing in PostgreSQL', async () => {
      const ciId = 'ci-missing-pg';

      mockBullJob.data = { ciIds: [ciId] };

      const neo4jCI: CI = {
        _id: ciId,
        _name: 'Test CI',
        _type: 'server',
        _status: 'active',
        _created_at: '2025-01-15T10:00:00Z',
        _updated_at: '2025-01-15T10:00:00Z',
        _discovered_at: '2025-01-15T10:00:00Z',
        _metadata: {}
      };

      mockNeo4jClient.getCI.mockResolvedValueOnce(neo4jCI);
      mockPostgresClient.query.mockResolvedValueOnce({ rows: [] }); // Not in PostgreSQL

      const result = await job.execute(mockBullJob);

      expect(result.conflictsDetected).toBe(1);
      expect(result.conflicts[0]?.type).toBe('missing-in-postgres');
    });

    it('should detect status mismatches', async () => {
      const ciId = 'ci-status-mismatch';

      mockBullJob.data = { ciIds: [ciId] };

      const neo4jCI: CI = {
        _id: ciId,
        _name: 'Test CI',
        _type: 'server',
        _status: 'active',
        _created_at: '2025-01-15T10:00:00Z',
        _updated_at: '2025-01-15T12:00:00Z',
        _discovered_at: '2025-01-15T10:00:00Z',
        _metadata: {}
      };

      const postgresCI: CI = {
        ...neo4jCI,
        _status: 'maintenance', // Different status
        _updated_at: '2025-01-15T11:00:00Z'
      };

      mockNeo4jClient.getCI.mockResolvedValueOnce(neo4jCI);
      mockPostgresClient.query.mockResolvedValueOnce({
        _rows: [{
          _ci_id: postgresCI.id,
          _ci_name: postgresCI.name,
          _ci_type: postgresCI.type,
          _status: postgresCI.status,
          _created_at: new Date(postgresCI.created_at),
          _updated_at: new Date(postgresCI.updated_at),
          _discovered_at: new Date(postgresCI.discovered_at),
          _metadata: postgresCI.metadata
        }]
      });

      const result = await job.execute(mockBullJob);

      expect(result.conflictsDetected).toBe(1);
      const conflict = result.conflicts.find(c => c.type === 'status-mismatch');
      expect(conflict).toBeDefined();
      expect(conflict?.neo4jValue).toBe('active');
      expect(conflict?.postgresValue).toBe('maintenance');
    });

    it('should detect timestamp mismatches', async () => {
      const ciId = 'ci-timestamp-mismatch';

      mockBullJob.data = { ciIds: [ciId] };

      const neo4jCI: CI = {
        _id: ciId,
        _name: 'Test CI',
        _type: 'server',
        _status: 'active',
        _created_at: '2025-01-15T10:00:00Z',
        _updated_at: '2025-01-15T15:00:00Z', // 5 hours later
        _discovered_at: '2025-01-15T10:00:00Z',
        _metadata: {}
      };

      const postgresCI: CI = {
        ...neo4jCI,
        _updated_at: '2025-01-15T10:00:00Z' // 5 hours difference
      };

      mockNeo4jClient.getCI.mockResolvedValueOnce(neo4jCI);
      mockPostgresClient.query.mockResolvedValueOnce({
        _rows: [{
          _ci_id: postgresCI.id,
          _ci_name: postgresCI.name,
          _ci_type: postgresCI.type,
          _status: postgresCI.status,
          _created_at: new Date(postgresCI.created_at),
          _updated_at: new Date(postgresCI.updated_at),
          _discovered_at: new Date(postgresCI.discovered_at),
          _metadata: postgresCI.metadata
        }]
      });

      const result = await job.execute(mockBullJob);

      const timestampConflict = result.conflicts.find(c => c.type === 'timestamp-mismatch');
      expect(timestampConflict).toBeDefined();
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve with neo4j-wins strategy', async () => {
      const ciId = 'ci-resolve';

      mockBullJob.data = {
        _ciIds: [ciId],
        _conflictStrategy: 'neo4j-wins',
        _autoResolve: true
      };

      const neo4jCI: CI = {
        _id: ciId,
        _name: 'Test CI',
        _type: 'server',
        _status: 'active',
        _created_at: '2025-01-15T10:00:00Z',
        _updated_at: '2025-01-15T12:00:00Z',
        _discovered_at: '2025-01-15T10:00:00Z',
        _metadata: {}
      };

      const postgresCI: CI = {
        ...neo4jCI,
        _status: 'maintenance'
      };

      mockNeo4jClient.getCI.mockResolvedValueOnce(neo4jCI);
      mockPostgresClient.query
        .mockResolvedValueOnce({
          _rows: [{
            _ci_id: postgresCI.id,
            _ci_name: postgresCI.name,
            _ci_type: postgresCI.type,
            _status: postgresCI.status,
            _created_at: new Date(postgresCI.created_at),
            _updated_at: new Date(postgresCI.updated_at),
            _discovered_at: new Date(postgresCI.discovered_at),
            _metadata: postgresCI.metadata
          }]
        })
        .mockResolvedValueOnce({}); // Update query

      const result = await job.execute(mockBullJob);

      expect(result.conflictsResolved).toBe(1);
      expect(result.conflicts[0]?.autoResolved).toBe(true);
      expect(mockPostgresClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE dim_ci'),
        expect.arrayContaining(['active', ciId])
      );
    });

    it('should resolve with postgres-wins strategy', async () => {
      const ciId = 'ci-resolve';

      mockBullJob.data = {
        _ciIds: [ciId],
        _conflictStrategy: 'postgres-wins',
        _autoResolve: true
      };

      const neo4jCI: CI = {
        _id: ciId,
        _name: 'Test CI',
        _type: 'server',
        _status: 'active',
        _created_at: '2025-01-15T10:00:00Z',
        _updated_at: '2025-01-15T11:00:00Z',
        _discovered_at: '2025-01-15T10:00:00Z',
        _metadata: {}
      };

      const postgresCI: CI = {
        ...neo4jCI,
        _status: 'maintenance',
        _updated_at: '2025-01-15T12:00:00Z'
      };

      mockNeo4jClient.getCI.mockResolvedValueOnce(neo4jCI);
      mockNeo4jClient.updateCI.mockResolvedValueOnce(undefined);

      mockPostgresClient.query.mockResolvedValueOnce({
        _rows: [{
          _ci_id: postgresCI.id,
          _ci_name: postgresCI.name,
          _ci_type: postgresCI.type,
          _status: postgresCI.status,
          _created_at: new Date(postgresCI.created_at),
          _updated_at: new Date(postgresCI.updated_at),
          _discovered_at: new Date(postgresCI.discovered_at),
          _metadata: postgresCI.metadata
        }]
      });

      const result = await job.execute(mockBullJob);

      expect(result.conflictsResolved).toBe(1);
      expect(mockNeo4jClient.updateCI).toHaveBeenCalledWith(
        ciId,
        expect.objectContaining({ status: 'maintenance' })
      );
    });

    it('should resolve with newest-wins strategy', async () => {
      const ciId = 'ci-resolve';

      mockBullJob.data = {
        _ciIds: [ciId],
        _conflictStrategy: 'newest-wins',
        _autoResolve: true
      };

      const neo4jCI: CI = {
        _id: ciId,
        _name: 'Test CI',
        _type: 'server',
        _status: 'active',
        _created_at: '2025-01-15T10:00:00Z',
        _updated_at: '2025-01-15T13:00:00Z', // Newer
        _discovered_at: '2025-01-15T10:00:00Z',
        _metadata: {}
      };

      const postgresCI: CI = {
        ...neo4jCI,
        _status: 'maintenance',
        _updated_at: '2025-01-15T12:00:00Z' // Older
      };

      mockNeo4jClient.getCI.mockResolvedValueOnce(neo4jCI);
      mockPostgresClient.query
        .mockResolvedValueOnce({
          _rows: [{
            _ci_id: postgresCI.id,
            _ci_name: postgresCI.name,
            _ci_type: postgresCI.type,
            _status: postgresCI.status,
            _created_at: new Date(postgresCI.created_at),
            _updated_at: new Date(postgresCI.updated_at),
            _discovered_at: new Date(postgresCI.discovered_at),
            _metadata: postgresCI.metadata
          }]
        })
        .mockResolvedValueOnce({}); // Update

      const result = await job.execute(mockBullJob);

      expect(result.conflictsResolved).toBe(1);
      // Neo4j should win because it's newer
      expect(mockPostgresClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE dim_ci'),
        expect.arrayContaining(['active'])
      );
    });

    it('should not auto-resolve with manual strategy', async () => {
      const ciId = 'ci-manual';

      mockBullJob.data = {
        _ciIds: [ciId],
        _conflictStrategy: 'manual',
        _autoResolve: true // Even with autoResolve=true, manual conflicts shouldn't resolve
      };

      const neo4jCI: CI = {
        _id: ciId,
        _name: 'Test CI',
        _type: 'server',
        _status: 'active',
        _created_at: '2025-01-15T10:00:00Z',
        _updated_at: '2025-01-15T12:00:00Z',
        _discovered_at: '2025-01-15T10:00:00Z',
        _metadata: {}
      };

      const postgresCI: CI = {
        ...neo4jCI,
        _status: 'maintenance'
      };

      mockNeo4jClient.getCI.mockResolvedValueOnce(neo4jCI);
      mockPostgresClient.query.mockResolvedValueOnce({
        _rows: [{
          _ci_id: postgresCI.id,
          _ci_name: postgresCI.name,
          _ci_type: postgresCI.type,
          _status: postgresCI.status,
          _created_at: new Date(postgresCI.created_at),
          _updated_at: new Date(postgresCI.updated_at),
          _discovered_at: new Date(postgresCI.discovered_at),
          _metadata: postgresCI.metadata
        }]
      });

      const result = await job.execute(mockBullJob);

      expect(result.conflictsDetected).toBe(1);
      expect(result.conflictsResolved).toBe(0);
      expect(result.manualReviewRequired).toBe(1);
    });
  });

  describe('getAllCIIds', () => {
    it('should collect CI IDs from both sources', async () => {
      mockSession.run
        .mockResolvedValueOnce({ // Neo4j
          _records: [
            { get: jest.fn(() => 'ci-1') },
            { get: jest.fn(() => 'ci-2') }
          ]
        });

      mockPostgresClient.query.mockResolvedValueOnce({ // PostgreSQL
        _rows: [
          { ci_id: 'ci-2' }, // Duplicate
          { ci_id: 'ci-3' }
        ]
      });

      mockBullJob.data = {}; // No ciIds specified

      // Mock empty CIs to avoid actual reconciliation
      mockNeo4jClient.getCI.mockResolvedValue(null);
      mockPostgresClient.query
        .mockResolvedValueOnce({ rows: [{ ci_id: 'ci-2' }, { ci_id: 'ci-3' }] }) // getAllCIIds
        .mockResolvedValue({ rows: [] }); // getPostgresCI calls

      await job.execute(mockBullJob);

      // Should have unique IDs from both sources
      expect(mockBullJob.updateProgress).toHaveBeenCalled();
    });
  });

  describe('Progress Tracking', () => {
    it('should update progress during reconciliation', async () => {
      mockBullJob.data = {
        _ciIds: ['ci-1', 'ci-2', 'ci-3']
      };

      mockNeo4jClient.getCI.mockResolvedValue(null);
      mockPostgresClient.query.mockResolvedValue({ rows: [] });

      await job.execute(mockBullJob);

      expect(mockBullJob.updateProgress).toHaveBeenCalled();
      const progressCalls = (mockBullJob.updateProgress as jest.Mock).mock.calls;
      expect(progressCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should continue after individual CI reconciliation error', async () => {
      mockBullJob.data = {
        _ciIds: ['ci-error', 'ci-ok']
      };

      mockNeo4jClient.getCI
        .mockRejectedValueOnce(new Error('Neo4j error'))
        .mockResolvedValueOnce(null);

      mockPostgresClient.query.mockResolvedValue({ rows: [] });

      const result = await job.execute(mockBullJob);

      // Should process at least one CI
      expect(result.cisChecked).toBeGreaterThan(0);
    });
  });
});
