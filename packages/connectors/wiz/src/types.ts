// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Type definitions for Wiz connector
 */

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface GraphQLResponse<T> {
  data: T;
  errors?: Array<{ message: string; path?: string[] }>;
}

export interface WizCloudResource {
  id: string;
  name: string;
  type: string;
  cloudPlatform: string;
  cloudProviderURL: string;
  region: string;
  subscriptionId?: string;
  subscriptionName?: string;
  resourceGroupName?: string;
  status: string;
  tags: Record<string, string>;
  createdAt: string;
  updatedAt?: string;
  nativeType: string;
  providerUniqueId: string;
}

export interface WizVulnerability {
  id: string;
  name: string;
  detailedName: string;
  description: string;
  severity: string;
  cvssScore?: number;
  vendorSeverity?: string;
  cveId?: string;
  exploitabilityScore?: number;
  hasExploit: boolean;
  status: string;
  resolution?: string;
  fixedVersion?: string;
  detectedAt: string;
  resolvedAt?: string;
  affectedResource?: {
    id: string;
    name: string;
    type: string;
  };
  packages?: Array<{
    name: string;
    version: string;
    fixedVersion?: string;
  }>;
}

export interface WizIssue {
  id: string;
  type: string;
  control: {
    id: string;
    name: string;
    description: string;
    severity: string;
  };
  severity: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  dueAt?: string;
  statusChangedAt?: string;
  entitySnapshot?: {
    id: string;
    name: string;
    type: string;
    cloudPlatform?: string;
  };
  notes?: string;
}

export interface WizIdentity {
  id: string;
  name: string;
  type: string;
  cloudPlatform: string;
  cloudProviderURL: string;
  status: string;
  createdAt: string;
  lastActiveAt: string;
  isHuman: boolean;
  hasConsoleAccess: boolean;
  hasMFA: boolean;
  effectivePermissions: Array<{
    action: string;
    resource: string;
  }>;
  tags: Record<string, string>;
}
