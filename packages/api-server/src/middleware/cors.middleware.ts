// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * CORS Middleware
 * Configurable CORS with environment-specific origins
 */

import cors from 'cors';
import type { ConfigSchema } from '@cmdb/common';

export function createCorsMiddleware(config: ConfigSchema['cors']) {
  if (!config.enabled) {
    // Return no-op middleware if CORS is disabled
    return (_req: any, _res: any, next: any) => next();
  }

  return cors({
    origin: (origin: any, callback: any) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (config.origins.includes(origin) || config.origins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: config.credentials,
    maxAge: config.maxAge,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-API-Key',
      'X-Requested-With',
      'X-Request-ID',
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-Request-ID',
    ],
  });
}
