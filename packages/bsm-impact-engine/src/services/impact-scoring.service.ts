// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Impact Scoring Service
 * Calculates comprehensive impact scores (0-100) for business services
 */

import { BusinessService } from '@cmdb/unified-model';
import { ImpactScore, ImpactScoreComponents } from '../types/impact-types';
import { getRevenueImpactCalculator } from '../calculators/revenue-impact-calculator';
import { getUserImpactCalculator } from '../calculators/user-impact-calculator';
import { getComplianceImpactCalculator } from '../calculators/compliance-impact-calculator';

/**
 * Impact Scoring Service
 * Calculates a comprehensive 0-100 impact score based on multiple weighted factors
 *
 * Scoring Formula:
 * - Revenue (40%): 0-40 points based on annual revenue
 * - Customers (25%): 0-25 points based on customer count
 * - Transactions (15%): 0-15 points based on daily transactions
 * - Compliance (10%): 0-10 points based on regulatory requirements
 * - Users (10%): 0-10 points based on internal user count
 */
export class ImpactScoringService {
  private revenueCalculator = getRevenueImpactCalculator();
  private userCalculator = getUserImpactCalculator();
  private complianceCalculator = getComplianceImpactCalculator();

  /**
   * Calculate complete impact score for a business service
   *
   * @param businessService - Business service to analyze
   * @returns Complete impact score with component breakdown
   */
  calculateImpactScore(businessService: BusinessService): ImpactScore {
    // Extract service attributes
    const annualRevenue = businessService.bsm_attributes.annual_revenue_supported || 0;
    const customerCount = businessService.bsm_attributes.customer_count || 0;
    const transactionVolume = businessService.bsm_attributes.transaction_volume_daily || 0;
    const dataClassification = businessService.bsm_attributes.data_sensitivity || 'internal';

    // Calculate component scores
    const revenueScore = this.calculateRevenueScore(annualRevenue);
    const customerScore = this.calculateCustomerScore(customerCount);
    const transactionScore = this.calculateTransactionScore(transactionVolume);
    const complianceScore = this.complianceCalculator.calculateComplianceScore(businessService);
    const userScore = this.calculateUserScore(businessService);

    // Calculate total score
    const totalScore = revenueScore + customerScore + transactionScore + complianceScore + userScore;

    // Get user impact details
    const userImpact = this.userCalculator.calculateUserImpact(businessService);

    // Get compliance impact details
    const complianceImpact = this.complianceCalculator.calculateComplianceWeight(businessService);

    const components: ImpactScoreComponents = {
      revenue: Math.round(revenueScore * 10) / 10,
      customers: Math.round(customerScore * 10) / 10,
      transactions: Math.round(transactionScore * 10) / 10,
      compliance: Math.round(complianceScore * 10) / 10,
      users: Math.round(userScore * 10) / 10,
    };

    const impactScore: ImpactScore = {
      totalScore: Math.round(totalScore * 10) / 10,
      components,
      revenueImpact: annualRevenue,
      customerImpact: customerCount,
      transactionVolume,
      complianceImpact,
      userImpact: userImpact.totalUsers,
      dataClassification,
      calculatedAt: new Date(),
    };

    return impactScore;
  }

  /**
   * Calculate revenue component score (0-40 points)
   * Uses logarithmic scale to handle wide revenue ranges
   *
   * @param annualRevenue - Annual revenue in USD
   * @returns Revenue score (0-40)
   */
  private calculateRevenueScore(annualRevenue: number): number {
    if (annualRevenue === 0) {
      return 0;
    }

    // Logarithmic scale
    // $0 = 0 points
    // $10K = 8 points
    // $100K = 16 points
    // $1M = 24 points
    // $10M = 32 points
    // $100M+ = 40 points

    const logRevenue = Math.log10(annualRevenue);
    const logMax = Math.log10(100_000_000); // $100M = max score (40 points)

    const score = (logRevenue / logMax) * 40;

    return Math.min(Math.max(score, 0), 40);
  }

