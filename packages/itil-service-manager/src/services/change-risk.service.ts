// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Change Risk Assessment Service
 * Implements ITIL v4 Change Management with automated risk assessment
 */

import { getNeo4jClient } from '@cmdb/database';
import { BusinessService } from '@cmdb/unified-model';
import { CIRepository } from '../repositories/ci-repository';
import { BusinessServiceRepository } from '../repositories/business-service-repository';
import { ChangeRepository } from '../repositories/change-repository';
import { RiskAssessor } from '../utils/risk-assessor';
import { PriorityCalculator } from '../utils/priority-calculator';
import {
  ChangeRequest,
  ChangeRiskAssessment,
  RiskFactors,
  Change,
} from '../types';

export class ChangeRiskService {
  private ciRepository: CIRepository;
  private businessServiceRepository: BusinessServiceRepository;
  private changeRepository: ChangeRepository;

  constructor() {
    this.ciRepository = new CIRepository();
    this.businessServiceRepository = new BusinessServiceRepository();
    this.changeRepository = new ChangeRepository();
  }

  /**
   * Assess change risk
   */
  async assessChangeRisk(change: ChangeRequest): Promise<ChangeRiskAssessment> {
    // Get affected CIs
    const affectedCIs = await this.ciRepository.getCIsByIds(change.affectedCIIds);
    if (affectedCIs.length === 0) {
      throw new Error('No affected CIs found');
    }

    // Get affected business services
    const affectedBusinessServices =
      await this.getAffectedBusinessServices(change.affectedCIIds);

    // Calculate risk factors
    const riskFactors = await this.calculateRiskFactors(
      change,
      affectedCIs,
      affectedBusinessServices
    );

    // Calculate overall risk score
    const overallRiskScore = RiskAssessor.calculateOverallRiskScore(riskFactors);

    // Determine risk level
    const riskLevel = RiskAssessor.determineRiskLevel(overallRiskScore);

    // Calculate business impact
    const businessImpact = this.calculateBusinessImpact(
      change,
      affectedBusinessServices,
      riskLevel
    );

    // Determine if CAB approval required
    const requiresCABApproval = RiskAssessor.requiresCABApproval(
      riskLevel,
      change.changeType,
      businessImpact.estimatedRevenueAtRisk
    );

    // Generate mitigation strategies
    const mitigationStrategies =
      RiskAssessor.generateMitigationStrategies(riskFactors);

    // Generate recommendations
    const recommendations = RiskAssessor.generateRecommendations(
      riskLevel,
      change.changeType
    );

    // Check if change window is optimal
    const isOptimalChangeWindow = await this.isOptimalChangeWindow(
      affectedBusinessServices.map((s) => s.id),
      change.plannedStart
    );

    // Get historical change success rate
    const changeSuccessRate = await this.getChangeSuccessRate(change.affectedCIIds[0]);

    // Get critical services affected
    const criticalServicesAffected = affectedBusinessServices
      .filter((s) => s.bsm_attributes.business_criticality === 'tier_1')
      .map((s) => s.name);

    return {
      overallRiskScore,
      riskLevel,
      requiresCABApproval,
      affectedBusinessServices,
      criticalServicesAffected,
      estimatedDowntime: businessImpact.estimatedDowntime,
      estimatedUserImpact: businessImpact.estimatedUserImpact,
      estimatedRevenueAtRisk: businessImpact.estimatedRevenueAtRisk,
      implementationCost: businessImpact.implementationCost,
      downtimeCost: businessImpact.downtimeCost,
      totalCost: businessImpact.totalCost,
      recommendations,
      mitigationStrategies,
      changeSuccessRate,
      isOptimalChangeWindow,
    };
  }

