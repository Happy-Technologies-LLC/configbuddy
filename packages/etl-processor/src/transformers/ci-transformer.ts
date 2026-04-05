// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * CI Transformer
 *
 * Transforms Configuration Item (CI) data between different formats and structures.
 * Handles conversions between:
 * - Neo4j graph format
 * - PostgreSQL relational format
 * - API DTOs
 * - Internal domain models
 */

import { CI, CIInput, CIType, CIStatus, Environment, logger } from '@cmdb/common';

/**
 * Neo4j node representation
 */
export interface Neo4jNode {
  _identity: string;
  _labels: string[];
  _properties: Record<string, any>;
}

/**
 * PostgreSQL row representation
 */
export interface PostgresRow {
  _ci_id: string;
  _ci_name: string;
  _ci_type: CIType;
  _status: CIStatus;
  environment?: Environment;
  external_id?: string;
  _created_at: Date;
  _updated_at: Date;
  _discovered_at: Date;
  metadata?: Record<string, any>;
}

/**
 * API DTO for CI creation/update
 */
export interface CIDTO {
  _id: string;
  _name: string;
  _type: CIType;
  status?: CIStatus;
  environment?: Environment;
  externalId?: string;
  metadata?: Record<string, any>;
}

/**
 * Data quality check result
 */
export interface DataQualityResult {
  _isValid: boolean;
  _errors: string[];
  _warnings: string[];
  _score: number; // 0-100
}

/**
 * Nested metadata extraction result
 */
export interface ExtractedMetadata {
  cloud?: {
    provider?: string;
    region?: string;
    availabilityZone?: string;
    accountId?: string;
  };
  compute?: {
    instanceType?: string;
    vcpus?: number;
    memory?: string;
    architecture?: string;
  };
  network?: {
    ipAddresses?: string[];
    vpc?: string;
    subnet?: string;
    securityGroups?: string[];
  };
  tags?: Record<string, string>;
  custom?: Record<string, any>;
}

/**
 * Main CI transformer class
 */
export class CITransformer {

  /**
   * Transform Neo4j node to CI domain model with data quality validation
   */
  fromNeo4jNode(node: Neo4jNode): CI {
    const props = node._properties;

    const ci: CI = {
      _id: props['id'],
      external_id: props['external_id'],
      name: props['name'],
      _type: this.validateCIType(props['type']),
      _status: this.validateCIStatus(props['status']),
      environment: props['environment'] as Environment | undefined,
      _created_at: this.formatDateTime(props['created_at']),
      _updated_at: this.formatDateTime(props['updated_at']),
      _discovered_at: this.formatDateTime(props['discovered_at']),
      _metadata: this.parseMetadata(props['metadata'])
    };

    // Perform data quality check and log issues
    const qualityCheck = this.checkDataQuality(ci);
    if (!qualityCheck._isValid) {
      logger.warn('Data quality issues detected for CI', {
        _ciId: ci._id,
        _errors: qualityCheck._errors,
        _warnings: qualityCheck._warnings,
        _score: qualityCheck._score
      });
    }

    return ci;
  }

  /**
   * Perform comprehensive data quality checks on CI data
   */
  checkDataQuality(ci: CI): DataQualityResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    // Critical checks (reduce score significantly)
    if (!ci._id || ci._id.trim() === '') {
      errors.push('CI ID is missing or empty');
      score -= 30;
    }

    if (!ci.name || ci.name.trim() === '') {
      errors.push('CI name is missing or empty');
      score -= 20;
    }

    if (!ci._type) {
      errors.push('CI type is missing');
      score -= 20;
    }

    // Important checks (moderate score reduction)
    if (!ci._status) {
      warnings.push('CI status is missing, defaulting to active');
      score -= 10;
    }

    if (!ci._created_at) {
      warnings.push('CI created_at timestamp is missing');
      score -= 5;
    }

    if (!ci._updated_at) {
      warnings.push('CI updated_at timestamp is missing');
      score -= 5;
    }

    if (!ci._discovered_at) {
      warnings.push('CI discovered_at timestamp is missing');
      score -= 5;
    }