  /**
   * Calculate customer component score (0-25 points)
   * Uses logarithmic scale to handle wide customer ranges
   *
   * @param customerCount - Number of customers
   * @returns Customer score (0-25)
   */
  private calculateCustomerScore(customerCount: number): number {
    if (customerCount === 0) {
      return 0;
    }

    // Logarithmic scale
    // 0 customers = 0 points
    // 100 = 5 points
    // 1,000 = 10 points
    // 10,000 = 15 points
    // 100,000 = 20 points
    // 1,000,000+ = 25 points

    const logCustomers = Math.log10(customerCount);
    const logMax = Math.log10(1_000_000); // 1M customers = max score (25 points)

    const score = (logCustomers / logMax) * 25;

    return Math.min(Math.max(score, 0), 25);
  }

  /**
   * Calculate transaction component score (0-15 points)
   * Linear scale for daily transaction volume
   *
   * @param transactionVolume - Daily transaction volume
   * @returns Transaction score (0-15)
   */
  private calculateTransactionScore(transactionVolume: number): number {
    if (transactionVolume === 0) {
      return 0;
    }

    // Linear scale
    // 0 txns = 0 points
    // 10,000 txns/day = 3 points
    // 100,000 txns/day = 10 points
    // 1,000,000+ txns/day = 15 points

    const score = (transactionVolume / 1_000_000) * 15;

    return Math.min(Math.max(score, 0), 15);
  }

  /**
   * Calculate user component score (0-10 points)
   * Based on internal user count
   *
   * @param businessService - Business service
   * @returns User score (0-10)
   */
  private calculateUserScore(businessService: BusinessService): number {
    const userImpact = this.userCalculator.calculateUserImpact(businessService);
    const internalUsers = userImpact.internalUsers;

    if (internalUsers === 0) {
      return 0;
    }

    // Linear scale
    // 0 users = 0 points
    // 100 users = 2 points
    // 500 users = 5 points
    // 1,000+ users = 10 points

    const score = (internalUsers / 1000) * 10;

    return Math.min(Math.max(score, 0), 10);
  }

