/**
 * Business Service Validators (Zod schemas)
 */

import { z } from 'zod';
import { BusinessCriticalitySchema, DataClassificationSchema } from './ci-validator';

// ITIL Service validators
export const ServiceHoursSchema = z.object({
  availability: z.enum(['24x7', '24x5', 'business_hours', 'custom']),
  business_hours_start: z.string().optional(),
  business_hours_end: z.string().optional(),
  timezone: z.string(),
  maintenance_windows: z.array(z.object({
    day_of_week: z.number().int().min(0).max(6),
    start_time: z.string().regex(/^\d{2}:\d{2}$/),
    end_time: z.string().regex(/^\d{2}:\d{2}$/),
    frequency: z.enum(['weekly', 'monthly']),
  })),
});

export const SLATargetsSchema = z.object({
  availability_percentage: z.number().min(0).max(100),
  response_time_ms: z.number().nonnegative(),
  error_rate_percentage: z.number().min(0).max(100),
  measured_period: z.enum(['monthly', 'quarterly', 'annually']),
});

export const SupportLevelSchema = z.enum(['l1', 'l2', 'l3', 'l4']);

export const ITILBusinessServiceAttributesSchema = z.object({
  service_owner: z.string(),
  service_type: z.enum(['customer_facing', 'internal', 'infrastructure']),
  service_hours: ServiceHoursSchema,
  sla_targets: SLATargetsSchema,
  support_level: SupportLevelSchema,
  incident_count_30d: z.number().int().nonnegative(),
  change_count_30d: z.number().int().nonnegative(),
  availability_30d: z.number().min(0).max(100),
});

// TBM Service validators
export const CostTrendSchema = z.enum(['increasing', 'stable', 'decreasing']);

export const TBMBusinessServiceAttributesSchema = z.object({
  total_monthly_cost: z.number().nonnegative(),
  cost_per_user: z.number().nonnegative(),
  cost_per_transaction: z.number().nonnegative(),
  cost_breakdown_by_tower: z.record(z.number().nonnegative()),
  cost_trend: CostTrendSchema,
});

// BSM Service validators
export const RiskRatingSchema = z.enum(['critical', 'high', 'medium', 'low']);

export const ComplianceFrameworkSchema = z.enum([
  'GDPR',
  'HIPAA',
  'PCI_DSS',
  'SOX',
  'FINRA',
  'ISO27001',
  'SOC2',
]);

export const ComplianceRequirementSchema = z.object({
  framework: ComplianceFrameworkSchema,
  applicable: z.boolean(),
  last_audit: z.date(),
  next_audit: z.date(),
  compliance_status: z.enum(['compliant', 'non_compliant', 'unknown']),
  findings_count: z.number().int().nonnegative(),
});

export const BSMBusinessServiceAttributesSchema = z.object({
  business_criticality: BusinessCriticalitySchema,
  capabilities_enabled: z.array(z.string()),
  value_streams: z.array(z.string()),
  business_impact_score: z.number().min(0).max(100),
  risk_rating: RiskRatingSchema,
  annual_revenue_supported: z.number().nonnegative(),
  customer_count: z.number().int().nonnegative(),
  transaction_volume_daily: z.number().int().nonnegative(),
  compliance_requirements: z.array(ComplianceRequirementSchema),
  data_sensitivity: DataClassificationSchema,
  sox_scope: z.boolean(),
  pci_scope: z.boolean(),
  recovery_time_objective: z.number().int().nonnegative(),
  recovery_point_objective: z.number().int().nonnegative(),
  disaster_recovery_tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
});

// Operational Status
export const OperationalStatusSchema = z.enum([
  'operational',
  'degraded',
  'outage',
  'maintenance',
]);

// Complete BusinessService validator
export const BusinessServiceSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  itil_attributes: ITILBusinessServiceAttributesSchema,
  tbm_attributes: TBMBusinessServiceAttributesSchema,
  bsm_attributes: BSMBusinessServiceAttributesSchema,
  application_services: z.array(z.string()),
  technical_owner: z.string(),
  platform_team: z.string(),
  operational_status: OperationalStatusSchema,
  last_incident: z.date(),
  created_at: z.date(),
  updated_at: z.date(),
  last_validated: z.date(),
});

// Input validator
export const BusinessServiceInputSchema = BusinessServiceSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Update validator
export const BusinessServiceUpdateSchema = BusinessServiceSchema.partial().omit({
  id: true,
  created_at: true,
});

/**
 * Type-safe validation function
 */
export function validateBusinessService(data: unknown) {
  return BusinessServiceSchema.parse(data);
}

/**
 * Safe validation with error handling
 */
export function validateBusinessServiceSafe(data: unknown) {
  return BusinessServiceSchema.safeParse(data);
}
