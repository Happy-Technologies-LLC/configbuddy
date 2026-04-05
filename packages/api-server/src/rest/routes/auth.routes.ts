// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Authentication Routes
 * Routes for user authentication, token management, and API key operations
 */

import { Router } from 'express';
import { AuthController } from '../auth.controller';
import { AuthService } from '../../auth/auth.service';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { RateLimitMiddleware } from '../../middleware/rate-limit.middleware';
import { getNeo4jClient, getRedisClient, getPostgresClient } from '@cmdb/database';
import { loadConfig } from '@cmdb/common';

// Create router
const router = Router();

// Load configuration
const config = loadConfig();

// Create repository for AuthService
// Users are stored in Neo4j, API keys are stored in PostgreSQL
class Neo4jAuthRepository {
  private neo4jClient = getNeo4jClient();
  private postgresClient = getPostgresClient();

  async findUserByUsername(username: string): Promise<any | null> {
    const session = this.neo4jClient.getSession();
    try {
      const result = await session.run(
        'MATCH (u:User) WHERE u._username = $username OR u.username = $username RETURN u',
        { username }
      );

      if (result.records.length === 0) {
        return null;
      }

      const node = result.records[0]?.get('u');
      if (!node) {
        return null;
      }
      return {
        _id: node.properties._id || node.properties.id,
        _username: node.properties._username || node.properties.username,
        _email: node.properties._email || node.properties.email,
        _passwordHash: node.properties._passwordHash || node.properties.passwordHash,
        _role: node.properties._role || node.properties.role,
        _enabled: node.properties._enabled !== undefined ? node.properties._enabled : node.properties.enabled,
        _createdAt: node.properties._createdAt || node.properties.createdAt,
        _updatedAt: node.properties._updatedAt || node.properties.updatedAt,
        _lastLoginAt: node.properties._lastLoginAt || node.properties.lastLoginAt,
      };
    } catch (error) {
      throw new Error(`Failed to find user by username: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await session.close();
    }
  }

  async findUserById(id: string): Promise<any | null> {
    const session = this.neo4jClient.getSession();
    try {
      const result = await session.run(
        'MATCH (u:User) WHERE u._id = $id OR u.id = $id RETURN u',
        { id }
      );

      if (result.records.length === 0) {
        return null;
      }

      const node = result.records[0]?.get('u');
      if (!node) {
        return null;
      }
      return {
        _id: node.properties._id || node.properties.id,
        _username: node.properties._username || node.properties.username,
        _email: node.properties._email || node.properties.email,
        _passwordHash: node.properties._passwordHash || node.properties.passwordHash,
        _role: node.properties._role || node.properties.role,
        _enabled: node.properties._enabled !== undefined ? node.properties._enabled : node.properties.enabled,
        _createdAt: node.properties._createdAt || node.properties.createdAt,
        _updatedAt: node.properties._updatedAt || node.properties.updatedAt,
        _lastLoginAt: node.properties._lastLoginAt || node.properties.lastLoginAt,
      };
    } catch (error) {
      throw new Error(`Failed to find user by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await session.close();
    }
  }

  async updateUserLastLogin(userId: string): Promise<void> {
    const session = this.neo4jClient.getSession();
    try {
      await session.run(
        'MATCH (u:User) WHERE u._id = $userId OR u.id = $userId SET u._lastLoginAt = datetime(), u.lastLoginAt = datetime() RETURN u',
        { userId }
      );
    } catch (error) {
      throw new Error(`Failed to update user last login: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await session.close();
    }
  }

  async findApiKeyByKey(keyHash: string): Promise<any | null> {
    try {
      const result = await this.postgresClient.query(
        `SELECT id, user_id, key_hash, name, role, enabled, created_at, expires_at, last_used_at, revoked_at
         FROM api_keys
         WHERE key_hash = $1 AND enabled = TRUE AND revoked_at IS NULL`,
        [keyHash]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        _id: row.id,
        _userId: row.user_id,
        _keyHash: row.key_hash,
        _name: row.name,
        _role: row.role,
        _enabled: row.enabled,
        _createdAt: row.created_at,
        expiresAt: row.expires_at,
        lastUsedAt: row.last_used_at,
      };
    } catch (error) {
      throw new Error(`Failed to find API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createApiKey(apiKey: any): Promise<any> {
    try {
      const result = await this.postgresClient.query(
        `INSERT INTO api_keys (user_id, key_hash, name, role, enabled, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, user_id, key_hash, name, role, enabled, created_at, expires_at, last_used_at`,
        [
          apiKey._userId,
          apiKey._keyHash,
          apiKey._name,
          apiKey._role,
          apiKey._enabled !== undefined ? apiKey._enabled : true,
          apiKey.expiresAt || null,
        ]
      );

      const row = result.rows[0];
      return {
        _id: row.id,
        _userId: row.user_id,
        _keyHash: row.key_hash,
        _name: row.name,
        _role: row.role,
        _enabled: row.enabled,
        _createdAt: row.created_at,
        expiresAt: row.expires_at,
        lastUsedAt: row.last_used_at,
      };
    } catch (error) {
      throw new Error(`Failed to create API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateApiKeyLastUsed(keyId: string): Promise<void> {
    try {
      await this.postgresClient.query(
        `UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`,
        [keyId]
      );
    } catch (error) {
      throw new Error(`Failed to update API key last used: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteApiKey(keyId: string): Promise<void> {
    try {
      // Soft delete by setting revoked_at timestamp
      await this.postgresClient.query(
        `UPDATE api_keys SET revoked_at = NOW(), enabled = FALSE WHERE id = $1`,
        [keyId]
      );
    } catch (error) {
      throw new Error(`Failed to delete API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listApiKeys(userId: string): Promise<any[]> {
    try {
      const result = await this.postgresClient.query(
        `SELECT id, user_id, name, role, enabled, created_at, expires_at, last_used_at
         FROM api_keys
         WHERE user_id = $1 AND revoked_at IS NULL
         ORDER BY created_at DESC`,
        [userId]
      );

      return result.rows.map(row => ({
        _id: row.id,
        _userId: row.user_id,
        _name: row.name,
        _role: row.role,
        _enabled: row.enabled,
        _createdAt: row.created_at,
        expiresAt: row.expires_at,
        lastUsedAt: row.last_used_at,
      }));
    } catch (error) {
      throw new Error(`Failed to list API keys: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Initialize services
const authRepository = new Neo4jAuthRepository();
const authService = new AuthService(config.auth, authRepository);
const validationMiddleware = new ValidationMiddleware();
const authMiddleware = new AuthMiddleware(authService, config.auth);
const rateLimitMiddleware = new RateLimitMiddleware(getRedisClient().getConnection(), config.rateLimit);

// Create controller
const authController = new AuthController(
  authService,
  validationMiddleware,
  authMiddleware,
  rateLimitMiddleware
);

// Mount controller routes
router.use('/', authController.getRouter());

export { router as authRoutes };
