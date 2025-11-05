/**
 * Integration Tests - CI REST API
 *
 * Tests the complete CRUD flow for Configuration Items through the REST API.
 * Uses testcontainers for Neo4j and PostgreSQL to ensure realistic testing.
 */

import request from 'supertest';
import express, { Application } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { startTestContainers, stopTestContainers, cleanDatabases, getTestContext } from '../helpers/test-containers';
import { ciRoutes } from '../../src/rest/routes/ci.routes';
import { CI, CIInput } from '@cmdb/common';

describe('CI REST API Integration Tests', () => {
  let app: Application;

  // Setup test containers before all tests
  beforeAll(async () => {
    await startTestContainers();

    // Create Express app with CI routes
    app = express();
    app.use(express.json());
    app.use('/api/v1/cis', ciRoutes);
  }, 120000); // 2 minute timeout for container startup

  // Clean databases between tests
  afterEach(async () => {
    await cleanDatabases();
  });

  // Stop containers after all tests
  afterAll(async () => {
    await stopTestContainers();
  }, 30000);

  describe('POST /api/v1/cis - Create CI', () => {
    it('should create a new CI with valid data', async () => {
      const ciData: CIInput = {
        _id: uuidv4(),
        _name: 'web-server-01',
        _type: 'server',
        _status: 'active',
        _environment: 'production',
        _metadata: {
          _ip_address: '10.0.1.100',
          _hostname: 'web01.example.com',
          _os: 'Ubuntu 22.04',
        },
      };

      const response = await request(app)
        .post('/api/v1/cis')
        .send(ciData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        _id: ciData.id,
        _name: ciData.name,
        _type: ciData.type,
        _status: ciData.status,
        _environment: ciData.environment,
      });
      expect(response.body.data).toHaveProperty('created_at');
      expect(response.body.data).toHaveProperty('updated_at');
    });

    it('should reject CI with missing required fields', async () => {
      const invalidData = {
        _name: 'incomplete-server',
        // Missing id and type
      };

      const response = await request(app)
        .post('/api/v1/cis')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject CI with duplicate ID', async () => {
      const ciData: CIInput = {
        _id: 'duplicate-id',
        _name: 'server-01',
        _type: 'server',
      };

      // Create first CI
      await request(app).post('/api/v1/cis').send(ciData).expect(201);

      // Attempt to create duplicate
      const response = await request(app)
        .post('/api/v1/cis')
        .send(ciData)
        .expect(409);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toBe('Conflict');
    });

    it('should create CI with default status when not provided', async () => {
      const ciData: CIInput = {
        _id: uuidv4(),
        _name: 'test-server',
        _type: 'virtual-machine',
        // status not provided, should default to 'active'
      };

      const response = await request(app)
        .post('/api/v1/cis')
        .send(ciData)
        .expect(201);

      expect(response.body.data.status).toBe('active');
    });
  });

  describe('GET /api/v1/cis/:id - Get CI by ID', () => {
    it('should retrieve existing CI by ID', async () => {
      const ciData: CIInput = {
        _id: uuidv4(),
        _name: 'database-server',
        _type: 'database',
        _status: 'active',
        _environment: 'production',
      };

      // Create CI first
      await request(app).post('/api/v1/cis').send(ciData).expect(201);

      // Retrieve CI
      const response = await request(app)
        .get(`/api/v1/cis/${ciData.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toMatchObject({
        _id: ciData.id,
        _name: ciData.name,
        _type: ciData.type,
      });
    });

    it('should return 404 for non-existent CI', async () => {
      const nonExistentId = uuidv4();

      const response = await request(app)
        .get(`/api/v1/cis/${nonExistentId}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toBe('Not Found');
    });
  });

  describe('GET /api/v1/cis - List CIs with filtering', () => {
    beforeEach(async () => {
      // Create test data
      const testCIs: CIInput[] = [
        {
          _id: uuidv4(),
          _name: 'web-server-01',
          _type: 'server',
          _status: 'active',
          _environment: 'production',
        },
        {
          _id: uuidv4(),
          _name: 'web-server-02',
          _type: 'server',
          _status: 'active',
          _environment: 'production',
        },
        {
          _id: uuidv4(),
          _name: 'db-server-01',
          _type: 'database',
          _status: 'active',
          _environment: 'production',
        },
        {
          _id: uuidv4(),
          _name: 'staging-app-01',
          _type: 'application',
          _status: 'active',
          _environment: 'staging',
        },
        {
          _id: uuidv4(),
          _name: 'old-server',
          _type: 'server',
          _status: 'decommissioned',
          _environment: 'production',
        },
      ];

      for (const ci of testCIs) {
        await request(app).post('/api/v1/cis').send(ci);
      }
    });

    it('should retrieve all CIs without filters', async () => {
      const response = await request(app).get('/api/v1/cis').expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveLength(5);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination.total).toBe(5);
    });

    it('should filter CIs by type', async () => {
      const response = await request(app)
        .get('/api/v1/cis')
        .query({ type: 'server' })
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      expect(response.body.data.every((ci: CI) => ci.type === 'server')).toBe(true);
    });

    it('should filter CIs by environment', async () => {
      const response = await request(app)
        .get('/api/v1/cis')
        .query({ environment: 'staging' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].environment).toBe('staging');
    });

    it('should filter CIs by status', async () => {
      const response = await request(app)
        .get('/api/v1/cis')
        .query({ status: 'decommissioned' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('decommissioned');
    });

    it('should support pagination with limit and offset', async () => {
      const response = await request(app)
        .get('/api/v1/cis')
        .query({ limit: 2, offset: 0 })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.offset).toBe(0);
    });

    it('should support multiple filters', async () => {
      const response = await request(app)
        .get('/api/v1/cis')
        .query({ type: 'server', status: 'active', environment: 'production' })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(
        response.body.data.every(
          (ci: CI) =>
            ci.type === 'server' &&
            ci.status === 'active' &&
            ci.environment === 'production'
        )
      ).toBe(true);
    });
  });

  describe('PUT /api/v1/cis/:id - Update CI', () => {
    it('should update existing CI', async () => {
      const ciData: CIInput = {
        _id: uuidv4(),
        _name: 'app-server',
        _type: 'application',
        _status: 'active',
      };

      // Create CI
      await request(app).post('/api/v1/cis').send(ciData).expect(201);

      // Update CI
      const updateData = {
        _status: 'maintenance',
        _metadata: {
          _maintenance_window: '2025-10-01T00:00:00Z',
        },
      };

      const response = await request(app)
        .put(`/api/v1/cis/${ciData.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.status).toBe('maintenance');
      expect(response.body.data.metadata.maintenance_window).toBe('2025-10-01T00:00:00Z');
    });

    it('should return 404 when updating non-existent CI', async () => {
      const nonExistentId = uuidv4();

      const response = await request(app)
        .put(`/api/v1/cis/${nonExistentId}`)
        .send({ status: 'inactive' })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toBe('Not Found');
    });
  });

  describe('DELETE /api/v1/cis/:id - Delete CI', () => {
    it('should delete existing CI', async () => {
      const ciData: CIInput = {
        _id: uuidv4(),
        _name: 'temp-server',
        _type: 'server',
      };

      // Create CI
      await request(app).post('/api/v1/cis').send(ciData).expect(201);

      // Delete CI
      await request(app).delete(`/api/v1/cis/${ciData.id}`).expect(204);

      // Verify CI is deleted
      await request(app).get(`/api/v1/cis/${ciData.id}`).expect(404);
    });

    it('should return 404 when deleting non-existent CI', async () => {
      const nonExistentId = uuidv4();

      const response = await request(app)
        .delete(`/api/v1/cis/${nonExistentId}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('CI Relationships', () => {
    let serverId: string;
    let appId: string;
    let dbId: string;

    beforeEach(async () => {
      // Create test CIs
      serverId = uuidv4();
      appId = uuidv4();
      dbId = uuidv4();

      await request(app).post('/api/v1/cis').send({
        _id: serverId,
        _name: 'app-server',
        _type: 'server',
        _status: 'active',
      });

      await request(app).post('/api/v1/cis').send({
        _id: appId,
        _name: 'web-app',
        _type: 'application',
        _status: 'active',
      });

      await request(app).post('/api/v1/cis').send({
        _id: dbId,
        _name: 'postgres-db',
        _type: 'database',
        _status: 'active',
      });

      // Create relationships using Neo4j client
      const { neo4jDriver } = getTestContext();
      const session = neo4jDriver.session();
      try {
        // Server HOSTS Application
        await session.run(
          `
          MATCH (from:CI {id: $fromId}), (to:CI {id: $toId})
          CREATE (from)-[r:HOSTS]->(to)
          RETURN r
          `,
          { fromId: serverId, toId: appId }
        );

        // Application USES Database
        await session.run(
          `
          MATCH (from:CI {id: $fromId}), (to:CI {id: $toId})
          CREATE (from)-[r:USES]->(to)
          RETURN r
          `,
          { fromId: appId, toId: dbId }
        );
      } finally {
        await session.close();
      }
    });

    it('should retrieve CI relationships', async () => {
      const response = await request(app)
        .get(`/api/v1/cis/${serverId}/relationships`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should retrieve outbound relationships only', async () => {
      const response = await request(app)
        .get(`/api/v1/cis/${serverId}/relationships`)
        .query({ direction: 'out' })
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      // Server has outbound HOSTS relationship to app
      expect(response.body.data.some((rel: any) => rel.type === 'HOSTS')).toBe(true);
    });

    it('should retrieve CI dependencies', async () => {
      const response = await request(app)
        .get(`/api/v1/cis/${appId}/dependencies`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should perform impact analysis', async () => {
      // Impact analysis from database should show app and server
      const response = await request(app)
        .get(`/api/v1/cis/${dbId}/impact`)
        .query({ depth: 3 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/v1/cis/search - Search CIs', () => {
    beforeEach(async () => {
      // Create searchable test data
      await request(app).post('/api/v1/cis').send({
        _id: uuidv4(),
        _name: 'production-web-server',
        _type: 'server',
        _external_id: 'i-1234567890abcdef0',
        _metadata: { region: 'us-east-1' },
      });

      await request(app).post('/api/v1/cis').send({
        _id: uuidv4(),
        _name: 'production-database',
        _type: 'database',
        _external_id: 'db-abcdef123456',
      });

      await request(app).post('/api/v1/cis').send({
        _id: uuidv4(),
        _name: 'staging-app',
        _type: 'application',
      });

      // Wait for Neo4j fulltext index to update
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    it('should search CIs by name', async () => {
      const response = await request(app)
        .post('/api/v1/cis/search')
        .send({ query: 'production' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      expect(response.body.data[0]).toHaveProperty('score');
    });

    it('should search CIs by type', async () => {
      const response = await request(app)
        .post('/api/v1/cis/search')
        .send({ query: 'database' })
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data.some((item: any) => item.ci.type === 'database')).toBe(true);
    });

    it('should search CIs by external_id', async () => {
      const response = await request(app)
        .post('/api/v1/cis/search')
        .send({ query: 'i-1234567890abcdef0' })
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(
        response.body.data.some((item: any) => item.ci.external_id === 'i-1234567890abcdef0')
      ).toBe(true);
    });
  });

  describe('Complete CRUD Flow', () => {
    it('should support full lifecycle of a CI', async () => {
      const ciId = uuidv4();

      // 1. Create CI
      const createResponse = await request(app)
        .post('/api/v1/cis')
        .send({
          _id: ciId,
          _name: 'lifecycle-test-server',
          _type: 'server',
          _status: 'active',
          _environment: 'development',
          _metadata: { version: '1.0' },
        })
        .expect(201);

      expect(createResponse.body.success).toBe(true);

      // 2. Read CI
      const readResponse = await request(app).get(`/api/v1/cis/${ciId}`).expect(200);

      expect(readResponse.body.data.name).toBe('lifecycle-test-server');

      // 3. Update CI
      const updateResponse = await request(app)
        .put(`/api/v1/cis/${ciId}`)
        .send({
          _status: 'maintenance',
          _metadata: { version: '1.1', maintenance_mode: true },
        })
        .expect(200);

      expect(updateResponse.body.data.status).toBe('maintenance');
      expect(updateResponse.body.data.metadata.version).toBe('1.1');

      // 4. Verify update persisted
      const verifyResponse = await request(app).get(`/api/v1/cis/${ciId}`).expect(200);

      expect(verifyResponse.body.data.status).toBe('maintenance');

      // 5. Delete CI
      await request(app).delete(`/api/v1/cis/${ciId}`).expect(204);

      // 6. Verify deletion
      await request(app).get(`/api/v1/cis/${ciId}`).expect(404);
    });
  });
});
