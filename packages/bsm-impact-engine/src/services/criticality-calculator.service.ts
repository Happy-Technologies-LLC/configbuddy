// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Criticality Calculator Service
 * Calculates business criticality tiers (0-4) for business services
 */

import { BusinessService } from '@cmdb/unified-model';
import { CriticalityCalculation, CriticalityCalculationOptions } from '../types/impact-types';
import {
  BusinessCriticality,
  BusinessCriticalityTier,
  DEFAULT_CRITICALITY_WEIGHTS,
  DEFAULT_TIER_THRESHOLDS,
} from '../types/bsm-types';
import { getComplianceImpactCalculator } from '../calculators/compliance-impact-calculator';
import { getGraphTraversal } from '../utils/graph-traversal';

/**
 * Criticality Calculator Service
 * Automatically calculates business criticality tier based on multiple factors
 */
export class CriticalityCalculatorService {
  private complianceCalculator = getComplianceImpactCalculator();
  private graphTraversal = getGraphTraversal();

  /**
   * Calculate business criticality for a business service
   * Considers: revenue, customers, transactions, compliance, users
   *
   * @param businessService - Business service to analyze
   * @param options - Optional calculation parameters
   * @returns Criticality calculation result
   */
  async calculateCriticality(
    businessService: BusinessService,
    options?: CriticalityCalculationOptions
  ): Promise<CriticalityCalculation> {
    // Use custom weights or defaults
    const weights = {
      revenue: options?.weights?.revenue ?? DEFAULT_CRITICALITY_WEIGHTS.annualRevenue,
      customers: options?.weights?.customers ?? DEFAULT_CRITICALITY_WEIGHTS.customerCount,
      transactions:
        options?.weights?.transactions ?? DEFAULT_CRITICALITY_WEIGHTS.transactionVolume,
      compliance: options?.weights?.compliance ?? DEFAULT_CRITICALITY_WEIGHTS.complianceRequirements,
      users: options?.weights?.users ?? DEFAULT_CRITICALITY_WEIGHTS.userCount,
    };

    // Use custom thresholds or defaults
    const thresholds = {
      tier_0: options?.thresholds?.tier_0 ?? DEFAULT_TIER_THRESHOLDS.tier_0,
      tier_1: options?.thresholds?.tier_1 ?? DEFAULT_TIER_THRESHOLDS.tier_1,
      tier_2: options?.thresholds?.tier_2 ?? DEFAULT_TIER_THRESHOLDS.tier_2,
      tier_3: options?.thresholds?.tier_3 ?? DEFAULT_TIER_THRESHOLDS.tier_3,
    };

    // Extract service attributes
    const annualRevenue = businessService.bsm_attributes.annual_revenue_supported || 0;
    const customerCount = businessService.bsm_attributes.customer_count || 0;
    const transactionVolume = businessService.bsm_attributes.transaction_volume_daily || 0;

    // Calculate compliance weight
    const complianceWeight = this.complianceCalculator.calculateComplianceWeight(businessService);

    // Estimate internal users (placeholder - should be configurable)
    const internalUsers = this.estimateInternalUsers(businessService);

    // Calculate individual factor scores (0-100 scale)
    const revenueScore = this.calculateRevenueScore(annualRevenue, weights.revenue);
    const customerScore = this.calculateCustomerScore(customerCount, weights.customers);
    const transactionScore = this.calculateTransactionScore(transactionVolume, weights.transactions);
    const complianceScore = complianceWeight.weight * 100 * weights.compliance;
    const userScore = this.calculateUserScore(internalUsers, weights.users);

    // Calculate total impact score (0-100)
    const impactScore = revenueScore + customerScore + transactionScore + complianceScore + userScore;

    // Determine criticality tier based on thresholds and impact score
    const calculatedCriticality = this.determineTier(
      annualRevenue,
      customerCount,
      impactScore,
      thresholds
    );

    // Calculate confidence level (0-1)
    const confidence = this.calculateConfidence(businessService);

    // Generate recommendation
    const recommendation = this.generateRecommendation(
      calculatedCriticality,
      businessService,
      impactScore
    );

    const calculation: CriticalityCalculation = {
      calculatedCriticality,
      impactScore: Math.round(impactScore * 10) / 10,
      factors: {
        annualRevenue,
        customerCount,
        transactionVolume,
        complianceWeight: complianceWeight.weight,
        internalUsers,
      },
      tierThresholds: {
        revenue: thresholds.tier_0,
        customers: 100000, // Placeholder
        transactions: 100000, // Placeholder
      },
      recommendation,
      confidence,
      calculatedAt: new Date(),
    };

    // Optionally propagate criticality to dependent CIs
    if (options?.propagateToChildren !== false) {
      await this.graphTraversal.propagateCriticality(
        businessService.id,
        calculatedCriticality,
        5 // Max depth
      );
    }

    return calculation;
  }