    // Timestamp validation
    try {
      const created = new Date(ci._created_at);
      const updated = new Date(ci._updated_at);
      const discovered = new Date(ci._discovered_at);

      if (isNaN(created.getTime())) {
        errors.push('Invalid created_at timestamp');
        score -= 10;
      }

      if (isNaN(updated.getTime())) {
        errors.push('Invalid updated_at timestamp');
        score -= 10;
      }

      if (isNaN(discovered.getTime())) {
        errors.push('Invalid discovered_at timestamp');
        score -= 10;
      }

      // Logical timestamp checks
      if (updated.getTime() < created.getTime()) {
        warnings.push('updated_at is before created_at');
        score -= 5;
      }

      // Check for future dates
      const now = Date.now();
      if (created.getTime() > now) {
        warnings.push('created_at is in the future');
        score -= 5;
      }
    } catch (error) {
      errors.push('Timestamp validation failed');
      score -= 10;
    }

    // Metadata checks
    if (!ci._metadata || Object.keys(ci._metadata).length === 0) {
      warnings.push('CI has no metadata');
      score -= 5;
    } else {
      // Check for null or undefined values in metadata
      const nullKeys = Object.entries(ci._metadata)
        .filter(([_, v]) => v === null || v === undefined)
        .map(([k, _]) => k);

      if (nullKeys.length > 0) {
        warnings.push(`Metadata contains null/undefined values: ${nullKeys.join(', ')}`);
        score -= 2;
      }
    }

    // Name quality checks
    if (ci.name && (ci.name.toLowerCase().includes('unknown') || ci.name.toLowerCase().includes('unnamed'))) {
      warnings.push('CI name appears to be a placeholder');
      score -= 5;
    }

    // Environment validation
    if (ci.environment) {
      const validEnvs: Environment[] = ['production', 'staging', 'development', 'test'];
      if (!validEnvs.includes(ci.environment)) {
        warnings.push(`Invalid environment value: ${ci.environment}`);
        score -= 5;
      }
    }

