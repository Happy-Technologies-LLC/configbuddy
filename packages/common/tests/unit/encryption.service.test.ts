// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Encryption Service Unit Tests
 *
 * Tests for AES-256-GCM encryption/decryption functionality
 */

import { EncryptionService, getEncryptionService, resetEncryptionService } from '../../src/services/encryption.service';
import type { EncryptedData } from '../../src/types/credential.types';

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;
  const testMasterKey = 'test-master-key-minimum-32-chars-long-12345';

  beforeEach(() => {
    resetEncryptionService();
    encryptionService = getEncryptionService(testMasterKey);
  });

  afterEach(() => {
    resetEncryptionService();
  });

  describe('constructor', () => {
    it('should throw error if no master key provided', () => {
      delete process.env['CREDENTIAL_ENCRYPTION_KEY'];
      expect(() => new EncryptionService()).toThrow(
        'CREDENTIAL_ENCRYPTION_KEY environment variable is required'
      );
    });

    it('should throw error if master key is too short', () => {
      expect(() => new EncryptionService('short')).toThrow(
        'CREDENTIAL_ENCRYPTION_KEY must be at least 32 characters long'
      );
    });

    it('should accept master key from environment variable', () => {
      process.env['CREDENTIAL_ENCRYPTION_KEY'] = testMasterKey;
      expect(() => new EncryptionService()).not.toThrow();
    });

    it('should accept master key from constructor parameter', () => {
      expect(() => new EncryptionService(testMasterKey)).not.toThrow();
    });
  });

  describe('encrypt', () => {
    it('should encrypt plaintext successfully', () => {
      const plaintext = 'sensitive data to encrypt';
      const encrypted = encryptionService.encrypt(plaintext);

      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('encryptedData');
      expect(encrypted).toHaveProperty('authTag');
      expect(encrypted.iv).toBeTruthy();
      expect(encrypted.encryptedData).toBeTruthy();
      expect(encrypted.authTag).toBeTruthy();
    });

    it('should produce different ciphertext for same plaintext (unique IV)', () => {
      const plaintext = 'test data';
      const encrypted1 = encryptionService.encrypt(plaintext);
      const encrypted2 = encryptionService.encrypt(plaintext);

      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.encryptedData).not.toBe(encrypted2.encryptedData);
      expect(encrypted1.authTag).not.toBe(encrypted2.authTag);
    });

    it('should encrypt empty string', () => {
      const encrypted = encryptionService.encrypt('');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('encryptedData');
      expect(encrypted).toHaveProperty('authTag');
    });

    it('should encrypt long strings', () => {
      const longText = 'a'.repeat(10000);
      const encrypted = encryptionService.encrypt(longText);
      expect(encrypted).toHaveProperty('encryptedData');
      expect(encrypted.encryptedData.length).toBeGreaterThan(0);
    });

    it('should encrypt special characters', () => {
      const specialText = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`"\'\\';
      const encrypted = encryptionService.encrypt(specialText);
      expect(encrypted).toHaveProperty('encryptedData');
    });

    it('should encrypt unicode characters', () => {
      const unicodeText = 'Hello 世界 🌍';
      const encrypted = encryptionService.encrypt(unicodeText);
      expect(encrypted).toHaveProperty('encryptedData');
    });
  });

  describe('decrypt', () => {
    it('should decrypt encrypted data successfully', () => {
      const plaintext = 'sensitive data to encrypt and decrypt';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty string round-trip', () => {
      const plaintext = '';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings round-trip', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters round-trip', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`"\'\\';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters round-trip', () => {
      const plaintext = 'Hello 世界 🌍';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error if authentication tag is tampered', () => {
      const plaintext = 'test data';
      const encrypted = encryptionService.encrypt(plaintext);

      // Tamper with the auth tag
      const tamperedEncrypted: EncryptedData = {
        ...encrypted,
        authTag: Buffer.from('tampered', 'utf8').toString('base64'),
      };

      expect(() => encryptionService.decrypt(tamperedEncrypted)).toThrow('Decryption failed');
    });

    it('should throw error if encrypted data is tampered', () => {
      const plaintext = 'test data';
      const encrypted = encryptionService.encrypt(plaintext);

      // Tamper with the encrypted data
      const tamperedEncrypted: EncryptedData = {
        ...encrypted,
        encryptedData: 'tampered-data',
      };

      expect(() => encryptionService.decrypt(tamperedEncrypted)).toThrow('Decryption failed');
    });

    it('should throw error if IV is invalid', () => {
      const plaintext = 'test data';
      const encrypted = encryptionService.encrypt(plaintext);

      // Invalid IV
      const tamperedEncrypted: EncryptedData = {
        ...encrypted,
        iv: 'invalid',
      };

      expect(() => encryptionService.decrypt(tamperedEncrypted)).toThrow('Decryption failed');
    });
  });

  describe('encryptCredential', () => {
    it('should encrypt credential object successfully', () => {
      const credential = {
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        region: 'us-east-1',
      };

      const encrypted = encryptionService.encryptCredential(credential);
      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('should handle nested objects', () => {
      const credential = {
        aws: {
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        },
        metadata: {
          environment: 'production',
          tags: ['aws', 'prod'],
        },
      };

      const encrypted = encryptionService.encryptCredential(credential);
      expect(typeof encrypted).toBe('string');
    });

    it('should handle arrays', () => {
      const credential = {
        apiKeys: ['key1', 'key2', 'key3'],
        regions: ['us-east-1', 'us-west-2'],
      };

      const encrypted = encryptionService.encryptCredential(credential);
      expect(typeof encrypted).toBe('string');
    });
  });

  describe('decryptCredential', () => {
    it('should decrypt credential object successfully', () => {
      const original = {
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        region: 'us-east-1',
      };

      const encrypted = encryptionService.encryptCredential(original);
      const decrypted = encryptionService.decryptCredential(encrypted);

      expect(decrypted).toEqual(original);
    });

    it('should handle nested objects round-trip', () => {
      const original = {
        aws: {
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        },
        metadata: {
          environment: 'production',
          tags: ['aws', 'prod'],
        },
      };

      const encrypted = encryptionService.encryptCredential(original);
      const decrypted = encryptionService.decryptCredential(encrypted);

      expect(decrypted).toEqual(original);
    });

    it('should handle arrays round-trip', () => {
      const original = {
        apiKeys: ['key1', 'key2', 'key3'],
        regions: ['us-east-1', 'us-west-2'],
      };

      const encrypted = encryptionService.encryptCredential(original);
      const decrypted = encryptionService.decryptCredential(encrypted);

      expect(decrypted).toEqual(original);
    });

    it('should throw error for invalid encrypted string', () => {
      expect(() => encryptionService.decryptCredential('invalid-base64')).toThrow(
        'Failed to decrypt credential'
      );
    });
  });

  describe('redactCredential', () => {
    it('should redact password fields', () => {
      const credential = {
        username: 'admin',
        password: 'secret123',
      };

      const redacted = encryptionService.redactCredential(credential);
      expect(redacted.username).toBe('admin');
      expect(redacted.password).toBe('***REDACTED***');
    });

    it('should redact secret fields', () => {
      const credential = {
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      };

      const redacted = encryptionService.redactCredential(credential);
      // accessKeyId contains "key" which matches the sensitive key pattern, so it is also redacted
      expect(redacted.accessKeyId).toBe('***REDACTED***');
      expect(redacted.secretAccessKey).toBe('***REDACTED***');
    });

    it('should redact key fields', () => {
      const credential = {
        apiKey: 'sk-1234567890abcdef',
        privateKey: '-----BEGIN RSA PRIVATE KEY-----',
      };

      const redacted = encryptionService.redactCredential(credential);
      expect(redacted.apiKey).toBe('***REDACTED***');
      expect(redacted.privateKey).toBe('***REDACTED***');
    });

    it('should redact token fields', () => {
      const credential = {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        refreshToken: 'refresh-token-123',
      };

      const redacted = encryptionService.redactCredential(credential);
      expect(redacted.accessToken).toBe('***REDACTED***');
      expect(redacted.refreshToken).toBe('***REDACTED***');
    });

    it('should redact passphrase fields', () => {
      const credential = {
        username: 'user',
        passphrase: 'my-passphrase',
      };

      const redacted = encryptionService.redactCredential(credential);
      expect(redacted.username).toBe('user');
      expect(redacted.passphrase).toBe('***REDACTED***');
    });

    it('should handle case-insensitive field names', () => {
      const credential = {
        PASSWORD: 'secret',
        SecretKey: 'key123',
        ApiToken: 'token456',
      };

      const redacted = encryptionService.redactCredential(credential);
      expect(redacted.PASSWORD).toBe('***REDACTED***');
      expect(redacted.SecretKey).toBe('***REDACTED***');
      expect(redacted.ApiToken).toBe('***REDACTED***');
    });

    it('should not redact non-sensitive fields', () => {
      const credential = {
        username: 'admin',
        region: 'us-east-1',
        environment: 'production',
      };

      const redacted = encryptionService.redactCredential(credential);
      expect(redacted.username).toBe('admin');
      expect(redacted.region).toBe('us-east-1');
      expect(redacted.environment).toBe('production');
    });

    it('should handle null and undefined', () => {
      expect(encryptionService.redactCredential(null)).toBe(null);
      expect(encryptionService.redactCredential(undefined)).toBe(undefined);
    });

    it('should handle non-object types', () => {
      expect(encryptionService.redactCredential('string')).toBe('string');
      expect(encryptionService.redactCredential(123)).toBe(123);
      expect(encryptionService.redactCredential(true)).toBe(true);
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = getEncryptionService(testMasterKey);
      // Call without masterKey so the singleton is returned (passing masterKey forces a new instance)
      const instance2 = getEncryptionService();
      expect(instance1).toBe(instance2);
    });

    it('should allow reset for testing', () => {
      const instance1 = getEncryptionService(testMasterKey);
      resetEncryptionService();
      const instance2 = getEncryptionService(testMasterKey);
      expect(instance1).not.toBe(instance2);
    });
  });
});
