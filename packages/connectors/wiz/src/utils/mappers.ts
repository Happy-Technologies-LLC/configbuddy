// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Status mapping and utility functions for Wiz connector
 */

export const mapStatus = {
  resource: (status: string): string => {
    const mapping: Record<string, string> = {
      'Active': 'active',
      'Running': 'active',
      'Available': 'active',
      'Stopped': 'inactive',
      'Terminated': 'decommissioned',
      'Deleting': 'decommissioned',
    };
    return mapping[status] || 'active';
  },

  vulnerability: (status: string): string => {
    const mapping: Record<string, string> = {
      'OPEN': 'active',
      'IN_PROGRESS': 'active',
      'RESOLVED': 'inactive',
      'REJECTED': 'inactive',
    };
    return mapping[status] || 'active';
  },

  issue: (status: string): string => {
    const mapping: Record<string, string> = {
      'OPEN': 'active',
      'IN_PROGRESS': 'active',
      'RESOLVED': 'inactive',
      'REJECTED': 'inactive',
    };
    return mapping[status] || 'active';
  },

  identity: (status: string): string => {
    const mapping: Record<string, string> = {
      'Active': 'active',
      'Inactive': 'inactive',
      'Disabled': 'inactive',
    };
    return mapping[status] || 'active';
  },
};

export function inferEnvironment(tags: Record<string, string>): string {
  const envTag = tags?.['Environment'] || tags?.['environment'] || tags?.['env'];
  if (envTag) {
    const envLower = envTag.toLowerCase();
    if (envLower.includes('prod')) return 'production';
    if (envLower.includes('staging') || envLower.includes('stg')) return 'staging';
    if (envLower.includes('dev')) return 'development';
    if (envLower.includes('test') || envLower.includes('qa')) return 'test';
  }
  return 'production';
}