  /**
   * Calculate risk factors
   */
  private async calculateRiskFactors(
    change: ChangeRequest,
    affectedCIs: any[],
    affectedBusinessServices: BusinessService[]
  ): Promise<RiskFactors> {
    // Business criticality score
    const highestCriticality = this.getHighestCriticality(affectedBusinessServices);
    const customerFacingCount = affectedBusinessServices.filter(
      (s) => s.bsm_attributes.business_criticality === 'tier_1' || s.bsm_attributes.business_criticality === 'tier_0'
    ).length;
    const businessCriticalityScore = RiskAssessor.calculateBusinessCriticalityScore(
      highestCriticality as any,
      affectedBusinessServices.length,
      customerFacingCount
    );

    // Complexity score
    const hasRollbackPlan = Boolean(change.backoutPlan);
    const hasTested = Boolean(change.testPlan);
    const complexityScore = RiskAssessor.calculateComplexityScore(
      affectedCIs.length,
      change.changeType,
      hasRollbackPlan,
      hasTested
    );

    // Historical risk score
    const successRate = await this.getChangeSuccessRate(change.affectedCIIds[0] || '');
    const recentFailures = await this.getRecentFailures(change.affectedCIIds[0] || '');
    const historicalRiskScore = RiskAssessor.calculateHistoricalRiskScore(
      successRate,
      recentFailures
    );

    // Change window score
    const isBusinessHours = await this.isBusinessHours(
      affectedBusinessServices,
      change.plannedStart
    );
    const isMaintenanceWindow = await this.isMaintenanceWindow(
      affectedBusinessServices,
      change.plannedStart
    );
    const durationHours =
      (change.plannedEnd.getTime() - change.plannedStart.getTime()) / (1000 * 60 * 60);
    const changeWindowScore = RiskAssessor.calculateChangeWindowScore(
      isBusinessHours,
      isMaintenanceWindow,
      durationHours
    );

    // Dependency score
    const dependencyCounts = await this.getDependencyCounts(change.affectedCIIds);
    const dependencyScore = RiskAssessor.calculateDependencyScore(
      dependencyCounts.upstream,
      dependencyCounts.downstream
    );

    return {
      businessCriticalityScore,
      complexityScore,
      historicalRiskScore,
      changeWindowScore,
      dependencyScore,
    };
  }

  /**
   * Calculate business impact
   */
  private calculateBusinessImpact(
    change: ChangeRequest,
    affectedBusinessServices: BusinessService[],
    _riskLevel: 'low' | 'medium' | 'high' | 'very_high'
  ): {
    estimatedDowntime: number;
    estimatedUserImpact: number;
    estimatedRevenueAtRisk: number;
    implementationCost: number;
    downtimeCost: number;
    totalCost: number;
  } {
    // Estimate downtime
    const plannedDurationMinutes =
      (change.plannedEnd.getTime() - change.plannedStart.getTime()) / (1000 * 60);
    const estimatedDowntime = RiskAssessor.estimateDowntime(
      change.changeType,
      change.affectedCIIds.length,
      plannedDurationMinutes
    );

    // Calculate user impact
    const estimatedUserImpact = affectedBusinessServices.reduce(
      (sum, service) => sum + (service.bsm_attributes.customer_count || 0),
      0
    );

    // Calculate revenue at risk
    const annualRevenue = affectedBusinessServices.reduce(
      (sum, service) => sum + (service.bsm_attributes.annual_revenue_supported || 0),
      0
    );
    const hourlyRevenue = PriorityCalculator.estimateCostOfDowntime(annualRevenue);
    const downtimeCost = (hourlyRevenue * estimatedDowntime) / 60;

    // Estimate implementation cost based on change type
    const implementationCostEstimates: Record<string, number> = {
      standard: 1000,
      normal: 5000,
      emergency: 10000,
      major: 50000,
    };
    const implementationCost =
      implementationCostEstimates[change.changeType] || 5000;

    // Total cost
    const totalCost = implementationCost + downtimeCost;

    // Revenue at risk (potential lost revenue during downtime)
    const estimatedRevenueAtRisk = downtimeCost;

    return {
      estimatedDowntime,
      estimatedUserImpact,
      estimatedRevenueAtRisk,
      implementationCost,
      downtimeCost,
      totalCost,
    };
  }

  /**
   * Get affected business services
   */
  private async getAffectedBusinessServices(
    ciIds: string[]
  ): Promise<BusinessService[]> {
    const allServices: BusinessService[] = [];
    const serviceIds = new Set<string>();

    for (const ciId of ciIds) {
      const services = await this.businessServiceRepository.getBusinessServicesByCIId(ciId);
      for (const service of services) {
        if (!serviceIds.has(service.id)) {
          serviceIds.add(service.id);
          allServices.push(service);
        }
      }
    }

    return allServices;
  }

  /**
   * Get highest criticality from services
   */
  private getHighestCriticality(services: BusinessService[]): string {
    if (services.some((s) => s.bsm_attributes.business_criticality === 'tier_1')) {
      return 'tier_1';
    }
    if (services.some((s) => s.bsm_attributes.business_criticality === 'tier_2')) {
      return 'tier_2';
    }
    if (services.some((s) => s.bsm_attributes.business_criticality === 'tier_3')) {
      return 'tier_3';
    }
    return 'tier_4';
  }

