// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Unit tests for SQL injection prevention validators
 */

import {
  validateTableName,
  validateTableNames,
  validateCISortField,
  validateConnectorSortField,
  validateConnectorConfigSortField,
  validateConnectorRunSortField,
  validateSortDirection,
  containsSQLInjectionPatterns,
  escapePostgresIdentifier,
} from '../sql-validators';

describe('SQL Validators - SQL Injection Prevention', () => {
  describe('validateTableName', () => {
    it('should accept valid table names', () => {
      expect(validateTableName('dim_ci')).toBe('dim_ci');
      expect(validateTableName('fact_ci_relationships')).toBe('fact_ci_relationships');
      expect(validateTableName('credentials')).toBe('credentials');
    });

    it('should reject invalid table names', () => {
      expect(() => validateTableName('users; DROP TABLE credentials;')).toThrow('Invalid table name');
      expect(() => validateTableName('../../../etc/passwd')).toThrow('Invalid table name');
      expect(() => validateTableName('malicious_table')).toThrow('Invalid table name');
    });

    it('should prevent SQL injection attempts', () => {
      const attacks = [
        "dim_ci' OR '1'='1",
        'dim_ci; DROP TABLE credentials; --',
        'dim_ci UNION SELECT * FROM credentials',
        "dim_ci'; DELETE FROM audit_log; --",
      ];

      attacks.forEach(attack => {
        expect(() => validateTableName(attack)).toThrow('Invalid table name');
      });
    });
  });

  describe('validateTableNames', () => {
    it('should validate multiple table names', () => {
      const tables = ['dim_ci', 'fact_ci_relationships', 'credentials'];
      expect(validateTableNames(tables)).toEqual(tables);
    });

    it('should reject if any table name is invalid', () => {
      const tables = ['dim_ci', 'malicious_table', 'credentials'];
      expect(() => validateTableNames(tables)).toThrow('Invalid table name');
    });
  });

  describe('validateCISortField', () => {
    it('should accept valid CI sort fields', () => {
      expect(validateCISortField('name')).toBe('name');
      expect(validateCISortField('created_at')).toBe('created_at');
      expect(validateCISortField('type')).toBe('type');
    });

    it('should reject invalid sort fields', () => {
      expect(() => validateCISortField('malicious_field')).toThrow('Invalid sort field');
      expect(() => validateCISortField('name; DROP TABLE ci')).toThrow('Invalid sort field');
    });

    it('should prevent SQL injection in ORDER BY clause', () => {
      const attacks = [
        "name; DROP TABLE ci; --",
        "name UNION SELECT password FROM users",
        "name, (SELECT COUNT(*) FROM credentials)",
        "name ASC, password DESC",
      ];

      attacks.forEach(attack => {
        expect(() => validateCISortField(attack)).toThrow('Invalid sort field');
      });
    });
  });

  describe('validateSortDirection', () => {
    it('should accept valid sort directions', () => {
      expect(validateSortDirection('asc')).toBe('ASC');
      expect(validateSortDirection('ASC')).toBe('ASC');
      expect(validateSortDirection('desc')).toBe('DESC');
      expect(validateSortDirection('DESC')).toBe('DESC');
    });

    it('should reject invalid sort directions', () => {
      expect(() => validateSortDirection('invalid')).toThrow('Invalid sort direction');
      expect(() => validateSortDirection('asc; DROP TABLE ci')).toThrow('Invalid sort direction');
      expect(() => validateSortDirection('RANDOM()')).toThrow('Invalid sort direction');
    });
  });

  describe('containsSQLInjectionPatterns', () => {
    it('should detect SQL injection patterns', () => {
      const injections = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "1'; DELETE FROM credentials",
        "UNION SELECT * FROM passwords",
        "'; EXEC sp_executesql",
        "1 OR 1=1",
        "; TRUNCATE TABLE audit_log",
        "/* comment */ DROP TABLE ci",
      ];

      injections.forEach(injection => {
        expect(containsSQLInjectionPatterns(injection)).toBe(true);
      });
    });

    it('should not flag safe strings', () => {
      const safeStrings = [
        'normal-ci-name',
        'server-01',
        'production',
        'application/service',
      ];

      safeStrings.forEach(safe => {
        expect(containsSQLInjectionPatterns(safe)).toBe(false);
      });
    });
  });

  describe('escapePostgresIdentifier', () => {
    it('should escape double quotes in identifiers', () => {
      expect(escapePostgresIdentifier('my"table')).toBe('"my""table"');
      expect(escapePostgresIdentifier('normal_table')).toBe('"normal_table"');
    });

    it('should wrap identifiers in double quotes', () => {
      const escaped = escapePostgresIdentifier('table_name');
      expect(escaped).toMatch(/^".*"$/);
    });
  });

  describe('Real-world SQL injection attack scenarios', () => {
    it('should prevent authentication bypass', () => {
      const attack = "admin' OR '1'='1";
      expect(() => validateCISortField(attack)).toThrow();
    });

    it('should prevent data exfiltration via UNION', () => {
      const attack = "name UNION SELECT password FROM users";
      expect(() => validateCISortField(attack)).toThrow();
    });

    it('should prevent table dropping', () => {
      const attack = "dim_ci; DROP TABLE credentials; --";
      expect(() => validateTableName(attack)).toThrow();
    });

    it('should prevent comment-based injection', () => {
      const attack = "name --";
      expect(() => validateCISortField(attack)).toThrow();
    });

    it('should prevent stacked queries', () => {
      const attack = "name; UPDATE credentials SET password = 'hacked'";
      expect(() => validateCISortField(attack)).toThrow();
    });
  });

  describe('Edge cases and special characters', () => {
    it('should handle empty strings', () => {
      expect(() => validateTableName('')).toThrow();
      expect(() => validateCISortField('')).toThrow();
    });

    it('should handle whitespace', () => {
      expect(() => validateTableName('  dim_ci  ')).toThrow(); // Whitespace not in whitelist
      expect(() => validateCISortField(' name ')).toThrow(); // Whitespace not in whitelist
    });

    it('should handle case sensitivity correctly', () => {
      // Sort direction should be case-insensitive
      expect(validateSortDirection('asc')).toBe('ASC');
      expect(validateSortDirection('DESC')).toBe('DESC');
    });
  });
});
