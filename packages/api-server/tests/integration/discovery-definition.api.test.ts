/**
 * Integration Tests - Discovery Definition REST API
 *
 * Tests the complete CRUD flow for Discovery Definitions through the REST API.
 * Uses testcontainers for PostgreSQL and Redis to ensure realistic testing.
 */

import request from 'supertest';
import express, { Application } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { startTestContainers, stopTestContainers, cleanDatabases, getTestContext } from '../helpers/test-containers';
import { discoveryDefinitionRoutes } from '../../src/rest/routes/discovery-definition.routes';
import { DiscoveryDefinitionInput } from '@cmdb/common';

describe('Discovery Definition REST API Integration Tests', () => {
  let app: Application;
  let testCredentialId: string;

  // Setup test containers before all tests
  beforeAll(async () => {
    await startTestContainers();

    // Create Express app with discovery definition routes
    app = express();
    app.use(express.json());

    // Mock user middleware for created_by field
    app.use((req: any, res, next) => {
      req.user = { id: 'test-user-123', username: 'testuser' };
      next();
    });

    app.use('/api/v1/discovery/definitions', discoveryDefinitionRoutes);

    // Create a test credential to use in definitions
    const { postgresClient } = getTestContext();
    const pool = postgresClient['pool'];
    const result = await pool.query(
      `INSERT INTO credentials (id, name, type, credentials, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        uuidv4(),
        'Test AWS Credentials',
        'aws',
        JSON.stringify({ accessKeyId: 'test-key', secretAccessKey: 'test-secret' }),
        'test-user-123',
        new Date().toISOString(),
        new Date().toISOString(),
      ]
    );
    testCredentialId = result.rows[0].id;
  }, 120000); // 2 minute timeout for container startup

  // Clean databases between tests
  afterEach(async () => {
    const { postgresClient } = getTestContext();
    const pool = postgresClient['pool'];
    // Clean only discovery definitions, keep test credential
    await pool.query('DELETE FROM discovery_definitions');
  });

  // Stop containers after all tests
  afterAll(async () => {
    await stopTestContainers();
  }, 30000);

  describe('POST /api/v1/discovery/definitions - Create Definition', () => {
    it('should create a new discovery definition with valid data', async () => {
      const definitionData: DiscoveryDefinitionInput = {
        name: 'AWS Production Discovery',
        description: 'Daily discovery of AWS production resources',
        provider: 'aws',
        method: 'agentless',
        credential_id: testCredentialId,
        config: {
          regions: ['us-east-1', 'us-west-2'],
          filters: { environment: 'production' },
        },
        schedule: '0 2 * * *', // Daily at 2 AM
        is_active: true,
        tags: ['production', 'aws'],
      };

      const response = await request(app)
        .post('/api/v1/discovery/definitions')
        .send(definitionData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        name: definitionData.name,
        description: definitionData.description,
        provider: definitionData.provider,
        method: definitionData.method,
        credential_id: definitionData.credential_id,
        schedule: definitionData.schedule,
        is_active: true,
        tags: definitionData.tags,
      });
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('created_at');
      expect(response.body.data).toHaveProperty('updated_at');
      expect(response.body.data).toHaveProperty('created_by', 'test-user-123');
    });

    it('should reject definition with invalid credential_id', async () => {
      const definitionData: DiscoveryDefinitionInput = {
        name: 'Invalid Credential Test',
        provider: 'aws',
        method: 'agentless',
        credential_id: uuidv4(), // Non-existent credential
        config: {},
      };

      const response = await request(app)
        .post('/api/v1/discovery/definitions')
        .send(definitionData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Credential');
    });

    it('should reject definition with missing required fields', async () => {
      const invalidData = {
        name: 'Incomplete Definition',
        // Missing provider, method, credential_id
      };

      const response = await request(app)
        .post('/api/v1/discovery/definitions')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should create definition with minimal required fields', async () => {
      const definitionData: DiscoveryDefinitionInput = {
        name: 'Minimal Definition',
        provider: 'ssh',
        method: 'agentless',
        credential_id: testCredentialId,
        config: {},
      };

      const response = await request(app)
        .post('/api/v1/discovery/definitions')
        .send(definitionData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toMatchObject({
        name: definitionData.name,
        provider: definitionData.provider,
        is_active: true, // Default value
        tags: [],
      });
    });
  });

  describe('GET /api/v1/discovery/definitions - List Definitions', () => {
    it('should list all discovery definitions', async () => {
      // Create two definitions
      const def1: DiscoveryDefinitionInput = {
        name: 'AWS Discovery',
        provider: 'aws',
        method: 'agentless',
        credential_id: testCredentialId,
        config: {},
      };

      const def2: DiscoveryDefinitionInput = {
        name: 'Azure Discovery',
        provider: 'azure',
        method: 'agentless',
        credential_id: testCredentialId,
        config: {},
        is_active: false,
      };

      await request(app).post('/api/v1/discovery/definitions').send(def1);
      await request(app).post('/api/v1/discovery/definitions').send(def2);

      const response = await request(app)
        .get('/api/v1/discovery/definitions')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(2);
      expect(response.body).toHaveProperty('count', 2);
    });

    it('should filter definitions by provider', async () => {
      // Create AWS and Azure definitions
      await request(app).post('/api/v1/discovery/definitions').send({
        name: 'AWS Discovery',
        provider: 'aws',
        method: 'agentless',
        credential_id: testCredentialId,
        config: {},
      });

      await request(app).post('/api/v1/discovery/definitions').send({
        name: 'Azure Discovery',
        provider: 'azure',
        method: 'agentless',
        credential_id: testCredentialId,
        config: {},
      });

      const response = await request(app)
        .get('/api/v1/discovery/definitions?provider=aws')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].provider).toBe('aws');
    });

    it('should filter definitions by is_active', async () => {
      await request(app).post('/api/v1/discovery/definitions').send({
        name: 'Active Definition',
        provider: 'aws',
        method: 'agentless',
        credential_id: testCredentialId,
        config: {},
        is_active: true,
      });

      await request(app).post('/api/v1/discovery/definitions').send({
        name: 'Inactive Definition',
        provider: 'aws',
        method: 'agentless',
        credential_id: testCredentialId,
        config: {},
        is_active: false,
      });

      const response = await request(app)
        .get('/api/v1/discovery/definitions?is_active=true')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].is_active).toBe(true);
    });
  });

  describe('GET /api/v1/discovery/definitions/:id - Get Definition', () => {
    it('should get a definition by ID', async () => {
      const createResponse = await request(app)
        .post('/api/v1/discovery/definitions')
        .send({
          name: 'Test Definition',
          provider: 'aws',
          method: 'agentless',
          credential_id: testCredentialId,
          config: {},
        });

      const definitionId = createResponse.body.data.id;

      const response = await request(app)
        .get(`/api/v1/discovery/definitions/${definitionId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toMatchObject({
        id: definitionId,
        name: 'Test Definition',
      });
    });

    it('should return 404 for non-existent definition', async () => {
      const response = await request(app)
        .get(`/api/v1/discovery/definitions/${uuidv4()}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('PUT /api/v1/discovery/definitions/:id - Update Definition', () => {
    it('should update a definition', async () => {
      const createResponse = await request(app)
        .post('/api/v1/discovery/definitions')
        .send({
          name: 'Original Name',
          provider: 'aws',
          method: 'agentless',
          credential_id: testCredentialId,
          config: {},
        });

      const definitionId = createResponse.body.data.id;

      const response = await request(app)
        .put(`/api/v1/discovery/definitions/${definitionId}`)
        .send({
          name: 'Updated Name',
          description: 'New description',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toMatchObject({
        id: definitionId,
        name: 'Updated Name',
        description: 'New description',
      });
    });

    it('should reject update with invalid credential_id', async () => {
      const createResponse = await request(app)
        .post('/api/v1/discovery/definitions')
        .send({
          name: 'Test Definition',
          provider: 'aws',
          method: 'agentless',
          credential_id: testCredentialId,
          config: {},
        });

      const definitionId = createResponse.body.data.id;

      const response = await request(app)
        .put(`/api/v1/discovery/definitions/${definitionId}`)
        .send({
          credential_id: uuidv4(), // Non-existent credential
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Credential');
    });

    it('should return 404 when updating non-existent definition', async () => {
      const response = await request(app)
        .put(`/api/v1/discovery/definitions/${uuidv4()}`)
        .send({
          name: 'Updated Name',
        })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/v1/discovery/definitions/:id - Delete Definition', () => {
    it('should delete a definition', async () => {
      const createResponse = await request(app)
        .post('/api/v1/discovery/definitions')
        .send({
          name: 'To Be Deleted',
          provider: 'aws',
          method: 'agentless',
          credential_id: testCredentialId,
          config: {},
        });

      const definitionId = createResponse.body.data.id;

      await request(app)
        .delete(`/api/v1/discovery/definitions/${definitionId}`)
        .expect(204);

      // Verify it's deleted
      await request(app)
        .get(`/api/v1/discovery/definitions/${definitionId}`)
        .expect(404);
    });

    it('should return 404 when deleting non-existent definition', async () => {
      const response = await request(app)
        .delete(`/api/v1/discovery/definitions/${uuidv4()}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/v1/discovery/definitions/:id/run - Run Definition', () => {
    it('should trigger a discovery job from definition', async () => {
      const createResponse = await request(app)
        .post('/api/v1/discovery/definitions')
        .send({
          name: 'AWS Discovery',
          provider: 'aws',
          method: 'agentless',
          credential_id: testCredentialId,
          config: {
            regions: ['us-east-1'],
          },
        });

      const definitionId = createResponse.body.data.id;

      const response = await request(app)
        .post(`/api/v1/discovery/definitions/${definitionId}/run`)
        .expect(202);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('job_id');
      expect(response.body.data).toHaveProperty('definition_id', definitionId);
      expect(response.body.data).toHaveProperty('provider', 'aws');
      expect(response.body.data).toHaveProperty('status', 'pending');
    });

    it('should return 404 when running non-existent definition', async () => {
      const response = await request(app)
        .post(`/api/v1/discovery/definitions/${uuidv4()}/run`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/v1/discovery/definitions/:id/schedule/enable - Enable Schedule', () => {
    it('should enable schedule for a definition with schedule configured', async () => {
      const createResponse = await request(app)
        .post('/api/v1/discovery/definitions')
        .send({
          name: 'Scheduled Discovery',
          provider: 'aws',
          method: 'agentless',
          credential_id: testCredentialId,
          config: {},
          schedule: '0 2 * * *',
          is_active: false,
        });

      const definitionId = createResponse.body.data.id;

      const response = await request(app)
        .post(`/api/v1/discovery/definitions/${definitionId}/schedule/enable`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.is_active).toBe(true);
    });

    it('should reject enabling schedule when no schedule configured', async () => {
      const createResponse = await request(app)
        .post('/api/v1/discovery/definitions')
        .send({
          name: 'No Schedule',
          provider: 'aws',
          method: 'agentless',
          credential_id: testCredentialId,
          config: {},
          // No schedule provided
        });

      const definitionId = createResponse.body.data.id;

      const response = await request(app)
        .post(`/api/v1/discovery/definitions/${definitionId}/schedule/enable`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('no schedule configured');
    });
  });

  describe('POST /api/v1/discovery/definitions/:id/schedule/disable - Disable Schedule', () => {
    it('should disable schedule for a definition', async () => {
      const createResponse = await request(app)
        .post('/api/v1/discovery/definitions')
        .send({
          name: 'Active Scheduled Discovery',
          provider: 'aws',
          method: 'agentless',
          credential_id: testCredentialId,
          config: {},
          schedule: '0 2 * * *',
          is_active: true,
        });

      const definitionId = createResponse.body.data.id;

      const response = await request(app)
        .post(`/api/v1/discovery/definitions/${definitionId}/schedule/disable`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.is_active).toBe(false);
    });
  });
});