  /**
   * Calculate revenue score (0-40 points)
   *
   * @param annualRevenue - Annual revenue in USD
   * @param weight - Weight factor (default: 0.40)
   * @returns Revenue score
   */
  private calculateRevenueScore(annualRevenue: number, weight: number): number {
    // Logarithmic scale to handle wide revenue ranges
    // $0 = 0 points, $1M = 20 points, $10M = 30 points, $100M+ = 40 points
    const maxPoints = 100 * weight;

    if (annualRevenue === 0) {
      return 0;
    }

    // Use logarithmic scale
    const logRevenue = Math.log10(annualRevenue);
    const logMax = Math.log10(100_000_000); // $100M = max score

    const score = (logRevenue / logMax) * maxPoints;

    return Math.min(Math.max(score, 0), maxPoints);
  }

  /**
   * Calculate customer score (0-25 points)
   *
   * @param customerCount - Number of customers
   * @param weight - Weight factor (default: 0.25)
   * @returns Customer score
   */
  private calculateCustomerScore(customerCount: number, weight: number): number {
    const maxPoints = 100 * weight;

    if (customerCount === 0) {
      return 0;
    }

    // Logarithmic scale
    // 0 customers = 0 points, 10K = 12.5 points, 100K = 20 points, 1M+ = 25 points
    const logCustomers = Math.log10(customerCount);
    const logMax = Math.log10(1_000_000); // 1M customers = max score

    const score = (logCustomers / logMax) * maxPoints;

    return Math.min(Math.max(score, 0), maxPoints);
  }

  /**
   * Calculate transaction score (0-15 points)
   *
   * @param transactionVolume - Daily transaction volume
   * @param weight - Weight factor (default: 0.15)
   * @returns Transaction score
   */
  private calculateTransactionScore(transactionVolume: number, weight: number): number {
    const maxPoints = 100 * weight;

    if (transactionVolume === 0) {
      return 0;
    }

    // Linear scale for transactions
    // 0 txns = 0 points, 100K txns/day = 10 points, 1M+ txns/day = 15 points
    const score = (transactionVolume / 1_000_000) * maxPoints;

    return Math.min(Math.max(score, 0), maxPoints);
  }

  /**
   * Calculate user score (0-10 points)
   *
   * @param userCount - Number of internal users
   * @param weight - Weight factor (default: 0.10)
   * @returns User score
   */
  private calculateUserScore(userCount: number, weight: number): number {
    const maxPoints = 100 * weight;

    if (userCount === 0) {
      return 0;
    }

    // Linear scale
    // 0 users = 0 points, 500 users = 5 points, 1000+ users = 10 points
    const score = (userCount / 1000) * maxPoints;

    return Math.min(Math.max(score, 0), maxPoints);
  }

  /**
   * Determine criticality tier based on thresholds
   *
   * @param annualRevenue - Annual revenue in USD
   * @param customerCount - Number of customers
   * @param impactScore - Calculated impact score (0-100)
   * @param thresholds - Tier thresholds
   * @returns Business criticality tier
   */
  private determineTier(
    annualRevenue: number,
    customerCount: number,
    impactScore: number,
    thresholds: any
  ): BusinessCriticality {
    // Primary criterion: revenue
    if (annualRevenue >= thresholds.tier_0) {
      return BusinessCriticalityTier.TIER_0;
    }

    if (annualRevenue >= thresholds.tier_1) {
      return BusinessCriticalityTier.TIER_1;
    }

    if (annualRevenue >= thresholds.tier_2) {
      return BusinessCriticalityTier.TIER_2;
    }

    if (annualRevenue >= thresholds.tier_3) {
      return BusinessCriticalityTier.TIER_3;
    }

    // Secondary criterion: impact score
    // Even with low revenue, high impact score can elevate tier
    if (impactScore >= 80) {
      return BusinessCriticalityTier.TIER_1;
    }

    if (impactScore >= 60) {
      return BusinessCriticalityTier.TIER_2;
    }

    if (impactScore >= 40) {
      return BusinessCriticalityTier.TIER_3;
    }

    // Default: low priority
    return BusinessCriticalityTier.TIER_4;
  }

