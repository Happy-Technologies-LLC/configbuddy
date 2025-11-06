/**
 * Revenue Impact Calculator
 * Calculates financial impact of service disruptions
 */

import { BusinessService } from '@cmdb/unified-model';
import { RevenueImpactAnalysis } from '../types/impact-types';
import { CRITICALITY_MULTIPLIERS } from '../types/bsm-types';

/**
 * Revenue Impact Calculator
 * Estimates revenue impact and downtime costs for business services
 */
export class RevenueImpactCalculator {
  /**
   * Calculate downtime cost for a business service
   * Formula: (Annual Revenue / 8760 hours) * Downtime Hours * Criticality Multiplier
   *
   * @param businessService - Business service to analyze
   * @param downtimeHours - Estimated downtime duration in hours
   * @returns Estimated downtime cost in USD
   */
  calculateDowntimeCost(businessService: BusinessService, downtimeHours: number): number {
    const annualRevenue = businessService.bsm_attributes.annual_revenue_supported || 0;
    const criticality = businessService.bsm_attributes.business_criticality;

    // Calculate hourly revenue rate
    const hoursPerYear = 8760; // 365 days * 24 hours
    const revenuePerHour = annualRevenue / hoursPerYear;

    // Apply criticality multiplier
    const criticalityMultiplier = CRITICALITY_MULTIPLIERS[criticality] || 1.0;

    // Calculate total downtime cost
    const downtimeCost = revenuePerHour * downtimeHours * criticalityMultiplier;

    return Math.round(downtimeCost * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate detailed revenue impact analysis
   * Provides comprehensive breakdown of revenue impact factors
   *
   * @param businessService - Business service to analyze
   * @param downtimeHours - Estimated downtime duration in hours
   * @param scenario - Description of the scenario
   * @returns Detailed revenue impact analysis
   */
  calculateRevenueImpact(
    businessService: BusinessService,
    downtimeHours: number,
    scenario: string = 'Service outage'
  ): RevenueImpactAnalysis {
    const annualRevenue = businessService.bsm_attributes.annual_revenue_supported || 0;
    const criticality = businessService.bsm_attributes.business_criticality;
    const isCustomerFacing = businessService.itil_attributes.service_type === 'customer_facing';

    // Calculate hourly revenue rate
    const hoursPerYear = 8760;
    const revenuePerHour = annualRevenue / hoursPerYear;

    // Get criticality multiplier
    const criticalityMultiplier = CRITICALITY_MULTIPLIERS[criticality] || 1.0;

    // Calculate downtime cost
    const downtimeCostPerHour = revenuePerHour * criticalityMultiplier;
    const estimatedLoss = downtimeCostPerHour * downtimeHours;

    const analysis: RevenueImpactAnalysis = {
      annualRevenue,
      directRevenue: isCustomerFacing,
      revenuePerHour: Math.round(revenuePerHour * 100) / 100,
      downtimeCostPerHour: Math.round(downtimeCostPerHour * 100) / 100,
      criticalityMultiplier,
      estimatedLoss: Math.round(estimatedLoss * 100) / 100,
      calculatedFor: {
        downtimeHours,
        scenario,
      },
    };

    return analysis;
  }

  /**
   * Calculate total revenue at risk across multiple services
   * Sums annual revenue for all impacted services
   *
   * @param impactedServices - Array of business services
   * @returns Total annual revenue at risk in USD
   */
  calculateRevenueAtRisk(impactedServices: BusinessService[]): number {
    const totalRevenue = impactedServices.reduce((sum, service) => {
      return sum + (service.bsm_attributes.annual_revenue_supported || 0);
    }, 0);

    return Math.round(totalRevenue * 100) / 100;
  }

  /**
   * Calculate hourly cost for a business service
   * Useful for real-time impact dashboards
   *
   * @param businessService - Business service to analyze
   * @returns Hourly cost in USD
   */
  calculateHourlyCost(businessService: BusinessService): number {
    const annualRevenue = businessService.bsm_attributes.annual_revenue_supported || 0;
    const criticality = businessService.bsm_attributes.business_criticality;
    const hoursPerYear = 8760;

    const revenuePerHour = annualRevenue / hoursPerYear;
    const criticalityMultiplier = CRITICALITY_MULTIPLIERS[criticality] || 1.0;

    return Math.round(revenuePerHour * criticalityMultiplier * 100) / 100;
  }

  /**
   * Estimate revenue impact based on percentage of service degradation
   * For partial outages where service is degraded but not completely down
   *
   * @param businessService - Business service to analyze
   * @param degradationPercentage - Percentage of service degradation (0-100)
   * @param durationHours - Duration of degradation in hours
   * @returns Estimated revenue impact in USD
   */
  calculateDegradationImpact(
    businessService: BusinessService,
    degradationPercentage: number,
    durationHours: number
  ): number {
    if (degradationPercentage < 0 || degradationPercentage > 100) {
      throw new Error('Degradation percentage must be between 0 and 100');
    }

    const fullDowntimeCost = this.calculateDowntimeCost(businessService, durationHours);
    const degradationFactor = degradationPercentage / 100;
    const degradationCost = fullDowntimeCost * degradationFactor;

    return Math.round(degradationCost * 100) / 100;
  }

  /**
   * Calculate opportunity cost for delayed projects/initiatives
   * Estimates lost revenue due to delayed feature releases or service improvements
   *
   * @param projectedAnnualRevenue - Expected annual revenue from the initiative
   * @param delayDays - Number of days delayed
   * @returns Opportunity cost in USD
   */
  calculateOpportunityCost(projectedAnnualRevenue: number, delayDays: number): number {
    const daysPerYear = 365;
    const revenuePerDay = projectedAnnualRevenue / daysPerYear;
    const opportunityCost = revenuePerDay * delayDays;

    return Math.round(opportunityCost * 100) / 100;
  }

  /**
   * Calculate revenue impact for a specific time period
   * Useful for incident reports and post-mortems
   *
   * @param businessService - Business service to analyze
   * @param startTime - Start of outage/degradation
   * @param endTime - End of outage/degradation
   * @param degradationPercentage - Optional percentage of degradation (default: 100 for complete outage)
   * @returns Revenue impact analysis for the time period
   */
  calculateTimePeriodImpact(
    businessService: BusinessService,
    startTime: Date,
    endTime: Date,
    degradationPercentage: number = 100
  ): RevenueImpactAnalysis {
    // Calculate duration in hours
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    if (durationHours < 0) {
      throw new Error('End time must be after start time');
    }

    // Calculate base impact
    const baseImpact = this.calculateRevenueImpact(
      businessService,
      durationHours,
      `Outage from ${startTime.toISOString()} to ${endTime.toISOString()}`
    );

    // Adjust for degradation if not a complete outage
    if (degradationPercentage < 100) {
      const degradationFactor = degradationPercentage / 100;
      baseImpact.estimatedLoss = baseImpact.estimatedLoss * degradationFactor;
      baseImpact.calculatedFor.scenario = `${degradationPercentage}% degradation from ${startTime.toISOString()} to ${endTime.toISOString()}`;
    }

    return baseImpact;
  }

  /**
   * Calculate cumulative revenue impact over multiple incidents
   * Useful for calculating monthly/quarterly impact reports
   *
   * @param incidents - Array of incidents with service, start time, end time, and severity
   * @returns Total revenue impact in USD
   */
  calculateCumulativeImpact(
    incidents: Array<{
      businessService: BusinessService;
      startTime: Date;
      endTime: Date;
      degradationPercentage?: number;
    }>
  ): number {
    let totalImpact = 0;

    for (const incident of incidents) {
      const impact = this.calculateTimePeriodImpact(
        incident.businessService,
        incident.startTime,
        incident.endTime,
        incident.degradationPercentage
      );
      totalImpact += impact.estimatedLoss;
    }

    return Math.round(totalImpact * 100) / 100;
  }
}

/**
 * Singleton instance
 */
let revenueCalculatorInstance: RevenueImpactCalculator | null = null;

/**
 * Get Revenue Impact Calculator instance (singleton)
 */
export function getRevenueImpactCalculator(): RevenueImpactCalculator {
  if (!revenueCalculatorInstance) {
    revenueCalculatorInstance = new RevenueImpactCalculator();
  }
  return revenueCalculatorInstance;
}
