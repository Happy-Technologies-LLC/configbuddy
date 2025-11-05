import { Request, Response } from 'express';
import { getUnifiedCredentialService, getPostgresClient } from '@cmdb/database';
import {
  UnifiedCredentialInput,
  UnifiedCredentialUpdateInput,
  CredentialMatchContext,
  AuthProtocol,
  CredentialScope,
  logger,
} from '@cmdb/common';

/**
 * Unified Credential Controller
 * Handles REST API requests for managing protocol-based credentials
 */
export class UnifiedCredentialController {
  private credentialService;

  constructor() {
    const pool = getPostgresClient().pool;
    this.credentialService = getUnifiedCredentialService(pool);
  }

  /**
   * POST /api/v1/credentials - Create credential
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const input: UnifiedCredentialInput = req.body;
      const createdBy = (req as any).user?.id || 'system'; // Get from auth middleware

      const credential = await this.credentialService.create(input, createdBy);

      // Redact sensitive credentials before returning
      const safeCredential = {
        ...credential,
        credentials: '***REDACTED***',
      };

      res.status(201).json({
        _success: true,
        _data: safeCredential,
        _message: 'Credential created successfully',
      });
    } catch (error) {
      logger.error('Error creating credential', { error });

      // Check for duplicate name error
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          _success: false,
          _error: 'Conflict',
          _message: error.message,
        });
        return;
      }

      res.status(500).json({
        _success: false,
        _error: 'Failed to create credential',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/credentials - List credentials (summaries only, no sensitive data)
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        protocol: req.query['protocol'] as AuthProtocol | undefined,
        scope: req.query['scope'] as CredentialScope | undefined,
        tags: req.query['tags'] ? (req.query['tags'] as string).split(',') : undefined,
        created_by: req.query['created_by'] as string | undefined,
        limit: req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : undefined,
        offset: req.query['offset'] ? parseInt(req.query['offset'] as string, 10) : undefined,
      };

      const credentials = await this.credentialService.list(filters);

      res.status(200).json({
        _success: true,
        _data: credentials,
        _count: credentials.length,
      });
    } catch (error) {
      logger.error('Error listing credentials', { error });
      res.status(500).json({
        _success: false,
        _error: 'Failed to list credentials',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/credentials/:id - Get credential by ID
   * WARNING: Returns decrypted credentials - should be restricted to admins
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          _success: false,
          _error: 'Bad Request',
          _message: 'Credential ID is required',
        });
        return;
      }

      const credential = await this.credentialService.getById(id);

      if (!credential) {
        res.status(404).json({
          _success: false,
          _error: 'Not Found',
          _message: `Credential with ID '${id}' not found`,
        });
        return;
      }

      // Redact sensitive credentials before returning
      // In a real implementation, you might check user permissions first
      const safeCredential = {
        ...credential,
        credentials: '***REDACTED***',
      };

      res.status(200).json({
        _success: true,
        _data: safeCredential,
      });
    } catch (error) {
      logger.error('Error getting credential', { error, id: req.params['id'] });
      res.status(500).json({
        _success: false,
        _error: 'Failed to get credential',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * PUT /api/v1/credentials/:id - Update credential
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          _success: false,
          _error: 'Bad Request',
          _message: 'Credential ID is required',
        });
        return;
      }

      const input: UnifiedCredentialUpdateInput = req.body;

      const credential = await this.credentialService.update(id, input);

      // Redact sensitive credentials before returning
      const safeCredential = {
        ...credential,
        credentials: '***REDACTED***',
      };

      res.status(200).json({
        _success: true,
        _data: safeCredential,
        _message: 'Credential updated successfully',
      });
    } catch (error) {
      logger.error('Error updating credential', { error, id: req.params['id'] });

      // Check for not found error
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          _success: false,
          _error: 'Not Found',
          _message: error.message,
        });
        return;
      }

      // Check for duplicate name error
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          _success: false,
          _error: 'Conflict',
          _message: error.message,
        });
        return;
      }

      res.status(500).json({
        _success: false,
        _error: 'Failed to update credential',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * DELETE /api/v1/credentials/:id - Delete credential
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          _success: false,
          _error: 'Bad Request',
          _message: 'Credential ID is required',
        });
        return;
      }

      await this.credentialService.delete(id);

      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting credential', { error, id: req.params['id'] });

      // Check for not found error
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          _success: false,
          _error: 'Not Found',
          _message: error.message,
        });
        return;
      }

      // Check for in-use error
      if (error instanceof Error && error.message.includes('currently used')) {
        res.status(409).json({
          _success: false,
          _error: 'Conflict',
          _message: error.message,
        });
        return;
      }

      res.status(500).json({
        _success: false,
        _error: 'Failed to delete credential',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/v1/credentials/:id/validate - Validate credential
   */
  async validate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          _success: false,
          _error: 'Bad Request',
          _message: 'Credential ID is required',
        });
        return;
      }

      const result = await this.credentialService.validate(id);

      res.status(200).json({
        _success: true,
        _data: result,
      });
    } catch (error) {
      logger.error('Error validating credential', { error, id: req.params['id'] });
      res.status(500).json({
        _success: false,
        _error: 'Failed to validate credential',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/v1/credentials/match - Find best matching credential
   */
  async match(req: Request, res: Response): Promise<void> {
    try {
      const context: CredentialMatchContext = req.body;

      const result = await this.credentialService.findBestMatch(context);

      if (!result) {
        res.status(404).json({
          _success: false,
          _error: 'Not Found',
          _message: 'No matching credential found for the given context',
        });
        return;
      }

      // Redact sensitive credentials before returning
      const safeResult = {
        ...result,
        credential: {
          ...result.credential,
          credentials: '***REDACTED***',
        },
      };

      res.status(200).json({
        _success: true,
        _data: safeResult,
      });
    } catch (error) {
      logger.error('Error matching credentials', { error });
      res.status(500).json({
        _success: false,
        _error: 'Failed to match credentials',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/v1/credentials/rank - Rank all credentials by match
   */
  async rank(req: Request, res: Response): Promise<void> {
    try {
      const context: CredentialMatchContext = req.body;

      const results = await this.credentialService.rankCredentials(context);

      // Redact sensitive credentials before returning
      const safeResults = results.map((result) => ({
        ...result,
        credential: {
          ...result.credential,
          credentials: '***REDACTED***',
        },
      }));

      res.status(200).json({
        _success: true,
        _data: safeResults,
        _count: safeResults.length,
      });
    } catch (error) {
      logger.error('Error ranking credentials', { error });
      res.status(500).json({
        _success: false,
        _error: 'Failed to rank credentials',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
