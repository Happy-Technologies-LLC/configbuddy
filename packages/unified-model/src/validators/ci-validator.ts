/**
 * Configuration Item Validators (Zod schemas)
 */

import { z } from 'zod';

// Common validators
export const CITypeSchema = z.enum([
  'server',
  'virtual-machine',
  'container',
  'application',
  'service',
  'database',
  'network-device',
  'storage',
  'load-balancer',
  'cloud-resource',
  'software',
  'facility',
  'documentation',
]);

export const CIStatusSchema = z.enum([
  'active',
  'inactive',
  'maintenance',
  'decommissioned',
]);

export const EnvironmentSchema = z.enum([
  'production',
  'staging',
  'development',
  'test',
  'disaster-recovery',
]);

// ITIL validators
export const ITILCIClassSchema = z.enum([
  'hardware',
  'software',
  'service',
  'network',
  'facility',
  'documentation',
  'personnel',
]);

export const ITILLifecycleSchema = z.enum([
  'planning',
  'design',
  'build',
  'test',
  'deploy',
  'operate',
  'retire',
]);

export const ITILConfigStatusSchema = z.enum([
  'planned',
  'ordered',
  'in_development',
  'active',
  'maintenance',
  'retired',
  'disposed',
]);

export const AuditStatusSchema = z.enum([
  'compliant',
  'non_compliant',
  'unknown',
]);

export const ITILAttributesSchema = z.object({
  ci_class: ITILCIClassSchema,
  lifecycle_stage: ITILLifecycleSchema,
  configuration_status: ITILConfigStatusSchema,
  version: z.string(),
  baseline_id: z.string().optional(),
  last_audited: z.date(),
  audit_status: AuditStatusSchema,
});

// TBM validators
export const TBMResourceTowerSchema = z.enum([
  'compute',
  'storage',
  'network',
  'data',
  'security',
  'end_user',
  'facilities',
  'risk_compliance',
  'iot',
  'blockchain',
  'quantum',
]);

export const TBMCostPoolSchema = z.enum([
  'labor_internal',
  'labor_external',
  'hardware',
  'software',
  'cloud',
  'outside_services',
  'facilities',
  'telecom',
]);

export const AllocationMethodSchema = z.enum([
  'direct',
  'usage_based',
  'equal',
]);

export const DepreciationScheduleSchema = z.object({
  purchase_date: z.date(),
  purchase_cost: z.number().nonnegative(),
  useful_life_months: z.number().int().positive(),
  residual_value: z.number().nonnegative(),
  depreciation_method: z.enum(['straight_line', 'declining_balance']),
});

export const TBMCIAttributesSchema = z.object({
  resource_tower: TBMResourceTowerSchema,
  sub_tower: z.string().optional(),
  cost_pool: TBMCostPoolSchema,
  monthly_cost: z.number().nonnegative(),
  cost_allocation_method: AllocationMethodSchema,
  depreciation_schedule: DepreciationScheduleSchema.optional(),
});

// BSM validators
export const BusinessCriticalitySchema = z.enum([
  'tier_0',
  'tier_1',
  'tier_2',
  'tier_3',
  'tier_4',
]);

export const DataClassificationSchema = z.enum([
  'public',
  'internal',
  'confidential',
  'restricted',
  'highly_restricted',
]);

export const BSMCIAttributesSchema = z.object({
  business_criticality: BusinessCriticalitySchema,
  supports_business_services: z.array(z.string()),
  customer_facing: z.boolean(),
  compliance_scope: z.array(z.string()),
  data_classification: DataClassificationSchema,
});

// Location validator
export const LocationSchema = z.object({
  datacenter: z.string().optional(),
  region: z.string().optional(),
  availability_zone: z.string().optional(),
  rack: z.string().optional(),
  physical_address: z.string().optional(),
  coordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional(),
});

// Complete ConfigurationItem validator
export const ConfigurationItemSchema = z.object({
  id: z.string(),
  external_id: z.string().optional(),
  name: z.string().min(1),
  type: CITypeSchema,
  itil_attributes: ITILAttributesSchema,
  tbm_attributes: TBMCIAttributesSchema,
  bsm_attributes: BSMCIAttributesSchema,
  status: CIStatusSchema,
  environment: EnvironmentSchema,
  location: LocationSchema,
  owner: z.string(),
  technical_contact: z.string(),
  discovered_by: z.array(z.string()),
  discovery_confidence: z.number().min(0).max(100),
  last_discovered: z.date(),
  created_at: z.date(),
  updated_at: z.date(),
  created_by: z.string(),
  updated_by: z.string(),
  metadata: z.record(z.any()),
});

// Input validator (without auto-generated fields)
export const ConfigurationItemInputSchema = ConfigurationItemSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  created_by: true,
  updated_by: true,
});

// Update validator (all fields optional except metadata changes)
export const ConfigurationItemUpdateSchema = ConfigurationItemSchema.partial().omit({
  id: true,
  created_at: true,
  created_by: true,
});

/**
 * Type-safe validation function
 */
export function validateConfigurationItem(data: unknown) {
  return ConfigurationItemSchema.parse(data);
}

/**
 * Safe validation with error handling
 */
export function validateConfigurationItemSafe(data: unknown) {
  return ConfigurationItemSchema.safeParse(data);
}
