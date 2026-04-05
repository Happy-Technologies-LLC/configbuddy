// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * CI Transformer Tests
 *
 * Tests for CI data transformation including:
 * - Neo4j to CI conversion
 * - Data quality checks
 * - Metadata extraction
 * - Type conversions
 */

import { CITransformer, Neo4jNode, PostgresRow } from '../../src/transformers/ci-transformer';
import { CI, CIType, CIStatus, Environment } from '@cmdb/common';

describe('CITransformer', () => {
  let transformer: CITransformer;

  beforeEach(() => {
    transformer = new CITransformer();
  });

  describe('fromNeo4jNode', () => {
    it('should transform valid Neo4j node to CI', () => {
      const node: Neo4jNode = {
        _identity: '1',
        _labels: ['CI', 'server'],
        _properties: {
          _id: 'ci-123',
          _external_id: 'i-1234567890',
          _name: 'web-server-01',
          _type: 'server',
          _status: 'active',
          _environment: 'production',
          _created_at: '2025-01-15T10:00:00Z',
          _updated_at: '2025-01-15T11:00:00Z',
          _discovered_at: '2025-01-15T09:00:00Z',
          _metadata: '{"region": "us-east-1", "instance_type": "t3.large"}'
        }
      };

      const ci = transformer.fromNeo4jNode(node);

      expect(ci.id).toBe('ci-123');
      expect(ci.external_id).toBe('i-1234567890');
      expect(ci.name).toBe('web-server-01');
      expect(ci.type).toBe('server');
      expect(ci.status).toBe('active');
      expect(ci.environment).toBe('production');
      expect(ci.metadata).toEqual({ region: 'us-east-1', instance_type: 't3.large' });
    });

    it('should handle missing metadata', () => {
      const node: Neo4jNode = {
        _identity: '1',
        _labels: ['CI'],
        _properties: {
          _id: 'ci-123',
          _name: 'test-ci',
          _type: 'server',
          _status: 'active',
          _created_at: '2025-01-15T10:00:00Z',
          _updated_at: '2025-01-15T10:00:00Z',
          _discovered_at: '2025-01-15T10:00:00Z'
        }
      };

      const ci = transformer.fromNeo4jNode(node);

      expect(ci.metadata).toEqual({});
    });

    it('should normalize invalid CI types to cloud-resource', () => {
      const node: Neo4jNode = {
        _identity: '1',
        _labels: ['CI'],
        _properties: {
          _id: 'ci-123',
          _name: 'test',
          _type: 'invalid-type',
          _status: 'active',
          _created_at: '2025-01-15T10:00:00Z',
          _updated_at: '2025-01-15T10:00:00Z',
          _discovered_at: '2025-01-15T10:00:00Z'
        }
      };

      const ci = transformer.fromNeo4jNode(node);

      expect(ci.type).toBe('cloud-resource');
    });

    it('should normalize invalid CI status to active', () => {
      const node: Neo4jNode = {
        _identity: '1',
        _labels: ['CI'],
        _properties: {
          _id: 'ci-123',
          _name: 'test',
          _type: 'server',
          _status: 'invalid-status',
          _created_at: '2025-01-15T10:00:00Z',
          _updated_at: '2025-01-15T10:00:00Z',
          _discovered_at: '2025-01-15T10:00:00Z'
        }
      };

      const ci = transformer.fromNeo4jNode(node);

      expect(ci.status).toBe('active');
    });
  });

  describe('checkDataQuality', () => {
    it('should validate a complete CI with high quality score', () => {
      const ci: CI = {
        _id: 'ci-123',
        _external_id: 'i-123',
        _name: 'web-server-01',
        _type: 'server',
        _status: 'active',
        _environment: 'production',
        _created_at: '2025-01-14T10:00:00Z',
        _updated_at: '2025-01-15T10:00:00Z',
        _discovered_at: '2025-01-14T09:00:00Z',
        _metadata: { region: 'us-east-1', vpc: 'vpc-123' }
      };

      const result = transformer.checkDataQuality(ci);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.score).toBeGreaterThan(90);
    });

    it('should detect missing required fields', () => {
      const ci: CI = {
        _id: '',
        _name: '',
        _type: '' as CIType,
        _status: 'active',
        _created_at: '2025-01-15T10:00:00Z',
        _updated_at: '2025-01-15T10:00:00Z',
        _discovered_at: '2025-01-15T10:00:00Z',
        _metadata: {}
      };

      const result = transformer.checkDataQuality(ci);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('CI ID is missing or empty');
      expect(result.errors).toContain('CI name is missing or empty');
      expect(result.score).toBeLessThan(50);
    });

    it('should warn about missing optional fields', () => {
      const ci: CI = {
        _id: 'ci-123',
        _name: 'test-server',
        _type: 'server',
        _status: 'active',
        _created_at: '',
        _updated_at: '',
        _discovered_at: '',
        _metadata: {}
      };

      const result = transformer.checkDataQuality(ci);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(100);
    });

    it('should detect invalid timestamp logic', () => {
      const ci: CI = {
        _id: 'ci-123',
        _name: 'test',
        _type: 'server',
        _status: 'active',
        _created_at: '2025-01-15T10:00:00Z',
        _updated_at: '2025-01-14T10:00:00Z', // Before created_at
        _discovered_at: '2025-01-15T10:00:00Z',
        _metadata: {}
      };

      const result = transformer.checkDataQuality(ci);

      expect(result.warnings).toContain('updated_at is before created_at');
    });

    it('should detect placeholder names', () => {
      const ci: CI = {
        _id: 'ci-123',
        _name: 'Unknown Server',
        _type: 'server',
        _status: 'active',
        _created_at: '2025-01-15T10:00:00Z',
        _updated_at: '2025-01-15T10:00:00Z',
        _discovered_at: '2025-01-15T10:00:00Z',
        _metadata: {}
      };

      const result = transformer.checkDataQuality(ci);

      expect(result.warnings).toContain('CI name appears to be a placeholder');
    });
  });

  describe('extractNestedMetadata', () => {
    it('should extract cloud provider information', () => {
      const metadata = {
        _aws_region: 'us-east-1',
        _availability_zone: 'us-east-1a',
        _aws_account_id: '123456789012',
        _instance_type: 't3.large'
      };

      const extracted = transformer.extractNestedMetadata(metadata);

      expect(extracted.cloud?.provider).toBe('aws');
      expect(extracted.cloud?.region).toBe('us-east-1');
      expect(extracted.cloud?.availabilityZone).toBe('us-east-1a');
      expect(extracted.cloud?.accountId).toBe('123456789012');
    });

    it('should extract compute information', () => {
      const metadata = {
        _instance_type: 't3.large',
        _vcpus: '2',
        _memory: '8GB',
        _architecture: 'x86_64'
      };

      const extracted = transformer.extractNestedMetadata(metadata);

      expect(extracted.compute?.instanceType).toBe('t3.large');
      expect(extracted.compute?.vcpus).toBe(2);
      expect(extracted.compute?.memory).toBe('8GB');
      expect(extracted.compute?.architecture).toBe('x86_64');
    });

    it('should extract network information', () => {
      const metadata = {
        _private_ip: '10.0.1.50',
        _public_ip: '54.123.45.67',
        _vpc_id: 'vpc-123',
        _subnet_id: 'subnet-456',
        _security_groups: ['sg-111', 'sg-222']
      };

      const extracted = transformer.extractNestedMetadata(metadata);

      expect(extracted.network?.ipAddresses).toContain('10.0.1.50');
      expect(extracted.network?.ipAddresses).toContain('54.123.45.67');
      expect(extracted.network?.vpc).toBe('vpc-123');
      expect(extracted.network?.subnet).toBe('subnet-456');
      expect(extracted.network?.securityGroups).toEqual(['sg-111', 'sg-222']);
    });

    it('should normalize AWS tags to object format', () => {
      const metadata = {
        _tags: [
          { Key: 'Environment', Value: 'production' },
          { Key: 'Team', Value: 'platform' }
        ]
      };

      const extracted = transformer.extractNestedMetadata(metadata);

      expect(extracted.tags).toEqual({
        _Environment: 'production',
        _Team: 'platform'
      });
    });

    it('should preserve object tags', () => {
      const metadata = {
        _tags: {
          _Environment: 'production',
          _Team: 'platform'
        }
      };

      const extracted = transformer.extractNestedMetadata(metadata);

      expect(extracted.tags).toEqual({
        _Environment: 'production',
        _Team: 'platform'
      });
    });

    it('should infer AWS from metadata patterns', () => {
      const metadata = {
        _instance_id: 'i-1234567890',
        _aws_account_id: '123456789012'
      };

      const extracted = transformer.extractNestedMetadata(metadata);

      expect(extracted.cloud?.provider).toBe('aws');
    });

    it('should separate known keys from custom metadata', () => {
      const metadata = {
        _region: 'us-east-1',
        _custom_field_1: 'value1',
        _custom_field_2: 'value2',
        _instance_type: 't3.large',
        _my_app_config: { key: 'value' }
      };

      const extracted = transformer.extractNestedMetadata(metadata);

      expect(extracted.custom).toEqual({
        _custom_field_1: 'value1',
        _custom_field_2: 'value2',
        _my_app_config: { key: 'value' }
      });
    });
  });

  describe('toNeo4jProperties', () => {
    it('should convert CI to Neo4j properties', () => {
      const ci: CI = {
        _id: 'ci-123',
        _external_id: 'i-123',
        _name: 'test-server',
        _type: 'server',
        _status: 'active',
        _environment: 'production',
        _created_at: '2025-01-15T10:00:00Z',
        _updated_at: '2025-01-15T11:00:00Z',
        _discovered_at: '2025-01-15T09:00:00Z',
        _metadata: { key: 'value' }
      };

      const props = transformer.toNeo4jProperties(ci);

      expect(props.id).toBe('ci-123');
      expect(props.external_id).toBe('i-123');
      expect(props.name).toBe('test-server');
      expect(props.type).toBe('server');
      expect(props.status).toBe('active');
      expect(props.environment).toBe('production');
      expect(props.metadata).toBe('{"key":"value"}');
    });
  });

  describe('getChangedFields', () => {
    it('should detect changed fields between two CIs', () => {
      const oldCI: CI = {
        _id: 'ci-123',
        _name: 'old-name',
        _type: 'server',
        _status: 'active',
        _environment: 'development',
        _created_at: '2025-01-15T10:00:00Z',
        _updated_at: '2025-01-15T10:00:00Z',
        _discovered_at: '2025-01-15T10:00:00Z',
        _metadata: { key: 'old' }
      };

      const newCI: CI = {
        ...oldCI,
        _name: 'new-name',
        _status: 'maintenance',
        _environment: 'production',
        _metadata: { key: 'new' }
      };

      const changes = transformer.getChangedFields(oldCI, newCI);

      expect(changes).toHaveProperty('name');
      expect(changes['name']).toEqual({ old: 'old-name', new: 'new-name' });
      expect(changes).toHaveProperty('status');
      expect(changes['status']).toEqual({ old: 'active', new: 'maintenance' });
      expect(changes).toHaveProperty('environment');
      expect(changes['environment']).toEqual({ old: 'development', new: 'production' });
      expect(changes).toHaveProperty('metadata');
    });

    it('should return empty object if no changes', () => {
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

      const changes = transformer.getChangedFields(ci, ci);

      expect(Object.keys(changes)).toHaveLength(0);
    });
  });

  describe('normalize', () => {
    it('should normalize partial CI with defaults', () => {
      const partial: Partial<CI> = {
        _id: 'ci-123',
        _name: 'test'
      };

      const normalized = transformer.normalize(partial);

      expect(normalized.id).toBe('ci-123');
      expect(normalized.name).toBe('test');
      expect(normalized.type).toBe('cloud-resource');
      expect(normalized.status).toBe('active');
      expect(normalized.created_at).toBeDefined();
      expect(normalized.updated_at).toBeDefined();
      expect(normalized.discovered_at).toBeDefined();
    });

    it('should preserve provided values', () => {
      const partial: Partial<CI> = {
        _id: 'ci-123',
        _name: 'test',
        _type: 'database',
        _status: 'maintenance'
      };

      const normalized = transformer.normalize(partial);

      expect(normalized.type).toBe('database');
      expect(normalized.status).toBe('maintenance');
    });
  });

  describe('merge', () => {
    it('should merge CI with updates', () => {
      const existing: CI = {
        _id: 'ci-123',
        _name: 'old-name',
        _type: 'server',
        _status: 'active',
        _environment: 'development',
        _created_at: '2025-01-15T10:00:00Z',
        _updated_at: '2025-01-15T10:00:00Z',
        _discovered_at: '2025-01-15T10:00:00Z',
        _metadata: { key1: 'value1' }
      };

      const updates = {
        _name: 'new-name',
        _status: 'maintenance' as CIStatus,
        _metadata: { key2: 'value2' }
      };

      const merged = transformer.merge(existing, updates);

      expect(merged.name).toBe('new-name');
      expect(merged.status).toBe('maintenance');
      expect(merged.environment).toBe('development'); // Preserved
      expect(merged.metadata).toEqual({ key1: 'value1', key2: 'value2' });
      expect(merged.updated_at).not.toBe(existing.updated_at); // Should be updated
    });
  });
});
