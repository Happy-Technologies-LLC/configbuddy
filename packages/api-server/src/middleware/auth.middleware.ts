/**
 * Authentication Middleware
 * Handles JWT and API key authentication for Express and GraphQL
 */

import { Request, Response, NextFunction } from 'express';
import type { ConfigSchema } from '@cmdb/common';
import { AuthService } from '../auth/auth.service';
import { TokenPayload, Permission, ROLE_PERMISSIONS } from '../auth/types';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export class AuthMiddleware {
  private authService: AuthService;
  private apiKeyHeader: string;

  constructor(authService: AuthService, config: ConfigSchema['auth']) {
    this.authService = authService;
    this.apiKeyHeader = config.apiKeys.headerName;
  }

  /**
   * Middleware to authenticate JWT or API key
   */
  authenticate() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const token = this.extractToken(req);
        const apiKey = this.extractApiKey(req);

        if (token) {
          // Verify JWT token
          const payload = await this.authService.verifyToken(token);
          req.user = payload;
          next();
        } else if (apiKey) {
          // Verify API key
          const payload = await this.authService.verifyApiKey(apiKey);
          req.user = payload;
          next();
        } else {
          res.status(401).json({
            _error: 'Unauthorized',
            _message: 'No authentication credentials provided',
          });
        }
      } catch (error: any) {
        res.status(401).json({
          _error: 'Unauthorized',
          _message: error.message || 'Authentication failed',
        });
      }
    };
  }

  /**
   * Optional authentication (sets user if available, but doesn't require it)
   */
  optionalAuthenticate() {
    return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
      try {
        const token = this.extractToken(req);
        const apiKey = this.extractApiKey(req);

        if (token) {
          const payload = await this.authService.verifyToken(token);
          req.user = payload;
        } else if (apiKey) {
          const payload = await this.authService.verifyApiKey(apiKey);
          req.user = payload;
        }

        next();
      } catch (error) {
        // Ignore authentication errors for optional auth
        next();
      }
    };
  }

  /**
   * Middleware to require specific permission
   */
  requirePermission(permission: Permission) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          _error: 'Unauthorized',
          _message: 'Authentication required',
        });
        return;
      }

      const userPermissions = ROLE_PERMISSIONS[req.user._role];

      if (!userPermissions.includes(permission)) {
        res.status(403).json({
          _error: 'Forbidden',
          _message: `Permission '${permission}' required`,
        });
        return;
      }

      next();
    };
  }

  /**
   * Middleware to require specific role
   */
  requireRole(...roles: string[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          _error: 'Unauthorized',
          _message: 'Authentication required',
        });
        return;
      }

      if (!roles.includes(req.user._role)) {
        res.status(403).json({
          _error: 'Forbidden',
          _message: `Role '${roles.join(' or ')}' required`,
        });
        return;
      }

      next();
    };
  }

  /**
   * Extract JWT token from request
   */
  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1] || null;
  }

  /**
   * Extract API key from request
   */
  private extractApiKey(req: Request): string | null {
    const apiKey = req.headers[this.apiKeyHeader.toLowerCase()] as string | undefined;
    return apiKey ?? null;
  }
}

/**
 * GraphQL context authentication
 */
export async function authenticateGraphQLContext(
  authService: AuthService,
  apiKeyHeader: string,
  req: Request
): Promise<{ user?: TokenPayload }> {
  // Extract token
  const authHeader = req.headers.authorization;
  let token: string | null = null;

  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1] || null;
    }
  }

  // Extract API key
  const apiKey = (req.headers[apiKeyHeader.toLowerCase()] as string | undefined) || null;

  try {
    if (token) {
      const payload = await authService.verifyToken(token);
      return { user: payload };
    } else if (apiKey) {
      const payload = await authService.verifyApiKey(apiKey);
      return { user: payload };
    }
  } catch (error) {
    // Authentication failed, return empty context
  }

  return {};
}

/**
 * GraphQL permission checker
 */
export function checkGraphQLPermission(
  context: { user?: TokenPayload },
  permission: Permission
): void {
  if (!context.user) {
    throw new Error('Authentication required');
  }

  const userPermissions = ROLE_PERMISSIONS[context.user._role];

  if (!userPermissions.includes(permission)) {
    throw new Error(`Permission '${permission}' required`);
  }
}
