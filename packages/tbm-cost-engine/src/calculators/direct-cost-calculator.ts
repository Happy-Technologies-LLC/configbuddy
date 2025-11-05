/**
 * Direct Cost Calculator
 * Calculates direct costs assigned to CIs (hardware, software licenses, maintenance)
 */

import { DirectCostItem, DirectCostResult } from '../types/cost-types';

/**
 * Calculate direct costs for a CI
 *
 * @param ciId - Configuration Item ID
 * @param costItems - Array of direct cost items
 * @param asOfDate - Date to calculate costs as of (defaults to now)
 * @returns Direct cost calculation result
 *
 * @example
 * ```typescript
 * const result = calculateDirectCosts('ci-server-001', [
 *   {
 *     ciId: 'ci-server-001',
 *     costType: 'purchase',
 *     amount: 36000,
 *     frequency: 'one_time',
 *     startDate: new Date('2023-01-01')
 *   },
 *   {
 *     ciId: 'ci-server-001',
 *     costType: 'maintenance',
 *     amount: 500,
 *     frequency: 'monthly',
 *     startDate: new Date('2023-01-01')
 *   }
 * ]);
 * ```
 */
export function calculateDirectCosts(
  ciId: string,
  costItems: DirectCostItem[],
  asOfDate: Date = new Date()
): DirectCostResult {
  const relevantItems = costItems.filter(item => item.ciId === ciId && isActiveCost(item, asOfDate));

  const costBreakdown = relevantItems.map(item => {
    const amortizedMonthly = amortizeCost(item, asOfDate);
    return {
      costType: item.costType,
      amount: item.amount,
      amortizedMonthly
    };
  });

  const totalMonthlyCost = costBreakdown.reduce((sum, item) => sum + item.amortizedMonthly, 0);

  return {
    ciId,
    totalMonthlyCost: roundToCents(totalMonthlyCost),
    costBreakdown: costBreakdown.map(item => ({
      ...item,
      amount: roundToCents(item.amount),
      amortizedMonthly: roundToCents(item.amortizedMonthly)
    }))
  };
}

/**
 * Amortize a cost item to monthly amount
 *
 * @param item - Cost item to amortize
 * @param asOfDate - Date to calculate as of
 * @returns Monthly amortized cost
 */
export function amortizeCost(item: DirectCostItem, asOfDate: Date = new Date()): number {
  if (!isActiveCost(item, asOfDate)) {
    return 0;
  }

  switch (item.frequency) {
    case 'monthly':
      return item.amount;

    case 'annual':
      return item.amount / 12;

    case 'one_time': {
      // Amortize one-time costs over 36 months (3 years) by default
      // or until endDate if specified
      const amortizationMonths = item.endDate
        ? getMonthsDifference(item.startDate, item.endDate)
        : 36;

      return item.amount / Math.max(1, amortizationMonths);
    }

    default:
      return 0;
  }
}

/**
 * Check if a cost is active as of a given date
 *
 * @param item - Cost item
 * @param asOfDate - Date to check
 * @returns True if cost is active
 */
export function isActiveCost(item: DirectCostItem, asOfDate: Date = new Date()): boolean {
  if (asOfDate < item.startDate) {
    return false;
  }

  if (item.endDate && asOfDate > item.endDate) {
    return false;
  }

  return true;
}

/**
 * Calculate total direct costs across multiple CIs
 *
 * @param ciIds - Array of CI IDs
 * @param costItems - All cost items
 * @param asOfDate - Date to calculate as of
 * @returns Map of CI ID to total monthly cost
 */
export function calculateBulkDirectCosts(
  ciIds: string[],
  costItems: DirectCostItem[],
  asOfDate: Date = new Date()
): Map<string, number> {
  const results = new Map<string, number>();

  for (const ciId of ciIds) {
    const result = calculateDirectCosts(ciId, costItems, asOfDate);
    results.set(ciId, result.totalMonthlyCost);
  }

  return results;
}

/**
 * Group cost items by cost type
 *
 * @param costItems - Cost items to group
 * @returns Map of cost type to items
 */
export function groupCostsByType(costItems: DirectCostItem[]): Map<string, DirectCostItem[]> {
  const grouped = new Map<string, DirectCostItem[]>();

  for (const item of costItems) {
    const existing = grouped.get(item.costType) || [];
    existing.push(item);
    grouped.set(item.costType, existing);
  }

  return grouped;
}

/**
 * Validate direct cost item
 *
 * @param item - Cost item to validate
 * @returns Validation errors (empty array if valid)
 */
export function validateDirectCostItem(item: DirectCostItem): string[] {
  const errors: string[] = [];

  if (!item.ciId || item.ciId.trim() === '') {
    errors.push('CI ID is required');
  }

  if (item.amount <= 0) {
    errors.push('Cost amount must be greater than 0');
  }

  if (item.startDate > new Date()) {
    errors.push('Start date cannot be in the future');
  }

  if (item.endDate && item.endDate < item.startDate) {
    errors.push('End date must be after start date');
  }

  const validCostTypes = ['purchase', 'license', 'maintenance', 'support', 'other'];
  if (!validCostTypes.includes(item.costType)) {
    errors.push(`Invalid cost type: ${item.costType}`);
  }

  const validFrequencies = ['one_time', 'monthly', 'annual'];
  if (!validFrequencies.includes(item.frequency)) {
    errors.push(`Invalid frequency: ${item.frequency}`);
  }

  return errors;
}

/**
 * Calculate cost for a specific time period
 *
 * @param item - Cost item
 * @param startDate - Period start date
 * @param endDate - Period end date
 * @returns Total cost for the period
 */
export function calculateCostForPeriod(
  item: DirectCostItem,
  startDate: Date,
  endDate: Date
): number {
  if (!isActiveCost(item, startDate) && !isActiveCost(item, endDate)) {
    return 0;
  }

  const months = getMonthsDifference(startDate, endDate);
  const monthlyAmount = amortizeCost(item, startDate);

  return roundToCents(monthlyAmount * months);
}

/**
 * Helper: Get months difference between two dates
 */
function getMonthsDifference(startDate: Date, endDate: Date): number {
  const yearsDiff = endDate.getFullYear() - startDate.getFullYear();
  const monthsDiff = endDate.getMonth() - startDate.getMonth();
  return Math.max(0, yearsDiff * 12 + monthsDiff);
}

/**
 * Helper: Round to cents (2 decimal places)
 */
function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}
