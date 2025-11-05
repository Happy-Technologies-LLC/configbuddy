/**
 * Integration Tests - GraphQL API
 *
 * Tests GraphQL queries and mutations for the CMDB platform.
 * Uses Apollo testing utilities and testcontainers for realistic testing.
 */

import { ApolloServer } from '@apollo/server';
import { v4 as uuidv4 } from 'uuid';
import { startTestContainers, stopTestContainers, cleanDatabases, getTestContext } from '../helpers/test-containers';
import { CI, CIInput, Relationship } from '@cmdb/common';
import { getNeo4jClient } from '@cmdb/database';

// GraphQL Schema
const typeDefs = `#graphql
  type CI {
    _id: ID!
    _external_id: String
    _name: String!
    _type: String!
    _status: String!
    _environment: String
    _created_at: String!
    _updated_at: String!
    _discovered_at: String!
    _metadata: JSON
  }

  type Relationship {
    _type: String!
    _from: CI!
    _to: CI!
    _properties: JSON
  }

  type CIConnection {
    _nodes: [CI!]!
    _totalCount: Int!
  }

  scalar JSON

  type Query {
    ci(id: ID!): CI
    cis(type: String, status: String, environment: String, limit: Int, offset: Int): CIConnection!
    ciRelationships(id: ID!, direction: String): [Relationship!]!
    ciImpactAnalysis(id: ID!, depth: Int): [CI!]!
    searchCIs(query: String!): [CI!]!
  }

  type Mutation {
    createCI(input: CIInput!): CI!
    updateCI(id: ID!, input: CIUpdateInput!): CI!
    deleteCI(id: ID!): Boolean!
    createRelationship(from: ID!, to: ID!, type: String!): Relationship!
  }

  input CIInput {
    _id: ID!
    _external_id: String
    _name: String!
    _type: String!
    _status: String
    _environment: String
    _discovered_at: String
    _metadata: JSON
  }

  input CIUpdateInput {
    _name: String
    _status: String
    _environment: String
    _metadata: JSON
  }
`;

// GraphQL Resolvers
const resolvers = {
  _Query: {
    _ci: async (_: any, { id }: { id: string }) => {
      const neo4jClient = getNeo4jClient();
      return await neo4jClient.getCI(id);
    },
    _cis: async (
      __: any,
      {
        type,
        status,
        environment,
        limit = 100,
        offset = 0,
      }: {
        type?: string;
        status?: string;
        environment?: string;
        limit?: number;
        offset?: number;
      }
    ) => {
      const neo4jClient = getNeo4jClient();
      const session = neo4jClient.getSession();
      try {
        let query = 'MATCH (ci:CI) WHERE 1=1';
        const params: any = {};

        if (type) {
          query += ' AND ci.type = $type';
          params.type = type;
        }
        if (status) {
          query += ' AND ci.status = $status';
          params.status = status;
        }
        if (environment) {
          query += ' AND ci.environment = $environment';
          params.environment = environment;
        }

        const countQuery = query + ' RETURN count(ci) as total';
        const countResult = await session.run(countQuery, params);
        const totalCount = countResult.records[0].get('total').toNumber();

        query += ' RETURN ci ORDER BY ci.name SKIP $offset LIMIT $limit';
        params.offset = offset;
        params.limit = limit;

        const result = await session.run(query, params);
        const nodes = result.records.map((r) => r.get('ci').properties);

        return { nodes, totalCount };
      } finally {
        await session.close();
      }
    },
    _ciRelationships: async (
      __: any,
      { id, direction = 'both' }: { id: string; direction?: string }
    ) => {
      const neo4jClient = getNeo4jClient();
      return await neo4jClient.getRelationships(id, direction as 'in' | 'out' | 'both');
    },
    _ciImpactAnalysis: async (_: any, { id, depth = 5 }: { id: string; depth?: number }) => {
      const neo4jClient = getNeo4jClient();
      return await neo4jClient.impactAnalysis(id, depth);
    },
    _searchCIs: async (_: any, { query }: { query: string }) => {
      const neo4jClient = getNeo4jClient();
      const session = neo4jClient.getSession();
      try {
        const result = await session.run(
          `
          CALL db.index.fulltext.queryNodes('ci_search', $query)
          YIELD node, score
          RETURN node
          ORDER BY score DESC
          LIMIT 50
          `,
          { query }
        );
        return result.records.map((r) => r.get('node').properties);
      } finally {
        await session.close();
      }
    },
  },
  _Mutation: {
    _createCI: async (_: any, { input }: { input: CIInput }) => {
      const neo4jClient = getNeo4jClient();
      return await neo4jClient.createCI(input);
    },
    _updateCI: async (_: any, { id, input }: { id: string; input: Partial<CI> }) => {
      const neo4jClient = getNeo4jClient();
      return await neo4jClient.updateCI(id, input);
    },
    _deleteCI: async (_: any, { id }: { id: string }) => {
      const neo4jClient = getNeo4jClient();
      const session = neo4jClient.getSession();
      try {
        await session.run('MATCH (ci:CI {id: $id}) DETACH DELETE ci', { id });
        return true;
      } finally {
        await session.close();
      }
    },
    _createRelationship: async (
      __: any,
      { from, to, type }: { from: string; to: string; type: string }
    ) => {
      const neo4jClient = getNeo4jClient();
      const session = neo4jClient.getSession();
      try {
        const result = await session.run(
          `
          MATCH (from:CI {id: $fromId}), (to:CI {id: $toId})
          CREATE (from)-[r:${type}]->(to)
          RETURN from, to, type(r) as relType
          `,
          { fromId: from, toId: to }
        );

        const record = result.records[0];
        return {
          _type: record.get('relType'),
          _from: record.get('from').properties,
          _to: record.get('to').properties,
          _properties: {},
        };
      } finally {
        await session.close();
      }
    },
  },
};

