// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Security Headers Middleware
 * Uses Helmet.js to set security headers
 */

import helmet from 'helmet';
import type { ConfigSchema } from '@cmdb/common';

export function createSecurityHeadersMiddleware(config: ConfigSchema['security']) {
  if (!config.helmet.enabled) {
    // Return no-op middleware if helmet is disabled
    return (_req: any, _res: any, next: any) => next();
  }

  const helmetConfig: any = {
    // Content Security Policy
    _contentSecurityPolicy: config.helmet.contentSecurityPolicy.enabled
      ? {
          _directives: config.helmet.contentSecurityPolicy.directives || {
            _defaultSrc: ["'self'"],
            _styleSrc: ["'self'", "'unsafe-inline'"],
            _scriptSrc: ["'self'"],
            _imgSrc: ["'self'", 'data:', 'https:'],
            _connectSrc: ["'self'"],
            _fontSrc: ["'self'"],
            _objectSrc: ["'none'"],
            _mediaSrc: ["'self'"],
            _frameSrc: ["'none'"],
          },
        }
      : false,

    // Strict-Transport-Security (HSTS)
    _hsts: config.helmet.hsts.enabled
      ? {
          _maxAge: config.helmet.hsts.maxAge,
          _includeSubDomains: config.helmet.hsts.includeSubDomains,
          _preload: config.helmet.hsts.preload,
        }
      : false,

    // X-Frame-Options
    _frameguard: {
      _action: 'deny',
    },

    // X-Content-Type-Options
    _noSniff: true,

    // X-XSS-Protection
    _xssFilter: true,

    // Referrer-Policy
    _referrerPolicy: {
      _policy: 'strict-origin-when-cross-origin',
    },

    // Hide X-Powered-By
    _hidePoweredBy: true,

    // DNS Prefetch Control
    _dnsPrefetchControl: {
      _allow: false,
    },

    // Download Options (IE8+)
    _ieNoOpen: true,

    // Permissions Policy
    _permissionsPolicy: {
      _features: {
        _geolocation: ["'none'"],
        _microphone: ["'none'"],
        _camera: ["'none'"],
        _payment: ["'none'"],
      },
    },
  };

  return helmet(helmetConfig);
}

/**
 * Additional security middleware for specific headers
 */
export function additionalSecurityHeaders() {
  return (_req: any, res: any, next: any) => {
    // X-Content-Type-Options
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // X-Frame-Options
    res.setHeader('X-Frame-Options', 'DENY');

    // X-XSS-Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Remove sensitive headers
    res.removeHeader('X-Powered-By');

    next();
  };
}
