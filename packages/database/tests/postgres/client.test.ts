/**
 * PostgreSQL Client Tests
 *
 * Tests for PostgreSQL database client including:
 * - Connection pool management
 * - Query execution and error handling
 * - Transaction management
 * - Data mart dimension and fact table operations
 * - SCD Type 2 dimension updates
 */

import { PostgresClient } from '../../src/postgres/client';
import { Pool } from 'pg';

// Mock pg module
jest.mock('pg', () => {
  const mPool = {
    _query: jest.fn(),
    _connect: jest.fn(),
    _end: jest.fn(),
    _on: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('PostgresClient', () => {
  let client: PostgresClient;
  let mockPool: any;
  let mockPoolClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock pool client
    mockPoolClient = {
      _query: jest.fn(),
      _release: jest.fn(),
    };

    // Get the mocked pool instance
    mockPool = new Pool();
    mockPool.connect.mockResolvedValue(mockPoolClient);
    mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });

    // Create client
    client = new PostgresClient({
      _host: 'localhost',
      _port: 5432,
      _database: 'test_db',
      _user: 'postgres',
      _password: 'password',
    });
  });

  afterEach(async () => {
    await client.close();
  });

  describe('Constructor', () => {
    it('should create pool with correct configuration', () => {
      expect(Pool).toHaveBeenCalledWith({
        _host: 'localhost',
        _port: 5432,
        _database: 'test_db',
        _user: 'postgres',
        _password: 'password',
        _max: 20,
        _idleTimeoutMillis: 30000,
        _connectionTimeoutMillis: 2000,
      });
    });

    it('should register error handler', () => {
      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('query', () => {
    it('should execute query successfully', async () => {
      const mockResult = {
        _rows: [{ id: 1, name: 'test' }],
        _rowCount: 1,
      };
      mockPool.query.mockResolvedValueOnce(mockResult);

      const result = await client.query('SELECT * FROM test', ['param1']);

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM test', ['param1']);
      expect(result).toEqual(mockResult);
    });

    it('should execute query without parameters', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await client.query('SELECT 1');

      expect(mockPool.query).toHaveBeenCalledWith('SELECT 1', undefined);
    });

    it('should throw error on query failure', async () => {
      const error = new Error('Query failed');
      mockPool.query.mockRejectedValueOnce(error);

      await expect(client.query('INVALID SQL')).rejects.toThrow('Query failed');
    });

    it('should log query execution time', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await client.query('SELECT 1');

      // Verify query was executed (logging is mocked in setup)
      expect(mockPool.query).toHaveBeenCalled();
    });
  });

  describe('getClient', () => {
    it('should get client from pool', async () => {
      const poolClient = await client.getClient();

      expect(mockPool.connect).toHaveBeenCalled();
      expect(poolClient).toBe(mockPoolClient);
    });
  });

  describe('transaction', () => {
    it('should execute transaction successfully', async () => {
      mockPoolClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // callback query
        .mockResolvedValueOnce({}); // COMMIT

      const callback = jest.fn(async (client) => {
        await client.query('INSERT INTO test VALUES (1)');
        return { success: true };
      });

      const result = await client.transaction(callback);

      expect(mockPoolClient.query).toHaveBeenCalledWith('BEGIN');
      expect(callback).toHaveBeenCalledWith(mockPoolClient);
      expect(mockPoolClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockPoolClient.release).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should rollback transaction on error', async () => {
      mockPoolClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Insert failed')) // callback error
        .mockResolvedValueOnce({}); // ROLLBACK

      const callback = jest.fn(async (client) => {
        await client.query('INVALID INSERT');
      });

      await expect(client.transaction(callback)).rejects.toThrow('Insert failed');

      expect(mockPoolClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockPoolClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockPoolClient.release).toHaveBeenCalled();
    });

    it('should release client even if commit fails', async () => {
      mockPoolClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // callback
        .mockRejectedValueOnce(new Error('Commit failed')); // COMMIT

      await expect(client.transaction(async () => {})).rejects.toThrow();

      expect(mockPoolClient.release).toHaveBeenCalled();
    });
  });

  describe('insertCIDimension', () => {
    it('should insert CI dimension successfully', async () => {
      const ciDimension = {
        _ci_id: 'ci-123',
        _ci_name: 'Test Server',
        _ci_type: 'server',
        _ci_status: 'active',
        _environment: 'production',
        _external_id: 'ext-123',
        _metadata: { location: 'us-east-1' },
        _effective_from: new Date('2025-01-15'),
      };

      mockPool.query.mockResolvedValueOnce({
        _rows: [{ ci_key: 42 }],
        _rowCount: 1,
      });

      const ciKey = await client.insertCIDimension(ciDimension);

      expect(mockPool.query).toHaveBeenCalled();
      const call = mockPool.query.mock.calls[0];
      expect(call[0]).toContain('INSERT INTO cmdb.dim_ci');
      expect(call[1]).toContain(ciDimension.ci_id);
      expect(call[1]).toContain(ciDimension.ci_name);
      expect(ciKey).toBe(42);
    });

    it('should handle optional fields', async () => {
      const ciDimension = {
        _ci_id: 'ci-123',
        _ci_name: 'Test',
        _ci_type: 'server',
        _ci_status: 'active',
      };

      mockPool.query.mockResolvedValueOnce({
        _rows: [{ ci_key: 1 }],
        _rowCount: 1,
      });

      await client.insertCIDimension(ciDimension);

      const call = mockPool.query.mock.calls[0];
      expect(call[1]).toContain(null); // environment
      expect(call[1]).toContain(null); // external_id
    });
  });

  describe('updateCIDimension', () => {
    it('should update CI dimension using SCD Type 2', async () => {
      const ciDimension = {
        _ci_id: 'ci-123',
        _ci_name: 'Updated Server',
        _ci_type: 'server',
        _ci_status: 'maintenance',
      };

      mockPoolClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE (expire old)
        .mockResolvedValueOnce({ rows: [{ ci_key: 43 }] }) // INSERT (new version)
        .mockResolvedValueOnce({}); // COMMIT

      const ciKey = await client.updateCIDimension(ciDimension);

      expect(mockPoolClient.query).toHaveBeenCalledWith('BEGIN');

      // Check UPDATE query to expire old record
      const updateCall = mockPoolClient.query.mock.calls[1];
      expect(updateCall[0]).toContain('UPDATE cmdb.dim_ci');
      expect(updateCall[0]).toContain('is_current = FALSE');
      expect(updateCall[1][1]).toBe('ci-123');

      // Check INSERT query for new version
      const insertCall = mockPoolClient.query.mock.calls[2];
      expect(insertCall[0]).toContain('INSERT INTO cmdb.dim_ci');
      expect(insertCall[1]).toContain('Updated Server');

      expect(ciKey).toBe(43);
    });
  });

  describe('upsertCIDimension', () => {
    it('should insert when CI does not exist', async () => {
      const ciDimension = {
        _ci_id: 'ci-new',
        _ci_name: 'New CI',
        _ci_type: 'server',
        _ci_status: 'active',
      };

      // Mock SELECT returns no rows
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ ci_key: 1 }], rowCount: 1 });

      const ciKey = await client.upsertCIDimension(ciDimension);

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(ciKey).toBe(1);
    });

    it('should update when CI already exists', async () => {
      const ciDimension = {
        _ci_id: 'ci-existing',
        _ci_name: 'Existing CI',
        _ci_type: 'server',
        _ci_status: 'active',
      };

      // Mock SELECT returns existing CI
      mockPool.query.mockResolvedValueOnce({
        _rows: [{ ci_key: 5 }],
        _rowCount: 1,
      });

      mockPoolClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // UPDATE
        .mockResolvedValueOnce({ rows: [{ ci_key: 6 }] }) // INSERT
        .mockResolvedValueOnce({}); // COMMIT

      const ciKey = await client.upsertCIDimension(ciDimension);

      expect(ciKey).toBe(6);
    });
  });

  describe('getCurrentCIKey', () => {
    it('should return CI key when found', async () => {
      mockPool.query.mockResolvedValueOnce({
        _rows: [{ ci_key: 42 }],
        _rowCount: 1,
      });

      const ciKey = await client.getCurrentCIKey('ci-123');

      expect(mockPool.query).toHaveBeenCalled();
      const call = mockPool.query.mock.calls[0];
      expect(call[0]).toContain('is_current = TRUE');
      expect(ciKey).toBe(42);
    });

    it('should return null when not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        _rows: [],
        _rowCount: 0,
      });

      const ciKey = await client.getCurrentCIKey('ci-999');

      expect(ciKey).toBeNull();
    });
  });

  describe('insertDiscoveryFact', () => {
    it('should insert discovery fact', async () => {
      const fact = {
        _ci_key: 42,
        _location_key: 1,
        _date_key: 20250115,
        _discovered_at: new Date('2025-01-15T10:00:00Z'),
        _discovery_job_id: 'job-123',
        _discovery_provider: 'aws',
        _discovery_method: 'agentless',
        _confidence_score: 0.95,
        _discovery_duration_ms: 1500,
      };

      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      await client.insertDiscoveryFact(fact);

      expect(mockPool.query).toHaveBeenCalled();
      const call = mockPool.query.mock.calls[0];
      expect(call[0]).toContain('INSERT INTO cmdb.fact_discovery');
      expect(call[1]).toContain(fact.ci_key);
      expect(call[1]).toContain(fact.discovery_provider);
    });

    it('should handle optional fields', async () => {
      const fact = {
        _ci_key: 42,
        _date_key: 20250115,
        _discovered_at: new Date(),
        _discovery_job_id: 'job-123',
        _discovery_provider: 'aws',
        _discovery_method: 'agentless',
      };

      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      await client.insertDiscoveryFact(fact);

      const call = mockPool.query.mock.calls[0];
      expect(call[1]).toContain(null); // location_key
      expect(call[1]).toContain(null); // confidence_score
    });
  });

  describe('insertRelationshipFact', () => {
    it('should insert relationship fact', async () => {
      const relationship = {
        _from_ci_key: 1,
        _to_ci_key: 2,
        _date_key: 20250115,
        _relationship_type: 'DEPENDS_ON',
        _relationship_strength: 0.9,
        _discovered_at: new Date(),
        _last_verified_at: new Date(),
        _is_active: true,
        _properties: { weight: 1 },
      };

      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      await client.insertRelationshipFact(relationship);

      expect(mockPool.query).toHaveBeenCalled();
      const call = mockPool.query.mock.calls[0];
      expect(call[0]).toContain('INSERT INTO cmdb.fact_ci_relationships');
      expect(call[1]).toContain(relationship.from_ci_key);
      expect(call[1]).toContain(relationship.to_ci_key);
      expect(call[1]).toContain(relationship.relationship_type);
    });
  });

  describe('deactivateRelationship', () => {
    it('should deactivate relationship', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      await client.deactivateRelationship(1, 2, 'DEPENDS_ON');

      expect(mockPool.query).toHaveBeenCalled();
      const call = mockPool.query.mock.calls[0];
      expect(call[0]).toContain('UPDATE cmdb.fact_ci_relationships');
      expect(call[0]).toContain('is_active = FALSE');
      expect(call[1]).toEqual([1, 2, 'DEPENDS_ON']);
    });
  });

  describe('getCurrentInventory', () => {
    it('should retrieve current inventory', async () => {
      const mockInventory = [
        { ci_id: 'ci-1', ci_name: 'Server 1', ci_type: 'server' },
        { ci_id: 'ci-2', ci_name: 'Server 2', ci_type: 'database' },
      ];

      mockPool.query.mockResolvedValueOnce({
        _rows: mockInventory,
        _rowCount: 2,
      });

      const result = await client.getCurrentInventory();

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM cmdb.v_current_ci_inventory');
      expect(result).toEqual(mockInventory);
    });
  });

  describe('getDiscoverySummary', () => {
    it('should get summary for specific CI', async () => {
      const mockSummary = [
        { ci_id: 'ci-123', discovery_count: 5, last_discovered: new Date() },
      ];

      mockPool.query.mockResolvedValueOnce({
        _rows: mockSummary,
        _rowCount: 1,
      });

      const result = await client.getDiscoverySummary('ci-123');

      expect(mockPool.query).toHaveBeenCalled();
      const call = mockPool.query.mock.calls[0];
      expect(call[0]).toContain('WHERE ci_id = $1');
      expect(call[1]).toEqual(['ci-123']);
      expect(result).toEqual(mockSummary);
    });

    it('should get summary for all CIs', async () => {
      mockPool.query.mockResolvedValueOnce({
        _rows: [],
        _rowCount: 0,
      });

      await client.getDiscoverySummary();

      const call = mockPool.query.mock.calls[0];
      expect(call[0]).not.toContain('WHERE');
    });
  });

  describe('getChangeHistory', () => {
    it('should get change history with default limit', async () => {
      mockPool.query.mockResolvedValueOnce({
        _rows: [],
        _rowCount: 0,
      });

      await client.getChangeHistory();

      const call = mockPool.query.mock.calls[0];
      expect(call[0]).toContain('LIMIT');
      expect(call[1]).toEqual([100]);
    });

    it('should get change history for specific CI with custom limit', async () => {
      mockPool.query.mockResolvedValueOnce({
        _rows: [],
        _rowCount: 0,
      });

      await client.getChangeHistory('ci-123', 50);

      const call = mockPool.query.mock.calls[0];
      expect(call[0]).toContain('WHERE ci_id = $1');
      expect(call[1]).toEqual(['ci-123', 50]);
    });
  });

  describe('close', () => {
    it('should close pool connection', async () => {
      await client.close();

      expect(mockPool.end).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle connection pool errors', async () => {
      const error = new Error('Pool connection failed');
      mockPool.connect.mockRejectedValueOnce(error);

      await expect(client.getClient()).rejects.toThrow('Pool connection failed');
    });

    it('should handle JSON stringify errors in metadata', async () => {
      const ciDimension = {
        _ci_id: 'ci-123',
        _ci_name: 'Test',
        _ci_type: 'server',
        _ci_status: 'active',
        _metadata: { circular: null as any },
      };
      // Create circular reference
      ciDimension.metadata.circular = ciDimension.metadata;

      mockPool.query.mockResolvedValueOnce({
        _rows: [{ ci_key: 1 }],
        _rowCount: 1,
      });

      // Should handle or throw appropriate error
      await expect(client.insertCIDimension(ciDimension)).rejects.toThrow();
    });
  });
});