  /**
   * Get historical change success rate for CI
   */
  async getChangeSuccessRate(ciId: string): Promise<number> {
    return await this.changeRepository.getChangeSuccessRateByCIId(ciId);
  }

  /**
   * Get recent failures count
   */
  private async getRecentFailures(ciId: string): Promise<number> {
    const changes = await this.changeRepository.getChangesByCIId(ciId, 50);
    return changes.filter(
      (c) => c.outcome === 'failed' || c.outcome === 'backed_out'
    ).length;
  }

  /**
   * Check if change window is optimal
   */
  async isOptimalChangeWindow(
    businessServiceIds: string[],
    plannedStart: Date
  ): Promise<boolean> {
    const services =
      await this.businessServiceRepository.getBusinessServicesByIds(businessServiceIds);

    // Check if all services allow changes at this time
    for (const service of services) {
      const serviceHours = service.itil_attributes.service_hours;
      const isBusinessHours = PriorityCalculator.isBusinessHours(
        serviceHours,
        plannedStart
      );

      // Optimal if outside business hours or during maintenance window
      const isMaintenanceWindow = this.isInMaintenanceWindow(
        serviceHours,
        plannedStart
      );

      if (isBusinessHours && !isMaintenanceWindow) {
        return false; // Not optimal - business hours without maintenance window
      }
    }

    return true; // All checks passed
  }

  /**
   * Check if time is business hours
   */
  private async isBusinessHours(
    services: BusinessService[],
    time: Date
  ): Promise<boolean> {
    // If any service is in business hours, consider it business hours
    for (const service of services) {
      if (
        PriorityCalculator.isBusinessHours(
          service.itil_attributes.service_hours,
          time
        )
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if time is in maintenance window
   */
  private async isMaintenanceWindow(
    services: BusinessService[],
    time: Date
  ): Promise<boolean> {
    // If any service has a maintenance window at this time
    for (const service of services) {
      if (this.isInMaintenanceWindow(service.itil_attributes.service_hours, time)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if time is in maintenance window
   */
  private isInMaintenanceWindow(
    serviceHours: any,
    time: Date
  ): boolean {
    const maintenanceWindows = serviceHours.maintenance_windows || [];
    const dayOfWeek = time.getDay();
    const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;

    for (const window of maintenanceWindows) {
      if (window.day_of_week === dayOfWeek) {
        if (timeStr >= window.start_time && timeStr <= window.end_time) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get dependency counts
   */
  private async getDependencyCounts(
    ciIds: string[]
  ): Promise<{ upstream: number; downstream: number }> {
    if (ciIds.length === 0) {
      return { upstream: 0, downstream: 0 };
    }

    const neo4j = getNeo4jClient();
    const session = neo4j.getSession();

    try {
      const result = await session.run(
        `
        MATCH (ci:CI)
        WHERE ci.id IN $ciIds
        OPTIONAL MATCH (ci)-[:DEPENDS_ON]->(upstream:CI)
        OPTIONAL MATCH (downstream:CI)-[:DEPENDS_ON]->(ci)
        RETURN
          count(DISTINCT upstream) as upstreamCount,
          count(DISTINCT downstream) as downstreamCount
        `,
        { ciIds }
      );

      const record = result.records[0];
      return {
        upstream: record.get('upstreamCount').toNumber(),
        downstream: record.get('downstreamCount').toNumber(),
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Generate mitigation strategies
   */
  async generateMitigationStrategies(
    risk: ChangeRiskAssessment
  ): Promise<string[]> {
    return risk.mitigationStrategies;
  }

  /**
   * Determine if CAB approval required
   */
  requiresCABApproval(risk: ChangeRiskAssessment): boolean {
    return risk.requiresCABApproval;
  }

  /**
   * Create change with risk assessment
   */
  async createChange(request: ChangeRequest): Promise<Change> {
    // Assess risk
    const riskAssessment = await this.assessChangeRisk(request);

    // Create change in database
    const change = await this.changeRepository.createChange(request, riskAssessment);

    return change;
  }

  /**
   * Get changes by CI
   */
  async getChangesByCIId(ciId: string, limit: number = 100): Promise<Change[]> {
    return await this.changeRepository.getChangesByCIId(ciId, limit);
  }

  /**
   * Get pending changes
   */
  async getPendingChanges(limit: number = 100): Promise<Change[]> {
    return await this.changeRepository.getPendingChanges(limit);
  }
}