describe('GraphQL API Integration Tests', () => {
  let server: ApolloServer;

  // Setup test containers before all tests
  beforeAll(async () => {
    await startTestContainers();

    // Create Apollo Server
    server = new ApolloServer({
      typeDefs,
      resolvers,
    });

    await server.start();
  }, 120000);

  // Clean databases between tests
  afterEach(async () => {
    await cleanDatabases();
  });

  // Stop containers after all tests
  afterAll(async () => {
    await server.stop();
    await stopTestContainers();
  }, 30000);

  describe('Query: ci - Get single CI', () => {
    it('should retrieve CI by ID', async () => {
      const ciId = uuidv4();

      // Create CI directly in Neo4j
      const neo4jClient = getNeo4jClient();
      const session = neo4jClient.getSession();
      try {
        await session.run(
          `
          CREATE (ci:CI {
            _id: $id,
            _name: $name,
            _type: $type,
            _status: $status,
            _environment: $environment,
            _created_at: datetime(),
            _updated_at: datetime(),
            _discovered_at: datetime()
          })
          RETURN ci
          `,
          {
            _id: ciId,
            _name: 'test-server',
            _type: 'server',
            _status: 'active',
            _environment: 'production',
          }
        );
      } finally {
        await session.close();
      }

      const response = await server.executeOperation({
        _query: `
          query GetCI($id: ID!) {
            ci(id: $id) {
              id
              name
              type
              status
              environment
            }
          }
        `,
        _variables: { id: ciId },
      });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.ci).toMatchObject({
          _id: ciId,
          _name: 'test-server',
          _type: 'server',
          _status: 'active',
          _environment: 'production',
        });
      }
    });

    it('should return null for non-existent CI', async () => {
      const response = await server.executeOperation({
        _query: `
          query GetCI($id: ID!) {
            ci(id: $id) {
              id
              name
            }
          }
        `,
        _variables: { id: 'non-existent-id' },
      });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.data?.ci).toBeNull();
      }
    });
  });

  describe('Query: cis - List CIs', () => {
    beforeEach(async () => {
      // Create test data
      const neo4jClient = getNeo4jClient();
      await neo4jClient.createCI({
        _id: uuidv4(),
        _name: 'web-server-01',
        _type: 'server',
        _status: 'active',
        _environment: 'production',
      });
      await neo4jClient.createCI({
        _id: uuidv4(),
        _name: 'web-server-02',
        _type: 'server',
        _status: 'active',
        _environment: 'production',
      });
      await neo4jClient.createCI({
        _id: uuidv4(),
        _name: 'database-01',
        _type: 'database',
        _status: 'active',
        _environment: 'production',
      });
    });

    it('should list all CIs', async () => {
      const response = await server.executeOperation({
        _query: `
          query ListCIs {
            cis {
              nodes {
                id
                name
                type
              }
              totalCount
            }
          }
        `,
      });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.cis.nodes).toHaveLength(3);
        expect(response.body.singleResult.data?.cis.totalCount).toBe(3);
      }
    });

    it('should filter CIs by type', async () => {
      const response = await server.executeOperation({
        _query: `
          query ListCIsByType($type: String) {
            cis(type: $type) {
              nodes {
                id
                name
                type
              }
              totalCount
            }
          }
        `,
        _variables: { type: 'server' },
      });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.data?.cis.nodes).toHaveLength(2);
        expect(response.body.singleResult.data?.cis.totalCount).toBe(2);
        expect(
          response.body.singleResult.data?.cis.nodes.every((ci: CI) => ci.type === 'server')
        ).toBe(true);
      }
    });

    it('should support pagination', async () => {
      const response = await server.executeOperation({
        _query: `
          query ListCIsPaginated($limit: Int, $offset: Int) {
            cis(limit: $limit, offset: $offset) {
              nodes {
                id
                name
              }
              totalCount
            }
          }
        `,
        _variables: { limit: 2, offset: 0 },
      });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.data?.cis.nodes).toHaveLength(2);
        expect(response.body.singleResult.data?.cis.totalCount).toBe(3);
      }
    });
  });

  describe('Mutation: createCI', () => {
    it('should create new CI', async () => {
      const ciId = uuidv4();
      const response = await server.executeOperation({
        _query: `
          mutation CreateCI($input: CIInput!) {
            createCI(input: $input) {
              id
              name
              type
              status
              environment
            }
          }
        `,
        _variables: {
          _input: {
            _id: ciId,
            _name: 'new-server',
            _type: 'server',
            _status: 'active',
            _environment: 'production',
            _metadata: { region: 'us-east-1' },
          },
        },
      });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.createCI).toMatchObject({
          _id: ciId,
          _name: 'new-server',
          _type: 'server',
          _status: 'active',
          _environment: 'production',
        });
      }
    });

    it('should handle metadata in CI creation', async () => {
      const ciId = uuidv4();
      const metadata = {
        _ip_address: '10.0.1.100',
        _hostname: 'server01.example.com',
        _cpu_cores: 8,
      };

      const response = await server.executeOperation({
        _query: `
          mutation CreateCI($input: CIInput!) {
            createCI(input: $input) {
              id
              name
              metadata
            }
          }
        `,
        _variables: {
          _input: {
            _id: ciId,
            _name: 'metadata-server',
            _type: 'server',
            metadata,
          },
        },
      });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.data?.createCI.metadata).toMatchObject(metadata);
      }
    });
  });

  describe('Mutation: updateCI', () => {
    it('should update existing CI', async () => {
      const ciId = uuidv4();

      // Create CI first
      const neo4jClient = getNeo4jClient();
      await neo4jClient.createCI({
        _id: ciId,
        _name: 'original-name',
        _type: 'server',
        _status: 'active',
      });

      // Update CI
      const response = await server.executeOperation({
        _query: `
          mutation UpdateCI($id: ID!, $input: CIUpdateInput!) {
            updateCI(id: $id, input: $input) {
              id
              name
              status
              metadata
            }
          }
        `,
        _variables: {
          _id: ciId,
          _input: {
            _name: 'updated-name',
            _status: 'maintenance',
            _metadata: { updated: true },
          },
        },
      });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.updateCI).toMatchObject({
          _id: ciId,
          _name: 'updated-name',
          _status: 'maintenance',
          _metadata: { updated: true },
        });
      }
    });
  });

  describe('Mutation: deleteCI', () => {
    it('should delete existing CI', async () => {
      const ciId = uuidv4();

      // Create CI first
      const neo4jClient = getNeo4jClient();
      await neo4jClient.createCI({
        _id: ciId,
        _name: 'to-delete',
        _type: 'server',
      });

      // Delete CI
      const response = await server.executeOperation({
        _query: `
          mutation DeleteCI($id: ID!) {
            deleteCI(id: $id)
          }
        `,
        _variables: { id: ciId },
      });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.data?.deleteCI).toBe(true);
      }

      // Verify deletion
      const ci = await neo4jClient.getCI(ciId);
      expect(ci).toBeNull();
    });
  });

  describe('Relationships and Impact Analysis', () => {
    let serverId: string;
    let appId: string;
    let dbId: string;

    beforeEach(async () => {
      serverId = uuidv4();
      appId = uuidv4();
      dbId = uuidv4();

      const neo4jClient = getNeo4jClient();

      // Create CIs
      await neo4jClient.createCI({
        _id: serverId,
        _name: 'app-server',
        _type: 'server',
        _status: 'active',
      });

      await neo4jClient.createCI({
        _id: appId,
        _name: 'web-app',
        _type: 'application',
        _status: 'active',
      });

      await neo4jClient.createCI({
        _id: dbId,
        _name: 'postgres-db',
        _type: 'database',
        _status: 'active',
      });

      // Create relationships
      const session = neo4jClient.getSession();
      try {
        await session.run(
          `
          MATCH (from:CI {id: $fromId}), (to:CI {id: $toId})
          CREATE (from)-[r:HOSTS]->(to)
          `,
          { fromId: serverId, toId: appId }
        );

        await session.run(
          `
          MATCH (from:CI {id: $fromId}), (to:CI {id: $toId})
          CREATE (from)-[r:USES]->(to)
          `,
          { fromId: appId, toId: dbId }
        );
      } finally {
        await session.close();
      }
    });

    it('should create relationship between CIs', async () => {
      const newServerId = uuidv4();
      const newAppId = uuidv4();

      const neo4jClient = getNeo4jClient();
      await neo4jClient.createCI({ id: newServerId, name: 'new-server', type: 'server' });
      await neo4jClient.createCI({ id: newAppId, name: 'new-app', type: 'application' });

      const response = await server.executeOperation({
        _query: `
          mutation CreateRelationship($from: ID!, $to: ID!, $type: String!) {
            createRelationship(from: $from, to: $to, type: $type) {
              type
              from {
                id
                name
              }
              to {
                id
                name
              }
            }
          }
        `,
        _variables: {
          _from: newServerId,
          _to: newAppId,
          _type: 'HOSTS',
        },
      });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.createRelationship).toMatchObject({
          _type: 'HOSTS',
          _from: { id: newServerId },
          _to: { id: newAppId },
        });
      }
    });

    it('should query CI relationships', async () => {
      const response = await server.executeOperation({
        _query: `
          query GetRelationships($id: ID!, $direction: String) {
            ciRelationships(id: $id, direction: $direction) {
              type
              from {
                id
                name
              }
              to {
                id
                name
              }
            }
          }
        `,
        _variables: { id: serverId, direction: 'out' },
      });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.ciRelationships).toBeInstanceOf(Array);
        expect(response.body.singleResult.data?.ciRelationships.length).toBeGreaterThan(0);
      }
    });

    it('should perform impact analysis', async () => {
      const response = await server.executeOperation({
        _query: `
          query ImpactAnalysis($id: ID!, $depth: Int) {
            ciImpactAnalysis(id: $id, depth: $depth) {
              id
              name
              type
            }
          }
        `,
        _variables: { id: dbId, depth: 3 },
      });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.ciImpactAnalysis).toBeInstanceOf(Array);
        // Database impacts app and server
        expect(response.body.singleResult.data?.ciImpactAnalysis.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Query: searchCIs', () => {
    beforeEach(async () => {
      const neo4jClient = getNeo4jClient();

      await neo4jClient.createCI({
        _id: uuidv4(),
        _name: 'production-web-server',
        _type: 'server',
        _external_id: 'i-prod-web-001',
      });

      await neo4jClient.createCI({
        _id: uuidv4(),
        _name: 'production-database',
        _type: 'database',
        _external_id: 'db-prod-001',
      });

      await neo4jClient.createCI({
        _id: uuidv4(),
        _name: 'staging-app',
        _type: 'application',
      });

      // Wait for fulltext index
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    it('should search CIs by name', async () => {
      const response = await server.executeOperation({
        _query: `
          query SearchCIs($query: String!) {
            searchCIs(query: $query) {
              id
              name
              type
            }
          }
        `,
        _variables: { query: 'production' },
      });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.searchCIs).toBeInstanceOf(Array);
        expect(response.body.singleResult.data?.searchCIs.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('should search CIs by type', async () => {
      const response = await server.executeOperation({
        _query: `
          query SearchCIs($query: String!) {
            searchCIs(query: $query) {
              id
              name
              type
            }
          }
        `,
        _variables: { query: 'database' },
      });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.data?.searchCIs.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Complex Workflow', () => {
    it('should support complete GraphQL workflow', async () => {
      const serverId = uuidv4();
      const appId = uuidv4();

      // 1. Create server CI
      const createServerResponse = await server.executeOperation({
        _query: `
          mutation CreateCI($input: CIInput!) {
            createCI(input: $input) {
              id
              name
              type
              status
            }
          }
        `,
        _variables: {
          _input: {
            _id: serverId,
            _name: 'workflow-server',
            _type: 'server',
            _status: 'active',
            _environment: 'production',
          },
        },
      });

      expect(createServerResponse.body.kind).toBe('single');

      // 2. Create app CI
      const createAppResponse = await server.executeOperation({
        _query: `
          mutation CreateCI($input: CIInput!) {
            createCI(input: $input) {
              id
              name
            }
          }
        `,
        _variables: {
          _input: {
            _id: appId,
            _name: 'workflow-app',
            _type: 'application',
            _status: 'active',
          },
        },
      });

      expect(createAppResponse.body.kind).toBe('single');

      // 3. Create relationship
      const createRelResponse = await server.executeOperation({
        _query: `
          mutation CreateRelationship($from: ID!, $to: ID!, $type: String!) {
            createRelationship(from: $from, to: $to, type: $type) {
              type
            }
          }
        `,
        _variables: {
          _from: serverId,
          _to: appId,
          _type: 'HOSTS',
        },
      });

      expect(createRelResponse.body.kind).toBe('single');

      // 4. Query relationships
      const queryRelResponse = await server.executeOperation({
        _query: `
          query GetRelationships($id: ID!) {
            ciRelationships(id: $id) {
              type
              to {
                name
              }
            }
          }
        `,
        _variables: { id: serverId },
      });

      expect(queryRelResponse.body.kind).toBe('single');
      if (queryRelResponse.body.kind === 'single') {
        expect(queryRelResponse.body.singleResult.data?.ciRelationships.length).toBeGreaterThan(0);
      }

      // 5. Update server status
      const updateResponse = await server.executeOperation({
        _query: `
          mutation UpdateCI($id: ID!, $input: CIUpdateInput!) {
            updateCI(id: $id, input: $input) {
              id
              status
            }
          }
        `,
        _variables: {
          _id: serverId,
          _input: { status: 'maintenance' },
        },
      });

      expect(updateResponse.body.kind).toBe('single');
      if (updateResponse.body.kind === 'single') {
        expect(updateResponse.body.singleResult.data?.updateCI.status).toBe('maintenance');
      }

      // 6. Delete CIs
      await server.executeOperation({
        _query: `
          mutation DeleteCI($id: ID!) {
            deleteCI(id: $id)
          }
        `,
        _variables: { id: appId },
      });

      await server.executeOperation({
        _query: `
          mutation DeleteCI($id: ID!) {
            deleteCI(id: $id)
          }
        `,
        _variables: { id: serverId },
      });

      // 7. Verify deletion
      const verifyResponse = await server.executeOperation({
        _query: `
          query GetCI($id: ID!) {
            ci(id: $id) {
              id
            }
          }
        `,
        _variables: { id: serverId },
      });

      expect(verifyResponse.body.kind).toBe('single');
      if (verifyResponse.body.kind === 'single') {
        expect(verifyResponse.body.singleResult.data?.ci).toBeNull();
      }
    });
  });
});
