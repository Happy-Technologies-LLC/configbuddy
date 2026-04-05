// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Business Service - Unified v3.0
 * Bridge between IT (ITIL/TBM) and Business (BSM)
 */

import { AuditFields } from './common.types';
import { ITILBusinessServiceAttributes } from './itil.types';
import { TBMBusinessServiceAttributes } from './tbm.types';
import { BSMBusinessServiceAttributes, OperationalStatus } from './bsm.types';

/**
 * Unified Business Service (v3.0)
 *
 * Represents a service that delivers business value, combining:
 * - ITIL Service Management (SLAs, incidents, changes)
 * - TBM Cost Transparency (fully allocated costs)
 * - BSM Business Impact (criticality, revenue, compliance)
 *
 * @example
 * ```typescript
 * const customerPortal: BusinessService = {
 *   id: 'bs-portal-001',
 *   name: 'Customer Self-Service Portal',
 *   description: 'Online portal for customer account management',
 *   itil_attributes: {
 *     service_owner: 'john.doe@company.com',
 *     service_type: 'customer_facing',
 *     service_hours: {
 *       availability: '24x7',
 *       timezone: 'UTC',
 *       maintenance_windows: []
 *     },
 *     sla_targets: {
 *       availability_percentage: 99.9,
 *       response_time_ms: 200,
 *       error_rate_percentage: 0.1,
 *       measured_period: 'monthly'
 *     },
 *     support_level: 'l2',
 *     incident_count_30d: 3,
 *     change_count_30d: 5,
 *     availability_30d: 99.95
 *   },
 *   bsm_attributes: {
 *     business_criticality: 'tier_1',
 *     annual_revenue_supported: 50000000,
 *     customer_count: 125000,
 *     risk_rating: 'high',
 *     // ... other BSM fields
 *   },
 *   // ... other fields
 * };
 * ```
 */
export interface BusinessService extends AuditFields {
  id: string;
  name: string;
  description: string;

  // ITIL Service Management
  itil_attributes: ITILBusinessServiceAttributes;

  // TBM Cost Transparency
  tbm_attributes: TBMBusinessServiceAttributes;

  // Business Service Mapping
  bsm_attributes: BSMBusinessServiceAttributes;

  // Application dependencies
  application_services: string[]; // Application service IDs

  // Technical ownership
  technical_owner: string;
  platform_team: string;

  // Operational state
  operational_status: OperationalStatus;
  last_incident: Date;

  // Validation
  last_validated: Date; // Last time owner validated accuracy
}

/**
 * Partial BusinessService for updates
 */
export type BusinessServiceUpdate = Partial<Omit<BusinessService, 'id' | 'created_at' | 'created_by'>>;

/**
 * BusinessService creation input
 */
export type BusinessServiceInput = Omit<BusinessService, 'id' | 'created_at' | 'updated_at'>;

/**
 * Filters for querying Business Services
 */
export interface BusinessServiceFilters {
  service_type?: 'customer_facing' | 'internal' | 'infrastructure';
  business_criticality?: string;
  operational_status?: OperationalStatus | OperationalStatus[];
  technical_owner?: string;
  platform_team?: string;
  search?: string;
  limit?: number;
  offset?: number;
}
