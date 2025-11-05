/**
 * Neo4j Integration Tests
 *
 * Tests real database operations with Testcontainers.
 * These tests verify actual Neo4j driver behavior and Cypher queries.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import neo4j, { Driver, Session } from 'neo4j-driver';

describe('Neo4j Integration Tests', () => {
  let driver: Driver;
  let session: Session;

  beforeAll(async () => {
    // Connect to Neo4j test container (configured in global setup)
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const username = process.env.NEO4J_USERNAME || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'testpassword';

    driver = neo4j.driver(uri, neo4j.auth.basic(username, password));

    // Verify connection
    await driver.verifyConnectivity();
  });

  afterAll(async () => {
    await driver.close();
  });

  beforeEach(async () => {
    session = driver.session();

    // Clean database before each test
    await session.run('MATCH (n) DETACH DELETE n');
  });

  afterEach(async () => {
    await session.close();
  });

  describe('CI Node Operations', () => {
    it('should create CI node with properties', async () => {
      // Arrange
      const ciData = {
        id: 'ci-test-1',
        name: 'test-server',
        type: 'server',
        status: 'active',
        environment: 'production',
        created_at: new Date().toISOString(),
      };

      // Act: Create node
      const createResult = await session.run(
        `
        CREATE (ci:CI {
          id: $id,
          name: $name,
          type: $type,
          status: $status,
          environment: $environment,
          created_at: datetime($created_at)
        })
        RETURN ci
        `,
        ciData
      );

      // Assert: Node created
      expect(createResult.records).toHaveLength(1);
      const createdNode = createResult.records[0].get('ci');
      expect(createdNode.properties.id).toBe(ciData.id);
      expect(createdNode.properties.name).toBe(ciData.name);
      expect(createdNode.properties.type).toBe(ciData.type);

      // Verify: Query node back
      const findResult = await session.run(
        'MATCH (ci:CI {id: $id}) RETURN ci',
        { id: ciData.id }
      );

      expect(findResult.records).toHaveLength(1);
      expect(findResult.records[0].get('ci').properties.name).toBe('test-server');
    });

    it('should update CI node properties', async () => {
      // Arrange: Create initial node
      await session.run(
        `
        CREATE (ci:CI {
          id: 'ci-update-test',
          name: 'old-name',
          status: 'active'
        })
        `,
        {}
      );

      // Act: Update node
      const updateResult = await session.run(
        `
        MATCH (ci:CI {id: $id})
        SET ci.name = $newName,
            ci.updated_at = datetime()
        RETURN ci
        `,
        { id: 'ci-update-test', newName: 'new-name' }
      );

      // Assert: Node updated
      expect(updateResult.records).toHaveLength(1);
      const updatedNode = updateResult.records[0].get('ci');
      expect(updatedNode.properties.name).toBe('new-name');
      expect(updatedNode.properties.updated_at).toBeDefined();
    });

    it('should delete CI node', async () => {
      // Arrange: Create node
      await session.run(
        'CREATE (ci:CI {id: $id, name: $name})',
        { id: 'ci-delete-test', name: 'to-delete' }
      );

      // Act: Delete node
      const deleteResult = await session.run(
        'MATCH (ci:CI {id: $id}) DELETE ci RETURN count(ci) as deleted',
        { id: 'ci-delete-test' }
      );

      // Assert: Node deleted
      expect(deleteResult.records[0].get('deleted').toNumber()).toBe(1);

      // Verify: Node no longer exists
      const findResult = await session.run(
        'MATCH (ci:CI {id: $id}) RETURN ci',
        { id: 'ci-delete-test' }
      );

      expect(findResult.records).toHaveLength(0);
    });
  });

  describe('Relationship Operations', () => {
    it('should create relationship between CI nodes', async () => {
      // Arrange: Create two nodes
      await session.run(
        `
        CREATE (ci1:CI {id: 'ci-1', name: 'app-server'})
        CREATE (ci2:CI {id: 'ci-2', name: 'database'})
        `,
        {}
      );

      // Act: Create relationship
      const relResult = await session.run(
        `
        MATCH (from:CI {id: $fromId})
        MATCH (to:CI {id: $toId})
        CREATE (from)-[r:DEPENDS_ON {created_at: datetime()}]->(to)
        RETURN r
        `,
        { fromId: 'ci-1', toId: 'ci-2' }
      );

      // Assert: Relationship created
      expect(relResult.records).toHaveLength(1);
      const relationship = relResult.records[0].get('r');
      expect(relationship.type).toBe('DEPENDS_ON');

      // Verify: Query relationship
      const findResult = await session.run(
        `
        MATCH (from:CI {id: $fromId})-[r:DEPENDS_ON]->(to:CI {id: $toId})
        RETURN from, r, to
        `,
        { fromId: 'ci-1', toId: 'ci-2' }
      );

      expect(findResult.records).toHaveLength(1);
      expect(findResult.records[0].get('from').properties.id).toBe('ci-1');
      expect(findResult.records[0].get('to').properties.id).toBe('ci-2');
    });

    it('should traverse dependency graph', async () => {
      // Arrange: Create dependency chain: A -> B -> C -> D
      await session.run(
        `
        CREATE (a:CI {id: 'ci-a', name: 'A'})
        CREATE (b:CI {id: 'ci-b', name: 'B'})
        CREATE (c:CI {id: 'ci-c', name: 'C'})
        CREATE (d:CI {id: 'ci-d', name: 'D'})
        CREATE (a)-[:DEPENDS_ON]->(b)
        CREATE (b)-[:DEPENDS_ON]->(c)
        CREATE (c)-[:DEPENDS_ON]->(d)
        `,
        {}
      );

      // Act: Traverse all dependencies of A
      const result = await session.run(
        `
        MATCH path = (ci:CI {id: $id})-[:DEPENDS_ON*1..10]->(dep:CI)
        RETURN DISTINCT dep.id as depId, length(path) as distance
        ORDER BY distance
        `,
        { id: 'ci-a' }
      );

      // Assert: All dependencies found with correct distance
      expect(result.records).toHaveLength(3);
      expect(result.records[0].get('depId')).toBe('ci-b'); // Distance 1
      expect(result.records[0].get('distance').toNumber()).toBe(1);
      expect(result.records[1].get('depId')).toBe('ci-c'); // Distance 2
      expect(result.records[1].get('distance').toNumber()).toBe(2);
      expect(result.records[2].get('depId')).toBe('ci-d'); // Distance 3
      expect(result.records[2].get('distance').toNumber()).toBe(3);
    });

    it('should perform impact analysis (reverse dependencies)', async () => {
      // Arrange: Create impact graph: D <- C <- B <- A
      await session.run(
        `
        CREATE (a:CI {id: 'ci-a', name: 'A'})
        CREATE (b:CI {id: 'ci-b', name: 'B'})
        CREATE (c:CI {id: 'ci-c', name: 'C'})
        CREATE (d:CI {id: 'ci-d', name: 'D'})
        CREATE (a)-[:DEPENDS_ON]->(b)
        CREATE (b)-[:DEPENDS_ON]->(c)
        CREATE (c)-[:DEPENDS_ON]->(d)
        `,
        {}
      );

      // Act: Find all CIs impacted if D fails (reverse dependencies)
      const result = await session.run(
        `
        MATCH path = (ci:CI {id: $id})<-[:DEPENDS_ON*1..10]-(impacted:CI)
        RETURN DISTINCT impacted.id as impactedId, length(path) as distance
        ORDER BY distance
        `,
        { id: 'ci-d' } // Start from D
      );

      // Assert: All impacted CIs found
      expect(result.records).toHaveLength(3);
      expect(result.records[0].get('impactedId')).toBe('ci-c'); // Distance 1
      expect(result.records[1].get('impactedId')).toBe('ci-b'); // Distance 2
      expect(result.records[2].get('impactedId')).toBe('ci-a'); // Distance 3
    });
  });

  describe('Query Performance and Indexing', () => {
    it('should efficiently query CIs by type', async () => {
      // Arrange: Create multiple CIs of different types
      await session.run(
        `
        CREATE (s1:CI {id: 'server-1', type: 'server', name: 'Server 1'})
        CREATE (s2:CI {id: 'server-2', type: 'server', name: 'Server 2'})
        CREATE (d1:CI {id: 'db-1', type: 'database', name: 'Database 1'})
        CREATE (d2:CI {id: 'db-2', type: 'database', name: 'Database 2'})
        CREATE (a1:CI {id: 'app-1', type: 'application', name: 'App 1'})
        `,
        {}
      );

      // Act: Query by type
      const startTime = Date.now();
      const result = await session.run(
        'MATCH (ci:CI) WHERE ci.type = $type RETURN ci',
        { type: 'server' }
      );
      const duration = Date.now() - startTime;

      // Assert: Correct results
      expect(result.records).toHaveLength(2);

      // Assert: Query should be fast (< 100ms even without index)
      expect(duration).toBeLessThan(100);
    });

    it('should support full-text search on CI names', async () => {
      // Arrange: Create CIs with searchable names
      await session.run(
        `
        CREATE (ci1:CI {id: 'ci-1', name: 'production-web-server-01'})
        CREATE (ci2:CI {id: 'ci-2', name: 'production-api-server-02'})
        CREATE (ci3:CI {id: 'ci-3', name: 'staging-web-server-01'})
        CREATE (ci4:CI {id: 'ci-4', name: 'test-database-server-01'})
        `,
        {}
      );

      // Act: Search for CIs containing "production" and "web"
      const result = await session.run(
        `
        MATCH (ci:CI)
        WHERE ci.name CONTAINS $keyword1 AND ci.name CONTAINS $keyword2
        RETURN ci
        `,
        { keyword1: 'production', keyword2: 'web' }
      );

      // Assert: Only production web server found
      expect(result.records).toHaveLength(1);
      expect(result.records[0].get('ci').properties.id).toBe('ci-1');
    });
  });

  describe('Transaction Handling', () => {
    it('should rollback transaction on error', async () => {
      const txSession = driver.session();

      try {
        const tx = txSession.beginTransaction();

        // Act: Create node in transaction
        await tx.run(
          'CREATE (ci:CI {id: $id, name: $name})',
          { id: 'tx-test', name: 'Test Node' }
        );

        // Verify: Node exists in transaction context
        const checkResult = await tx.run(
          'MATCH (ci:CI {id: $id}) RETURN ci',
          { id: 'tx-test' }
        );
        expect(checkResult.records).toHaveLength(1);

        // Rollback transaction
        await tx.rollback();

        // Assert: Node should not exist after rollback
        const verifyResult = await session.run(
          'MATCH (ci:CI {id: $id}) RETURN ci',
          { id: 'tx-test' }
        );
        expect(verifyResult.records).toHaveLength(0);
      } finally {
        await txSession.close();
      }
    });

    it('should commit transaction successfully', async () => {
      const txSession = driver.session();

      try {
        const tx = txSession.beginTransaction();

        // Act: Create multiple nodes in transaction
        await tx.run(
          `
          CREATE (ci1:CI {id: 'tx-ci-1', name: 'TX Node 1'})
          CREATE (ci2:CI {id: 'tx-ci-2', name: 'TX Node 2'})
          `,
          {}
        );

        // Commit transaction
        await tx.commit();

        // Assert: Nodes should exist after commit
        const verifyResult = await session.run(
          'MATCH (ci:CI) WHERE ci.id IN [$id1, $id2] RETURN ci',
          { id1: 'tx-ci-1', id2: 'tx-ci-2' }
        );
        expect(verifyResult.records).toHaveLength(2);
      } finally {
        await txSession.close();
      }
    });
  });
});
