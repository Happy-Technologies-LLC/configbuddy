// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Unit tests for TransformationEngine
 */

import { TransformationEngine } from '../../src/engine/transformation-engine';
import { TransformationRule, TransformationContext } from '../../src/types/transformation.types';

// Mock logger
jest.mock('@cmdb/common', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { logger } from '@cmdb/common';

describe('TransformationEngine', () => {
  let engine: TransformationEngine;

  beforeEach(() => {
    engine = new TransformationEngine();
    jest.clearAllMocks();
  });

  describe('transform', () => {
    it('should transform data with direct field mappings', async () => {
      const rule: TransformationRule = {
        id: 'test-rule-1',
        name: 'Direct Mapping',
        source_system: 'test-source',
        target_system: 'cmdb',
        field_mappings: [
          {
            source_field: 'hostname',
            target_field: 'ci_name',
            transformation: { type: 'direct' },
          },
          {
            source_field: 'ip_address',
            target_field: 'attributes.ip',
            transformation: { type: 'direct' },
          },
        ],
      };

      const context: TransformationContext = {
        source_data: {
          hostname: 'web-server-01',
          ip_address: '192.168.1.100',
        },
        lookup_tables: {},
      };

      const result = await engine.transform(rule, context);

      expect(result.success).toBe(true);
      expect(result.transformed_data).toEqual({
        ci_name: 'web-server-01',
        attributes: {
          ip: '192.168.1.100',
        },
      });
    });

    it('should handle default values for missing fields', async () => {
      const rule: TransformationRule = {
        id: 'test-rule-2',
        name: 'Default Values',
        source_system: 'test-source',
        target_system: 'cmdb',
        field_mappings: [
          {
            source_field: 'status',
            target_field: 'ci_status',
            default_value: 'active',
          },
          {
            source_field: 'environment',
            target_field: 'ci_environment',
            default_value: 'production',
          },
        ],
      };

      const context: TransformationContext = {
        source_data: {
          // Missing both fields
        },
        lookup_tables: {},
      };

      const result = await engine.transform(rule, context);

      expect(result.success).toBe(true);
      expect(result.transformed_data).toEqual({
        ci_status: 'active',
        ci_environment: 'production',
      });
    });

    it('should fail for required missing fields', async () => {
      const rule: TransformationRule = {
        id: 'test-rule-3',
        name: 'Required Fields',
        source_system: 'test-source',
        target_system: 'cmdb',
        field_mappings: [
          {
            source_field: 'required_field',
            target_field: 'ci_name',
            required: true,
          },
        ],
      };

      const context: TransformationContext = {
        source_data: {},
        lookup_tables: {},
      };

      const result = await engine.transform(rule, context);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].message).toContain('required_field is missing');
    });

    it('should apply expression transformations', async () => {
      const rule: TransformationRule = {
        id: 'test-rule-4',
        name: 'Expression Transform',
        source_system: 'test-source',
        target_system: 'cmdb',
        field_mappings: [
          {
            source_field: 'name',
            target_field: 'ci_name',
            transformation: {
              type: 'expression',
              expression: 'uppercase(name)',
            },
          },
        ],
      };

      const context: TransformationContext = {
        source_data: {
          name: 'server-name',
        },
        lookup_tables: {},
      };

      const result = await engine.transform(rule, context);

      expect(result.success).toBe(true);
      expect(result.transformed_data?.ci_name).toBe('SERVER-NAME');
    });

    it('should apply lookup transformations', async () => {
      const rule: TransformationRule = {
        id: 'test-rule-5',
        name: 'Lookup Transform',
        source_system: 'test-source',
        target_system: 'cmdb',
        field_mappings: [
          {
            source_field: 'region_code',
            target_field: 'region_name',
            transformation: {
              type: 'lookup',
              lookup_table: 'regions',
              lookup_key: 'code',
              lookup_value: 'name',
            },
          },
        ],
      };

      const context: TransformationContext = {
        source_data: {
          region_code: 'us-east-1',
        },
        lookup_tables: {
          regions: [
            { code: 'us-east-1', name: 'US East (N. Virginia)' },
            { code: 'us-west-2', name: 'US West (Oregon)' },
          ],
        },
      };

      const result = await engine.transform(rule, context);

      expect(result.success).toBe(true);
      expect(result.transformed_data?.region_name).toBe('US East (N. Virginia)');
    });

    it('should handle lookup table not found', async () => {
      const rule: TransformationRule = {
        id: 'test-rule-6',
        name: 'Invalid Lookup',
        source_system: 'test-source',
        target_system: 'cmdb',
        field_mappings: [
          {
            source_field: 'region_code',
            target_field: 'region_name',
            transformation: {
              type: 'lookup',
              lookup_table: 'nonexistent',
              lookup_key: 'code',
              lookup_value: 'name',
            },
          },
        ],
      };

      const context: TransformationContext = {
        source_data: { region_code: 'us-east-1' },
        lookup_tables: {},
      };

      const result = await engine.transform(rule, context);

      expect(result.success).toBe(false);
      expect(result.errors![0].message).toContain('Lookup table not found');
    });

    it('should apply conditional transformations', async () => {
      const rule: TransformationRule = {
        id: 'test-rule-7',
        name: 'Conditional Transform',
        source_system: 'test-source',
        target_system: 'cmdb',
        field_mappings: [
          {
            source_field: 'instance_type',
            target_field: 'ci_type',
            transformation: {
              type: 'conditional',
              if_condition: 'instance_type',
              then_value: 'virtual-machine',
              else_value: 'physical-server',
            },
          },
        ],
      };

      const context: TransformationContext = {
        source_data: {
          instance_type: 't2.micro',
        },
        lookup_tables: {},
      };

      const result = await engine.transform(rule, context);

      expect(result.success).toBe(true);
      expect(result.transformed_data?.ci_type).toBe('virtual-machine');
    });

    it('should evaluate rule conditions', async () => {
      const rule: TransformationRule = {
        id: 'test-rule-8',
        name: 'Conditional Rule',
        source_system: 'test-source',
        target_system: 'cmdb',
        conditions: [
          {
            field: 'resource_type',
            operator: 'equals',
            value: 'server',
          },
        ],
        field_mappings: [
          {
            source_field: 'name',
            target_field: 'ci_name',
          },
        ],
      };

      const context: TransformationContext = {
        source_data: {
          name: 'server-01',
          resource_type: 'server',
        },
        lookup_tables: {},
      };

      const result = await engine.transform(rule, context);

      expect(result.success).toBe(true);
    });

    it('should fail when rule conditions not met', async () => {
      const rule: TransformationRule = {
        id: 'test-rule-9',
        name: 'Failed Condition',
        source_system: 'test-source',
        target_system: 'cmdb',
        conditions: [
          {
            field: 'resource_type',
            operator: 'equals',
            value: 'database',
          },
        ],
        field_mappings: [
          {
            source_field: 'name',
            target_field: 'ci_name',
          },
        ],
      };

      const context: TransformationContext = {
        source_data: {
          name: 'server-01',
          resource_type: 'server',
        },
        lookup_tables: {},
      };

      const result = await engine.transform(rule, context);

      expect(result.success).toBe(false);
      expect(result.errors![0].message).toContain('Rule conditions not met');
    });

    it('should validate transformed data', async () => {
      const rule: TransformationRule = {
        id: 'test-rule-10',
        name: 'Validation Rule',
        source_system: 'test-source',
        target_system: 'cmdb',
        field_mappings: [
          {
            source_field: 'name',
            target_field: 'ci_name',
          },
        ],
        validations: [
          {
            field: 'ci_name',
            rule_type: 'required',
            error_message: 'CI name is required',
          },
        ],
      };

      const context: TransformationContext = {
        source_data: {
          // Missing name field
        },
        lookup_tables: {},
      };

      const result = await engine.transform(rule, context);

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'ci_name',
          message: 'CI name is required',
        })
      );
    });

    it('should validate regex patterns', async () => {
      const rule: TransformationRule = {
        id: 'test-rule-11',
        name: 'Regex Validation',
        source_system: 'test-source',
        target_system: 'cmdb',
        field_mappings: [
          {
            source_field: 'ip_address',
            target_field: 'ci_ip',
          },
        ],
        validations: [
          {
            field: 'ci_ip',
            rule_type: 'regex',
            parameters: {
              pattern: '^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$',
            },
            error_message: 'Invalid IP address format',
          },
        ],
      };

      // Test valid IP
      let context: TransformationContext = {
        source_data: { ip_address: '192.168.1.1' },
        lookup_tables: {},
      };

      let result = await engine.transform(rule, context);
      expect(result.success).toBe(true);

      // Test invalid IP
      context = {
        source_data: { ip_address: 'invalid-ip' },
        lookup_tables: {},
      };

      result = await engine.transform(rule, context);
      expect(result.success).toBe(false);
      expect(result.errors![0].message).toBe('Invalid IP address format');
    });

    it('should validate numeric ranges', async () => {
      const rule: TransformationRule = {
        id: 'test-rule-12',
        name: 'Range Validation',
        source_system: 'test-source',
        target_system: 'cmdb',
        field_mappings: [
          {
            source_field: 'cpu_count',
            target_field: 'ci_cpu_count',
          },
        ],
        validations: [
          {
            field: 'ci_cpu_count',
            rule_type: 'range',
            parameters: {
              min: 1,
              max: 64,
            },
            error_message: 'CPU count must be between 1 and 64',
          },
        ],
      };

      // Test valid range
      let context: TransformationContext = {
        source_data: { cpu_count: 8 },
        lookup_tables: {},
      };

      let result = await engine.transform(rule, context);
      expect(result.success).toBe(true);

      // Test below min
      context = {
        source_data: { cpu_count: 0 },
        lookup_tables: {},
      };

      result = await engine.transform(rule, context);
      expect(result.success).toBe(false);

      // Test above max
      context = {
        source_data: { cpu_count: 128 },
        lookup_tables: {},
      };

      result = await engine.transform(rule, context);
      expect(result.success).toBe(false);
    });
  });

  describe('evaluateConditions', () => {
    it('should evaluate equals operator', () => {
      const conditions = [{ field: 'type', operator: 'equals', value: 'server' }];
      const data = { type: 'server' };

      const result = (engine as any).evaluateConditions(conditions, data);
      expect(result).toBe(true);
    });

    it('should evaluate not_equals operator', () => {
      const conditions = [{ field: 'type', operator: 'not_equals', value: 'database' }];
      const data = { type: 'server' };

      const result = (engine as any).evaluateConditions(conditions, data);
      expect(result).toBe(true);
    });

    it('should evaluate contains operator', () => {
      const conditions = [{ field: 'name', operator: 'contains', value: 'web' }];
      const data = { name: 'web-server-01' };

      const result = (engine as any).evaluateConditions(conditions, data);
      expect(result).toBe(true);
    });

    it('should evaluate regex operator', () => {
      const conditions = [{ field: 'name', operator: 'regex', value: '^web-' }];
      const data = { name: 'web-server-01' };

      const result = (engine as any).evaluateConditions(conditions, data);
      expect(result).toBe(true);
    });

    it('should evaluate exists operator', () => {
      const conditions = [{ field: 'optional_field', operator: 'exists', value: null }];
      const data = { optional_field: 'value' };

      const result = (engine as any).evaluateConditions(conditions, data);
      expect(result).toBe(true);
    });

    it('should return false for non-existent field with exists operator', () => {
      const conditions = [{ field: 'missing_field', operator: 'exists', value: null }];
      const data = {};

      const result = (engine as any).evaluateConditions(conditions, data);
      expect(result).toBe(false);
    });
  });

  describe('getNestedValue and setNestedValue', () => {
    it('should get nested values', () => {
      const obj = {
        level1: {
          level2: {
            value: 'test',
          },
        },
      };

      const result = (engine as any).getNestedValue(obj, 'level1.level2.value');
      expect(result).toBe('test');
    });

    it('should return undefined for non-existent path', () => {
      const obj = { level1: {} };

      const result = (engine as any).getNestedValue(obj, 'level1.level2.value');
      expect(result).toBeUndefined();
    });

    it('should set nested values', () => {
      const obj: any = {};

      (engine as any).setNestedValue(obj, 'level1.level2.value', 'test');

      expect(obj.level1.level2.value).toBe('test');
    });

    it('should handle existing nested objects', () => {
      const obj: any = {
        level1: {
          existing: 'value',
        },
      };

      (engine as any).setNestedValue(obj, 'level1.level2.value', 'new');

      expect(obj.level1.existing).toBe('value');
      expect(obj.level1.level2.value).toBe('new');
    });
  });
});
