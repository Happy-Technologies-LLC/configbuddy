// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Credential Service Unit Tests
 *
 * Tests for credential CRUD operations with encryption
 */

import { CredentialService, getCredentialService, resetCredentialService } from '../../src/services/credential.service';
import { getPostgresClient } from '@cmdb/database';
import { getEncryptionService, resetEncryptionService } from '@cmdb/common';
import type { CredentialInput, CredentialUpdateInput } from '@cmdb/common';

// Mock the database client
jest.mock('@cmdb/database');
jest.mock('@cmdb/common', () => ({
  ...jest.requireActual('@cmdb/common'),
  getEncryptionService: jest.fn(),
}));

describe('CredentialService', () => {
  let credentialService: CredentialService;
  let mockPostgresClient: any;
  let mockEncryptionService: any;

  const testMasterKey = 'test-master-key-minimum-32-chars-long-12345';
  const testUserId = 'user-123';

  beforeEach(() => {
    // Reset singletons
    resetCredentialService();
    resetEncryptionService();

    // Create mock encryption service (use real implementation)
    const RealEncryptionService = jest.requireActual('@cmdb/common').EncryptionService;
    mockEncryptionService = new RealEncryptionService(testMasterKey);

    // Create mock PostgreSQL client
    mockPostgresClient = {
      query: jest.fn(),
    };

    // Setup mocks
    (getPostgresClient as jest.Mock).mockReturnValue(mockPostgresClient);
    (getEncryptionService as jest.Mock).mockReturnValue(mockEncryptionService);

    credentialService = getCredentialService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCredential', () => {
    it('should create a credential with encrypted data', async () => {
      const input: CredentialInput = {
        name: 'AWS Production',
        description: 'AWS credentials for production',
        credential_type: 'aws',
        credentials: {
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          region: 'us-east-1',
        },
        tags: ['aws', 'production'],
      };

      const mockRow = {
        id: 'cred-123',
        name: input.name,
        description: input.description,
        credential_type: input.credential_type,
        credentials: JSON.stringify({
          iv: 'test-iv',
          encryptedData: 'test-encrypted',
          authTag: 'test-tag',
        }),
        created_by: testUserId,
        created_at: new Date(),
        updated_at: new Date(),
        tags: input.tags,
      };

      mockPostgresClient.query.mockResolvedValue({ rows: [mockRow] });

      const result = await credentialService.createCredential(input, testUserId);

      expect(result).toBeDefined();
      expect(result.id).toBe('cred-123');
      expect(result.name).toBe(input.name);
      expect(result.credential_type).toBe(input.credential_type);
      expect(mockPostgresClient.query).toHaveBeenCalledTimes(1);

      // Verify the credentials were encrypted
      const queryCall = mockPostgresClient.query.mock.calls[0];
      const encryptedParam = queryCall[1][3]; // credentials parameter
      expect(encryptedParam).toBeTruthy();
      expect(typeof encryptedParam).toBe('string');
    });

    it('should handle creation without optional fields', async () => {
      const input: CredentialInput = {
        name: 'Simple Cred',
        credential_type: 'ssh',
        credentials: { username: 'admin', password: 'secret' },
      };

      const mockRow = {
        id: 'cred-456',
        name: input.name,
        description: null,
        credential_type: input.credential_type,
        credentials: '{}',
        created_by: testUserId,
        created_at: new Date(),
        updated_at: new Date(),
        tags: [],
      };

      mockPostgresClient.query.mockResolvedValue({ rows: [mockRow] });

      const result = await credentialService.createCredential(input, testUserId);

      expect(result).toBeDefined();
      expect(result.description).toBeUndefined();
      expect(result.tags).toEqual([]);
    });

    it('should throw error on database failure', async () => {
      const input: CredentialInput = {
        name: 'Test',
        credential_type: 'aws',
        credentials: { accessKeyId: 'test' },
      };

      mockPostgresClient.query.mockRejectedValue(new Error('Database error'));

      await expect(credentialService.createCredential(input, testUserId)).rejects.toThrow(
        'Failed to create credential'
      );
    });
  });

  describe('getCredential', () => {
    it('should retrieve a credential by ID', async () => {
      const credId = 'cred-123';
      const mockRow = {
        id: credId,
        name: 'Test Credential',
        description: 'Test description',
        credential_type: 'aws',
        credentials: '{"iv":"test","encryptedData":"data","authTag":"tag"}',
        created_by: testUserId,
        created_at: new Date(),
        updated_at: new Date(),
        tags: ['test'],
      };

      mockPostgresClient.query.mockResolvedValue({ rows: [mockRow] });

      const result = await credentialService.getCredential(credId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(credId);
      expect(result?.name).toBe('Test Credential');
      expect(mockPostgresClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [credId]
      );
    });

    it('should return null if credential not found', async () => {
      mockPostgresClient.query.mockResolvedValue({ rows: [] });

      const result = await credentialService.getCredential('non-existent');

      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      mockPostgresClient.query.mockRejectedValue(new Error('Database error'));

      await expect(credentialService.getCredential('cred-123')).rejects.toThrow(
        'Failed to get credential'
      );
    });
  });

  describe('listCredentials', () => {
    it('should list all credentials without filters', async () => {
      const mockRows = [
        {
          id: 'cred-1',
          name: 'Cred 1',
          credential_type: 'aws',
          credentials: '{}',
          created_by: testUserId,
          created_at: new Date(),
          updated_at: new Date(),
          tags: [],
        },
        {
          id: 'cred-2',
          name: 'Cred 2',
          credential_type: 'azure',
          credentials: '{}',
          created_by: testUserId,
          created_at: new Date(),
          updated_at: new Date(),
          tags: [],
        },
      ];

      mockPostgresClient.query.mockResolvedValue({ rows: mockRows });

      const result = await credentialService.listCredentials();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('cred-1');
      expect(result[1].id).toBe('cred-2');
    });

    it('should filter by user ID', async () => {
      mockPostgresClient.query.mockResolvedValue({ rows: [] });

      await credentialService.listCredentials({ userId: testUserId });

      const queryCall = mockPostgresClient.query.mock.calls[0];
      expect(queryCall[0]).toContain('created_by = $1');
      expect(queryCall[1]).toContain(testUserId);
    });

    it('should filter by credential type', async () => {
      mockPostgresClient.query.mockResolvedValue({ rows: [] });

      await credentialService.listCredentials({ credentialType: 'aws' });

      const queryCall = mockPostgresClient.query.mock.calls[0];
      expect(queryCall[0]).toContain('credential_type = $1');
      expect(queryCall[1]).toContain('aws');
    });

    it('should filter by tags', async () => {
      mockPostgresClient.query.mockResolvedValue({ rows: [] });

      await credentialService.listCredentials({ tags: ['production', 'aws'] });

      const queryCall = mockPostgresClient.query.mock.calls[0];
      expect(queryCall[0]).toContain('tags &&');
      expect(queryCall[1]).toContain(['production', 'aws']);
    });

    it('should apply multiple filters', async () => {
      mockPostgresClient.query.mockResolvedValue({ rows: [] });

      await credentialService.listCredentials({
        userId: testUserId,
        credentialType: 'aws',
        tags: ['production'],
      });

      const queryCall = mockPostgresClient.query.mock.calls[0];
      expect(queryCall[1]).toHaveLength(3);
    });
  });

  describe('listCredentialSummaries', () => {
    it('should return summaries without sensitive data', async () => {
      const mockRows = [
        {
          id: 'cred-1',
          name: 'Cred 1',
          description: 'Description',
          credential_type: 'aws',
          created_by: testUserId,
          created_at: new Date(),
          updated_at: new Date(),
          tags: ['test'],
          usage_count: '5',
        },
      ];

      mockPostgresClient.query.mockResolvedValue({ rows: mockRows });

      const result = await credentialService.listCredentialSummaries();

      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('credentials');
      expect(result[0].usage_count).toBe(5);
    });
  });

  describe('updateCredential', () => {
    it('should update credential name', async () => {
      const updates: CredentialUpdateInput = {
        name: 'Updated Name',
      };

      const mockRow = {
        id: 'cred-123',
        name: 'Updated Name',
        credential_type: 'aws',
        credentials: '{}',
        created_by: testUserId,
        created_at: new Date(),
        updated_at: new Date(),
        tags: [],
      };

      mockPostgresClient.query.mockResolvedValue({ rows: [mockRow] });

      const result = await credentialService.updateCredential('cred-123', updates);

      expect(result.name).toBe('Updated Name');
      expect(mockPostgresClient.query).toHaveBeenCalledTimes(1);
    });

    it('should re-encrypt credentials when updating', async () => {
      const updates: CredentialUpdateInput = {
        credentials: {
          accessKeyId: 'NEW_KEY',
          secretAccessKey: 'NEW_SECRET',
        },
      };

      const mockRow = {
        id: 'cred-123',
        name: 'Test',
        credential_type: 'aws',
        credentials: '{}',
        created_by: testUserId,
        created_at: new Date(),
        updated_at: new Date(),
        tags: [],
      };

      mockPostgresClient.query.mockResolvedValue({ rows: [mockRow] });

      await credentialService.updateCredential('cred-123', updates);

      const queryCall = mockPostgresClient.query.mock.calls[0];
      expect(queryCall[0]).toContain('credentials = $1');
    });

    it('should update multiple fields', async () => {
      const updates: CredentialUpdateInput = {
        name: 'New Name',
        description: 'New Description',
        tags: ['new', 'tags'],
      };

      const mockRow = {
        id: 'cred-123',
        name: 'New Name',
        description: 'New Description',
        credential_type: 'aws',
        credentials: '{}',
        created_by: testUserId,
        created_at: new Date(),
        updated_at: new Date(),
        tags: ['new', 'tags'],
      };

      mockPostgresClient.query.mockResolvedValue({ rows: [mockRow] });

      const result = await credentialService.updateCredential('cred-123', updates);

      expect(result.name).toBe('New Name');
      expect(result.description).toBe('New Description');
      expect(result.tags).toEqual(['new', 'tags']);
    });

    it('should throw error if no fields to update', async () => {
      await expect(credentialService.updateCredential('cred-123', {})).rejects.toThrow(
        'No fields to update'
      );
    });

    it('should throw error if credential not found', async () => {
      const updates: CredentialUpdateInput = { name: 'New Name' };
      mockPostgresClient.query.mockResolvedValue({ rows: [] });

      await expect(credentialService.updateCredential('non-existent', updates)).rejects.toThrow(
        'Credential not found'
      );
    });
  });

  describe('deleteCredential', () => {
    it('should delete credential if not in use', async () => {
      mockPostgresClient.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // Usage check
        .mockResolvedValueOnce({ rowCount: 1 }); // Delete

      await credentialService.deleteCredential('cred-123');

      expect(mockPostgresClient.query).toHaveBeenCalledTimes(2);
    });

    it('should throw error if credential is in use', async () => {
      mockPostgresClient.query.mockResolvedValueOnce({ rows: [{ count: '5' }] });

      await expect(credentialService.deleteCredential('cred-123')).rejects.toThrow(
        'Cannot delete credential: it is used by 5 discovery definition(s)'
      );
    });

    it('should throw error if credential not found', async () => {
      mockPostgresClient.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rowCount: 0 });

      await expect(credentialService.deleteCredential('non-existent')).rejects.toThrow(
        'Credential not found'
      );
    });
  });

  describe('getDecryptedCredentials', () => {
    it('should decrypt and return credential data', async () => {
      const originalCreds = {
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      };

      // Encrypt the credentials using the real encryption service
      const encrypted = mockEncryptionService.encrypt(JSON.stringify(originalCreds));

      const mockRow = {
        id: 'cred-123',
        name: 'Test',
        credential_type: 'aws',
        credentials: JSON.stringify(encrypted),
        created_by: testUserId,
        created_at: new Date(),
        updated_at: new Date(),
        tags: [],
      };

      mockPostgresClient.query.mockResolvedValue({ rows: [mockRow] });

      const result = await credentialService.getDecryptedCredentials('cred-123');

      expect(result).toEqual(originalCreds);
      expect(result.accessKeyId).toBe('AKIAIOSFODNN7EXAMPLE');
      expect(result.secretAccessKey).toBe('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
    });

    it('should throw error if credential not found', async () => {
      mockPostgresClient.query.mockResolvedValue({ rows: [] });

      await expect(credentialService.getDecryptedCredentials('non-existent')).rejects.toThrow(
        'Credential not found'
      );
    });
  });

  describe('markCredentialAsUsed', () => {
    it('should update timestamp without throwing', async () => {
      mockPostgresClient.query.mockResolvedValue({ rowCount: 1 });

      await expect(credentialService.markCredentialAsUsed('cred-123')).resolves.not.toThrow();
    });

    it('should not throw error on failure (non-critical)', async () => {
      mockPostgresClient.query.mockRejectedValue(new Error('Database error'));

      // Should log error but not throw
      await expect(credentialService.markCredentialAsUsed('cred-123')).resolves.not.toThrow();
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = getCredentialService();
      const instance2 = getCredentialService();
      expect(instance1).toBe(instance2);
    });

    it('should allow reset for testing', () => {
      const instance1 = getCredentialService();
      resetCredentialService();
      const instance2 = getCredentialService();
      expect(instance1).not.toBe(instance2);
    });
  });
});
