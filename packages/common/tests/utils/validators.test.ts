/**
 * Validation Utilities Tests
 *
 * Tests for Joi-based validation schemas including:
 * - Generic validation function
 * - Common schema validators (UUID, timestamp, enums)
 * - CI validation schemas
 * - Relationship validation schemas
 * - Discovery job validation schemas
 * - Pagination and query filter schemas
 */

import { validate, validators, schemas } from '../../src/utils/validators';

describe('Validation Utilities', () => {
  describe('validate function', () => {
    it('should return valid result for valid data', () => {
      const schema = schemas.uuid;
      const data = '123e4567-e89b-12d3-a456-426614174000';

      const result = validate(schema, data);

      expect(result.valid).toBe(true);
      expect(result.value).toBe(data);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid result for invalid data', () => {
      const schema = schemas.uuid;
      const data = 'not-a-uuid';

      const result = validate(schema, data);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.details).toBeDefined();
      expect(result.value).toBeUndefined();
    });

    it('should strip unknown properties', () => {
      const data = {
        _id: 'test-id',
        _name: 'Test CI',
        _type: 'server',
        _status: 'active',
        _unknownField: 'should be stripped',
        _created_at: new Date().toISOString(),
        _updated_at: new Date().toISOString(),
        _discovered_at: new Date().toISOString(),
      };

      const result = validators.validateCI(data);

      expect(result.valid).toBe(true);
      expect(result.value).not.toHaveProperty('unknownField');
    });

    it('should include all error details when validation fails', () => {
      const data = {
        _name: '', // Too short
        _type: 'invalid-type',
        _status: 'invalid-status',
      };

      const result = validators.validateCIInput(data);

      expect(result.valid).toBe(false);
      expect(result.details).toBeInstanceOf(Array);
      expect(result.details.length).toBeGreaterThan(0);
    });
  });

  describe('Common schemas', () => {
    describe('uuid schema', () => {
      it('should validate valid UUIDs', () => {
        const validUUIDs = [
          '123e4567-e89b-12d3-a456-426614174000',
          'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          '00000000-0000-0000-0000-000000000000',
        ];

        validUUIDs.forEach(uuid => {
          const result = validate(schemas.uuid, uuid);
          expect(result.valid).toBe(true);
        });
      });

      it('should reject invalid UUIDs', () => {
        const invalidUUIDs = [
          'not-a-uuid',
          '123',
          'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          '',
        ];

        invalidUUIDs.forEach(uuid => {
          const result = validate(schemas.uuid, uuid);
          expect(result.valid).toBe(false);
        });
      });
    });

    describe('timestamp schema', () => {
      it('should validate ISO 8601 timestamps', () => {
        const validTimestamps = [
          '2025-01-15T10:30:00Z',
          '2025-01-15T10:30:00.123Z',
          '2025-01-15T10:30:00+00:00',
        ];

        validTimestamps.forEach(timestamp => {
          const result = validate(schemas.timestamp, timestamp);
          expect(result.valid).toBe(true);
        });
      });

      it('should reject invalid timestamps', () => {
        const invalidTimestamps = [
          'not-a-date',
          '2025-13-45',
          '01/15/2025',
          '',
        ];

        invalidTimestamps.forEach(timestamp => {
          const result = validate(schemas.timestamp, timestamp);
          expect(result.valid).toBe(false);
        });
      });
    });

    describe('ciType schema', () => {
      it('should validate all valid CI types', () => {
        const validTypes = [
          'server',
          'virtual-machine',
          'container',
          'application',
          'service',
          'database',
          'network-device',
          'storage',
          'load-balancer',
          'cloud-resource',
        ];

        validTypes.forEach(type => {
          const result = validate(schemas.ciType, type);
          expect(result.valid).toBe(true);
        });
      });

      it('should reject invalid CI types', () => {
        const invalidTypes = ['invalid-type', 'server2', '', 'SERVER'];

        invalidTypes.forEach(type => {
          const result = validate(schemas.ciType, type);
          expect(result.valid).toBe(false);
        });
      });
    });

    describe('ciStatus schema', () => {
      it('should validate all valid CI statuses', () => {
        const validStatuses = ['active', 'inactive', 'maintenance', 'decommissioned'];

        validStatuses.forEach(status => {
          const result = validate(schemas.ciStatus, status);
          expect(result.valid).toBe(true);
        });
      });

      it('should reject invalid CI statuses', () => {
        const invalidStatuses = ['running', 'stopped', '', 'ACTIVE'];

        invalidStatuses.forEach(status => {
          const result = validate(schemas.ciStatus, status);
          expect(result.valid).toBe(false);
        });
      });
    });

    describe('environment schema', () => {
      it('should validate all valid environments', () => {
        const validEnvironments = ['production', 'staging', 'development', 'test'];

        validEnvironments.forEach(env => {
          const result = validate(schemas.environment, env);
          expect(result.valid).toBe(true);
        });
      });

      it('should reject invalid environments', () => {
        const invalidEnvironments = ['prod', 'dev', 'qa', ''];

        invalidEnvironments.forEach(env => {
          const result = validate(schemas.environment, env);
          expect(result.valid).toBe(false);
        });
      });
    });

    describe('relationshipType schema', () => {
      it('should validate all valid relationship types', () => {
        const validTypes = [
          'DEPENDS_ON',
          'HOSTS',
          'CONNECTS_TO',
          'USES',
          'OWNED_BY',
          'PART_OF',
          'DEPLOYED_ON',
          'BACKED_UP_BY',
        ];

        validTypes.forEach(type => {
          const result = validate(schemas.relationshipType, type);
          expect(result.valid).toBe(true);
        });
      });

      it('should reject invalid relationship types', () => {
        const invalidTypes = ['depends_on', 'INVALID', ''];

        invalidTypes.forEach(type => {
          const result = validate(schemas.relationshipType, type);
          expect(result.valid).toBe(false);
        });
      });
    });
  });

  describe('validators.validateCI', () => {
    it('should validate complete valid CI', () => {
      const ci = {
        _id: 'ci-123',
        _external_id: 'ext-123',
        _name: 'Web Server 01',
        _type: 'server',
        _status: 'active',
        _environment: 'production',
        _created_at: '2025-01-15T10:00:00Z',
        _updated_at: '2025-01-15T10:00:00Z',
        _discovered_at: '2025-01-15T10:00:00Z',
        _metadata: { location: 'us-east-1' },
      };

      const result = validators.validateCI(ci);

      expect(result.valid).toBe(true);
      expect(result.value).toMatchObject(ci);
    });

    it('should reject CI with missing required fields', () => {
      const ci = {
        _id: 'ci-123',
        // Missing name
        _type: 'server',
        _status: 'active',
      };

      const result = validators.validateCI(ci);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('name');
    });

    it('should reject CI with invalid type', () => {
      const ci = {
        _id: 'ci-123',
        _name: 'Test',
        _type: 'invalid-type',
        _status: 'active',
        _created_at: '2025-01-15T10:00:00Z',
        _updated_at: '2025-01-15T10:00:00Z',
        _discovered_at: '2025-01-15T10:00:00Z',
      };

      const result = validators.validateCI(ci);

      expect(result.valid).toBe(false);
    });

    it('should handle optional fields correctly', () => {
      const ci = {
        _id: 'ci-123',
        _name: 'Test Server',
        _type: 'server',
        _status: 'active',
        _created_at: '2025-01-15T10:00:00Z',
        _updated_at: '2025-01-15T10:00:00Z',
        _discovered_at: '2025-01-15T10:00:00Z',
        // Optional fields omitted
      };

      const result = validators.validateCI(ci);

      expect(result.valid).toBe(true);
    });

    it('should reject CI with name exceeding max length', () => {
      const ci = {
        _id: 'ci-123',
        _name: 'a'.repeat(501),
        _type: 'server',
        _status: 'active',
        _created_at: '2025-01-15T10:00:00Z',
        _updated_at: '2025-01-15T10:00:00Z',
        _discovered_at: '2025-01-15T10:00:00Z',
      };

      const result = validators.validateCI(ci);

      expect(result.valid).toBe(false);
    });
  });

  describe('validators.validateCIInput', () => {
    it('should validate valid CI input', () => {
      const ciInput = {
        _id: 'ci-123',
        _name: 'Test CI',
        _type: 'server',
        _status: 'active',
        _environment: 'production',
        _metadata: { key: 'value' },
      };

      const result = validators.validateCIInput(ciInput);

      expect(result.valid).toBe(true);
    });

    it('should apply default values', () => {
      const ciInput = {
        _id: 'ci-123',
        _name: 'Test CI',
        _type: 'server',
        // status omitted - should default to 'active'
        // metadata omitted - should default to {}
      };

      const result = validators.validateCIInput(ciInput);

      expect(result.valid).toBe(true);
      expect(result.value?.status).toBe('active');
      expect(result.value?.metadata).toEqual({});
    });
  });

  describe('validators.validateRelationship', () => {
    it('should validate valid relationship', () => {
      const relationship = {
        _from_id: 'ci-1',
        _to_id: 'ci-2',
        _type: 'DEPENDS_ON',
        _properties: { weight: 1 },
      };

      const result = validators.validateRelationship(relationship);

      expect(result.valid).toBe(true);
    });

    it('should require from_id and to_id', () => {
      const relationship = {
        _type: 'DEPENDS_ON',
      };

      const result = validators.validateRelationship(relationship);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('from_id');
      expect(result.error).toContain('to_id');
    });

    it('should default properties to empty object', () => {
      const relationship = {
        _from_id: 'ci-1',
        _to_id: 'ci-2',
        _type: 'DEPENDS_ON',
      };

      const result = validators.validateRelationship(relationship);

      expect(result.valid).toBe(true);
      expect(result.value?.properties).toEqual({});
    });
  });

  describe('validators.validateDiscoveryJob', () => {
    it('should validate valid discovery job', () => {
      const job = {
        _id: 'job-123',
        _provider: 'aws',
        _method: 'agentless',
        _config: {
          _credentials: {},
          _regions: ['us-east-1'],
          _filters: {},
        },
        _status: 'pending',
        _created_at: '2025-01-15T10:00:00Z',
      };

      const result = validators.validateDiscoveryJob(job);

      expect(result.valid).toBe(true);
    });

    it('should validate all discovery providers', () => {
      const providers = ['aws', 'azure', 'gcp', 'ssh', 'nmap', 'kubernetes', 'docker'];

      providers.forEach(provider => {
        const job = {
          _id: 'job-123',
          provider,
          _method: 'agentless',
          _config: {},
          _status: 'pending',
          _created_at: '2025-01-15T10:00:00Z',
        };

        const result = validators.validateDiscoveryJob(job);
        expect(result.valid).toBe(true);
      });
    });

    it('should validate job statuses', () => {
      const statuses = ['pending', 'running', 'completed', 'failed'];

      statuses.forEach(status => {
        const job = {
          _id: 'job-123',
          _provider: 'aws',
          _method: 'agentless',
          _config: {},
          status,
          _created_at: '2025-01-15T10:00:00Z',
        };

        const result = validators.validateDiscoveryJob(job);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('validators.validateDiscoveredCI', () => {
    it('should validate discovered CI with required fields', () => {
      const discoveredCI = {
        _id: 'ci-123',
        _name: 'Discovered Server',
        _type: 'server',
        _discovery_job_id: 'job-123',
        _discovery_provider: 'aws',
        _confidence_score: 0.95,
      };

      const result = validators.validateDiscoveredCI(discoveredCI);

      expect(result.valid).toBe(true);
    });

    it('should validate confidence score range', () => {
      const validScores = [0, 0.5, 1.0];
      const invalidScores = [-0.1, 1.1, 2.0];

      validScores.forEach(score => {
        const ci = {
          _id: 'ci-123',
          _name: 'Test',
          _type: 'server',
          _discovery_job_id: 'job-123',
          _discovery_provider: 'aws',
          _confidence_score: score,
        };
        const result = validators.validateDiscoveredCI(ci);
        expect(result.valid).toBe(true);
      });

      invalidScores.forEach(score => {
        const ci = {
          _id: 'ci-123',
          _name: 'Test',
          _type: 'server',
          _discovery_job_id: 'job-123',
          _discovery_provider: 'aws',
          _confidence_score: score,
        };
        const result = validators.validateDiscoveredCI(ci);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('validators.validatePagination', () => {
    it('should validate valid pagination params', () => {
      const pagination = {
        _limit: 50,
        _offset: 100,
      };

      const result = validators.validatePagination(pagination);

      expect(result.valid).toBe(true);
      expect(result.value).toMatchObject(pagination);
    });

    it('should apply default values', () => {
      const result = validators.validatePagination({});

      expect(result.valid).toBe(true);
      expect(result.value?.limit).toBe(100);
      expect(result.value?.offset).toBe(0);
    });

    it('should enforce limit constraints', () => {
      const invalidLimits = [0, -1, 1001];

      invalidLimits.forEach(limit => {
        const result = validators.validatePagination({ limit });
        expect(result.valid).toBe(false);
      });

      const validLimits = [1, 100, 1000];

      validLimits.forEach(limit => {
        const result = validators.validatePagination({ limit });
        expect(result.valid).toBe(true);
      });
    });

    it('should enforce offset constraints', () => {
      const result1 = validators.validatePagination({ offset: -1 });
      expect(result1.valid).toBe(false);

      const result2 = validators.validatePagination({ offset: 0 });
      expect(result2.valid).toBe(true);

      const result3 = validators.validatePagination({ offset: 1000 });
      expect(result3.valid).toBe(true);
    });
  });

  describe('validators.validateQueryFilters', () => {
    it('should validate filters with pagination', () => {
      const filters = {
        _type: 'server',
        _status: 'active',
        _environment: 'production',
        _search: 'web',
        _limit: 50,
        _offset: 0,
      };

      const result = validators.validateQueryFilters(filters);

      expect(result.valid).toBe(true);
      expect(result.value).toMatchObject(filters);
    });

    it('should allow optional filter fields', () => {
      const filters = {
        _limit: 10,
      };

      const result = validators.validateQueryFilters(filters);

      expect(result.valid).toBe(true);
    });

    it('should validate all filter combinations', () => {
      const filters = {
        _type: 'database',
        _status: 'maintenance',
        _environment: 'staging',
      };

      const result = validators.validateQueryFilters(filters);

      expect(result.valid).toBe(true);
    });
  });
});
