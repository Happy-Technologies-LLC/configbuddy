/**
 * Business Capability - Unified v3.0
 * Maps to TBM Business Layer + BSM top level
 */

import { AuditFields } from './common.types';
import { TBMBusinessCapabilityAttributes } from './tbm.types';
import {
  CapabilityType,
  StrategicImportance,
  MaturityLevel,
  LifecycleStage,
  RevenueImpact,
} from './bsm.types';

/**
 * Unified Business Capability (v3.0)
 *
 * Represents a business capability that delivers value to the organization.
 * Combines TBM business layer costing with capability-based planning.
 *
 * @example
 * ```typescript
 * const orderManagement: BusinessCapability = {
 *   id: 'bc-order-mgmt-001',
 *   name: 'Order Management',
 *   description: 'End-to-end order processing capability',
 *   tbm_attributes: {
 *     business_unit: 'Sales & Operations',
 *     total_monthly_cost: 250000.00,
 *     cost_per_employee: 500.00,
 *     budget_annual: 3000000.00,
 *     variance_percentage: -2.5
 *   },
 *   capability_attributes: {
 *     capability_type: 'core',
 *     strategic_importance: 'critical',
 *     maturity_level: 'defined',
 *     lifecycle_stage: 'invest',
 *     capability_owner: 'jane.smith@company.com'
 *   },
 *   // ... other fields
 * };
 * ```
 */
export interface BusinessCapability extends AuditFields {
  id: string;
  name: string;
  description: string;

  // TBM Business Layer
  tbm_attributes: TBMBusinessCapabilityAttributes;

  // Business context
  capability_attributes: CapabilityAttributes;

  // Business value
  value_attributes: ValueAttributes;

  // Supported by
  business_services: string[]; // Business service IDs
  key_applications: string[]; // Application service IDs
}

/**
 * Capability-specific attributes
 */
export interface CapabilityAttributes {
  capability_type: CapabilityType;
  parent_capability_id?: string;
  strategic_importance: StrategicImportance;
  maturity_level: MaturityLevel;
  lifecycle_stage: LifecycleStage;
  capability_owner: string; // VP, Director
}

/**
 * Value attributes
 */
export interface ValueAttributes {
  revenue_impact: RevenueImpact;
  customer_facing: boolean;
  user_count: number;
  regulatory_requirements: string[];
  competitive_advantage: boolean;
}

/**
 * Partial BusinessCapability for updates
 */
export type BusinessCapabilityUpdate = Partial<Omit<BusinessCapability, 'id' | 'created_at' | 'created_by'>>;

/**
 * BusinessCapability creation input
 */
export type BusinessCapabilityInput = Omit<BusinessCapability, 'id' | 'created_at' | 'updated_at'>;

/**
 * Filters for querying Business Capabilities
 */
export interface BusinessCapabilityFilters {
  capability_type?: CapabilityType | CapabilityType[];
  strategic_importance?: StrategicImportance | StrategicImportance[];
  lifecycle_stage?: LifecycleStage | LifecycleStage[];
  business_unit?: string;
  capability_owner?: string;
  parent_capability_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}
