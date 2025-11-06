/**
 * Equal Split Cost Calculator
 * Allocates costs equally among consumers
 */

import { EqualSplitParams, EqualSplitResult } from '../types/cost-types';

/**
 * Calculate equal split cost allocation
 *
 * @param params - Equal split parameters
 * @returns Equal split allocation result
 *
 * @example
 * ```typescript
 * const result = calculateEqualSplit({
 *   ciId: 'ci-shared-db-001',
 *   totalCost: 3000,
 *   consumers: ['app-001', 'app-002', 'app-003']
 * });
 * console.log(result.costPerConsumer); // 1000
 * ```
 */
export function calculateEqualSplit(params: EqualSplitParams): EqualSplitResult {
  const { ciId, totalCost, consumers } = params;

  if (consumers.length === 0) {
    return {
      ciId,
      totalCost,
      consumerCount: 0,
      costPerConsumer: 0,
      allocations: []
    };
  }

  const costPerConsumer = totalCost / consumers.length;
  const percentage = 100 / consumers.length;

  const allocations = consumers.map(consumerId => ({
    consumerId,
    allocatedCost: roundToCents(costPerConsumer),
    percentage: roundToDecimal(percentage, 2)
  }));

  return {
    ciId,
    totalCost: roundToCents(totalCost),
    consumerCount: consumers.length,
    costPerConsumer: roundToCents(costPerConsumer),
    allocations
  };
}

/**
 * Calculate weighted equal split
 * Similar to equal split but with weights per consumer
 *
 * @param ciId - Configuration Item ID
 * @param totalCost - Total cost to allocate
 * @param consumerWeights - Map of consumer ID to weight
 * @returns Weighted allocation result
 *
 * @example
 * ```typescript
 * const result = calculateWeightedSplit('ci-001', 3000, new Map([
 *   ['app-001', 2],  // Gets 2/5 of cost
 *   ['app-002', 2],  // Gets 2/5 of cost
 *   ['app-003', 1]   // Gets 1/5 of cost
 * ]));
 * ```
 */
export function calculateWeightedSplit(
  ciId: string,
  totalCost: number,
  consumerWeights: Map<string, number>
): EqualSplitResult {
  if (consumerWeights.size === 0) {
    return {
      ciId,
      totalCost,
      consumerCount: 0,
      costPerConsumer: 0,
      allocations: []
    };
  }

  // Calculate total weight
  const totalWeight = Array.from(consumerWeights.values()).reduce((sum, weight) => sum + weight, 0);

  if (totalWeight === 0) {
    throw new Error('Total weight cannot be zero');
  }

  // Calculate allocations
  const allocations = Array.from(consumerWeights.entries()).map(([consumerId, weight]) => {
    const percentage = (weight / totalWeight) * 100;
    const allocatedCost = (weight / totalWeight) * totalCost;

    return {
      consumerId,
      allocatedCost: roundToCents(allocatedCost),
      percentage: roundToDecimal(percentage, 2)
    };
  });

  // Sort by allocated cost descending
  allocations.sort((a, b) => b.allocatedCost - a.allocatedCost);

  // Calculate average cost per consumer (for reference)
  const avgCostPerConsumer = totalCost / consumerWeights.size;

  return {
    ciId,
    totalCost: roundToCents(totalCost),
    consumerCount: consumerWeights.size,
    costPerConsumer: roundToCents(avgCostPerConsumer),
    allocations
  };
}

/**
 * Calculate equal split for active consumers only
 *
 * @param params - Equal split parameters
 * @param activeConsumers - Set of active consumer IDs
 * @returns Equal split result for active consumers
 */
export function calculateEqualSplitActiveOnly(
  params: EqualSplitParams,
  activeConsumers: Set<string>
): EqualSplitResult {
  const filteredConsumers = params.consumers.filter(c => activeConsumers.has(c));

  return calculateEqualSplit({
    ...params,
    consumers: filteredConsumers
  });
}

/**
 * Calculate equal split with minimum charge
 * Ensures each consumer pays at least a minimum amount
 *
 * @param params - Equal split parameters
 * @param minimumCharge - Minimum charge per consumer
 * @returns Equal split result with minimum charge enforced
 */
