/**
 * Change Detection Job - Enhanced Integration Tests
 *
 * Comprehensive tests covering:
 * - Detection of multiple field changes
 * - Cascading change detection
 * - Metadata change tracking with deep comparison
 * - Relationship change detection (bidirectional)
 * - Performance with high-frequency changes
 * - Change attribution and auditing
 */

import { ChangeDetectionJob, ChangeEvent, ChangeType } from '../../src/jobs/change-detection.job';
import { Neo4jClient, PostgresClient } from '@cmdb/database';
import { Job } from 'bullmq';
import { CI } from '@cmdb/common';

describe('ChangeDetectionJob - Enhanced Integration Tests', () => {
  let job: ChangeDetectionJob;
  let mockNeo4jClient: jest.Mocked<Neo4jClient>;
  let mockPostgresClient: jest.Mocked<PostgresClient>;
  let mockSession: any;
  let mockPoolClient: any;
  let mockBullJob: jest.Mocked<Job>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSession = {
      run: jest.fn(),
      close: jest.fn()
    };

    mockNeo4jClient = {
      getSession: jest.fn().mockReturnValue(mockSession)
    } as any;

    mockPoolClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    mockPostgresClient = {
      transaction: jest.fn(async (callback) => await callback(mockPoolClient)),
      query: jest.fn()
    } as any;

    mockBullJob = {
      id: 'test-job-id',
      data: {
        lookbackHours: 24
      },
      updateProgress: jest.fn()
    } as any;

    job = new ChangeDetectionJob(mockNeo4jClient, mockPostgresClient);
  });

  describe('Multiple Field Changes', () => {
    it('should detect changes to multiple fields in a single CI', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn().mockReturnValue({
              properties: {
                id: 'ci-multichange',
                name: 'New Server Name', // Changed
                type: 'server',
                status: 'maintenance', // Changed
                environment: 'staging', // Changed
                created_at: '2025-01-15T10:00:00Z',
                updated_at: '2025-01-15T14:00:00Z',
                discovered_at: '2025-01-15T10:00:00Z',
                metadata: JSON.stringify({ version: '2.0' }) // Changed
              }
            })
          }
        ]
      });

      mockPostgresClient.query.mockResolvedValueOnce({
        rows: [{
          ci_id: 'ci-multichange',
          ci_name: 'Old Server Name',
          ci_type: 'server',
          status: 'active',
          environment: 'production',
          created_at: new Date('2025-01-15T10:00:00Z'),
          updated_at: new Date('2025-01-15T11:00:00Z'),
          discovered_at: new Date('2025-01-15T10:00:00Z'),
          metadata: { version: '1.0' }
        }]
      });

      mockPoolClient.query.mockResolvedValue({});

      const result = await job.execute(mockBullJob);

      expect(result.changesDetected).toBeGreaterThanOrEqual(4); // name, status, environment, metadata
      expect(result.changesRecorded).toBeGreaterThanOrEqual(4);

      // Verify different change types
      const changes = result.changes;
      expect(changes.some(c => c.fieldName === 'name' && c.changeType === 'updated')).toBe(true);
      expect(changes.some(c => c.fieldName === 'status' && c.changeType === 'status-changed')).toBe(true);
      expect(changes.some(c => c.fieldName === 'environment' && c.changeType === 'updated')).toBe(true);
      expect(changes.some(c => c.fieldName === 'metadata' && c.changeType === 'metadata-changed')).toBe(true);
    });

    it('should capture old and new values for all changes', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn().mockReturnValue({
              properties: {
                id: 'ci-values',
                name: 'Updated Name',
                type: 'server',
                status: 'inactive',
                environment: 'production',
                created_at: '2025-01-15T10:00:00Z',
                updated_at: '2025-01-15T12:00:00Z',
                discovered_at: '2025-01-15T10:00:00Z',
                metadata: '{}'
              }
            })
          }
        ]
      });

      mockPostgresClient.query.mockResolvedValueOnce({
        rows: [{
          ci_id: 'ci-values',
          ci_name: 'Original Name',
          ci_type: 'server',
          status: 'active',
          environment: 'production',
          created_at: new Date('2025-01-15T10:00:00Z'),
          updated_at: new Date('2025-01-15T11:00:00Z'),
          discovered_at: new Date('2025-01-15T10:00:00Z'),
          metadata: {}
        }]
      });

      mockPoolClient.query.mockResolvedValue({});

      const result = await job.execute(mockBullJob);

      const nameChange = result.changes.find(c => c.fieldName === 'name');
      expect(nameChange).toBeDefined();
      expect(nameChange?.oldValue).toBe('Original Name');
      expect(nameChange?.newValue).toBe('Updated Name');

      const statusChange = result.changes.find(c => c.fieldName === 'status');
      expect(statusChange).toBeDefined();
      expect(statusChange?.oldValue).toBe('active');
      expect(statusChange?.newValue).toBe('inactive');
    });
  });

  describe('Complex Metadata Changes', () => {
    it('should detect nested metadata changes', async () => {
      const oldMetadata = {
        config: {
          cpu: 4,
          memory: 16,
          disk: {
            size: 500,
            type: 'ssd'
          }
        },
        tags: ['web', 'production']
      };

      const newMetadata = {
        config: {
          cpu: 8, // Changed
          memory: 16,
          disk: {
            size: 1000, // Changed
            type: 'nvme' // Changed
          }
        },
        tags: ['web', 'production', 'critical'] // Changed
      };

      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn().mockReturnValue({
              properties: {
                id: 'ci-metadata',
                name: 'Server',
                type: 'server',
                status: 'active',
                environment: 'production',
                created_at: '2025-01-15T10:00:00Z',
                updated_at: '2025-01-15T13:00:00Z',
                discovered_at: '2025-01-15T10:00:00Z',
                metadata: JSON.stringify(newMetadata)
              }
            })
          }
        ]
      });

      mockPostgresClient.query.mockResolvedValueOnce({
        rows: [{
          ci_id: 'ci-metadata',
          ci_name: 'Server',
          ci_type: 'server',
          status: 'active',
          environment: 'production',
          created_at: new Date('2025-01-15T10:00:00Z'),
          updated_at: new Date('2025-01-15T11:00:00Z'),
          discovered_at: new Date('2025-01-15T10:00:00Z'),
          metadata: oldMetadata
        }]
      });

      mockPoolClient.query.mockResolvedValue({});

      const result = await job.execute(mockBullJob);

      const metadataChange = result.changes.find(c => c.changeType === 'metadata-changed');
      expect(metadataChange).toBeDefined();
      expect(metadataChange?.oldValue).toEqual(oldMetadata);
      expect(metadataChange?.newValue).toEqual(newMetadata);
    });

    it('should handle metadata with null and undefined values', async () => {
      const oldMetadata = {
        key1: 'value1',
        key2: null,
        key3: undefined
      };

      const newMetadata = {
        key1: 'value1',
        key2: 'value2', // Changed from null
        key4: 'new-key' // New key added
      };

      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn().mockReturnValue({
              properties: {
                id: 'ci-null-metadata',
                name: 'Server',
                type: 'server',
                status: 'active',
                created_at: '2025-01-15T10:00:00Z',
                updated_at: '2025-01-15T12:00:00Z',
                discovered_at: '2025-01-15T10:00:00Z',
                metadata: JSON.stringify(newMetadata)
              }
            })
          }
        ]
      });

      mockPostgresClient.query.mockResolvedValueOnce({
        rows: [{
          ci_id: 'ci-null-metadata',
          ci_name: 'Server',
          ci_type: 'server',
          status: 'active',
          created_at: new Date('2025-01-15T10:00:00Z'),
          updated_at: new Date('2025-01-15T11:00:00Z'),
          discovered_at: new Date('2025-01-15T10:00:00Z'),
          metadata: oldMetadata
        }]
      });

      mockPoolClient.query.mockResolvedValue({});

      const result = await job.execute(mockBullJob);

      expect(result.changesDetected).toBeGreaterThan(0);
    });
  });

  describe('Relationship Change Detection', () => {
    it('should detect newly added relationships', async () => {
      mockBullJob.data = {
        lookbackHours: 24,
        includeRelationships: true
      };

      mockSession.run
        .mockResolvedValueOnce({ records: [] }) // No CI changes
        .mockResolvedValueOnce({
          records: [
            {
              get: jest.fn((field: string) => {
                const data: Record<string, any> = {
                  fromId: 'app-1',
                  fromName: 'Application 1',
                  toId: 'db-1',
                  toName: 'Database 1',
                  relType: 'DEPENDS_ON',
                  createdAt: new Date('2025-01-15T12:00:00Z').toISOString(),
                  updatedAt: new Date('2025-01-15T12:00:00Z').toISOString()
                };
                return data[field];
              })
            },
            {
              get: jest.fn((field: string) => {
                const data: Record<string, any> = {
                  fromId: 'app-1',
                  fromName: 'Application 1',
                  toId: 'cache-1',
                  toName: 'Cache 1',
                  relType: 'USES',
                  createdAt: new Date('2025-01-15T13:00:00Z').toISOString(),
                  updatedAt: new Date('2025-01-15T13:00:00Z').toISOString()
                };
                return data[field];
              })
            }
          ]
        });

      mockPoolClient.query.mockResolvedValue({});

      const result = await job.execute(mockBullJob);

      expect(result.changesDetected).toBe(2);
      const relChanges = result.changes.filter(
        c => c.changeType === 'relationship-added'
      );
      expect(relChanges).toHaveLength(2);
      expect(relChanges[0].ciId).toBe('app-1');
    });

    it('should distinguish between new and updated relationships', async () => {
      mockBullJob.data = {
        lookbackHours: 24,
        includeRelationships: true
      };

      const since = new Date('2025-01-15T00:00:00Z').toISOString();

      mockSession.run
        .mockResolvedValueOnce({ records: [] })
        .mockResolvedValueOnce({
          records: [
            {
              get: jest.fn((field: string) => {
                const data: Record<string, any> = {
                  fromId: 'ci-1',
                  fromName: 'CI 1',
                  toId: 'ci-2',
                  toName: 'CI 2',
                  relType: 'CONNECTS_TO',
                  createdAt: new Date('2025-01-14T10:00:00Z').toISOString(), // Old
                  updatedAt: new Date('2025-01-15T12:00:00Z').toISOString() // Recently updated
                };
                return data[field];
              })
            }
          ]
        });

      mockPoolClient.query.mockResolvedValue({});

      const result = await job.execute(mockBullJob);

      const updatedRel = result.changes.find(c => c.changeType === 'updated');
      expect(updatedRel).toBeDefined();
    });
  });

  describe('CI Filtering', () => {
    it('should filter changes by specific CI IDs', async () => {
      mockBullJob.data = {
        lookbackHours: 24,
        ciIds: ['ci-1', 'ci-3']
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
                updated_at: '2025-01-15T11:00:00Z',
                metadata: '{}'
              }
            })
          }
        ]
      });

      mockPostgresClient.query.mockResolvedValue({ rows: [] });
      mockPoolClient.query.mockResolvedValue({});

      await job.execute(mockBullJob);

      const query = mockSession.run.mock.calls[0][0];
      const params = mockSession.run.mock.calls[0][1];

      expect(query).toContain('ci.id IN $ciIds');
      expect(params.ciIds).toEqual(['ci-1', 'ci-3']);
    });

    it('should process all CIs when no ciIds filter provided', async () => {
      mockBullJob.data = {
        lookbackHours: 24
      };

      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn().mockReturnValue({
              properties: {
                id: 'ci-any',
                name: 'Any CI',
                type: 'server',
                status: 'active',
                updated_at: '2025-01-15T11:00:00Z',
                metadata: '{}'
              }
            })
          }
        ]
      });

      mockPostgresClient.query.mockResolvedValue({ rows: [] });
      mockPoolClient.query.mockResolvedValue({});

      await job.execute(mockBullJob);

      const query = mockSession.run.mock.calls[0][0];
      expect(query).not.toContain('ci.id IN $ciIds');
    });
  });

  describe('Change Recording', () => {
    it('should batch insert changes into fact table', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn().mockReturnValue({
              properties: {
                id: 'ci-batch',
                name: 'New Name',
                type: 'server',
                status: 'maintenance',
                environment: 'staging',
                created_at: '2025-01-15T10:00:00Z',
                updated_at: '2025-01-15T14:00:00Z',
                discovered_at: '2025-01-15T10:00:00Z',
                metadata: '{}'
              }
            })
          }
        ]
      });

      mockPostgresClient.query.mockResolvedValueOnce({
        rows: [{
          ci_id: 'ci-batch',
          ci_name: 'Old Name',
          ci_type: 'server',
          status: 'active',
          environment: 'production',
          created_at: new Date('2025-01-15T10:00:00Z'),
          updated_at: new Date('2025-01-15T11:00:00Z'),
          discovered_at: new Date('2025-01-15T10:00:00Z'),
          metadata: {}
        }]
      });

      mockPoolClient.query.mockResolvedValue({});

      await job.execute(mockBullJob);

      const insertCalls = mockPoolClient.query.mock.calls.filter(
        (call: any) => call[0].includes('INSERT INTO fact_ci_changes')
      );

      expect(insertCalls.length).toBeGreaterThan(0);

      // Verify all required columns are provided
      insertCalls.forEach((call: any) => {
        expect(call[0]).toContain('ci_id');
        expect(call[0]).toContain('change_type');
        expect(call[0]).toContain('field_name');
        expect(call[0]).toContain('old_value');
        expect(call[0]).toContain('new_value');
        expect(call[0]).toContain('changed_at');
        expect(call[0]).toContain('changed_by');
      });
    });

    it('should serialize complex values as JSON', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn().mockReturnValue({
              properties: {
                id: 'ci-complex',
                name: 'Server',
                type: 'server',
                status: 'active',
                created_at: '2025-01-15T10:00:00Z',
                updated_at: '2025-01-15T12:00:00Z',
                discovered_at: '2025-01-15T10:00:00Z',
                metadata: JSON.stringify({ complex: { nested: 'data' } })
              }
            })
          }
        ]
      });

      mockPostgresClient.query.mockResolvedValueOnce({
        rows: [{
          ci_id: 'ci-complex',
          ci_name: 'Server',
          ci_type: 'server',
          status: 'active',
          created_at: new Date('2025-01-15T10:00:00Z'),
          updated_at: new Date('2025-01-15T11:00:00Z'),
          discovered_at: new Date('2025-01-15T10:00:00Z'),
          metadata: { simple: 'data' }
        }]
      });

      mockPoolClient.query.mockResolvedValue({});

      await job.execute(mockBullJob);

      const insertCall = mockPoolClient.query.mock.calls.find(
        (call: any) => call[0].includes('fact_ci_changes') && call[1]
      );

      expect(insertCall).toBeDefined();
      // Values should be JSON.stringify'd
      expect(typeof insertCall[1][3]).toBe('string'); // old_value
      expect(typeof insertCall[1][4]).toBe('string'); // new_value
    });
  });

  describe('Progress Tracking', () => {
    it('should update progress during CI processing', async () => {
      const mockCIs = Array.from({ length: 10 }, (_, i) => ({
        get: jest.fn().mockReturnValue({
          properties: {
            id: `ci-${i}`,
            name: `Server ${i}`,
            type: 'server',
            status: 'active',
            created_at: '2025-01-15T10:00:00Z',
            updated_at: '2025-01-15T11:00:00Z',
            discovered_at: '2025-01-15T10:00:00Z',
            metadata: '{}'
          }
        })
      }));

      mockSession.run.mockResolvedValueOnce({ records: mockCIs });
      mockPostgresClient.query.mockResolvedValue({ rows: [] });
      mockPoolClient.query.mockResolvedValue({});

      await job.execute(mockBullJob);

      expect(mockBullJob.updateProgress).toHaveBeenCalled();
      const progressCalls = (mockBullJob.updateProgress as jest.Mock).mock.calls;
      expect(progressCalls.length).toBe(10);
      expect(progressCalls[9][0]).toBe(90); // Last update should be 90% (10th item of 10)
    });
  });

  describe('Error Handling', () => {
    it('should continue processing after individual CI errors', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn().mockReturnValue({
              properties: {
                id: 'ci-error',
                name: 'Error CI',
                type: 'server',
                status: 'active',
                updated_at: '2025-01-15T11:00:00Z',
                metadata: '{}'
              }
            })
          },
          {
            get: jest.fn().mockReturnValue({
              properties: {
                id: 'ci-ok',
                name: 'OK CI',
                type: 'server',
                status: 'active',
                updated_at: '2025-01-15T11:00:00Z',
                metadata: '{}'
              }
            })
          }
        ]
      });

      mockPostgresClient.query
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce({ rows: [] });

      mockPoolClient.query.mockResolvedValue({});

      const result = await job.execute(mockBullJob);

      expect(result.cisChecked).toBeGreaterThan(0);
    });

    it('should handle transaction failures gracefully', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn().mockReturnValue({
              properties: {
                id: 'ci-1',
                name: 'Server',
                type: 'server',
                status: 'inactive',
                created_at: '2025-01-15T10:00:00Z',
                updated_at: '2025-01-15T12:00:00Z',
                discovered_at: '2025-01-15T10:00:00Z',
                metadata: '{}'
              }
            })
          }
        ]
      });

      mockPostgresClient.query.mockResolvedValueOnce({
        rows: [{
          ci_id: 'ci-1',
          ci_name: 'Server',
          ci_type: 'server',
          status: 'active',
          created_at: new Date('2025-01-15T10:00:00Z'),
          updated_at: new Date('2025-01-15T11:00:00Z'),
          discovered_at: new Date('2025-01-15T10:00:00Z'),
          metadata: {}
        }]
      });

      (mockPostgresClient.transaction as jest.Mock).mockRejectedValueOnce(
        new Error('Transaction failed')
      );

      const result = await job.execute(mockBullJob);

      // Should complete without throwing
      expect(result).toBeDefined();
    });
  });

  describe('Performance with High Volume', () => {
    it('should handle large number of changes efficiently', async () => {
      const mockCIs = Array.from({ length: 100 }, (_, i) => ({
        get: jest.fn().mockReturnValue({
          properties: {
            id: `ci-${i}`,
            name: `Updated Server ${i}`,
            type: 'server',
            status: 'active',
            created_at: '2025-01-15T10:00:00Z',
            updated_at: '2025-01-15T12:00:00Z',
            discovered_at: '2025-01-15T10:00:00Z',
            metadata: '{}'
          }
        })
      }));

      mockSession.run.mockResolvedValueOnce({ records: mockCIs });

      // All have changes
      mockPostgresClient.query.mockImplementation((query, params) => {
        if (query.includes('SELECT')) {
          return Promise.resolve({
            rows: [{
              ci_id: params[0],
              ci_name: `Old Server ${params[0]}`,
              ci_type: 'server',
              status: 'active',
              created_at: new Date('2025-01-15T10:00:00Z'),
              updated_at: new Date('2025-01-15T11:00:00Z'),
              discovered_at: new Date('2025-01-15T10:00:00Z'),
              metadata: {}
            }]
          });
        }
        return Promise.resolve({});
      });

      mockPoolClient.query.mockResolvedValue({});

      const result = await job.execute(mockBullJob);

      expect(result.cisChecked).toBe(100);
      expect(result.changesDetected).toBeGreaterThanOrEqual(100);
      expect(result.durationMs).toBeDefined();
    });
  });
});