    return {
      _isValid: errors.length === 0,
      _errors: errors,
      _warnings: warnings,
      _score: Math.max(0, score)
    };
  }

  /**
   * Extract and structure nested metadata from raw metadata object
   */
  extractNestedMetadata(metadata: Record<string, any>): ExtractedMetadata {
    const extracted: ExtractedMetadata = {
      cloud: {},
      compute: {},
      network: {},
      tags: {},
      custom: {}
    };

    // Cloud provider information
    extracted.cloud = {
      provider: metadata['cloud_provider'] || metadata['provider'] || this.inferProviderFromMetadata(metadata),
      region: metadata['region'] || metadata['aws_region'] || metadata['azure_region'] || metadata['gcp_region'],
      availabilityZone: metadata['availability_zone'] || metadata['az'] || metadata['zone'],
      accountId: metadata['account_id'] || metadata['aws_account_id'] || metadata['azure_subscription_id'] || metadata['gcp_project_id']
    };

    // Compute resources
    extracted.compute = {
      instanceType: metadata['instance_type'] || metadata['vm_size'] || metadata['machine_type'],
      vcpus: this.parseNumber(metadata['vcpus'] || metadata['cpu_count'] || metadata['cores']),
      memory: metadata['memory'] || metadata['ram'] || metadata['memory_gb'],
      architecture: metadata['architecture'] || metadata['arch'] || metadata['cpu_architecture']
    };

    // Network information
    extracted.network = {
      ipAddresses: this.extractIpAddresses(metadata),
      vpc: metadata['vpc_id'] || metadata['vnet_id'] || metadata['network'],
      subnet: metadata['subnet_id'] || metadata['subnet'],
      securityGroups: this.extractArray(metadata['security_groups'] || metadata['security_group_ids'])
    };

    // Tags (normalize various tag formats)
    if (metadata['tags']) {
      if (Array.isArray(metadata['tags'])) {
        // Convert array of {Key, Value} to object
        extracted.tags = metadata['tags'].reduce((acc: Record<string, string>, tag: any) => {
          if (tag.Key && tag.Value) {
            acc[tag.Key] = tag.Value;
          } else if (tag.key && tag.value) {
            acc[tag.key] = tag.value;
          }
          return acc;
        }, {});
      } else if (typeof metadata['tags'] === 'object') {
        extracted.tags = metadata['tags'];
      }
    }

    // Custom metadata (everything else)
    const knownKeys = [
      'cloud_provider', 'provider', 'region', 'aws_region', 'azure_region', 'gcp_region',
      'availability_zone', 'az', 'zone', 'account_id', 'aws_account_id', 'azure_subscription_id',
      'gcp_project_id', 'instance_type', 'vm_size', 'machine_type', 'vcpus', 'cpu_count',
      'cores', 'memory', 'ram', 'memory_gb', 'architecture', 'arch', 'cpu_architecture',
      'ip_address', 'private_ip', 'public_ip', 'ip_addresses', 'vpc_id', 'vnet_id', 'network',
      'subnet_id', 'subnet', 'security_groups', 'security_group_ids', 'tags'
    ];

    Object.entries(metadata).forEach(([key, value]) => {
      if (!knownKeys.includes(key) && value !== null && value !== undefined) {
        extracted.custom![key] = value;
      }
    });

    return extracted;
  }

  /**
   * Infer cloud provider from metadata patterns
   */
  private inferProviderFromMetadata(metadata: Record<string, any>): string | undefined {
    if (metadata['aws_region'] || metadata['aws_account_id'] || metadata['instance_id']?.startsWith('i-')) {
      return 'aws';
    }
    if (metadata['azure_region'] || metadata['azure_subscription_id'] || metadata['resource_group']) {
      return 'azure';
    }
    if (metadata['gcp_project_id'] || metadata['gcp_zone'] || metadata['instance_id']?.match(/^\d+$/)) {
      return 'gcp';
    }
    return undefined;
  }

  /**
   * Extract IP addresses from various metadata formats
   */
  private extractIpAddresses(metadata: Record<string, any>): string[] {
    const ips: string[] = [];

    if (metadata['ip_address']) {
      ips.push(metadata['ip_address']);
    }
    if (metadata['private_ip']) {
      ips.push(metadata['private_ip']);
    }
    if (metadata['public_ip']) {
      ips.push(metadata['public_ip']);
    }
    if (metadata['ip_addresses']) {
      if (Array.isArray(metadata['ip_addresses'])) {
        ips.push(...metadata['ip_addresses']);
      } else if (typeof metadata['ip_addresses'] === 'string') {
        ips.push(metadata['ip_addresses']);
      }
    }

    // Deduplicate and filter valid IPs
    return [...new Set(ips)].filter(ip => this.isValidIP(ip));
  }

  /**
   * Validate IP address format (simple check)
   */
  private isValidIP(ip: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * Extract array from various formats
   */
  private extractArray(value: any): string[] | undefined {
    if (!value) return undefined;
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string') {
      // Try to parse as JSON array
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {
        // If not JSON, split by comma
        return value.split(',').map(s => s.trim());
      }
    }
    return [String(value)];
  }

  /**
   * Parse number from various formats
   */
  private parseNumber(value: any): number | undefined {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }

  /**
   * Transform CI domain model to Neo4j properties
   */
  toNeo4jProperties(ci: CI | CIInput): Record<string, any> {
    return {
      id: ci._id,
      external_id: ci.external_id || null,
      name: ci.name,
      type: ci._type,
      status: 'status' in ci && ci.status ? ci.status : 'active',
      environment: ci.environment || null,
      discovered_at: 'discovered_at' in ci ? ci.discovered_at : new Date().toISOString(),
      metadata: JSON.stringify('_metadata' in ci ? ci._metadata : ci.metadata || {})
    };
  }

  /**
   * Transform PostgreSQL row to CI domain model
   */
  fromPostgresRow(row: PostgresRow): CI {
    return {
      _id: row._ci_id,
      external_id: row.external_id,
      name: row._ci_name,
      _type: row._ci_type,
      _status: row._status,
      environment: row.environment,
      _created_at: row._created_at.toISOString(),
      _updated_at: row._updated_at.toISOString(),
      _discovered_at: row._discovered_at.toISOString(),
      _metadata: row.metadata || {}
    };
  }

  /**
   * Transform CI domain model to PostgreSQL insert values
   */
  toPostgresValues(ci: CI): any[] {
    return [
      ci._id,
      ci.name,
      ci._type,
      ci._status,
      ci.environment || null,
      ci.external_id || null,
      new Date(ci._created_at),
      new Date(ci._updated_at),
      new Date(ci._discovered_at),
      ci._metadata
    ];
  }

  /**
   * Transform API DTO to CI domain model
   */
  fromDTO(dto: CIDTO): CIInput {
    return {
      _id: dto._id,
      name: dto._name,
      _type: dto._type,
      status: dto.status || 'active',
      environment: dto.environment,
      external_id: dto.externalId,
      metadata: dto.metadata
    };
  }

  /**
   * Transform CI domain model to API DTO
   */
  toDTO(ci: CI): CIDTO {
    return {
      _id: ci._id,
      _name: ci.name,
      _type: ci._type,
      status: ci._status,
      environment: ci.environment,
      externalId: ci.external_id,
      metadata: ci._metadata
    };
  }

  /**
   * Normalize CI data (ensure consistent format)
   */
  normalize(ci: Partial<CI>): CI {
    const now = new Date().toISOString();

    return {
      _id: ci._id || '',
      external_id: ci.external_id,
      name: ci.name || 'Unknown',
      _type: ci._type || 'cloud-resource',
      _status: ci._status || 'active',
      environment: ci.environment,
      _created_at: ci._created_at || now,
      _updated_at: ci._updated_at || now,
      _discovered_at: ci._discovered_at || now,
      _metadata: ci._metadata || {}
    };
  }

  /**
   * Merge two CI objects (useful for updates)
   */
  merge(existing: CI, updates: Partial<CIInput>): CI {
    return {
      ...existing,
      name: updates.name ?? existing.name,
      _type: updates._type ?? existing._type,
      _status: updates.status ?? existing._status,
      environment: updates.environment ?? existing.environment,
      external_id: updates.external_id ?? existing.external_id,
      _updated_at: new Date().toISOString(),
      _metadata: {
        ...existing._metadata,
        ...(updates.metadata || {})
      }
    };
  }

  /**
   * Extract changed fields between two CIs
   */
  getChangedFields(oldCI: CI, newCI: CI): Record<string, { old: any; new: any }> {
    const changes: Record<string, { old: any; new: any }> = {};

    const fieldsToCheck: Array<keyof CI> = [
      'name', '_type', '_status', 'environment', 'external_id'
    ];

    for (const field of fieldsToCheck) {
      if (oldCI[field] !== newCI[field]) {
        changes[field] = {
          old: oldCI[field],
          new: newCI[field]
        };
      }
    }

    // Check metadata changes
    const oldMeta = JSON.stringify(oldCI['_metadata']);
    const newMeta = JSON.stringify(newCI['_metadata']);

    if (oldMeta !== newMeta) {
      changes['metadata'] = {
        old: oldCI['_metadata'],
        new: newCI['_metadata']
      };
    }

    return changes;
  }

  /**
   * Validate and normalize CI type
   */
  private validateCIType(type: any): CIType {
    const validTypes: CIType[] = [
      'server', 'virtual-machine', 'container', 'application',
      'service', 'database', 'network-device', 'storage',
      'load-balancer', 'cloud-resource'
    ];

    if (validTypes.includes(type)) {
      return type as CIType;
    }

    // Default to cloud-resource if invalid
    return 'cloud-resource';
  }

  /**
   * Validate and normalize CI status
   */
  private validateCIStatus(status: any): CIStatus {
    const validStatuses: CIStatus[] = ['active', 'inactive', 'maintenance', 'decommissioned'];

    if (validStatuses.includes(status)) {
      return status as CIStatus;
    }

    // Default to active if invalid
    return 'active';
  }

  /**
   * Format datetime values to ISO 8601 string
   */
  private formatDateTime(value: any): string {
    if (!value) {
      return new Date().toISOString();
    }

    if (typeof value === 'string') {
      return value;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    // Handle Neo4j DateTime objects
    if (typeof value === 'object' && 'toString' in value) {
      return value.toString();
    }

    return new Date().toISOString();
  }

  /**
   * Parse metadata from various formats
   */
  private parseMetadata(value: any): Record<string, any> {
    if (!value) {
      return {};
    }

    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    }

    if (typeof value === 'object') {
      return value;
    }

    return {};
  }
}
