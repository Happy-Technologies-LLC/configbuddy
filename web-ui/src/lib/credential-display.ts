/**
 * Display Formatting Utilities for Credentials
 * Maps internal protocol/scope values to user-friendly display strings
 */

import type { AuthProtocol, CredentialScope } from '@/services/credential.service';

/**
 * Protocol Display Names
 */
export const PROTOCOL_DISPLAY_NAMES: Record<AuthProtocol, string> = {
  oauth2: 'OAuth 2.0',
  api_key: 'API Key',
  basic: 'Basic Auth',
  bearer: 'Bearer Token',
  aws_iam: 'AWS IAM',
  azure_sp: 'Azure Service Principal',
  gcp_sa: 'GCP Service Account',
  ssh_key: 'SSH Key',
  ssh_password: 'SSH Password',
  certificate: 'Certificate',
  kerberos: 'Kerberos',
  snmp_v2c: 'SNMP v2c',
  snmp_v3: 'SNMP v3',
  winrm: 'WinRM',
};

/**
 * Scope Display Names
 */
export const SCOPE_DISPLAY_NAMES: Record<CredentialScope, string> = {
  cloud_provider: 'Cloud Provider',
  ssh: 'SSH',
  api: 'API',
  network: 'Network',
  database: 'Database',
  container: 'Container',
  universal: 'Universal',
};

/**
 * Format protocol for display
 */
export function formatProtocol(protocol: AuthProtocol): string {
  return PROTOCOL_DISPLAY_NAMES[protocol] || protocol;
}

/**
 * Format scope for display
 */
export function formatScope(scope: CredentialScope): string {
  return SCOPE_DISPLAY_NAMES[scope] || scope;
}

/**
 * Format generic snake_case or kebab-case string to Title Case
 */
export function formatLabel(value: string): string {
  return value
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
