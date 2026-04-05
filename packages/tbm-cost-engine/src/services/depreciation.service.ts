// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Depreciation Service
 * Manages depreciation schedules and calculations for CIs
 */

import {
  DepreciationSchedule,
  DepreciationResult
} from '../types/cost-types';
import {
  calculateDepreciation,
  calculateMonthlyDepreciation,
  getDefaultDepreciationSchedule,
  validateDepreciationSchedule,
  calculateTotalCostOfOwnership
} from '../calculators/depreciation.calculator';

/**
 * Depreciation Service
 * Singleton service for managing CI depreciation
 */
export class DepreciationService {
  private static instance: DepreciationService;
  private scheduleCache: Map<string, DepreciationSchedule> = new Map();

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): DepreciationService {
    if (!DepreciationService.instance) {
      DepreciationService.instance = new DepreciationService();
    }
    return DepreciationService.instance;
  }

  /**
   * Set depreciation schedule for a CI
   *
   * @param ciId - Configuration Item ID
   * @param schedule - Depreciation schedule
   * @returns Validation errors (empty if valid)
   */
  public setSchedule(ciId: string, schedule: DepreciationSchedule): string[] {
    const errors = validateDepreciationSchedule(schedule);

    if (errors.length === 0) {
      this.scheduleCache.set(ciId, schedule);
    }

    return errors;
  }

  /**
   * Get depreciation schedule for a CI
   *
   * @param ciId - Configuration Item ID
   * @returns Depreciation schedule or null if not set
   */
  public getSchedule(ciId: string): DepreciationSchedule | null {
    return this.scheduleCache.get(ciId) || null;
  }

  /**
   * Calculate current depreciation for a CI
   *
   * @param ciId - Configuration Item ID
   * @param asOfDate - Date to calculate as of (defaults to now)
   * @returns Depreciation result or null if no schedule
   */
  public calculateCurrentDepreciation(
    ciId: string,
    asOfDate: Date = new Date()
  ): DepreciationResult | null {
    const schedule = this.scheduleCache.get(ciId);

    if (!schedule) {
      return null;
    }

    return calculateDepreciation(ciId, schedule, asOfDate);
  }

  /**
   * Calculate monthly depreciation cost for a CI
   *
   * @param ciId - Configuration Item ID
   * @returns Monthly depreciation amount or 0 if no schedule
   */
  public getMonthlyDepreciation(ciId: string): number {
    const schedule = this.scheduleCache.get(ciId);

    if (!schedule) {
      return 0;
    }

    return calculateMonthlyDepreciation(
      schedule.purchasePrice,
      schedule.depreciationYears,
      schedule.residualValue
    );
  }

  /**
   * Set default depreciation schedule based on CI type
   *
   * @param ciId - Configuration Item ID
   * @param ciType - Type of CI
   * @param purchasePrice - Purchase price
   * @param purchaseDate - Purchase date
   * @returns The created schedule
   */
  public setDefaultSchedule(
    ciId: string,
    ciType: string,
    purchasePrice: number,
    purchaseDate: Date = new Date()
  ): DepreciationSchedule {
    const schedule = getDefaultDepreciationSchedule(ciType, purchasePrice, purchaseDate);
    this.scheduleCache.set(ciId, schedule);
    return schedule;
  }

  /**
   * Calculate depreciation for multiple CIs
   *
   * @param ciIds - Array of CI IDs
   * @param asOfDate - Date to calculate as of
   * @returns Map of CI ID to depreciation result
   */
  public calculateBulkDepreciation(
    ciIds: string[],
    asOfDate: Date = new Date()
  ): Map<string, DepreciationResult> {
    const results = new Map<string, DepreciationResult>();

    for (const ciId of ciIds) {
      const result = this.calculateCurrentDepreciation(ciId, asOfDate);
      if (result) {
        results.set(ciId, result);
      }
    }

    return results;
  }

  /**
   * Get all CIs with active depreciation schedules
   *
   * @returns Array of CI IDs
   */
  public getActiveSchedules(): string[] {
    return Array.from(this.scheduleCache.keys());
  }

  /**
   * Get CIs that are fully depreciated
   *
   * @param asOfDate - Date to check as of
   * @returns Array of CI IDs
   */
  public getFullyDepreciatedCIs(asOfDate: Date = new Date()): string[] {
    const fullyDepreciated: string[] = [];

    for (const ciId of this.scheduleCache.keys()) {
      const result = this.calculateCurrentDepreciation(ciId, asOfDate);
      if (result && result.isFullyDepreciated) {
        fullyDepreciated.push(ciId);
      }
    }

    return fullyDepreciated;
  }

  /**
   * Calculate total cost of ownership for a CI
   *
   * @param ciId - Configuration Item ID
   * @param operationalCostPerMonth - Monthly operational costs
   * @returns Total cost of ownership or null if no schedule
   */
  public calculateTCO(ciId: string, operationalCostPerMonth: number = 0): number | null {
    const schedule = this.scheduleCache.get(ciId);

    if (!schedule) {
      return null;
    }

    return calculateTotalCostOfOwnership(schedule, operationalCostPerMonth);
  }

  /**
   * Get depreciation summary statistics
   *
   * @param asOfDate - Date to calculate as of
   * @returns Summary statistics
   */
  public getDepreciationSummary(asOfDate: Date = new Date()): {
    totalCIs: number;
    totalBookValue: number;
    totalAccumulatedDepreciation: number;
    totalMonthlyDepreciation: number;
    fullyDepreciatedCount: number;
  } {
    let totalBookValue = 0;
    let totalAccumulatedDepreciation = 0;
    let totalMonthlyDepreciation = 0;
    let fullyDepreciatedCount = 0;

    for (const ciId of this.scheduleCache.keys()) {
      const result = this.calculateCurrentDepreciation(ciId, asOfDate);
      if (result) {
        totalBookValue += result.currentBookValue;
        totalAccumulatedDepreciation += result.accumulatedDepreciation;
        totalMonthlyDepreciation += result.monthlyDepreciation;
        if (result.isFullyDepreciated) {
          fullyDepreciatedCount++;
        }
      }
    }

    return {
      totalCIs: this.scheduleCache.size,
      totalBookValue: this.roundToCents(totalBookValue),
      totalAccumulatedDepreciation: this.roundToCents(totalAccumulatedDepreciation),
      totalMonthlyDepreciation: this.roundToCents(totalMonthlyDepreciation),
      fullyDepreciatedCount
    };
  }

  /**
   * Remove depreciation schedule for a CI
   *
   * @param ciId - Configuration Item ID
   */
  public removeSchedule(ciId: string): void {
    this.scheduleCache.delete(ciId);
  }

  /**
   * Clear all depreciation schedules
   */
  public clearAllSchedules(): void {
    this.scheduleCache.clear();
  }

  /**
   * Export all schedules
   *
   * @returns Map of CI ID to schedule
   */
  public exportSchedules(): Map<string, DepreciationSchedule> {
    return new Map(this.scheduleCache);
  }

  /**
   * Import schedules from map
   *
   * @param schedules - Map of CI ID to schedule
   * @returns Validation errors by CI ID
   */
  public importSchedules(
    schedules: Map<string, DepreciationSchedule>
  ): Map<string, string[]> {
    const errors = new Map<string, string[]>();

    for (const [ciId, schedule] of schedules.entries()) {
      const validationErrors = this.setSchedule(ciId, schedule);
      if (validationErrors.length > 0) {
        errors.set(ciId, validationErrors);
      }
    }

    return errors;
  }

  /**
   * Helper: Round to cents
   */
  private roundToCents(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

/**
 * Get singleton instance
 */
export function getDepreciationService(): DepreciationService {
  return DepreciationService.getInstance();
}