  /**
   * Calculate confidence level in the criticality assessment
   * Higher confidence when more data is available
   *
   * @param businessService - Business service to analyze
   * @returns Confidence level (0-1)
   */
  private calculateConfidence(businessService: BusinessService): number {
    let confidence = 0;
    let factorsAvailable = 0;
    const totalFactors = 5;

    // Check which factors have data
    if ((businessService.bsm_attributes.annual_revenue_supported || 0) > 0) {
      confidence += 0.3; // Revenue is most important
      factorsAvailable++;
    }

    if ((businessService.bsm_attributes.customer_count || 0) > 0) {
      confidence += 0.25; // Customers are second most important
      factorsAvailable++;
    }

    if ((businessService.bsm_attributes.transaction_volume_daily || 0) > 0) {
      confidence += 0.2;
      factorsAvailable++;
    }

    if ((businessService.bsm_attributes.compliance_requirements || []).length > 0) {
      confidence += 0.15;
      factorsAvailable++;
    }

    // Internal users (always estimated, lower confidence)
    confidence += 0.1;
    factorsAvailable++;

    // Normalize to 0-1 scale
    return Math.min(confidence, 1.0);
  }

  /**
   * Generate recommendation based on criticality calculation
   *
   * @param tier - Calculated criticality tier
   * @param businessService - Business service
   * @param impactScore - Impact score
   * @returns Human-readable recommendation
   */
  private generateRecommendation(
    tier: BusinessCriticality,
    businessService: BusinessService,
    impactScore: number
  ): string {
    const tierDescriptions: Record<BusinessCriticality, string> = {
      tier_0:
        'Mission-critical service requiring 24x7 monitoring, redundancy, and immediate incident response.',
      tier_1:
        'Business-critical service requiring high availability, proactive monitoring, and rapid incident response.',
      tier_2:
        'Important service requiring standard availability targets and timely incident response.',
      tier_3:
        'Standard service with normal support hours and standard incident response times.',
      tier_4:
        'Low priority service suitable for best-effort support and maintenance windows.',
    };

    let recommendation = tierDescriptions[tier];

    // Add specific recommendations based on impact score
    if (impactScore > 70 && tier !== 'tier_0') {
      recommendation +=
        ' Consider reviewing revenue and customer impact data - this service may warrant higher criticality.';
    }

    if (businessService.bsm_attributes.compliance_requirements.length > 0) {
      recommendation += ' Ensure compliance audit requirements are met regularly.';
    }

    return recommendation;
  }

  /**
   * Estimate internal users for a service
   * Placeholder - should be configured or queried from HRMS integration
   *
   * @param businessService - Business service
   * @returns Estimated internal user count
   */
  private estimateInternalUsers(businessService: BusinessService): number {
    const serviceType = businessService.itil_attributes.service_type;

    if (serviceType === 'internal') {
      return 500; // Internal services used by most employees
    }

    if (serviceType === 'infrastructure') {
      return 50; // Infrastructure services used by IT team
    }

    // Customer-facing services have limited internal users (support, ops)
    return 20;
  }

  /**
   * Batch calculate criticality for multiple services
   * Efficient for bulk processing
   *
   * @param businessServices - Array of business services
   * @param options - Calculation options
   * @returns Array of criticality calculations
   */
  async batchCalculateCriticality(
    businessServices: BusinessService[],
    options?: CriticalityCalculationOptions
  ): Promise<CriticalityCalculation[]> {
    const calculations: CriticalityCalculation[] = [];

    for (const service of businessServices) {
      try {
        const calculation = await this.calculateCriticality(service, options);
        calculations.push(calculation);
      } catch (error) {
        console.error(`Error calculating criticality for service ${service.id}:`, error);
        // Continue processing other services
      }
    }

    return calculations;
  }
}

/**
 * Singleton instance
 */
let criticalityCalculatorInstance: CriticalityCalculatorService | null = null;

/**
 * Get Criticality Calculator Service instance (singleton)
 */
export function getCriticalityCalculatorService(): CriticalityCalculatorService {
  if (!criticalityCalculatorInstance) {
    criticalityCalculatorInstance = new CriticalityCalculatorService();
  }
  return criticalityCalculatorInstance;
}
