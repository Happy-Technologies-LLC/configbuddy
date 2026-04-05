// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Parser for Wiz identities
 */

import { WizIdentity } from '../types';

export function parseIdentity(entity: any): WizIdentity {
  const props = entity.properties || {};
  return {
    id: entity.id,
    name: entity.name || props.name || 'Unknown',
    type: props.type || entity.type,
    cloudPlatform: props.cloudPlatform || 'Unknown',
    cloudProviderURL: props.cloudProviderURL || '',
    status: props.status || 'Active',
    createdAt: props.createdAt || new Date().toISOString(),
    lastActiveAt: props.lastActiveAt || '',
    isHuman: props.isHuman || false,
    hasConsoleAccess: props.hasConsoleAccess || false,
    hasMFA: props.hasMFA || false,
    effectivePermissions: props.effectivePermissions || [],
    tags: props.tags || {},
  };
}
