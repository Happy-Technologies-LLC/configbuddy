// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * User Impact Calculator
 * Calculates impact on internal and external users
 */

import { BusinessService } from '@cmdb/unified-model';
import { UserImpact, UserSegment } from '../types/impact-types';

/**
 * User Impact Calculator
 * Estimates the number of users affected by service disruptions
 */
export class UserImpactCalculator {
  /**
   * Calculate user impact for a business service
   * Analyzes both internal (employee) and external (customer) users
   *
   * @param businessService - Business service to analyze
   * @returns User impact analysis
   */
  calculateUserImpact(businessService: BusinessService): UserImpact {
    const customerCount = businessService.bsm_attributes.customer_count || 0;
    const transactionVolumeDaily = businessService.bsm_attributes.transaction_volume_daily || 0;

    // Estimate internal users based on service type
    const internalUsers = this.estimateInternalUsers(businessService);

    // Estimate daily active users (DAU) as a percentage of total customers
    // Typically 20-40% of customers are active daily for consumer services
    const dailyActiveUsers = this.estimateDailyActiveUsers(customerCount, businessService);

    // Estimate peak concurrent users (typically 5-10% of DAU)
    const peakConcurrentUsers = Math.round(dailyActiveUsers * 0.08);

    // Identify user segments
    const userSegments = this.identifyUserSegments(businessService);

    const userImpact: UserImpact = {
      internalUsers,
      externalUsers: customerCount,
      totalUsers: internalUsers + customerCount,
      dailyActiveUsers,
      peakConcurrentUsers,
      userSegments,
    };

    return userImpact;
  }

  /**
   * Estimate internal users (employees) based on service type
   *
   * @param businessService - Business service to analyze
   * @returns Estimated number of internal users
   */
  private estimateInternalUsers(businessService: BusinessService): number {
    const serviceType = businessService.itil_attributes.service_type;

    // Internal services are used by employees
    if (serviceType === 'internal') {
      // Could query HRMS integration for actual employee count
      // For now, estimate based on company size (placeholder)
      return 500; // Placeholder: should be configured or queried
    }

    // Infrastructure services support IT team
    if (serviceType === 'infrastructure') {
      return 50; // IT team size estimate
    }

    // Customer-facing services have limited internal users (support, ops)
    if (serviceType === 'customer_facing') {
      return 20; // Support and operations team
    }

    return 0;
  }

  /**
   * Estimate daily active users based on total customers
   *
   * @param totalCustomers - Total customer count
   * @param businessService - Business service to analyze
   * @returns Estimated daily active users
   */
  private estimateDailyActiveUsers(
    totalCustomers: number,
    businessService: BusinessService
  ): number {
    if (totalCustomers === 0) {
      return 0;
    }

    const criticality = businessService.bsm_attributes.business_criticality;
    const serviceType = businessService.itil_attributes.service_type;

    // DAU percentage varies by service criticality and type
    let dauPercentage = 0.25; // Default: 25% of customers active daily

    // Customer-facing services have higher daily engagement
    if (serviceType === 'customer_facing') {
      switch (criticality) {
        case 'tier_0':
        case 'tier_1':
          dauPercentage = 0.40; // 40% for critical customer services
          break;
        case 'tier_2':
          dauPercentage = 0.30; // 30% for important services
          break;
        case 'tier_3':
        case 'tier_4':
          dauPercentage = 0.20; // 20% for standard services
          break;
      }
    }

    // Internal services: all employees use them regularly
    if (serviceType === 'internal') {
      dauPercentage = 0.80; // 80% of internal users active daily
    }

    return Math.round(totalCustomers * dauPercentage);
  }

  /**
   * Identify user segments and their impact severity
   *
   * @param businessService - Business service to analyze
   * @returns Array of user segments
   */
  private identifyUserSegments(businessService: BusinessService): UserSegment[] {
    const segments: UserSegment[] = [];
    const customerCount = businessService.bsm_attributes.customer_count || 0;
    const criticality = businessService.bsm_attributes.business_criticality;
    const serviceType = businessService.itil_attributes.service_type;

    // Customer segment (if customer-facing)
    if (serviceType === 'customer_facing' && customerCount > 0) {
      // Premium customers (top 20% by revenue, typically 5% of users)
      const premiumCustomers = Math.round(customerCount * 0.05);
      segments.push({
        segmentName: 'Premium Customers',
        userCount: premiumCustomers,
        impactSeverity: criticality === 'tier_0' || criticality === 'tier_1' ? 'critical' : 'high',
        description: 'High-value customers with premium support agreements',
      });

      // Standard customers (remaining 95%)
      const standardCustomers = customerCount - premiumCustomers;
      segments.push({
        segmentName: 'Standard Customers',
        userCount: standardCustomers,
        impactSeverity: criticality === 'tier_0' ? 'high' : 'medium',
        description: 'General customer base with standard service levels',
      });
    }

    // Internal user segments
    if (serviceType === 'internal') {
      segments.push({
        segmentName: 'Internal Users',
        userCount: this.estimateInternalUsers(businessService),
        impactSeverity: criticality === 'tier_0' || criticality === 'tier_1' ? 'high' : 'medium',
        description: 'Employees and internal users',
      });
    }

    // IT Operations segment (for infrastructure services)
    if (serviceType === 'infrastructure') {
      segments.push({
        segmentName: 'IT Operations',
        userCount: this.estimateInternalUsers(businessService),
        impactSeverity: 'high',
        description: 'IT team members managing infrastructure',
      });
    }

    return segments;
  }

