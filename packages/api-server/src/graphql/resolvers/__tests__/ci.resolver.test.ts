/**
 * GraphQL CI Resolver Unit Tests
 *
 * TDD London School Approach:
 * - Mock Neo4j database client and DataLoaders
 * - Test GraphQL resolver behavior and interactions
 * - Verify query construction and response formatting
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { resolvers, GraphQLContext } from '../index';
import { GraphQLError } from 'graphql';
import {
  createMockNeo4jDriver,
  createMockNeo4jResult,
} from '@test/utils/mock-database-clients';
import { createCI, createCIs } from '@test/utils/mock-factories';

// Mock dependencies
jest.mock('@cmdb/common', () => ({
  _logger: {
    _info: jest.fn(),
    _error: jest.fn(),
    _debug: jest.fn(),
    _warn: jest.fn(),
  },
}));

describe('GraphQL CI Resolvers', () => {
  let mockNeo4j: ReturnType<typeof createMockNeo4jDriver>;
  let mockContext: GraphQLContext;
  let mockLoaders: any;

  beforeEach(() => {
    // Arrange: Create mock Neo4j client
    mockNeo4j = createMockNeo4jDriver();

    // Arrange: Create mock DataLoaders
    mockLoaders = {
      _ciLoader: {
        _load: jest.fn(),
        _clear: jest.fn(),
      },
      _relationshipLoader: {
        _load: jest.fn(),
        _clear: jest.fn(),
      },
      _dependentLoader: {
        _load: jest.fn(),
        _clear: jest.fn(),
      },
    };

    // Arrange: Create GraphQL context
    mockContext = {
      _neo4jClient: mockNeo4j.driver as any,
      _loaders: mockLoaders,
    };

    // Mock getSession method
    (mockContext.neo4jClient as any).getSession = jest
      .fn()
      .mockReturnValue(mockNeo4j.session);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Query.getCIs', () => {
    it('should fetch all CIs without filters', async () => {
      // Arrange: Mock CIs
      const mockCIs = createCIs(3, { type: 'server' });

      mockNeo4j.session.run.mockResolvedValueOnce(
        createMockNeo4jResult(
          mockCIs.map((ci) => ({ ci: { properties: ci } }))
        )
      );

      // Act: Execute query
      const result = await resolvers.Query.getCIs(
        null,
        { limit: 100, offset: 0 },
        mockContext
      );

      // Assert: Verify Neo4j query
      expect(mockNeo4j.session.run).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (ci:CI)'),
        expect.objectContaining({
          _limit: 100,
          _offset: 0,
        })
      );

      // Assert: Verify session cleanup
      expect(mockNeo4j.session.close).toHaveBeenCalled();

      // Assert: Verify results
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('type');
    });

    it('should filter CIs by type', async () => {
      // Arrange
      const serverCIs = createCIs(2, { type: 'server' });

      mockNeo4j.session.run.mockResolvedValueOnce(
        createMockNeo4jResult(
          serverCIs.map((ci) => ({ ci: { properties: ci } }))
        )
      );

      // Act: Query with type filter
      const result = await resolvers.Query.getCIs(
        null,
        {
          _filter: { type: 'SERVER' }, // GraphQL enum format
          _limit: 100,
          _offset: 0,
        },
        mockContext
      );

      // Assert: Verify type filter in query
      expect(mockNeo4j.session.run).toHaveBeenCalledWith(
        expect.stringContaining('ci.type = $type'),
        expect.objectContaining({
          _type: 'server', // Converted to database format
        })
      );

      expect(result).toHaveLength(2);
    });

    it('should filter CIs by multiple criteria', async () => {
      // Arrange
      mockNeo4j.session.run.mockResolvedValueOnce(createMockNeo4jResult([]));

      // Act: Query with multiple filters
      await resolvers.Query.getCIs(
        null,
        {
          _filter: {
            _type: 'SERVER',
            _status: 'ACTIVE',
            _environment: 'PRODUCTION',
            _name: 'web',
          },
          _limit: 50,
          _offset: 10,
        },
        mockContext
      );

      // Assert: Verify all filters in query
      expect(mockNeo4j.session.run).toHaveBeenCalledWith(
        expect.stringMatching(/ci\.type = \$type.*ci\.status = \$status/s),
        expect.objectContaining({
          _type: 'server',
          _status: 'active',
          _environment: 'production',
          _name: 'web',
          _limit: 50,
          _offset: 10,
        })
      );
    });

    it('should handle Neo4j errors gracefully', async () => {
      // Arrange: Mock database error
      mockNeo4j.session.run.mockRejectedValueOnce(new Error('Connection lost'));

      // Act & Assert: Expect GraphQL error
      await expect(
        resolvers.Query.getCIs(null, {}, mockContext)
      ).rejects.toThrow(GraphQLError);

      await expect(
        resolvers.Query.getCIs(null, {}, mockContext)
      ).rejects.toMatchObject({
        _extensions: {
          _code: 'INTERNAL_SERVER_ERROR',
        },
      });

      // Assert: Session still closed
      expect(mockNeo4j.session.close).toHaveBeenCalled();
    });

    it('should apply pagination correctly', async () => {
      // Arrange
      mockNeo4j.session.run.mockResolvedValueOnce(createMockNeo4jResult([]));

      // Act: Query with pagination
      await resolvers.Query.getCIs(
        null,
        {
          _limit: 25,
          _offset: 100,
        },
        mockContext
      );

      // Assert: Verify SKIP and LIMIT in query
      expect(mockNeo4j.session.run).toHaveBeenCalledWith(
        expect.stringContaining('SKIP $offset'),
        expect.objectContaining({ offset: 100 })
      );

      expect(mockNeo4j.session.run).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $limit'),
        expect.objectContaining({ limit: 25 })
      );
    });
  });

  describe('Query.getCI', () => {
    it('should fetch single CI by ID using DataLoader', async () => {
      // Arrange: Mock DataLoader response
      const mockCI = createCI({ id: 'ci-123', name: 'web-server' });
      mockLoaders.ciLoader.load.mockResolvedValueOnce(mockCI);

      // Act: Execute query
      const result = await resolvers.Query.getCI(
        null,
        { id: 'ci-123' },
        mockContext
      );

      // Assert: Verify DataLoader used
      expect(mockLoaders.ciLoader.load).toHaveBeenCalledWith('ci-123');

      // Assert: Verify result
      expect(result).toEqual(mockCI);
    });

    it('should return null when CI not found', async () => {
      // Arrange: DataLoader returns null
      mockLoaders.ciLoader.load.mockResolvedValueOnce(null);

      // Act
      const result = await resolvers.Query.getCI(
        null,
        { id: 'non-existent' },
        mockContext
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should handle DataLoader errors', async () => {
      // Arrange: Mock DataLoader error
      mockLoaders.ciLoader.load.mockRejectedValueOnce(new Error('Database error'));

      // Act & Assert
      await expect(
        resolvers.Query.getCI(null, { id: 'ci-123' }, mockContext)
      ).rejects.toThrow(GraphQLError);
    });
  });

  describe('Query.searchCIs', () => {
    it('should search CIs by name or external_id', async () => {
      // Arrange
      const matchingCIs = createCIs(2, { name: 'web-server' });

      mockNeo4j.session.run.mockResolvedValueOnce(
        createMockNeo4jResult(
          matchingCIs.map((ci) => ({ ci: { properties: ci } }))
        )
      );

      // Act: Search query
      const result = await resolvers.Query.searchCIs(
        null,
        {
          _query: 'web',
          _limit: 50,
        },
        mockContext
      );

      // Assert: Verify search query construction
      expect(mockNeo4j.session.run).toHaveBeenCalledWith(
        expect.stringContaining('ci.name CONTAINS $query OR ci.external_id CONTAINS $query'),
        expect.objectContaining({
          _query: 'web',
          _limit: 50,
        })
      );

      expect(result).toHaveLength(2);
    });

    it('should combine search with filters', async () => {
      // Arrange
      mockNeo4j.session.run.mockResolvedValueOnce(createMockNeo4jResult([]));

      // Act: Search with filter
      await resolvers.Query.searchCIs(
        null,
        {
          _query: 'prod',
          _filter: { type: 'SERVER', status: 'ACTIVE' },
          _limit: 50,
        },
        mockContext
      );

      // Assert: Verify combined query
      expect(mockNeo4j.session.run).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.objectContaining({
          _query: 'prod',
          _type: 'server',
          _status: 'active',
        })
      );
    });
  });

  describe('Query.getCIDependencies', () => {
    it('should fetch recursive dependencies with specified depth', async () => {
      // Arrange: Mock dependency graph
      const dependencies = createCIs(3, { type: 'database' });

      mockNeo4j.session.run.mockResolvedValueOnce(
        createMockNeo4jResult(
          dependencies.map((ci) => ({ dep: { properties: ci } }))
        )
      );

      // Act: Get dependencies with depth 3
      const result = await resolvers.Query.getCIDependencies(
        null,
        { id: 'ci-123', depth: 3 },
        mockContext
      );

      // Assert: Verify Cypher query with depth
      expect(mockNeo4j.session.run).toHaveBeenCalledWith(
        expect.stringContaining('[:DEPENDS_ON*1..3]'),
        expect.objectContaining({ id: 'ci-123' })
      );

      expect(result).toHaveLength(3);
    });

    it('should use default depth of 5 when not specified', async () => {
      // Arrange
      mockNeo4j.session.run.mockResolvedValueOnce(createMockNeo4jResult([]));

      // Act: Get dependencies without depth
      await resolvers.Query.getCIDependencies(
        null,
        { id: 'ci-123' },
        mockContext
      );

      // Assert: Verify default depth
      expect(mockNeo4j.session.run).toHaveBeenCalledWith(
        expect.stringContaining('[:DEPENDS_ON*1..5]'),
        expect.any(Object)
      );
    });
  });

  describe('Query.getImpactAnalysis', () => {
    it('should return impacted CIs with distance', async () => {
      // Arrange: Mock impact analysis results
      const mockResults = [
        { impacted: { properties: createCI({ id: 'ci-1' }) }, distance: 1 },
        { impacted: { properties: createCI({ id: 'ci-2' }) }, distance: 2 },
      ];

      mockNeo4j.session.run.mockResolvedValueOnce({
        _records: mockResults.map((r) => ({
          _get: (key: string) => {
            if (key === 'impacted') return r.impacted;
            if (key === 'distance') return { toNumber: () => r.distance };
          },
        })),
      });

      // Act: Perform impact analysis
      const result = await resolvers.Query.getImpactAnalysis(
        null,
        { id: 'ci-123', depth: 3 },
        mockContext
      );

      // Assert: Verify reverse dependency query (incoming edges)
      expect(mockNeo4j.session.run).toHaveBeenCalledWith(
        expect.stringContaining('<-[:DEPENDS_ON*1..3]'),
        expect.objectContaining({ id: 'ci-123' })
      );

      // Assert: Verify result structure
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('ci');
      expect(result[0]).toHaveProperty('distance', 1);
      expect(result[1]).toHaveProperty('distance', 2);
    });

    it('should order results by distance', async () => {
      // Arrange
      mockNeo4j.session.run.mockResolvedValueOnce(createMockNeo4jResult([]));

      // Act
      await resolvers.Query.getImpactAnalysis(
        null,
        { id: 'ci-123' },
        mockContext
      );

      // Assert: Verify ORDER BY in query
      expect(mockNeo4j.session.run).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY distance'),
        expect.any(Object)
      );
    });
  });

  describe('Mutation.createCI', () => {
    it('should create new CI with valid input', async () => {
      // Arrange: Mock create operation
      const newCI = createCI({ id: 'ci-new', name: 'new-server' });
      const mockCreateCI = jest.fn().mockResolvedValue(newCI);
      (mockContext.neo4jClient as any).createCI = mockCreateCI;

      // Act: Create mutation
      const result = await resolvers.Mutation.createCI(
        null,
        {
          _input: {
            _id: 'ci-new',
            _name: 'new-server',
            _type: 'SERVER',
            _status: 'ACTIVE',
            _environment: 'PRODUCTION',
          },
        },
        mockContext
      );

      // Assert: Verify createCI called with correct data
      expect(mockCreateCI).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: 'ci-new',
          _name: 'new-server',
          _type: 'server', // Enum converted
          _status: 'active',
          _environment: 'production',
        })
      );

      // Assert: Verify cache cleared
      expect(mockLoaders.ciLoader.clear).toHaveBeenCalledWith('ci-new');

      // Assert: Verify result
      expect(result).toEqual(newCI);
    });

    it('should validate required fields', async () => {
      // Act & Assert: Missing ID
      await expect(
        resolvers.Mutation.createCI(
          null,
          {
            _input: {
              _name: 'test',
              _type: 'SERVER',
            },
          },
          mockContext
        )
      ).rejects.toThrow(GraphQLError);

      // Act & Assert: Missing name
      await expect(
        resolvers.Mutation.createCI(
          null,
          {
            _input: {
              _id: 'ci-123',
              _type: 'SERVER',
            },
          },
          mockContext
        )
      ).rejects.toThrow(GraphQLError);

      // Act & Assert: Missing type
      await expect(
        resolvers.Mutation.createCI(
          null,
          {
            _input: {
              _id: 'ci-123',
              _name: 'test',
            },
          },
          mockContext
        )
      ).rejects.toThrow(GraphQLError);
    });

    it('should set default values for optional fields', async () => {
      // Arrange
      const mockCreateCI = jest.fn().mockResolvedValue(createCI());
      (mockContext.neo4jClient as any).createCI = mockCreateCI;

      // Act: Create with minimal input
      await resolvers.Mutation.createCI(
        null,
        {
          _input: {
            _id: 'ci-minimal',
            _name: 'minimal-server',
            _type: 'SERVER',
          },
        },
        mockContext
      );

      // Assert: Verify defaults applied
      expect(mockCreateCI).toHaveBeenCalledWith(
        expect.objectContaining({
          _status: 'active', // Default status
          _discovered_at: expect.any(String), // Auto-generated timestamp
        })
      );
    });
  });

  describe('Mutation.updateCI', () => {
    it('should update CI with partial data', async () => {
      // Arrange
      const updatedCI = createCI({ id: 'ci-123', name: 'updated-name' });
      const mockUpdateCI = jest.fn().mockResolvedValue(updatedCI);
      (mockContext.neo4jClient as any).updateCI = mockUpdateCI;

      // Act: Update mutation
      const result = await resolvers.Mutation.updateCI(
        null,
        {
          _id: 'ci-123',
          _input: {
            _name: 'updated-name',
            _status: 'INACTIVE',
          },
        },
        mockContext
      );

      // Assert: Verify updateCI called with only provided fields
      expect(mockUpdateCI).toHaveBeenCalledWith(
        'ci-123',
        expect.objectContaining({
          _name: 'updated-name',
          _status: 'inactive',
        })
      );

      // Assert: Verify cache cleared
      expect(mockLoaders.ciLoader.clear).toHaveBeenCalledWith('ci-123');

      expect(result).toEqual(updatedCI);
    });

    it('should not include undefined fields in update', async () => {
      // Arrange
      const mockUpdateCI = jest.fn().mockResolvedValue(createCI());
      (mockContext.neo4jClient as any).updateCI = mockUpdateCI;

      // Act: Update with only one field
      await resolvers.Mutation.updateCI(
        null,
        {
          _id: 'ci-123',
          _input: {
            _name: 'new-name',
          },
        },
        mockContext
      );

      // Assert: Only name should be in updates
      expect(mockUpdateCI).toHaveBeenCalledWith(
        'ci-123',
        expect.objectContaining({
          _name: 'new-name',
        })
      );

      const updateArg = mockUpdateCI.mock.calls[0][1];
      expect(updateArg).not.toHaveProperty('status');
      expect(updateArg).not.toHaveProperty('environment');
    });
  });

  describe('Mutation.deleteCI', () => {
    it('should delete CI and return true', async () => {
      // Arrange: Mock successful delete
      mockNeo4j.session.run.mockResolvedValueOnce({
        _records: [{ get: () => ({ toNumber: () => 1 }) }],
      });

      // Act: Delete mutation
      const result = await resolvers.Mutation.deleteCI(
        null,
        { id: 'ci-123' },
        mockContext
      );

      // Assert: Verify Cypher DELETE query
      expect(mockNeo4j.session.run).toHaveBeenCalledWith(
        expect.stringContaining('DETACH DELETE ci'),
        expect.objectContaining({ id: 'ci-123' })
      );

      // Assert: Verify cache cleared
      expect(mockLoaders.ciLoader.clear).toHaveBeenCalledWith('ci-123');

      // Assert: Verify result
      expect(result).toBe(true);
    });

    it('should throw error when CI not found', async () => {
      // Arrange: CI doesn't exist
      mockNeo4j.session.run.mockResolvedValueOnce({
        _records: [{ get: () => ({ toNumber: () => 0 }) }],
      });

      // Act & Assert: Expect NOT_FOUND error
      await expect(
        resolvers.Mutation.deleteCI(null, { id: 'non-existent' }, mockContext)
      ).rejects.toMatchObject({
        _extensions: { code: 'NOT_FOUND' },
      });
    });
  });

  describe('Mutation.createRelationship', () => {
    it('should create relationship between CIs', async () => {
      // Arrange
      const mockCreateRelationship = jest.fn().mockResolvedValue(undefined);
      (mockContext.neo4jClient as any).createRelationship = mockCreateRelationship;

      // Act: Create relationship
      const result = await resolvers.Mutation.createRelationship(
        null,
        {
          _input: {
            _fromId: 'ci-1',
            _toId: 'ci-2',
            _type: 'DEPENDS_ON',
            _properties: { strength: 'strong' },
          },
        },
        mockContext
      );

      // Assert: Verify relationship creation
      expect(mockCreateRelationship).toHaveBeenCalledWith(
        'ci-1',
        'ci-2',
        'DEPENDS_ON',
        { strength: 'strong' }
      );

      // Assert: Verify caches cleared for both CIs
      expect(mockLoaders.relationshipLoader.clear).toHaveBeenCalledWith('ci-1');
      expect(mockLoaders.dependentLoader.clear).toHaveBeenCalledWith('ci-2');

      expect(result).toBe(true);
    });

    it('should create relationship with empty properties when not provided', async () => {
      // Arrange
      const mockCreateRelationship = jest.fn().mockResolvedValue(undefined);
      (mockContext.neo4jClient as any).createRelationship = mockCreateRelationship;

      // Act: Create relationship without properties
      await resolvers.Mutation.createRelationship(
        null,
        {
          _input: {
            _fromId: 'ci-1',
            _toId: 'ci-2',
            _type: 'CONNECTS_TO',
          },
        },
        mockContext
      );

      // Assert: Empty properties object
      expect(mockCreateRelationship).toHaveBeenCalledWith(
        'ci-1',
        'ci-2',
        'CONNECTS_TO',
        {}
      );
    });
  });

  describe('CI Field Resolvers', () => {
    it('should resolve relationships field using DataLoader', async () => {
      // Arrange
      const parentCI = createCI({ id: 'ci-123' });
      const mockRelationships = [{ type: 'DEPENDS_ON', ci: createCI() }];
      mockLoaders.relationshipLoader.load.mockResolvedValueOnce(mockRelationships);

      // Act: Resolve relationships field
      const result = await resolvers.CI.relationships(parentCI, {}, mockContext);

      // Assert: Verify DataLoader called with parent CI ID
      expect(mockLoaders.relationshipLoader.load).toHaveBeenCalledWith('ci-123');
      expect(result).toEqual(mockRelationships);
    });

    it('should resolve dependents field using DataLoader', async () => {
      // Arrange
      const parentCI = createCI({ id: 'ci-123' });
      const mockDependents = [{ type: 'DEPENDS_ON', ci: createCI() }];
      mockLoaders.dependentLoader.load.mockResolvedValueOnce(mockDependents);

      // Act: Resolve dependents field
      const result = await resolvers.CI.dependents(parentCI, {}, mockContext);

      // Assert
      expect(mockLoaders.dependentLoader.load).toHaveBeenCalledWith('ci-123');
      expect(result).toEqual(mockDependents);
    });

    it('should resolve dependencies field with recursive query', async () => {
      // Arrange
      const parentCI = createCI({ id: 'ci-123' });
      const mockDependencies = createCIs(2);

      mockNeo4j.session.run.mockResolvedValueOnce(
        createMockNeo4jResult(
          mockDependencies.map((ci) => ({ dep: { properties: ci } }))
        )
      );

      // Act: Resolve dependencies field
      const result = await resolvers.CI.dependencies(parentCI, {}, mockContext);

      // Assert: Verify recursive Cypher query
      expect(mockNeo4j.session.run).toHaveBeenCalledWith(
        expect.stringContaining('[:DEPENDS_ON*1..5]'),
        expect.objectContaining({ id: 'ci-123' })
      );

      expect(result).toHaveLength(2);
    });

    it('should map snake_case fields to camelCase', () => {
      // Arrange
      const ci = createCI({
        _external_id: 'ext-123',
        _created_at: '2023-01-01T00:00:00Z',
        _updated_at: '2023-01-02T00:00:00Z',
        _discovered_at: '2023-01-03T00:00:00Z',
      });

      // Act: Resolve field mappings
      const externalId = resolvers.CI.externalId(ci);
      const createdAt = resolvers.CI.createdAt(ci);
      const updatedAt = resolvers.CI.updatedAt(ci);
      const discoveredAt = resolvers.CI.discoveredAt(ci);

      // Assert: Proper field mapping
      expect(externalId).toBe('ext-123');
      expect(createdAt).toBe('2023-01-01T00:00:00Z');
      expect(updatedAt).toBe('2023-01-02T00:00:00Z');
      expect(discoveredAt).toBe('2023-01-03T00:00:00Z');
    });
  });

  describe('Contract Verification (London School)', () => {
    it('should always close Neo4j session after query', async () => {
      // Arrange
      mockNeo4j.session.run.mockResolvedValueOnce(createMockNeo4jResult([]));

      // Act: Execute any query
      await resolvers.Query.getCIs(null, {}, mockContext);

      // Assert: Session closed
      expect(mockNeo4j.session.close).toHaveBeenCalled();

      // Act: Execute query that throws error
      mockNeo4j.session.run.mockRejectedValueOnce(new Error('Database error'));

      try {
        await resolvers.Query.getCIs(null, {}, mockContext);
      } catch {
        // Expected to throw
      }

      // Assert: Session still closed even on error
      expect(mockNeo4j.session.close).toHaveBeenCalledTimes(2);
    });

    it('should clear DataLoader cache after mutations', async () => {
      // Arrange
      const mockUpdateCI = jest.fn().mockResolvedValue(createCI({ id: 'ci-123' }));
      (mockContext.neo4jClient as any).updateCI = mockUpdateCI;

      // Act: Execute mutation
      await resolvers.Mutation.updateCI(
        null,
        { id: 'ci-123', input: { name: 'new-name' } },
        mockContext
      );

      // Assert: Cache cleared for consistency
      expect(mockLoaders.ciLoader.clear).toHaveBeenCalledWith('ci-123');
    });

    it('should follow GraphQL error handling contract', async () => {
      // Arrange: Database error
      mockNeo4j.session.run.mockRejectedValueOnce(new Error('Connection timeout'));

      // Act & Assert: Should wrap in GraphQLError with proper code
      try {
        await resolvers.Query.getCIs(null, {}, mockContext);
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error).toBeInstanceOf(GraphQLError);
        expect(error.extensions).toHaveProperty('code', 'INTERNAL_SERVER_ERROR');
        expect(error.extensions).toHaveProperty('originalError');
      }
    });
  });
});
