// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Cost Calculation Types
 */

import { DepreciationMethod } from './tbm-types';

/**
 * Depreciation Schedule
 */
export interface DepreciationSchedule {
  purchaseDate: Date;
  purchasePrice: number;
  method: DepreciationMethod;
  depreciationYears: number;
  residualValue: number;
  salvageValue?: number;
}

/**
 * Depreciation Calculation Result
 */
export interface DepreciationResult {
  ciId: string;
  schedule: DepreciationSchedule;
  currentBookValue: number;
  accumulatedDepreciation: number;
  monthlyDepreciation: number;
  remainingLife: number; // months
  isFullyDepreciated: boolean;
}

/**
 * Direct Cost Item
 */
export interface DirectCostItem {
  ciId: string;
  costType: 'purchase' | 'license' | 'maintenance' | 'support' | 'other';
  amount: number;
  frequency: 'one_time' | 'monthly' | 'annual';
  startDate: Date;
  endDate?: Date;
  vendor?: string;
  description?: string;
}

/**
 * Direct Cost Calculation Result
 */
export interface DirectCostResult {
  ciId: string;
  totalMonthlyCost: number;
  costBreakdown: Array<{
    costType: string;
    amount: number;
    amortizedMonthly: number;
  }>;
}

/**
 * Usage-Based Cost Parameters
 */
export interface UsageBasedParams {
  ciId: string;
  unitCost: number; // Cost per unit
  usageMetric: 'cpu_hours' | 'storage_gb' | 'bandwidth_gb' | 'transactions' | 'users' | 'requests';
  totalUsage: number;
  consumerUsage: Map<string, number>; // consumerId -> usage
}

/**
 * Usage-Based Cost Result
 */
export interface UsageBasedResult {
  ciId: string;
  totalCost: number;
  unitCost: number;
  totalUsage: number;
  allocations: Array<{
    consumerId: string;
    usage: number;
    usagePercentage: number;
    allocatedCost: number;
  }>;
}

/**
 * Equal Split Parameters
 */
export interface EqualSplitParams {
  ciId: string;
  totalCost: number;
  consumers: string[]; // Array of consumer IDs
  excludeInactive?: boolean;
}

/**
 * Equal Split Result
 */
export interface EqualSplitResult {
  ciId: string;
  totalCost: number;
  consumerCount: number;
  costPerConsumer: number;
  allocations: Array<{
    consumerId: string;
    allocatedCost: number;
    percentage: number;
  }>;
}

/**
 * Cost Calculation Options
 */
export interface CostCalculationOptions {
  includeDepreciation?: boolean;
  includeOperationalCosts?: boolean;
  includeLabor?: boolean;
  month?: Date;
  roundingPrecision?: number; // decimal places
}

/**
 * Cost Validation Result
 */
export interface CostValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  totalCost: number;
  allocatedCost: number;
  unallocatedCost: number;
  allocationPercentage: number;
}
