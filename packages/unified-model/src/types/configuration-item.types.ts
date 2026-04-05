// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Configuration Item (CI) - Unified v3.0
 * Serves ITIL, TBM, and BSM requirements
 */

import { CIType, CIStatus, Environment, Location, AuditFields, DiscoveryMetadata } from './common.types';
import { ITILAttributes } from './itil.types';
import { TBMCIAttributes } from './tbm.types';
import { BSMCIAttributes } from './bsm.types';

/**
 * Unified Configuration Item (v3.0)
 *
 * This is the core entity that represents any IT infrastructure component,
 * enriched with attributes from ITIL Service Configuration Management,
 * TBM Cost Allocation, and Business Service Mapping frameworks.
 *
 * @example
 * ```typescript
 * const webServer: ConfigurationItem = {
 *   id: 'ci-web-001',
 *   name: 'Web Server - Production',
 *   type: 'server',
 *   itil_attributes: {
 *     ci_class: 'hardware',
 *     lifecycle_stage: 'operate',
 *     configuration_status: 'active',
 *     version: '1.0.0',
 *     last_audited: new Date(),
 *     audit_status: 'compliant'
 *   },
 *   tbm_attributes: {
 *     resource_tower: 'compute',
 *     sub_tower: 'Physical Servers',
 *     cost_pool: 'hardware',
 *     monthly_cost: 1500.00,
 *     cost_allocation_method: 'usage_based'
 *   },
 *   bsm_attributes: {
 *     business_criticality: 'tier_1',
 *     supports_business_services: ['bs-ecommerce-001'],
 *     customer_facing: true,
 *     compliance_scope: ['PCI_DSS', 'SOX'],
 *     data_classification: 'confidential'
 *   },
 *   // ... other fields
 * };
 * ```
 */
export interface ConfigurationItem extends AuditFields, DiscoveryMetadata {
  // Core identity
  id: string;
  external_id?: string;
  name: string;
  type: CIType;

  // ITIL Service Configuration Management
  itil_attributes: ITILAttributes;

  // TBM Cost Allocation
  tbm_attributes: TBMCIAttributes;

  // Business Service Mapping
  bsm_attributes: BSMCIAttributes;

  // Common operational attributes
  status: CIStatus;
  environment: Environment;
  location: Location;
  owner: string;
  technical_contact: string;

  // Flexible metadata for connector-specific data
  metadata: Record<string, any>;
}

/**
 * Partial ConfigurationItem for updates
 */
export type ConfigurationItemUpdate = Partial<Omit<ConfigurationItem, 'id' | 'created_at' | 'created_by'>>;

/**
 * ConfigurationItem creation input
 */
export type ConfigurationItemInput = Omit<ConfigurationItem, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>;

/**
 * Filters for querying CIs
 */
export interface CIFilters {
  type?: CIType | CIType[];
  status?: CIStatus | CIStatus[];
  environment?: Environment | Environment[];
  owner?: string;
  business_criticality?: string;
  resource_tower?: string;
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}
