// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Dimension Transformer Tests
 *
 * Tests for dimensional model transformations including:
 * - CI to dimension conversion
 * - Date dimension generation
 * - Location dimension extraction
 * - SCD Type 2 operations
 */

import { DimensionTransformer, CIDimension, DateDimension } from '../../src/transformers/dimension-transformer';
import { CI } from '@cmdb/common';

describe('DimensionTransformer', () => {
  let transformer: DimensionTransformer;

  beforeEach(() => {
    transformer = new DimensionTransformer();
  });

  describe('toDimension', () => {
    it('should transform CI to dimension', () => {
      const ci: CI = {
        _id: 'ci-123',
        _external_id: 'i-123',
        _name: 'web-server-01',
        _type: 'server',
        _status: 'active',
        _environment: 'production',
        _created_at: '2025-01-15T10:00:00Z',
        _updated_at: '2025-01-15T11:00:00Z',
        _discovered_at: '2025-01-15T09:00:00Z',
        _metadata: {}
      };

      const dimension = transformer.toDimension(ci);

      expect(dimension.ci_id).toBe('ci-123');
      expect(dimension.ci_name).toBe('web-server-01');
      expect(dimension.ci_type).toBe('server');
      expect(dimension.status).toBe('active');
      expect(dimension.environment).toBe('production');
      expect(dimension.external_id).toBe('i-123');
      expect(dimension.is_current).toBe(true);
      expect(dimension.end_date).toBeUndefined();
    });

    it('should handle CI without environment', () => {
      const ci: CI = {
        _id: 'ci-123',
        _name: 'test',
        _type: 'server',
        _status: 'active',
        _created_at: '2025-01-15T10:00:00Z',
        _updated_at: '2025-01-15T10:00:00Z',
        _discovered_at: '2025-01-15T10:00:00Z',
        _metadata: {}
      };

      const dimension = transformer.toDimension(ci);

      expect(dimension.environment).toBeUndefined();
    });
  });

  describe('toDiscoveryFact', () => {
    it('should create discovery fact', () => {
      const ci: CI = {
        _id: 'ci-123',
        _name: 'test',
        _type: 'server',
        _status: 'active',
        _created_at: '2025-01-15T10:00:00Z',
        _updated_at: '2025-01-15T10:00:00Z',
        _discovered_at: '2025-01-15T09:00:00Z',
        _metadata: {}
      };

      const fact = transformer.toDiscoveryFact(ci, 1);

      expect(fact.ci_key).toBe(1);
      expect(fact.date_key).toBeDefined();
      expect(fact.discovered_at).toBeInstanceOf(Date);
      expect(fact.discovery_method).toBeDefined();
      expect(fact.discovery_source).toBeDefined();
    });

    it('should infer AWS discovery method from metadata', () => {
      const ci: CI = {
        _id: 'ci-123',
        _name: 'test',
        _type: 'server',
        _status: 'active',
        _created_at: '2025-01-15T10:00:00Z',
        _updated_at: '2025-01-15T10:00:00Z',
        _discovered_at: '2025-01-15T10:00:00Z',
        _metadata: { aws_instance_id: 'i-123' }
      };

      const fact = transformer.toDiscoveryFact(ci);

      expect(fact.discovery_method).toBe('aws-discovery');
    });

    it('should default to manual discovery method', () => {
      const ci: CI = {
        _id: 'ci-123',
        _name: 'test',
        _type: 'server',
        _status: 'active',
        _created_at: '2025-01-15T10:00:00Z',
        _updated_at: '2025-01-15T10:00:00Z',
        _discovered_at: '2025-01-15T10:00:00Z',
        _metadata: {}
      };

      const fact = transformer.toDiscoveryFact(ci);

      expect(fact.discovery_method).toBe('manual');
    });
  });

  describe('toLocationDimension', () => {
    it('should extract location from AWS metadata', () => {
      const ci: CI = {
        _id: 'ci-123',
        _name: 'test',
        _type: 'server',
        _status: 'active',
        _created_at: '2025-01-15T10:00:00Z',
        _updated_at: '2025-01-15T10:00:00Z',
        _discovered_at: '2025-01-15T10:00:00Z',
        _metadata: {
          _aws_region: 'us-east-1',
          _availability_zone: 'us-east-1a',
          _aws_account_id: '123456789012'
        }
      };

      const location = transformer.toLocationDimension(ci);

      expect(location).not.toBeNull();
      expect(location?.region).toBe('us-east-1');
      expect(location?.availability_zone).toBe('us-east-1a');
      expect(location?.cloud_provider).toBe('aws');
    });

    it('should return null if insufficient location data', () => {
      const ci: CI = {
        _id: 'ci-123',
        _name: 'test',
        _type: 'server',
        _status: 'active',
        _created_at: '2025-01-15T10:00:00Z',
        _updated_at: '2025-01-15T10:00:00Z',
        _discovered_at: '2025-01-15T10:00:00Z',
        _metadata: {}
      };

      const location = transformer.toLocationDimension(ci);

      expect(location).toBeNull();
    });

    it('should extract Azure location data', () => {
      const ci: CI = {
        _id: 'ci-123',
        _name: 'test',
        _type: 'virtual-machine',
        _status: 'active',
        _created_at: '2025-01-15T10:00:00Z',
        _updated_at: '2025-01-15T10:00:00Z',
        _discovered_at: '2025-01-15T10:00:00Z',
        _metadata: {
          _azure_region: 'eastus',
          _azure_subscription_id: 'sub-123'
        }
      };

      const location = transformer.toLocationDimension(ci);

      expect(location?.region).toBe('eastus');
      expect(location?.cloud_provider).toBe('azure');
    });
  });

  describe('toDateDimension', () => {
    it('should generate complete date dimension', () => {
      const date = new Date('2025-01-15T10:00:00Z');

      const dateDim = transformer.toDateDimension(date);

      expect(dateDim.date_key).toBe(20250115);
      expect(dateDim.full_date).toEqual(date);
      expect(dateDim.year).toBe(2025);
      expect(dateDim.month).toBe(1);
      expect(dateDim.month_name).toBe('January');
      expect(dateDim.day_of_month).toBe(15);
      expect(dateDim.quarter).toBe(1);
    });

    it('should correctly identify weekends', () => {
      const saturday = new Date('2025-01-18T10:00:00Z'); // Saturday
      const sunday = new Date('2025-01-19T10:00:00Z'); // Sunday
      const monday = new Date('2025-01-20T10:00:00Z'); // Monday

      expect(transformer.toDateDimension(saturday).is_weekend).toBe(true);
      expect(transformer.toDateDimension(sunday).is_weekend).toBe(true);
      expect(transformer.toDateDimension(monday).is_weekend).toBe(false);
    });

    it('should calculate correct quarters', () => {
      expect(transformer.toDateDimension(new Date('2025-01-15')).quarter).toBe(1);
      expect(transformer.toDateDimension(new Date('2025-04-15')).quarter).toBe(2);
      expect(transformer.toDateDimension(new Date('2025-07-15')).quarter).toBe(3);
      expect(transformer.toDateDimension(new Date('2025-10-15')).quarter).toBe(4);
    });
  });

  describe('generateDateKey', () => {
    it('should generate date key in YYYYMMDD format', () => {
      const date = new Date('2025-01-15T10:00:00Z');

      const dateKey = transformer.generateDateKey(date);

      expect(dateKey).toBe(20250115);
    });

    it('should handle single-digit months and days', () => {
      const date = new Date('2025-03-05T10:00:00Z');

      const dateKey = transformer.generateDateKey(date);

      expect(dateKey).toBe(20250305);
    });
  });

  describe('parseDateKey', () => {
    it('should parse date key back to Date', () => {
      const dateKey = 20250115;

      const date = transformer.parseDateKey(dateKey);

      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(0); // January (0-indexed)
      expect(date.getDate()).toBe(15);
    });
  });

  describe('toRelationshipFact', () => {
    it('should create relationship fact', () => {
      const fact = transformer.toRelationshipFact(1, 2, 'DEPENDS_ON');

      expect(fact.from_ci_key).toBe(1);
      expect(fact.to_ci_key).toBe(2);
      expect(fact.relationship_type).toBe('DEPENDS_ON');
      expect(fact.is_current).toBe(true);
      expect(fact.effective_date).toBeInstanceOf(Date);
      expect(fact.end_date).toBeUndefined();
    });
  });

  describe('toChangeFact', () => {
    it('should create change fact', () => {
      const fact = transformer.toChangeFact(
        1,
        'status-changed',
        'status',
        'active',
        'maintenance',
        'admin'
      );

      expect(fact.ci_key).toBe(1);
      expect(fact.change_type).toBe('status-changed');
      expect(fact.field_name).toBe('status');
      expect(fact.old_value).toBe('active');
      expect(fact.new_value).toBe('maintenance');
      expect(fact.changed_by).toBe('admin');
      expect(fact.changed_at).toBeInstanceOf(Date);
      expect(fact.date_key).toBeDefined();
    });

    it('should default changed_by to system', () => {
      const fact = transformer.toChangeFact(
        1,
        'updated',
        'name',
        'old',
        'new'
      );

      expect(fact.changed_by).toBe('system');
    });

    it('should serialize complex values', () => {
      const fact = transformer.toChangeFact(
        1,
        'metadata-changed',
        'metadata',
        { key1: 'value1' },
        { key1: 'value1', key2: 'value2' }
      );

      expect(fact.old_value).toBe('{"key1":"value1"}');
      expect(fact.new_value).toBe('{"key1":"value1","key2":"value2"}');
    });
  });

  describe('createSCDUpdate', () => {
    it('should create SCD Type 2 update operations', () => {
      const currentDimension: CIDimension = {
        _ci_key: 5,
        _ci_id: 'ci-123',
        _ci_name: 'old-name',
        _ci_type: 'server',
        _status: 'active',
        _environment: 'development',
        _effective_date: new Date('2025-01-10T00:00:00Z'),
        _is_current: true
      };

      const updates = {
        _ci_name: 'new-name',
        _status: 'maintenance' as any
      };

      const { close, insert } = transformer.createSCDUpdate(currentDimension, updates);

      // Close operation
      expect(close.ci_key).toBe(5);
      expect(close.is_current).toBe(false);
      expect(close.end_date).toBeInstanceOf(Date);

      // Insert operation
      expect(insert.ci_key).toBeUndefined(); // Will be auto-generated
      expect(insert.ci_id).toBe('ci-123');
      expect(insert.ci_name).toBe('new-name');
      expect(insert.status).toBe('maintenance');
      expect(insert.environment).toBe('development'); // Preserved
      expect(insert.is_current).toBe(true);
      expect(insert.end_date).toBeUndefined();
    });
  });

  describe('generateSurrogateKey', () => {
    it('should generate consistent keys for same input', () => {
      const key1 = transformer.generateSurrogateKey('ci-123');
      const key2 = transformer.generateSurrogateKey('ci-123');

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different inputs', () => {
      const key1 = transformer.generateSurrogateKey('ci-123');
      const key2 = transformer.generateSurrogateKey('ci-456');

      expect(key1).not.toBe(key2);
    });

    it('should always return positive numbers', () => {
      const key = transformer.generateSurrogateKey('test');

      expect(key).toBeGreaterThan(0);
    });
  });
});
