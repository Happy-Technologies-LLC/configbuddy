// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Usage-Based Cost Calculator
 * Allocates costs based on actual usage metrics (CPU hours, storage GB, bandwidth, etc.)
 */

import { UsageBasedParams, UsageBasedResult } from '../types/cost-types';

/**
 * Calculate usage-based cost allocation
 *
 * @param params - Usage-based allocation parameters
 * @returns Usage-based allocation result
 *
 * @example
 * ```typescript
 * const result = calculateUsageBasedAllocation({
 *   ciId: 'ci-server-001',
 *   unitCost: 0.10, // $0.10 per CPU hour
 *   usageMetric: 'cpu_hours',
 *   totalUsage: 10000,
 *   consumerUsage: new Map([
 *     ['app-001', 6000],
 *     ['app-002', 3000],
 *     ['app-003', 1000]
 *   ])
 * });
 * console.log(result.totalCost); // 1000
 * console.log(result.allocations[0].allocatedCost); // 600 (60% of usage)
 * ```
 */
export function calculateUsageBasedAllocation(params: UsageBasedParams): UsageBasedResult {
  const { ciId, unitCost, totalUsage, consumerUsage } = params;

  // Calculate total cost
  const totalCost = unitCost * totalUsage;

  // Validate total usage matches sum of consumer usage
  const sumConsumerUsage = Array.from(consumerUsage.values()).reduce((sum, usage) => sum + usage, 0);

  if (Math.abs(sumConsumerUsage - totalUsage) > 0.01) {
    console.warn(
      `Usage mismatch for CI ${ciId}: total=${totalUsage}, sum of consumers=${sumConsumerUsage}`
    );
  }

  // Calculate allocations
  const allocations = Array.from(consumerUsage.entries()).map(([consumerId, usage]) => {
    const usagePercentage = totalUsage > 0 ? (usage / totalUsage) * 100 : 0;
    const allocatedCost = totalUsage > 0 ? (usage / totalUsage) * totalCost : 0;

    return {
      consumerId,
      usage,
      usagePercentage: roundToDecimal(usagePercentage, 2),
      allocatedCost: roundToCents(allocatedCost)
    };
  });

  // Sort by allocated cost descending
  allocations.sort((a, b) => b.allocatedCost - a.allocatedCost);

  return {
    ciId,
    totalCost: roundToCents(totalCost),
    unitCost: roundToCents(unitCost),
    totalUsage,
    allocations
  };
}

/**
 * Calculate usage-based allocation with tiered pricing
 *
 * @param params - Usage-based parameters
 * @param tiers - Pricing tiers (usage threshold -> unit cost)
 * @returns Usage-based allocation result
 *
 * @example
 * ```typescript
 * const result = calculateTieredUsageAllocation(params, [
 *   { threshold: 0, unitCost: 0.10 },      // First 1000: $0.10/unit
 *   { threshold: 1000, unitCost: 0.08 },   // Next units: $0.08/unit
 *   { threshold: 5000, unitCost: 0.05 }    // Above 5000: $0.05/unit
 * ]);
 * ```
 */
export function calculateTieredUsageAllocation(
  params: UsageBasedParams,
  tiers: Array<{ threshold: number; unitCost: number }>
): UsageBasedResult {
  const { ciId, totalUsage, consumerUsage } = params;

  // Sort tiers by threshold
  const sortedTiers = [...tiers].sort((a, b) => a.threshold - b.threshold);

  // Calculate cost for each consumer using tiered pricing
  const allocations = Array.from(consumerUsage.entries()).map(([consumerId, usage]) => {
    let remainingUsage = usage;
    let allocatedCost = 0;

    for (let i = 0; i < sortedTiers.length; i++) {
      const currentTier = sortedTiers[i];
      if (!currentTier) continue;

      const nextTier = sortedTiers[i + 1];

      const tierStart = currentTier.threshold;
      const tierEnd = nextTier ? nextTier.threshold : Infinity;
      const tierUsage = Math.min(remainingUsage, tierEnd - tierStart);

      if (tierUsage > 0) {
        allocatedCost += tierUsage * currentTier.unitCost;
        remainingUsage -= tierUsage;
      }

      if (remainingUsage <= 0) break;
    }

    const usagePercentage = totalUsage > 0 ? (usage / totalUsage) * 100 : 0;

    return {
      consumerId,
      usage,
      usagePercentage: roundToDecimal(usagePercentage, 2),
      allocatedCost: roundToCents(allocatedCost)
    };
  });

  const totalCost = allocations.reduce((sum, alloc) => sum + alloc.allocatedCost, 0);

  // Calculate weighted average unit cost
  const averageUnitCost = totalUsage > 0 ? totalCost / totalUsage : 0;

  return {
    ciId,
    totalCost: roundToCents(totalCost),
    unitCost: roundToCents(averageUnitCost),
    totalUsage,
    allocations: allocations.sort((a, b) => b.allocatedCost - a.allocatedCost)
  };
}

