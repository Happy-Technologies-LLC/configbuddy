/**
 * Transformation functions for Wiz data to CMDB format
 */

import { TransformedCI } from '@cmdb/integration-framework';
import {
  WizCloudResource,
  WizVulnerability,
  WizIssue,
  WizIdentity,
} from '../types';
import { inferEnvironment, mapStatus } from '../utils/mappers';

export function transformCloudResource(resource: WizCloudResource): TransformedCI {
  return {
    name: resource.name,
    ci_type: 'cloud-resource',
    environment: inferEnvironment(resource.tags),
    status: mapStatus.resource(resource.status),
    attributes: {
      wiz_id: resource.id,
      resource_type: resource.type,
      native_type: resource.nativeType,
      cloud_platform: resource.cloudPlatform,
      cloud_provider_url: resource.cloudProviderURL,
      region: resource.region,
      subscription_id: resource.subscriptionId,
      subscription_name: resource.subscriptionName,
      resource_group: resource.resourceGroupName,
      provider_unique_id: resource.providerUniqueId,
      tags: resource.tags,
      created_at: resource.createdAt,
      updated_at: resource.updatedAt,
    },
    identifiers: {
      external_id: resource.id,
      custom_identifiers: {
        wiz_id: resource.id,
        provider_unique_id: resource.providerUniqueId,
        cloud_platform: resource.cloudPlatform,
      },
    },
    source: 'wiz',
    source_id: resource.id,
    confidence_score: 95,
  };
}

export function transformVulnerability(vuln: WizVulnerability): TransformedCI {
  return {
    name: vuln.cveId || vuln.name,
    ci_type: 'vulnerability',
    environment: 'production',
    status: mapStatus.vulnerability(vuln.status),
    attributes: {
      wiz_id: vuln.id,
      vulnerability_name: vuln.name,
      detailed_name: vuln.detailedName,
      description: vuln.description,
      severity: vuln.severity,
      cvss_score: vuln.cvssScore,
      vendor_severity: vuln.vendorSeverity,
      cve_id: vuln.cveId,
      exploitability_score: vuln.exploitabilityScore,
      has_exploit: vuln.hasExploit,
      resolution: vuln.resolution,
      fixed_version: vuln.fixedVersion,
      detected_at: vuln.detectedAt,
      resolved_at: vuln.resolvedAt,
      affected_resource_id: vuln.affectedResource?.id,
      affected_resource_name: vuln.affectedResource?.name,
      affected_resource_type: vuln.affectedResource?.type,
      packages: vuln.packages,
    },
    identifiers: {
      external_id: vuln.id,
      custom_identifiers: {
        wiz_id: vuln.id,
        cve_id: vuln.cveId || '',
        affected_resource_id: vuln.affectedResource?.id || '',
      },
    },
    source: 'wiz',
    source_id: vuln.id,
    confidence_score: 90,
  };
}

export function transformIssue(issue: WizIssue): TransformedCI {
  return {
    name: issue.control.name,
    ci_type: 'security-issue',
    environment: 'production',
    status: mapStatus.issue(issue.status),
    attributes: {
      wiz_id: issue.id,
      issue_type: issue.type,
      control_id: issue.control.id,
      control_name: issue.control.name,
      control_description: issue.control.description,
      control_severity: issue.control.severity,
      severity: issue.severity,
      created_at: issue.createdAt,
      updated_at: issue.updatedAt,
      resolved_at: issue.resolvedAt,
      due_at: issue.dueAt,
      status_changed_at: issue.statusChangedAt,
      entity_snapshot_id: issue.entitySnapshot?.id,
      entity_snapshot_name: issue.entitySnapshot?.name,
      entity_snapshot_type: issue.entitySnapshot?.type,
      entity_snapshot_cloud_platform: issue.entitySnapshot?.cloudPlatform,
      notes: issue.notes,
    },
    identifiers: {
      external_id: issue.id,
      custom_identifiers: {
        wiz_id: issue.id,
        control_id: issue.control.id,
        entity_snapshot_id: issue.entitySnapshot?.id || '',
      },
    },
    source: 'wiz',
    source_id: issue.id,
    confidence_score: 85,
  };
}

export function transformIdentity(identity: WizIdentity): TransformedCI {
  return {
    name: identity.name,
    ci_type: 'identity',
    environment: 'production',
    status: mapStatus.identity(identity.status),
    attributes: {
      wiz_id: identity.id,
      identity_type: identity.type,
      cloud_platform: identity.cloudPlatform,
      cloud_provider_url: identity.cloudProviderURL || '',
      created_at: identity.createdAt,
      last_active_at: identity.lastActiveAt || '',
      is_human: identity.isHuman,
      has_console_access: identity.hasConsoleAccess,
      has_mfa: identity.hasMFA,
      effective_permissions: identity.effectivePermissions,
      tags: identity.tags || {},
    },
    identifiers: {
      external_id: identity.id,
      custom_identifiers: {
        wiz_id: identity.id,
        cloud_platform: identity.cloudPlatform,
        identity_type: identity.type,
      },
    },
    source: 'wiz',
    source_id: identity.id,
    confidence_score: 90,
  };
}
