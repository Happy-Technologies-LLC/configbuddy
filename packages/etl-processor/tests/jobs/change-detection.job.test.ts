// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Change Detection Job Tests
 *
 * Tests for the change detection system including:
 * - CI change detection
 * - Relationship change tracking
 * - Change event recording
 * - Historical comparison
 */

import { ChangeDetectionJob, ChangeEvent } from '../../src/jobs/change-detection.job';
import { Neo4jClient, PostgresClient } from '@cmdb/database';
import { Job } from 'bullmq';
import { CI } from '@cmdb/common';

describe('ChangeDetectionJob', () => {
  let job: ChangeDetectionJob;
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
      _close: jest.fn()
    };

    // Mock Neo4j client
    mockNeo4jClient = {
      _getSession: jest.fn().mockReturnValue(mockSession)
    } as any;

    // Mock PostgreSQL pool client
    mockPoolClient = {
      _query: jest.fn(),
      _release: jest.fn()
    };

    // Mock PostgreSQL client
    mockPostgresClient = {
      _transaction: jest.fn(async (callback) => await callback(mockPoolClient)),
      _query: jest.fn()
    } as any;

    // Mock BullMQ job
    mockBullJob = {
      _id: 'test-job-id',
      _data: {
        _lookbackHours: 24
      },
      _updateProgress: jest.fn()
    } as any;

    job = new ChangeDetectionJob(mockNeo4jClient, mockPostgresClient);
  });

  describe('execute', () => {
    it('should detect changes in CIs', async () => {
      // Mock Neo4j query for changed CIs
      mockSession.run.mockResolvedValueOnce({
        _records: [
          {
            _get: jest.fn().mockReturnValue({
              _properties: {
                _id: 'ci-1',
                _name: 'Updated Server',
                _type: 'server',
                _status: 'maintenance',
                _created_at: '2025-01-15T10:00:00Z',
                _updated_at: '2025-01-15T12:00:00Z',
                _discovered_at: '2025-01-15T10:00:00Z',
                _metadata: '{}'
              }
            })
          }
        ]
      });

      // Mock PostgreSQL query for historical CI (different status)
      mockPostgresClient.query.mockResolvedValueOnce({
        _rows: [{
          _ci_id: 'ci-1',
          _ci_name: 'Updated Server',
          _ci_type: 'server',
          _status: 'active', // Changed from active to maintenance
          _created_at: new Date('2025-01-15T10:00:00Z'),
          _updated_at: new Date('2025-01-15T11:00:00Z'),
          _discovered_at: new Date('2025-01-15T10:00:00Z'),
          _metadata: {}
        }]
      });

      const result = await job.execute(mockBullJob);

      expect(result.cisChecked).toBe(1);
      expect(result.changesDetected).toBeGreaterThan(0);
      expect(result.changesRecorded).toBeGreaterThan(0);
      expect(result.changes.length).toBeGreaterThan(0);
      expect(result.changes[0]?.changeType).toBe('status-changed');
    });

    it('should detect new CIs as created', async () => {
      // Mock Neo4j query
      mockSession.run.mockResolvedValueOnce({
        _records: [
          {
            _get: jest.fn().mockReturnValue({
              _properties: {
                _id: 'ci-new',
                _name: 'New Server',
                _type: 'server',
                _status: 'active',
                _created_at: '2025-01-15T12:00:00Z',
                _updated_at: '2025-01-15T12:00:00Z',
                _discovered_at: '2025-01-15T12:00:00Z',
                _metadata: '{}'
              }
            })
          }
        ]
      });

      // Mock PostgreSQL query - no historical record found
      mockPostgresClient.query.mockResolvedValueOnce({
        _rows: []
      });

      const result = await job.execute(mockBullJob);

      expect(result.changesDetected).toBe(1);
      expect(result.changes[0]?.changeType).toBe('created');
      expect(result.changes[0]?.ciId).toBe('ci-new');
    });

    it('should detect metadata changes', async () => {
      mockSession.run.mockResolvedValueOnce({
        _records: [
          {
            _get: jest.fn().mockReturnValue({
              _properties: {
                _id: 'ci-1',
                _name: 'Server',
                _type: 'server',
                _status: 'active',
                _created_at: '2025-01-15T10:00:00Z',
                _updated_at: '2025-01-15T12:00:00Z',
                _discovered_at: '2025-01-15T10:00:00Z',
                _metadata: '{"key": "new-value"}'
              }
            })
          }
        ]
      });

      mockPostgresClient.query.mockResolvedValueOnce({
        _rows: [{
          _ci_id: 'ci-1',
          _ci_name: 'Server',
          _ci_type: 'server',
          _status: 'active',
          _created_at: new Date('2025-01-15T10:00:00Z'),
          _updated_at: new Date('2025-01-15T11:00:00Z'),
          _discovered_at: new Date('2025-01-15T10:00:00Z'),
          _metadata: { key: 'old-value' } // Changed
        }]
      });

      const result = await job.execute(mockBullJob);

      const metadataChange = result.changes.find(c => c.changeType === 'metadata-changed');
      expect(metadataChange).toBeDefined();
      expect(metadataChange?.fieldName).toBe('metadata');
    });

    it('should handle CIs with no changes', async () => {
      mockSession.run.mockResolvedValueOnce({
        _records: [
          {
            _get: jest.fn().mockReturnValue({
              _properties: {
                _id: 'ci-1',
                _name: 'Unchanged Server',
                _type: 'server',
                _status: 'active',
                _created_at: '2025-01-15T10:00:00Z',
                _updated_at: '2025-01-15T11:00:00Z',
                _discovered_at: '2025-01-15T10:00:00Z',
                _metadata: '{}'
              }
            })
          }
        ]
      });

      mockPostgresClient.query.mockResolvedValueOnce({
        _rows: [{
          _ci_id: 'ci-1',
          _ci_name: 'Unchanged Server',
          _ci_type: 'server',
          _status: 'active',
          _created_at: new Date('2025-01-15T10:00:00Z'),
          _updated_at: new Date('2025-01-15T11:00:00Z'),
          _discovered_at: new Date('2025-01-15T10:00:00Z'),
          _metadata: {}
        }]
      });

      const result = await job.execute(mockBullJob);

      expect(result.cisChecked).toBe(1);
      expect(result.changesDetected).toBe(0);
    });

    it('should continue processing after individual CI error', async () => {
      mockSession.run.mockResolvedValueOnce({
        _records: [
          {
            _get: jest.fn().mockReturnValue({
              _properties: {
                _id: 'ci-error',
                _name: 'Error CI',
                _type: 'server',
                _status: 'active',
                _created_at: '2025-01-15T10:00:00Z',
                _updated_at: '2025-01-15T11:00:00Z',
                _discovered_at: '2025-01-15T10:00:00Z',
                _metadata: '{}'
              }
            })
          },
          {
            _get: jest.fn().mockReturnValue({
              _properties: {
                _id: 'ci-ok',
                _name: 'OK CI',
                _type: 'server',
                _status: 'active',
                _created_at: '2025-01-15T10:00:00Z',
                _updated_at: '2025-01-15T11:00:00Z',
                _discovered_at: '2025-01-15T10:00:00Z',
                _metadata: '{}'
              }
            })
          }
        ]
      });

      mockPostgresClient.query
        .mockRejectedValueOnce(new Error('Database error')) // First CI fails
        .mockResolvedValueOnce({ rows: [] }); // Second CI succeeds

      const result = await job.execute(mockBullJob);

      expect(result.cisChecked).toBeGreaterThan(0);
    });
  });

  describe('detectRelationshipChanges', () => {
    it('should detect new relationships', async () => {
      mockBullJob.data = {
        _lookbackHours: 24,
        _includeRelationships: true
      };

      // Mock getChangedCIs
      mockSession.run
        .mockResolvedValueOnce({ records: [] }) // No changed CIs
        .mockResolvedValueOnce({ // Relationship query
          _records: [
            {
              _get: jest.fn((field: string) => {
                const data: Record<string, any> = {
                  _fromId: 'ci-1',
                  _fromName: 'Server 1',
                  _toId: 'ci-2',
                  _toName: 'Database 1',
                  _relType: 'DEPENDS_ON',
                  _createdAt: new Date('2025-01-15T12:00:00Z').toISOString(),
                  _updatedAt: new Date('2025-01-15T12:00:00Z').toISOString()
                };
                return data[field];
              })
            }
          ]
        });

      const result = await job.execute(mockBullJob);

      expect(result.changesDetected).toBeGreaterThan(0);
      const relChange = result.changes.find(c => c.changeType === 'relationship-added');
      expect(relChange).toBeDefined();
    });
  });

  describe('recordChanges', () => {
    it('should batch insert changes into PostgreSQL', async () => {
      mockSession.run.mockResolvedValueOnce({
        _records: [
          {
            _get: jest.fn().mockReturnValue({
              _properties: {
                _id: 'ci-1',
                _name: 'Server 1',
                _type: 'server',
                _status: 'maintenance',
                _created_at: '2025-01-15T10:00:00Z',
                _updated_at: '2025-01-15T12:00:00Z',
                _discovered_at: '2025-01-15T10:00:00Z',
                _metadata: '{}'
              }
            })
          }
        ]
      });

      mockPostgresClient.query.mockResolvedValueOnce({
        _rows: [{
          _ci_id: 'ci-1',
          _ci_name: 'Server 1',
          _ci_type: 'server',
          _status: 'active', // Changed
          _created_at: new Date('2025-01-15T10:00:00Z'),
          _updated_at: new Date('2025-01-15T11:00:00Z'),
          _discovered_at: new Date('2025-01-15T10:00:00Z'),
          _metadata: {}
        }]
      });

      mockPoolClient.query.mockResolvedValue({});

      const result = await job.execute(mockBullJob);

      expect(result.changesRecorded).toBeGreaterThan(0);
      expect(mockPoolClient.query).toHaveBeenCalled();

      const insertCall = mockPoolClient.query.mock.calls.find((call: any) =>
        call[0].includes('INSERT INTO fact_ci_changes')
      );
      expect(insertCall).toBeDefined();
    });

    it('should handle empty changes array', async () => {
      mockSession.run.mockResolvedValueOnce({ records: [] });

      const result = await job.execute(mockBullJob);

      expect(result.changesRecorded).toBe(0);
    });
  });

  describe('getChangedCIs', () => {
    it('should filter by CI IDs when provided', async () => {
      mockSession.run.mockResolvedValueOnce({ records: [] });

      mockBullJob.data = {
        _lookbackHours: 24,
        _ciIds: ['ci-1', 'ci-2']
      };

      await job.execute(mockBullJob);

      const query = mockSession.run.mock.calls[0][0];
      const params = mockSession.run.mock.calls[0][1];

      expect(query).toContain('ci.id IN $ciIds');
      expect(params.ciIds).toEqual(['ci-1', 'ci-2']);
    });

    it('should use lookbackHours to filter', async () => {
      mockSession.run.mockResolvedValueOnce({ records: [] });

      mockBullJob.data = {
        _lookbackHours: 48
      };

      await job.execute(mockBullJob);

      const query = mockSession.run.mock.calls[0][0];
      expect(query).toContain('ci.updated_at >= datetime($since)');
    });
  });

  describe('Progress Tracking', () => {
    it('should update progress during processing', async () => {
      const records = Array.from({ length: 10 }, (_, i) => ({
        _get: jest.fn().mockReturnValue({
          _properties: {
            _id: `ci-${i}`,
            _name: `Server ${i}`,
            _type: 'server',
            _status: 'active',
            _created_at: '2025-01-15T10:00:00Z',
            _updated_at: '2025-01-15T11:00:00Z',
            _discovered_at: '2025-01-15T10:00:00Z',
            _metadata: '{}'
          }
        })
      }));

      mockSession.run.mockResolvedValueOnce({ records });
      mockPostgresClient.query.mockResolvedValue({ rows: [] });

      await job.execute(mockBullJob);

      expect(mockBullJob.updateProgress).toHaveBeenCalled();
      const progressCalls = (mockBullJob.updateProgress as jest.Mock).mock.calls;
      expect(progressCalls.length).toBeGreaterThan(0);
    });
  });
});