export function calculateEqualSplitWithMinimum(
  params: EqualSplitParams,
  minimumCharge: number
): EqualSplitResult {
  const { ciId, totalCost, consumers } = params;

  if (consumers.length === 0) {
    return {
      ciId,
      totalCost,
      consumerCount: 0,
      costPerConsumer: 0,
      allocations: []
    };
  }

  const equalSplitAmount = totalCost / consumers.length;
  const chargePerConsumer = Math.max(equalSplitAmount, minimumCharge);
  const adjustedTotalCost = chargePerConsumer * consumers.length;
  const percentage = 100 / consumers.length;

  const allocations = consumers.map(consumerId => ({
    consumerId,
    allocatedCost: roundToCents(chargePerConsumer),
    percentage: roundToDecimal(percentage, 2)
  }));

  return {
    ciId,
    totalCost: roundToCents(adjustedTotalCost),
    consumerCount: consumers.length,
    costPerConsumer: roundToCents(chargePerConsumer),
    allocations
  };
}

/**
 * Validate equal split parameters
 *
 * @param params - Parameters to validate
 * @returns Validation errors (empty array if valid)
 */
export function validateEqualSplitParams(params: EqualSplitParams): string[] {
  const errors: string[] = [];

  if (!params.ciId || params.ciId.trim() === '') {
    errors.push('CI ID is required');
  }

  if (params.totalCost < 0) {
    errors.push('Total cost cannot be negative');
  }

  if (params.consumers.length === 0) {
    errors.push('At least one consumer is required');
  }

  // Check for duplicate consumers
  const uniqueConsumers = new Set(params.consumers);
  if (uniqueConsumers.size !== params.consumers.length) {
    errors.push('Duplicate consumers found');
  }

  // Check for empty consumer IDs
  if (params.consumers.some(c => !c || c.trim() === '')) {
    errors.push('Consumer IDs cannot be empty');
  }

  return errors;
}

/**
 * Calculate variance from equal split
 * Useful for identifying over/under allocation
 *
 * @param actualAllocations - Map of consumer ID to actual cost
 * @param totalCost - Total cost
 * @returns Map of consumer ID to variance from equal share
 */
export function calculateVarianceFromEqualSplit(
  actualAllocations: Map<string, number>,
  totalCost: number
): Map<string, number> {
  const consumerCount = actualAllocations.size;
  const equalShare = totalCost / consumerCount;

  const variance = new Map<string, number>();

  for (const [consumerId, actualCost] of actualAllocations.entries()) {
    variance.set(consumerId, roundToCents(actualCost - equalShare));
  }

  return variance;
}

/**
 * Redistribute excess cost
 * When one consumer is over-allocated, redistribute to others
 *
 * @param params - Equal split parameters
 * @param excludeConsumers - Consumers to exclude from redistribution
 * @returns Redistributed allocation result
 */
export function redistributeCost(
  params: EqualSplitParams,
  excludeConsumers: Set<string>
): EqualSplitResult {
  const activeConsumers = params.consumers.filter(c => !excludeConsumers.has(c));

  return calculateEqualSplit({
    ...params,
    consumers: activeConsumers
  });
}

/**
 * Calculate allocation summary statistics
 *
 * @param result - Equal split result
 * @returns Summary statistics
 */
export function calculateAllocationStats(result: EqualSplitResult): {
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
} {
  if (result.allocations.length === 0) {
    return { mean: 0, median: 0, min: 0, max: 0, stdDev: 0 };
  }

  const costs = result.allocations.map(a => a.allocatedCost).sort((a, b) => a - b);

  const mean = costs.reduce((sum, c) => sum + c, 0) / costs.length;
  const median = costs.length % 2 === 0
    ? ((costs[costs.length / 2 - 1] || 0) + (costs[costs.length / 2] || 0)) / 2
    : costs[Math.floor(costs.length / 2)] || 0;
  const min = costs[0] || 0;
  const max = costs[costs.length - 1] || 0;

  // Calculate standard deviation
  const squaredDiffs = costs.map(c => Math.pow(c - mean, 2));
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / costs.length;
  const stdDev = Math.sqrt(variance);

  return {
    mean: roundToCents(mean),
    median: roundToCents(median),
    min: roundToCents(min),
    max: roundToCents(max),
    stdDev: roundToCents(stdDev)
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