  /**
   * Calculate total users affected by multiple service outages
   *
   * @param businessServices - Array of affected business services
   * @returns Total number of unique users affected
   */
  calculateAggregateUserImpact(businessServices: BusinessService[]): UserImpact {
    let totalInternalUsers = 0;
    let totalExternalUsers = 0;
    let totalDailyActiveUsers = 0;
    const allSegments: UserSegment[] = [];

    for (const service of businessServices) {
      const impact = this.calculateUserImpact(service);
      totalInternalUsers = Math.max(totalInternalUsers, impact.internalUsers); // Take max, not sum (users overlap)
      totalExternalUsers += impact.externalUsers; // Sum external users
      totalDailyActiveUsers += impact.dailyActiveUsers;

      // Merge segments
      allSegments.push(...impact.userSegments);
    }

    // Consolidate duplicate segments
    const consolidatedSegments = this.consolidateSegments(allSegments);

    const aggregateImpact: UserImpact = {
      internalUsers: totalInternalUsers,
      externalUsers: totalExternalUsers,
      totalUsers: totalInternalUsers + totalExternalUsers,
      dailyActiveUsers: totalDailyActiveUsers,
      peakConcurrentUsers: Math.round(totalDailyActiveUsers * 0.08),
      userSegments: consolidatedSegments,
    };

    return aggregateImpact;
  }

  /**
   * Consolidate duplicate user segments
   *
   * @param segments - Array of user segments
   * @returns Consolidated segments
   */
  private consolidateSegments(segments: UserSegment[]): UserSegment[] {
    const segmentMap = new Map<string, UserSegment>();

    for (const segment of segments) {
      if (segmentMap.has(segment.segmentName)) {
        const existing = segmentMap.get(segment.segmentName)!;
        existing.userCount += segment.userCount;

        // Keep the highest severity
        if (this.compareSeverity(segment.impactSeverity, existing.impactSeverity) > 0) {
          existing.impactSeverity = segment.impactSeverity;
        }
      } else {
        segmentMap.set(segment.segmentName, { ...segment });
      }
    }

    return Array.from(segmentMap.values());
  }

  /**
   * Compare severity levels
   *
   * @param severity1 - First severity level
   * @param severity2 - Second severity level
   * @returns Positive if severity1 > severity2, negative if severity1 < severity2, 0 if equal
   */
  private compareSeverity(
    severity1: 'critical' | 'high' | 'medium' | 'low',
    severity2: 'critical' | 'high' | 'medium' | 'low'
  ): number {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return severityOrder[severity1] - severityOrder[severity2];
  }

  /**
   * Estimate productivity loss for internal users
   * Calculates the value of lost employee productivity during outage
   *
   * @param internalUsers - Number of internal users affected
   * @param downtimeHours - Duration of outage in hours
   * @param averageHourlyWage - Average hourly wage (default: $50/hour)
   * @returns Estimated productivity loss in USD
   */
  calculateProductivityLoss(
    internalUsers: number,
    downtimeHours: number,
    averageHourlyWage: number = 50
  ): number {
    const productivityLoss = internalUsers * downtimeHours * averageHourlyWage;
    return Math.round(productivityLoss * 100) / 100;
  }

  /**
   * Calculate customer satisfaction impact score
   * Estimates impact on customer satisfaction based on outage severity and duration
   *
   * @param customerCount - Number of customers affected
   * @param downtimeHours - Duration of outage in hours
   * @param criticality - Service criticality level
   * @returns Impact score (0-100, higher is worse)
   */
  calculateSatisfactionImpact(
    customerCount: number,
    downtimeHours: number,
    criticality: string
  ): number {
    // Base impact: duration-based
    let impactScore = Math.min(downtimeHours * 10, 100); // 10 points per hour, max 100

    // Adjust for customer count (logarithmic scale)
    const customerFactor = Math.log10(Math.max(customerCount, 1)) / 6; // Normalize to 0-1
    impactScore *= 1 + customerFactor;

    // Adjust for criticality
    const criticalityMultipliers: Record<string, number> = {
      tier_0: 2.0,
      tier_1: 1.5,
      tier_2: 1.2,
      tier_3: 1.0,
      tier_4: 0.8,
    };
    impactScore *= criticalityMultipliers[criticality] || 1.0;

    return Math.min(Math.round(impactScore), 100);
  }
}

/**
 * Singleton instance
 */
let userImpactCalculatorInstance: UserImpactCalculator | null = null;

/**
 * Get User Impact Calculator instance (singleton)
 */
export function getUserImpactCalculator(): UserImpactCalculator {
  if (!userImpactCalculatorInstance) {
    userImpactCalculatorInstance = new UserImpactCalculator();
  }
  return userImpactCalculatorInstance;
}
