/**
 * Unit tests for ExpressionEvaluator
 */

import { ExpressionEvaluator } from '../../src/engine/expression-evaluator';

// Mock logger
jest.mock('@cmdb/common', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('ExpressionEvaluator', () => {
  let evaluator: ExpressionEvaluator;

  beforeEach(() => {
    evaluator = new ExpressionEvaluator();
  });

  describe('String Functions', () => {
    it('should convert to lowercase', () => {
      const result = evaluator.evaluate('lowercase(text)', { text: 'HELLO WORLD' });
      expect(result).toBe('hello world');
    });

    it('should convert to uppercase', () => {
      const result = evaluator.evaluate('uppercase(text)', { text: 'hello world' });
      expect(result).toBe('HELLO WORLD');
    });

    it('should trim whitespace', () => {
      const result = evaluator.evaluate('trim(text)', { text: '  hello  ' });
      expect(result).toBe('hello');
    });

    it('should extract substring', () => {
      const result = evaluator.evaluate('substring(text, 0, 5)', { text: 'hello world' });
      expect(result).toBe('hello');
    });

    it('should extract substring without length', () => {
      const result = evaluator.evaluate('substring(text, 6)', { text: 'hello world' });
      expect(result).toBe('world');
    });

    it('should concatenate strings', () => {
      const result = evaluator.evaluate('concat(first, " ", last)', {
        first: 'John',
        last: 'Doe',
      });
      expect(result).toBe('John Doe');
    });

    it('should replace text', () => {
      const result = evaluator.evaluate('replace(text, "old", "new")', {
        text: 'old value old',
      });
      expect(result).toBe('new value new');
    });

    it('should handle null values in string functions', () => {
      expect(evaluator.evaluate('lowercase(text)', { text: null })).toBeUndefined();
      expect(evaluator.evaluate('uppercase(text)', { text: null })).toBeUndefined();
      expect(evaluator.evaluate('trim(text)', { text: null })).toBeUndefined();
    });
  });

  describe('Date Functions', () => {
    it('should return current timestamp', () => {
      const result = evaluator.evaluate('now()', {});
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should format date from string', () => {
      const result = evaluator.evaluate('format_date(date)', {
        date: '2025-01-15T10:30:00Z',
      });
      expect(result).toBe('2025-01-15T10:30:00.000Z');
    });

    it('should format Date object', () => {
      const date = new Date('2025-01-15T10:30:00Z');
      const result = evaluator.evaluate('format_date(date)', { date });
      expect(result).toMatch(/2025-01-15/);
    });
  });

  describe('Conditional Functions', () => {
    it('should evaluate if function with true condition', () => {
      const result = evaluator.evaluate('if(true, "yes", "no")', {});
      expect(result).toBe('yes');
    });

    it('should evaluate if function with false condition', () => {
      const result = evaluator.evaluate('if(false, "yes", "no")', {});
      expect(result).toBe('no');
    });

    it('should evaluate if with expression condition', () => {
      const data = { status: 'active', value: 'production' };
      // This would require evaluating status as a field reference
      const result = evaluator.evaluate('if(status, value, "none")', data);
      expect(result).toBe('production');
    });
  });

  describe('Type Conversion Functions', () => {
    it('should convert to string', () => {
      expect(evaluator.evaluate('to_string(num)', { num: 123 })).toBe('123');
      expect(evaluator.evaluate('to_string(bool)', { bool: true })).toBe('true');
    });

    it('should convert to number', () => {
      expect(evaluator.evaluate('to_number(str)', { str: '123' })).toBe(123);
      expect(evaluator.evaluate('to_number(str)', { str: '45.67' })).toBe(45.67);
    });

    it('should convert to boolean', () => {
      expect(evaluator.evaluate('to_boolean(num)', { num: 1 })).toBe(true);
      expect(evaluator.evaluate('to_boolean(num)', { num: 0 })).toBe(false);
      expect(evaluator.evaluate('to_boolean(str)', { str: 'hello' })).toBe(true);
      expect(evaluator.evaluate('to_boolean(str)', { str: '' })).toBe(false);
    });
  });

  describe('Array Functions', () => {
    it('should get first element', () => {
      const result = evaluator.evaluate('first(arr)', { arr: [1, 2, 3] });
      expect(result).toBe(1);
    });

    it('should get last element', () => {
      const result = evaluator.evaluate('last(arr)', { arr: [1, 2, 3] });
      expect(result).toBe(3);
    });

    it('should join array elements', () => {
      const result = evaluator.evaluate('join(arr, ", ")', { arr: ['a', 'b', 'c'] });
      expect(result).toBe('a, b, c');
    });

    it('should handle empty arrays', () => {
      expect(evaluator.evaluate('first(arr)', { arr: [] })).toBeUndefined();
      expect(evaluator.evaluate('last(arr)', { arr: [] })).toBeUndefined();
    });

    it('should handle null arrays', () => {
      expect(evaluator.evaluate('first(arr)', { arr: null })).toBeUndefined();
      expect(evaluator.evaluate('join(arr, ",")', { arr: null })).toBeUndefined();
    });
  });

  describe('Null Handling Functions', () => {
    it('should return first non-null value with coalesce', () => {
      const result = evaluator.evaluate('coalesce(null, null, "value", "other")', {});
      expect(result).toBe('value');
    });

    it('should return default value when null', () => {
      const result = evaluator.evaluate('default(field, "fallback")', { field: null });
      expect(result).toBe('fallback');
    });

    it('should return actual value when not null', () => {
      const result = evaluator.evaluate('default(field, "fallback")', { field: 'actual' });
      expect(result).toBe('actual');
    });

    it('should handle undefined in coalesce', () => {
      const result = evaluator.evaluate('coalesce(a, b, c)', { a: undefined, b: null, c: 'value' });
      expect(result).toBe('value');
    });
  });

  describe('Field Access', () => {
    it('should access simple fields', () => {
      const result = evaluator.evaluate('name', { name: 'John' });
      expect(result).toBe('John');
    });

    it('should access nested fields', () => {
      const result = evaluator.evaluate('user.profile.name', {
        user: { profile: { name: 'Jane' } },
      });
      expect(result).toBe('Jane');
    });

    it('should return undefined for non-existent fields', () => {
      const result = evaluator.evaluate('missing.field', { other: 'value' });
      expect(result).toBeUndefined();
    });

    it('should handle null in path', () => {
      const result = evaluator.evaluate('user.profile.name', {
        user: { profile: null },
      });
      expect(result).toBeUndefined();
    });
  });

  describe('Nested Function Calls', () => {
    it('should evaluate nested functions', () => {
      const result = evaluator.evaluate('uppercase(trim(text))', { text: '  hello  ' });
      expect(result).toBe('HELLO');
    });

    it('should handle multiple levels of nesting', () => {
      const result = evaluator.evaluate('uppercase(substring(trim(text), 0, 3))', {
        text: '  hello world  ',
      });
      expect(result).toBe('HEL');
    });

    it('should evaluate nested function as argument', () => {
      const result = evaluator.evaluate('concat(uppercase(first), " ", lowercase(last))', {
        first: 'john',
        last: 'DOE',
      });
      expect(result).toBe('JOHN doe');
    });
  });

  describe('Argument Parsing', () => {
    it('should parse string literals with double quotes', () => {
      const args = (evaluator as any).parseArguments('"hello", "world"', {});
      expect(args).toEqual(['hello', 'world']);
    });

    it('should parse string literals with single quotes', () => {
      const args = (evaluator as any).parseArguments("'hello', 'world'", {});
      expect(args).toEqual(['hello', 'world']);
    });

    it('should parse number literals', () => {
      const args = (evaluator as any).parseArguments('123, 45.67', {});
      expect(args).toEqual([123, 45.67]);
    });

    it('should parse boolean literals', () => {
      const args = (evaluator as any).parseArguments('true, false', {});
      expect(args).toEqual([true, false]);
    });

    it('should parse null literal', () => {
      const args = (evaluator as any).parseArguments('null', {});
      expect(args).toEqual([null]);
    });

    it('should parse field references', () => {
      const args = (evaluator as any).parseArguments('field1, field2', {
        field1: 'value1',
        field2: 'value2',
      });
      expect(args).toEqual(['value1', 'value2']);
    });

    it('should parse mixed argument types', () => {
      const args = (evaluator as any).parseArguments('field, "literal", 123, true', {
        field: 'value',
      });
      expect(args).toEqual(['value', 'literal', 123, true]);
    });

    it('should handle nested function calls in arguments', () => {
      const args = (evaluator as any).parseArguments('uppercase(name), 123', {
        name: 'john',
        uppercase: (val: string) => val.toUpperCase(),
      });
      expect(args).toEqual(['JOHN', 123]);
    });

    it('should handle commas in quoted strings', () => {
      const args = (evaluator as any).parseArguments('"hello, world", "test"', {});
      expect(args).toEqual(['hello, world', 'test']);
    });

    it('should handle empty arguments', () => {
      const args = (evaluator as any).parseArguments('', {});
      expect(args).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unknown function', () => {
      expect(() => evaluator.evaluate('unknown_function(field)', { field: 'value' }))
        .toThrow('Unknown function: unknown_function');
    });

    it('should throw error for invalid expression syntax', () => {
      expect(() => evaluator.evaluate('invalid((expression', {}))
        .toThrow();
    });

    it('should throw error on evaluation failure', () => {
      expect(() => evaluator.evaluate('substring()', {}))
        .toThrow();
    });

    it('should log error on expression evaluation failure', () => {
      const { logger } = require('@cmdb/common');

      try {
        evaluator.evaluate('unknown_func()', {});
      } catch (error) {
        // Expected
      }

      expect(logger.error).toHaveBeenCalledWith(
        'Expression evaluation failed',
        expect.any(Object)
      );
    });
  });

  describe('Safe Context', () => {
    it('should prevent access to dangerous globals', () => {
      const context = (evaluator as any).createSafeContext({ test: 'value' });

      expect(context.eval).toBeUndefined();
      expect(context.Function).toBeUndefined();
      expect(context.setTimeout).toBeUndefined();
      expect(context.setInterval).toBeUndefined();
    });

    it('should include data fields in context', () => {
      const context = (evaluator as any).createSafeContext({ name: 'John', age: 30 });

      expect(context.name).toBe('John');
      expect(context.age).toBe(30);
    });

    it('should include built-in functions', () => {
      const context = (evaluator as any).createSafeContext({});

      expect(typeof context.uppercase).toBe('function');
      expect(typeof context.lowercase).toBe('function');
      expect(typeof context.concat).toBe('function');
    });
  });

  describe('Complex Real-World Scenarios', () => {
    it('should transform AWS instance data', () => {
      const data = {
        InstanceId: 'i-1234567890abcdef',
        InstanceType: 't2.micro',
        State: { Name: 'running' },
        Tags: [{ Key: 'Name', Value: 'web-server-01' }],
      };

      const instanceName = evaluator.evaluate('first(Tags).Value', data);
      expect(instanceName).toBe('web-server-01');

      const ciType = evaluator.evaluate('concat("aws-", lowercase(InstanceType))', data);
      expect(ciType).toBe('aws-t2.micro');
    });

    it('should handle complex nested transformations', () => {
      const data = {
        server: {
          hostname: 'WEB-SERVER-01',
          ip_addresses: ['10.0.1.5', '192.168.1.100'],
        },
        environment: 'PROD',
      };

      const result = evaluator.evaluate(
        'concat(lowercase(server.hostname), "-", lowercase(environment))',
        data
      );
      expect(result).toBe('web-server-01-prod');

      const firstIp = evaluator.evaluate('first(server.ip_addresses)', data);
      expect(firstIp).toBe('10.0.1.5');
    });

    it('should apply default values with coalesce', () => {
      const data1 = { optional_field: null, fallback: 'default' };
      const result1 = evaluator.evaluate('coalesce(optional_field, fallback, "hardcoded")', data1);
      expect(result1).toBe('default');

      const data2 = { optional_field: null, fallback: null };
      const result2 = evaluator.evaluate('coalesce(optional_field, fallback, "hardcoded")', data2);
      expect(result2).toBe('hardcoded');
    });
  });
});