/**
 * Calculate showback allocation (informational only, no actual charge)
 *
 * @param params - Usage-based parameters
 * @returns Showback report
 */
export function calculateShowback(params: UsageBasedParams): UsageBasedResult {
  // Showback is the same calculation as chargeback, but for informational purposes
  return calculateUsageBasedAllocation(params);
}

/**
 * Calculate chargeback allocation (actual cost transfer)
 *
 * @param params - Usage-based parameters
 * @returns Chargeback report
 */
export function calculateChargeback(params: UsageBasedParams): UsageBasedResult {
  return calculateUsageBasedAllocation(params);
}

/**
 * Normalize usage metrics to a common unit
 *
 * @param metric - Usage metric type
 * @param value - Usage value
 * @param unit - Current unit
 * @returns Normalized value
 *
 * @example
 * ```typescript
 * const normalized = normalizeUsageMetric('storage_gb', 1024, 'MB');
 * console.log(normalized); // 1 (GB)
 * ```
 */
export function normalizeUsageMetric(
  metric: 'cpu_hours' | 'storage_gb' | 'bandwidth_gb' | 'transactions' | 'users' | 'requests',
  value: number,
  unit: string
): number {
  const normalized = unit.toLowerCase();

  switch (metric) {
    case 'storage_gb':
    case 'bandwidth_gb':
      if (normalized === 'mb') return value / 1024;
      if (normalized === 'tb') return value * 1024;
      return value; // Already in GB

    case 'cpu_hours':
      if (normalized === 'minutes') return value / 60;
      if (normalized === 'seconds') return value / 3600;
      return value; // Already in hours

    default:
      return value;
  }
}

/**
 * Validate usage-based parameters
 *
 * @param params - Parameters to validate
 * @returns Validation errors (empty array if valid)
 */
export function validateUsageBasedParams(params: UsageBasedParams): string[] {
  const errors: string[] = [];

  if (!params.ciId || params.ciId.trim() === '') {
    errors.push('CI ID is required');
  }

  if (params.unitCost < 0) {
    errors.push('Unit cost cannot be negative');
  }

  if (params.totalUsage < 0) {
    errors.push('Total usage cannot be negative');
  }

  if (params.consumerUsage.size === 0) {
    errors.push('At least one consumer is required');
  }

  // Check for negative consumer usage
  for (const [consumerId, usage] of params.consumerUsage.entries()) {
    if (usage < 0) {
      errors.push(`Consumer ${consumerId} has negative usage: ${usage}`);
    }
  }

  // Validate sum of consumer usage
  const sumConsumerUsage = Array.from(params.consumerUsage.values()).reduce((sum, u) => sum + u, 0);
  const tolerance = 0.01;

  if (Math.abs(sumConsumerUsage - params.totalUsage) > tolerance) {
    errors.push(
      `Sum of consumer usage (${sumConsumerUsage}) does not match total usage (${params.totalUsage})`
    );
  }

  return errors;
}

/**
 * Calculate unallocated usage
 *
 * @param totalUsage - Total usage
 * @param allocatedUsage - Map of allocated usage
 * @returns Unallocated usage amount
 */
export function calculateUnallocatedUsage(
  totalUsage: number,
  allocatedUsage: Map<string, number>
): number {
  const sumAllocated = Array.from(allocatedUsage.values()).reduce((sum, usage) => sum + usage, 0);
  return Math.max(0, totalUsage - sumAllocated);
}

/**
 * Distribute unallocated costs proportionally
 *
 * @param result - Initial allocation result
 * @param unallocatedCost - Unallocated cost to distribute
 * @returns Updated allocation result
 */
export function distributeUnallocatedCost(
  result: UsageBasedResult,
  unallocatedCost: number
): UsageBasedResult {
  if (unallocatedCost <= 0 || result.allocations.length === 0) {
    return result;
  }

  const totalAllocated = result.allocations.reduce((sum, a) => sum + a.allocatedCost, 0);

  const updatedAllocations = result.allocations.map(allocation => {
    const proportion = totalAllocated > 0 ? allocation.allocatedCost / totalAllocated : 1 / result.allocations.length;
    const additionalCost = unallocatedCost * proportion;

    return {
      ...allocation,
      allocatedCost: roundToCents(allocation.allocatedCost + additionalCost)
    };
  });

  return {
    ...result,
    totalCost: roundToCents(result.totalCost + unallocatedCost),
    allocations: updatedAllocations
  };
}

/**
 * Helper: Round to cents (2 decimal places)
 */
function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Helper: Round to specified decimal places
 */
function roundToDecimal(value: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}
