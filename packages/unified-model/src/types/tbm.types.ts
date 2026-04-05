// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * TBM (Technology Business Management) v5.0.1 types
 */

/**
 * TBM Resource Tower
 * Top-level categorization of IT resources
 */
export type TBMResourceTower =
  | 'compute'
  | 'storage'
  | 'network'
  | 'data'
  | 'security'
  | 'end_user'
  | 'facilities'
  | 'risk_compliance'
  | 'iot'
  | 'blockchain'
  | 'quantum';

/**
 * TBM Cost Pool
 * Categories of IT costs
 */
export type TBMCostPool =
  | 'labor_internal'
  | 'labor_external'
  | 'hardware'
  | 'software'
  | 'cloud'
  | 'outside_services'
  | 'facilities'
  | 'telecom';

/**
 * Cost Allocation Method
 */
export type AllocationMethod =
  | 'direct'
  | 'usage_based'
  | 'equal';

/**
 * Depreciation Schedule
 */
export interface DepreciationSchedule {
  purchase_date: Date;
  purchase_cost: number;
  useful_life_months: number;
  residual_value: number;
  depreciation_method: 'straight_line' | 'declining_balance';
}

/**
 * TBM attributes for Configuration Items
 */
export interface TBMCIAttributes {
  resource_tower: TBMResourceTower;
  sub_tower?: string;
  cost_pool: TBMCostPool;
  monthly_cost: number;
  cost_allocation_method: AllocationMethod;
  depreciation_schedule?: DepreciationSchedule;
}

/**
 * Cost Breakdown
 */
export interface CostBreakdown {
  infrastructure: number;
  licenses: number;
  labor: number;
  support: number;
}

/**
 * Cost Trend
 */
export type CostTrend = 'increasing' | 'stable' | 'decreasing';

/**
 * TBM IT Solution attributes
 */
export interface TBMITSolutionAttributes {
  solution_type: 'application' | 'platform' | 'infrastructure_service';
  it_tower_alignment: string;
  total_monthly_cost: number;
  cost_breakdown: CostBreakdown;
}

/**
 * TBM Business Service attributes
 */
export interface TBMBusinessServiceAttributes {
  total_monthly_cost: number;
  cost_per_user: number;
  cost_per_transaction: number;
  cost_breakdown_by_tower: Record<string, number>;
  cost_trend: CostTrend;
}

/**
 * TBM Business Capability attributes
 */
export interface TBMBusinessCapabilityAttributes {
  business_unit: string;
  total_monthly_cost: number;
  cost_per_employee: number;
  budget_annual: number;
  variance_percentage: number;
}