  /**
   * Classify impact level based on total score
   *
   * @param totalScore - Total impact score (0-100)
   * @returns Impact level classification
   */
  classifyImpactLevel(totalScore: number): 'critical' | 'high' | 'medium' | 'low' {
    if (totalScore >= 80) {
      return 'critical';
    } else if (totalScore >= 60) {
      return 'high';
    } else if (totalScore >= 40) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Generate impact summary description
   *
   * @param impactScore - Impact score object
   * @returns Human-readable impact summary
   */
  generateImpactSummary(impactScore: ImpactScore): string {
    const level = this.classifyImpactLevel(impactScore.totalScore);
    const { components } = impactScore;

    // Identify primary drivers (top 2 contributors)
    const drivers: Array<{ name: string; score: number }> = [
      { name: 'Revenue', score: components.revenue },
      { name: 'Customers', score: components.customers },
      { name: 'Transactions', score: components.transactions },
      { name: 'Compliance', score: components.compliance },
      { name: 'Users', score: components.users },
    ];

    drivers.sort((a, b) => b.score - a.score);
    const topDrivers = drivers.slice(0, 2).filter((d) => d.score > 0);

    let summary = `Impact Level: ${level.toUpperCase()} (Score: ${impactScore.totalScore}/100). `;

    if (topDrivers.length > 0) {
      const driverNames = topDrivers.map((d) => d.name).join(' and ');
      summary += `Primary impact drivers: ${driverNames}. `;
    }

    if (impactScore.revenueImpact > 0) {
      summary += `Supports $${(impactScore.revenueImpact / 1_000_000).toFixed(1)}M in annual revenue. `;
    }

    if (impactScore.customerImpact > 0) {
      summary += `Serves ${impactScore.customerImpact.toLocaleString()} customers. `;
    }

    if (impactScore.complianceImpact.frameworks.length > 0) {
      summary += `Subject to ${impactScore.complianceImpact.frameworks.join(', ')} regulations.`;
    }

    return summary;
  }

  /**
   * Compare impact scores for prioritization
   * Returns: -1 if service1 < service2, 0 if equal, 1 if service1 > service2
   *
   * @param score1 - First impact score
   * @param score2 - Second impact score
   * @returns Comparison result
   */
  compareImpactScores(score1: ImpactScore, score2: ImpactScore): number {
    if (score1.totalScore > score2.totalScore) {
      return 1;
    } else if (score1.totalScore < score2.totalScore) {
      return -1;
    } else {
      // If total scores are equal, use revenue as tiebreaker
      if (score1.revenueImpact > score2.revenueImpact) {
        return 1;
      } else if (score1.revenueImpact < score2.revenueImpact) {
        return -1;
      }
      return 0;
    }
  }

  /**
   * Batch calculate impact scores for multiple services
   * Useful for generating reports or dashboards
   *
   * @param businessServices - Array of business services
   * @returns Array of impact scores
   */
  batchCalculateImpactScores(businessServices: BusinessService[]): ImpactScore[] {
    return businessServices.map((service) => this.calculateImpactScore(service));
  }

  /**
   * Calculate aggregate impact across multiple services
   * Useful for portfolio-level analysis
   *
   * @param businessServices - Array of business services
   * @returns Aggregated impact score
   */
  calculateAggregateImpact(businessServices: BusinessService[]): ImpactScore {
    const scores = this.batchCalculateImpactScores(businessServices);

    // Sum all component scores
    const aggregateComponents: ImpactScoreComponents = {
      revenue: 0,
      customers: 0,
      transactions: 0,
      compliance: 0,
      users: 0,
    };

    let totalRevenue = 0;
    let totalCustomers = 0;
    let totalTransactions = 0;
    let totalUsers = 0;
    const allFrameworks = new Set<string>();

    for (const score of scores) {
      aggregateComponents.revenue += score.components.revenue;
      aggregateComponents.customers += score.components.customers;
      aggregateComponents.transactions += score.components.transactions;
      aggregateComponents.compliance = Math.max(
        aggregateComponents.compliance,
        score.components.compliance
      );
      aggregateComponents.users += score.components.users;

      totalRevenue += score.revenueImpact;
      totalCustomers += score.customerImpact;
      totalTransactions += score.transactionVolume;
      totalUsers += score.userImpact;

      score.complianceImpact.frameworks.forEach((f) => allFrameworks.add(f));
    }

    // Calculate total score (average of component scores)
    const totalScore =
      aggregateComponents.revenue +
      aggregateComponents.customers +
      aggregateComponents.transactions +
      aggregateComponents.compliance +
      aggregateComponents.users;

    const aggregateScore: ImpactScore = {
      totalScore: Math.round(totalScore * 10) / 10,
      components: aggregateComponents,
      revenueImpact: totalRevenue,
      customerImpact: totalCustomers,
      transactionVolume: totalTransactions,
      complianceImpact: {
        frameworks: Array.from(allFrameworks) as any,
        weight: aggregateComponents.compliance / 10,
        penaltyRisk: 0, // Not calculated for aggregates
        description: `Aggregate impact across ${businessServices.length} services`,
      },
      userImpact: totalUsers,
      dataClassification: 'confidential', // Default for aggregates
      calculatedAt: new Date(),
    };

    return aggregateScore;
  }
}

/**
 * Singleton instance
 */
let impactScoringInstance: ImpactScoringService | null = null;

/**
 * Get Impact Scoring Service instance (singleton)
 */
export function getImpactScoringService(): ImpactScoringService {
  if (!impactScoringInstance) {
    impactScoringInstance = new ImpactScoringService();
  }
  return impactScoringInstance;
}
