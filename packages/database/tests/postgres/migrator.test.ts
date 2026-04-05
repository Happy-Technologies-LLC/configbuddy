// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * PostgreSQL Migration Runner Tests (TDD)
 *
 * Tests for PostgreSQL migration system including:
 * - Migration file discovery and ordering
 * - Migration tracking (schema_migrations table)
 * - SQL execution with transaction support
 * - Rollback on failure
 * - Idempotent execution
 * - Migration status reporting
 */

import { runMigrations, getMigrationStatus, MigrationStatus } from '../../src/postgres/migrator';
import { PostgresClient } from '../../src/postgres/client';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('../../src/postgres/client');
jest.mock('fs');
jest.mock('path');

describe('PostgreSQL Migration Runner', () => {
  let mockClient: jest.Mocked<PostgresClient>;
  let mockPoolClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock pool client
    mockPoolClient = {
      _query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      _release: jest.fn(),
    };

    // Setup mock PostgreSQL client
    mockClient = {
      _query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      _getClient: jest.fn().mockResolvedValue(mockPoolClient),
      _transaction: jest.fn(async (callback) => {
        return await callback(mockPoolClient);
      }),
      _close: jest.fn().mockResolvedValue(undefined),
    } as any;
  });

  describe('Migration Tracking Table', () => {
    it('should create schema_migrations table if not exists', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      await runMigrations(mockClient);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS cmdb.schema_migrations')
      );
    });

    it('should track migration name, applied_at, and checksum', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      await runMigrations(mockClient);

      const createTableCall = mockClient.query.mock.calls.find(call =>
        call[0].includes('CREATE TABLE')
      );

      expect(createTableCall![0]).toContain('migration_name');
      expect(createTableCall![0]).toContain('applied_at');
      expect(createTableCall![0]).toContain('checksum');
    });
  });

  describe('Migration File Discovery', () => {
    it('should discover migration files in default directory', async () => {
      const migrationFiles = [
        '001_initial_schema.sql',
        '002_add_indexes.sql',
      ];

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(migrationFiles);
      (fs.readFileSync as jest.Mock).mockReturnValue('SELECT 1;');

      await runMigrations(mockClient);

      expect(fs.readdirSync).toHaveBeenCalled();
    });

    it('should use custom migrations directory if provided', async () => {
      const customDir = '/custom/migrations';

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      await runMigrations(mockClient, customDir);

      expect(fs.readdirSync).toHaveBeenCalledWith(customDir);
    });

    it('should sort migration files by name', async () => {
      const migrationFiles = [
        '003_add_views.sql',
        '001_initial_schema.sql',
        '002_add_indexes.sql',
      ];

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(migrationFiles);
      (fs.readFileSync as jest.Mock).mockReturnValue('SELECT 1;');

      mockClient.query.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT migration_name')) {
          return { rows: [], rowCount: 0 };
        }
        return { rows: [], rowCount: 0 };
      });

      await runMigrations(mockClient);

      // Verify migrations are applied in order: 001, 002, 003
      const migrationInserts = mockPoolClient.query.mock.calls.filter(
        (call: any) => call[0].includes('INSERT INTO cmdb.schema_migrations')
      );

      expect(migrationInserts[0][1][0]).toContain('001_initial_schema.sql');
      expect(migrationInserts[1][1][0]).toContain('002_add_indexes.sql');
      expect(migrationInserts[2][1][0]).toContain('003_add_views.sql');
    });

    it('should only process .sql files', async () => {
      const files = [
        '001_initial.sql',
        'README.md',
        '002_indexes.sql',
        '.gitkeep',
      ];

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(files);
      (fs.readFileSync as jest.Mock).mockReturnValue('SELECT 1;');

      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await runMigrations(mockClient);

      // Should only process 2 .sql files
      const migrationInserts = mockPoolClient.query.mock.calls.filter(
        (call: any) => call[0].includes('INSERT INTO cmdb.schema_migrations')
      );

      expect(migrationInserts).toHaveLength(2);
    });
  });

  describe('Migration Execution', () => {
    it('should execute pending migrations', async () => {
      const migrationSQL = `
        CREATE TABLE cmdb.test_table (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100)
        );
      `;

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['001_test.sql']);
      (fs.readFileSync as jest.Mock).mockReturnValue(migrationSQL);

      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await runMigrations(mockClient);

      expect(mockPoolClient.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE cmdb.test_table')
      );
    });

    it('should skip already applied migrations', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        '001_initial.sql',
        '002_new.sql',
      ]);
      (fs.readFileSync as jest.Mock).mockReturnValue('SELECT 1;');

      // Mock that 001_initial.sql is already applied
      mockClient.query.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT migration_name')) {
          return {
            _rows: [{ migration_name: '001_initial.sql' }],
            _rowCount: 1,
          };
        }
        return { rows: [], rowCount: 0 };
      });

      await runMigrations(mockClient);

      // Should only insert 002_new.sql
      const migrationInserts = mockPoolClient.query.mock.calls.filter(
        (call: any) => call[0].includes('INSERT INTO cmdb.schema_migrations')
      );

      expect(migrationInserts).toHaveLength(1);
      expect(migrationInserts[0][1][0]).toContain('002_new.sql');
    });

    it('should execute migrations in a transaction', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['001_test.sql']);
      (fs.readFileSync as jest.Mock).mockReturnValue('SELECT 1;');

      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await runMigrations(mockClient);

      expect(mockClient.transaction).toHaveBeenCalled();
    });

    it('should record migration with checksum', async () => {
      const migrationSQL = 'CREATE TABLE test (id INT);';

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['001_test.sql']);
      (fs.readFileSync as jest.Mock).mockReturnValue(migrationSQL);

      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await runMigrations(mockClient);

      const migrationInsert = mockPoolClient.query.mock.calls.find(
        (call: any) => call[0].includes('INSERT INTO cmdb.schema_migrations')
      );

      expect(migrationInsert).toBeDefined();
      expect(migrationInsert![1]).toHaveLength(2); // [migration_name, checksum]
      expect(typeof migrationInsert![1][1]).toBe('string'); // checksum is a string
    });
  });

  describe('Error Handling and Rollback', () => {
    it('should rollback transaction on migration failure', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['001_bad.sql']);
      (fs.readFileSync as jest.Mock).mockReturnValue('INVALID SQL SYNTAX;');

      mockPoolClient.query.mockRejectedValueOnce(new Error('Syntax error'));

      mockClient.transaction.mockImplementation(async (callback) => {
        try {
          return await callback(mockPoolClient);
        } catch (error) {
          // Simulate rollback
          await mockPoolClient.query('ROLLBACK');
          throw error;
        }
      });

      await expect(runMigrations(mockClient)).rejects.toThrow();

      // Migration should not be recorded
      const migrationInserts = mockPoolClient.query.mock.calls.filter(
        (call: any) => call[0].includes('INSERT INTO cmdb.schema_migrations')
      );

      expect(migrationInserts).toHaveLength(0);
    });

    it('should not execute subsequent migrations if one fails', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        '001_good.sql',
        '002_bad.sql',
        '003_good.sql',
      ]);

      (fs.readFileSync as jest.Mock)
        .mockReturnValueOnce('SELECT 1;') // 001_good.sql
        .mockReturnValueOnce('INVALID SQL;') // 002_bad.sql
        .mockReturnValueOnce('SELECT 2;'); // 003_good.sql

      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

      mockPoolClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // 001_good.sql
        .mockResolvedValueOnce({}) // INSERT migration 001
        .mockRejectedValueOnce(new Error('Syntax error')); // 002_bad.sql fails

      mockClient.transaction.mockImplementation(async (callback) => {
        try {
          return await callback(mockPoolClient);
        } catch (error) {
          throw error;
        }
      });

      await expect(runMigrations(mockClient)).rejects.toThrow();

      // 003_good.sql should NOT be executed
      const sqlExecutions = mockPoolClient.query.mock.calls.filter(
        (call: any) => !call[0].includes('INSERT INTO cmdb.schema_migrations')
      );

      expect(sqlExecutions.some((call: any) => call[0].includes('SELECT 2'))).toBe(false);
    });

    it('should throw error if migrations directory does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(runMigrations(mockClient)).rejects.toThrow(
        'Migrations directory not found'
      );
    });
  });

  describe('Migration Status', () => {
    it('should return status of all migrations', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        '001_initial.sql',
        '002_indexes.sql',
        '003_views.sql',
      ]);

      mockClient.query.mockResolvedValue({
        _rows: [
          {
            _migration_name: '001_initial.sql',
            _applied_at: new Date('2025-01-01'),
            _checksum: 'abc123',
          },
          {
            _migration_name: '002_indexes.sql',
            _applied_at: new Date('2025-01-02'),
            _checksum: 'def456',
          },
        ],
        _rowCount: 2,
      });

      const status = await getMigrationStatus(mockClient);

      expect(status).toHaveLength(3);
      expect(status[0]).toEqual({
        _name: '001_initial.sql',
        _applied: true,
        _appliedAt: expect.any(Date),
      });
      expect(status[1]).toEqual({
        _name: '002_indexes.sql',
        _applied: true,
        _appliedAt: expect.any(Date),
      });
      expect(status[2]).toEqual({
        _name: '003_views.sql',
        _applied: false,
        _appliedAt: null,
      });
    });

    it('should indicate pending migrations', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['001_new.sql']);

      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

      const status = await getMigrationStatus(mockClient);

      expect(status[0]).toEqual({
        _name: '001_new.sql',
        _applied: false,
        _appliedAt: null,
      });
    });
  });

  describe('Idempotency', () => {
    it('should be safe to run multiple times', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['001_test.sql']);
      (fs.readFileSync as jest.Mock).mockReturnValue('SELECT 1;');

      // First run - migration applied
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await runMigrations(mockClient);

      // Second run - migration already applied
      mockClient.query.mockResolvedValueOnce({
        _rows: [{ migration_name: '001_test.sql' }],
        _rowCount: 1,
      });

      await runMigrations(mockClient);

      // Migration should only be inserted once
      const migrationInserts = mockPoolClient.query.mock.calls.filter(
        (call: any) => call[0].includes('INSERT INTO cmdb.schema_migrations')
      );

      expect(migrationInserts).toHaveLength(1);
    });
  });

  describe('Checksum Validation', () => {
    it('should detect modified migrations and throw error', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['001_test.sql']);
      (fs.readFileSync as jest.Mock).mockReturnValue('MODIFIED SQL;');

      // Mock that migration was applied with different checksum
      mockClient.query.mockResolvedValue({
        _rows: [
          {
            _migration_name: '001_test.sql',
            _checksum: 'original_checksum',
          },
        ],
        _rowCount: 1,
      });

      await expect(runMigrations(mockClient)).rejects.toThrow(
        'Migration checksum mismatch'
      );
    });

    it('should allow unchanged migrations to be skipped', async () => {
      const migrationSQL = 'SELECT 1;';

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['001_test.sql']);
      (fs.readFileSync as jest.Mock).mockReturnValue(migrationSQL);

      // Calculate expected checksum
      const crypto = require('crypto');
      const expectedChecksum = crypto
        .createHash('sha256')
        .update(migrationSQL)
        .digest('hex');

      mockClient.query.mockResolvedValue({
        _rows: [
          {
            _migration_name: '001_test.sql',
            _checksum: expectedChecksum,
          },
        ],
        _rowCount: 1,
      });

      await expect(runMigrations(mockClient)).resolves.not.toThrow();
    });
  });
});
