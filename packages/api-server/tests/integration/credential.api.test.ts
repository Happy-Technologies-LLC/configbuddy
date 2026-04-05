// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Credential API Integration Tests
 *
 * Tests the full CRUD lifecycle of credential management endpoints.
 * Verifies encryption, redaction, and authentication requirements.
 */

import request from 'supertest';
import express from 'express';
import { json } from 'body-parser';
import { credentialRoutes } from '../../src/rest/routes/credential.routes';
import { getPostgresClient, getCredentialService } from '@cmdb/database';
import { getEncryptionService } from '@cmdb/common';

// Setup Express app for testing
const app = express();
app.use(json());

// Mock user middleware
app.use((req: any, _res, next) => {
  req.user = { id: 'test-user-123' };
  next();
});

app.use('/api/v1/credentials', credentialRoutes);

describe('Credential API Integration Tests', () => {
  let credentialId: string;

  beforeAll(async () => {
    // Ensure encryption key is set for tests
    if (!process.env.CREDENTIAL_ENCRYPTION_KEY) {
      process.env.CREDENTIAL_ENCRYPTION_KEY = 'test-encryption-key-minimum-32-chars-required-for-security';
    }
  });

  afterAll(async () => {
    // Cleanup: delete test credential if it exists
    if (credentialId) {
      try {
        const postgresClient = getPostgresClient();
        const credentialService = getCredentialService(postgresClient['pool']);
        await credentialService.deleteCredential(credentialId, 'test-user-123');
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('POST /api/v1/credentials', () => {
    it('should create a new AWS credential', async () => {
      const response = await request(app)
        .post('/api/v1/credentials')
        .send({
          name: 'Test AWS Credential',
          description: 'AWS credentials for testing',
          credential_type: 'aws',
          credentials: {
            access_key_id: 'AKIAIOSFODNN7EXAMPLE',
            secret_access_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            region: 'us-east-1',
          },
          tags: ['test', 'aws'],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('Test AWS Credential');
      expect(response.body.data.credential_type).toBe('aws');

      // Verify credentials are redacted
      expect(response.body.data.credentials.access_key_id).toBe('***REDACTED***');
      expect(response.body.data.credentials.secret_access_key).toBe('***REDACTED***');
      expect(response.body.data.credentials.region).toBe('us-east-1'); // Non-sensitive field not redacted

      credentialId = response.body.data.id;
    });

    it('should create an SSH credential', async () => {
      const response = await request(app)
        .post('/api/v1/credentials')
        .send({
          name: 'Test SSH Credential',
          credential_type: 'ssh',
          credentials: {
            username: 'admin',
            password: 'super-secret-password',
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.credentials.username).toBe('admin');
      expect(response.body.data.credentials.password).toBe('***REDACTED***');

      // Cleanup
      await request(app).delete(`/api/v1/credentials/${response.body.data.id}`);
    });

    it('should reject invalid credential type', async () => {
      const response = await request(app)
        .post('/api/v1/credentials')
        .send({
          name: 'Invalid Credential',
          credential_type: 'invalid-type',
          credentials: {},
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/credentials')
        .send({
          credential_type: 'aws',
          credentials: {},
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/credentials/:id', () => {
    it('should get credential by ID with redacted credentials', async () => {
      const response = await request(app).get(`/api/v1/credentials/${credentialId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(credentialId);
      expect(response.body.data.name).toBe('Test AWS Credential');

      // Verify credentials are redacted
      expect(response.body.data.credentials.access_key_id).toBe('***REDACTED***');
      expect(response.body.data.credentials.secret_access_key).toBe('***REDACTED***');
    });

    it('should return 404 for non-existent credential', async () => {
      const response = await request(app).get('/api/v1/credentials/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/credentials', () => {
    it('should list credentials without sensitive data', async () => {
      const response = await request(app).get('/api/v1/credentials');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();

      // Verify credentials field is not included in summaries
      response.body.data.forEach((cred: any) => {
        expect(cred).not.toHaveProperty('credentials');
        expect(cred).toHaveProperty('id');
        expect(cred).toHaveProperty('name');
        expect(cred).toHaveProperty('credential_type');
      });
    });

    it('should filter by credential type', async () => {
      const response = await request(app)
        .get('/api/v1/credentials')
        .query({ credential_type: 'aws' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      response.body.data.forEach((cred: any) => {
        expect(cred.credential_type).toBe('aws');
      });
    });

    it('should filter by tags', async () => {
      const response = await request(app)
        .get('/api/v1/credentials')
        .query({ tags: 'test' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/credentials')
        .query({ limit: 5, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.pagination.offset).toBe(0);
    });
  });

  describe('PUT /api/v1/credentials/:id', () => {
    it('should update credential name', async () => {
      const response = await request(app)
        .put(`/api/v1/credentials/${credentialId}`)
        .send({
          name: 'Updated AWS Credential',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated AWS Credential');
    });

    it('should update credential tags', async () => {
      const response = await request(app)
        .put(`/api/v1/credentials/${credentialId}`)
        .send({
          tags: ['updated', 'test'],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tags).toEqual(['updated', 'test']);
    });

    it('should update credentials and re-encrypt', async () => {
      const response = await request(app)
        .put(`/api/v1/credentials/${credentialId}`)
        .send({
          credentials: {
            access_key_id: 'AKIAIOSFODNN7NEWKEY',
            secret_access_key: 'new-secret-key-value',
            region: 'us-west-2',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify new credentials are redacted
      expect(response.body.data.credentials.access_key_id).toBe('***REDACTED***');
      expect(response.body.data.credentials.secret_access_key).toBe('***REDACTED***');
      expect(response.body.data.credentials.region).toBe('us-west-2');
    });

    it('should return 404 for non-existent credential', async () => {
      const response = await request(app)
        .put('/api/v1/credentials/non-existent-id')
        .send({ name: 'Test' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/credentials/:id/test', () => {
    it('should validate credential structure', async () => {
      const response = await request(app)
        .post(`/api/v1/credentials/${credentialId}/test`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
    });

    it('should detect invalid credential structure', async () => {
      // Create a credential with missing required fields
      const createResponse = await request(app)
        .post('/api/v1/credentials')
        .send({
          name: 'Invalid AWS Credential',
          credential_type: 'aws',
          credentials: {
            // Missing secret_access_key
            access_key_id: 'AKIAIOSFODNN7EXAMPLE',
          },
        });

      const testResponse = await request(app)
        .post(`/api/v1/credentials/${createResponse.body.data.id}/test`);

      expect(testResponse.status).toBe(400);
      expect(testResponse.body.success).toBe(false);
      expect(testResponse.body.error).toBe('Invalid Credential');

      // Cleanup
      await request(app).delete(`/api/v1/credentials/${createResponse.body.data.id}`);
    });
  });

  describe('DELETE /api/v1/credentials/:id', () => {
    it('should delete credential', async () => {
      const response = await request(app).delete(`/api/v1/credentials/${credentialId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(credentialId);

      // Verify credential is deleted
      const getResponse = await request(app).get(`/api/v1/credentials/${credentialId}`);
      expect(getResponse.status).toBe(404);

      credentialId = ''; // Clear for cleanup
    });

    it('should return 404 for non-existent credential', async () => {
      const response = await request(app).delete('/api/v1/credentials/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should prevent deletion of credentials in use', async () => {
      // This test would require creating a discovery definition that uses the credential
      // For now, we'll skip this as it requires additional setup
      // TODO: Add test for preventing deletion of in-use credentials
    });
  });

  describe('Encryption & Security', () => {
    it('should never return plain text credentials', async () => {
      // Create credential
      const createResponse = await request(app)
        .post('/api/v1/credentials')
        .send({
          name: 'Security Test Credential',
          credential_type: 'api_key',
          credentials: {
            api_key: 'super-secret-api-key',
            api_secret: 'super-secret-api-secret',
          },
        });

      const credId = createResponse.body.data.id;

      // Get credential
      const getResponse = await request(app).get(`/api/v1/credentials/${credId}`);

      // List credentials
      const listResponse = await request(app).get('/api/v1/credentials');

      // Update credential
      const updateResponse = await request(app)
        .put(`/api/v1/credentials/${credId}`)
        .send({ name: 'Updated Security Test' });

      // Verify all responses have redacted credentials
      expect(createResponse.body.data.credentials.api_key).toBe('***REDACTED***');
      expect(createResponse.body.data.credentials.api_secret).toBe('***REDACTED***');

      expect(getResponse.body.data.credentials.api_key).toBe('***REDACTED***');
      expect(getResponse.body.data.credentials.api_secret).toBe('***REDACTED***');

      // List should not include credentials at all
      const listedCred = listResponse.body.data.find((c: any) => c.id === credId);
      expect(listedCred).not.toHaveProperty('credentials');

      expect(updateResponse.body.data.credentials.api_key).toBe('***REDACTED***');
      expect(updateResponse.body.data.credentials.api_secret).toBe('***REDACTED***');

      // Cleanup
      await request(app).delete(`/api/v1/credentials/${credId}`);
    });

    it('should encrypt credentials in database', async () => {
      const response = await request(app)
        .post('/api/v1/credentials')
        .send({
          name: 'Encryption Test',
          credential_type: 'ssh',
          credentials: {
            username: 'testuser',
            password: 'testpassword',
          },
        });

      const credId = response.body.data.id;

      // Directly query database to verify encryption
      const postgresClient = getPostgresClient();
      const result = await postgresClient['pool'].query(
        'SELECT credentials FROM discovery_credentials WHERE id = $1',
        [credId]
      );

      const encryptedData = result.rows[0].credentials;

      // Verify it's an EncryptedData structure
      expect(encryptedData).toHaveProperty('iv');
      expect(encryptedData).toHaveProperty('encryptedData');
      expect(encryptedData).toHaveProperty('authTag');

      // Verify it's not plain text
      expect(JSON.stringify(encryptedData)).not.toContain('testpassword');
      expect(JSON.stringify(encryptedData)).not.toContain('testuser');

      // Verify we can decrypt it
      const encryptionService = getEncryptionService();
      const decrypted = JSON.parse(encryptionService.decrypt(encryptedData));
      expect(decrypted.username).toBe('testuser');
      expect(decrypted.password).toBe('testpassword');

      // Cleanup
      await request(app).delete(`/api/v1/credentials/${credId}`);
    });
  });
});
