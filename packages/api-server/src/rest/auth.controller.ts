/**
 * Authentication REST Controller
 * Handles login, logout, token refresh, and API key management
 */

import { Request, Response, Router } from 'express';
import { AuthService } from '../auth/auth.service';
import { ValidationMiddleware } from './middleware/validation.middleware';
import { authSchemas } from '../validation/schemas';
import { AuthMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';
import { RateLimitMiddleware } from '../middleware/rate-limit.middleware';

export class AuthController {
  private router: Router;
  private authService: AuthService;
  private validator: ValidationMiddleware;
  private authMiddleware: AuthMiddleware;
  private rateLimiter: RateLimitMiddleware;

  constructor(
    authService: AuthService,
    validator: ValidationMiddleware,
    authMiddleware: AuthMiddleware,
    rateLimiter: RateLimitMiddleware
  ) {
    this.authService = authService;
    this.validator = validator;
    this.authMiddleware = authMiddleware;
    this.rateLimiter = rateLimiter;
    this.router = Router();

    this.setupRoutes();
  }

  private setupRoutes(): void {
    /**
     * POST /api/auth/login
     * Login with username and password
     */
    this.router.post(
      '/login',
      this.rateLimiter.limit('auth'),
      this.validator.validate(authSchemas._login),
      this.login.bind(this)
    );

    /**
     * POST /api/auth/refresh
     * Refresh access token using refresh token
     */
    this.router.post(
      '/refresh',
      this.rateLimiter.limit('auth'),
      this.validator.validate(authSchemas._refreshToken),
      this.refreshToken.bind(this)
    );

    /**
     * POST /api/auth/logout
     * Logout (client-side token invalidation)
     */
    this.router.post(
      '/logout',
      this.authMiddleware.authenticate(),
      this.logout.bind(this)
    );

    /**
     * POST /api/auth/api-key
     * Generate new API key
     */
    this.router.post(
      '/api-key',
      this.authMiddleware.authenticate(),
      this.validator.validate(authSchemas._generateApiKey),
      this.generateApiKey.bind(this)
    );

    /**
     * GET /api/auth/api-keys
     * List all API keys for the current user
     */
    this.router.get(
      '/api-keys',
      this.authMiddleware.authenticate(),
      this.listApiKeys.bind(this)
    );

    /**
     * DELETE /api/auth/api-key/:keyId
     * Revoke API key
     */
    this.router.delete(
      '/api-key/:keyId',
      this.authMiddleware.authenticate(),
      this.revokeApiKey.bind(this)
    );

    /**
     * GET /api/auth/me
     * Get current user info
     */
    this.router.get(
      '/me',
      this.authMiddleware.authenticate(),
      this.getCurrentUser.bind(this)
    );
  }

  /**
   * Login endpoint
   */
  private async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.authService.login(req.body);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        error: 'Authentication Failed',
        message: error.message || 'Invalid credentials',
      });
    }
  }

  /**
   * Refresh token endpoint
   */
  private async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.authService.refreshToken(req.body);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        error: 'Token Refresh Failed',
        message: error.message || 'Invalid or expired refresh token',
      });
    }
  }

  /**
   * Logout endpoint
   */
  private async logout(_req: AuthenticatedRequest, res: Response): Promise<void> {
    // Logout is primarily client-side (discarding tokens)
    // Server-side token blacklist could be implemented here if needed

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }

  /**
   * Generate API key endpoint
   */
  private async generateApiKey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?._userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const result = await this.authService.generateApiKey(req.user._userId, req.body);

      res.json({
        success: true,
        data: result,
        message: 'API key generated. Save it securely - it will not be shown again.',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'API Key Generation Failed',
        message: error.message || 'Failed to generate API key',
      });
    }
  }

  /**
   * List API keys endpoint
   */
  private async listApiKeys(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?._userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const apiKeys = await this.authService.listApiKeys(req.user._userId);

      res.json({
        success: true,
        data: apiKeys,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to List API Keys',
        message: error.message || 'Failed to retrieve API keys',
      });
    }
  }

  /**
   * Revoke API key endpoint
   */
  private async revokeApiKey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?._userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const { keyId } = req.params;
      if (!keyId) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Key ID is required',
        });
        return;
      }
      await this.authService.revokeApiKey(req.user._userId, keyId);

      res.json({
        success: true,
        message: 'API key revoked successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'API Key Revocation Failed',
        message: error.message || 'Failed to revoke API key',
      });
    }
  }

  /**
   * Get current user info endpoint
   */
  private async getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    res.json({
      success: true,
      data: {
        userId: req.user?._userId,
        username: req.user?._username,
        role: req.user?._role,
      },
    });
  }

  public getRouter(): Router {
    return this.router;
  }
}
