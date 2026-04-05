// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Incident Priority Service
 * Implements ITIL v4 Incident Management with automated priority calculation
 */

import { BusinessService } from '@cmdb/unified-model';
import { CIRepository } from '../repositories/ci-repository';
import { BusinessServiceRepository } from '../repositories/business-service-repository';
import { IncidentRepository } from '../repositories/incident-repository';
import { PriorityCalculator } from '../utils/priority-calculator';
import {
  IncidentInput,
  IncidentPriority,
  PriorityMatrix,
  Incident,
} from '../types';

export class IncidentPriorityService {
  private ciRepository: CIRepository;
  private businessServiceRepository: BusinessServiceRepository;
  private incidentRepository: IncidentRepository;

  constructor() {
    this.ciRepository = new CIRepository();
    this.businessServiceRepository = new BusinessServiceRepository();
    this.incidentRepository = new IncidentRepository();
  }

  /**
   * Calculate incident priority using ITIL methodology
   * Priority = f(Impact, Urgency)
   */
  async calculatePriority(incident: IncidentInput): Promise<IncidentPriority> {
    // Get affected CI
    const ci = await this.ciRepository.getCI(incident.affectedCIId);
    if (!ci) {
      throw new Error(`CI not found: ${incident.affectedCIId}`);
    }

    // Get affected business services
    const affectedBusinessServices =
      await this.businessServiceRepository.getBusinessServicesByCIId(incident.affectedCIId);

    // Calculate impact
    const impact = await this.calculateImpact(ci, affectedBusinessServices);

    // Calculate urgency
    const urgency = await this.calculateUrgency(ci, affectedBusinessServices);

    // Calculate priority using ITIL matrix
    const priority = PriorityCalculator.calculatePriority(impact, urgency);

    // Calculate business impact metrics
    const businessImpact = this.calculateBusinessImpact(
      ci,
      affectedBusinessServices,
      impact
    );

    // Determine if escalation required
    const requiresEscalation = PriorityCalculator.requiresEscalation(priority);

    // Get recommended response team
    const serviceOwner =
      affectedBusinessServices.length > 0
        ? affectedBusinessServices[0].technical_owner
        : ci.owner;
    const supportLevel =
      affectedBusinessServices.length > 0
        ? affectedBusinessServices[0].itil_attributes.support_level
        : 'l2';

    const recommendedResponseTeam = PriorityCalculator.getRecommendedResponseTeam(
      priority,
      serviceOwner,
      supportLevel
    );

    // Generate reasoning
    const reasoning = this.generateReasoning(
      impact,
      urgency,
      priority,
      affectedBusinessServices
    );

    return {
      priority,
      impact,
      urgency,
      reasoning,
      affectedBusinessServices,
      estimatedUserImpact: businessImpact.userImpact,
      estimatedRevenueImpact: businessImpact.revenueImpact,
      estimatedCostOfDowntime: businessImpact.costOfDowntime,
      requiresEscalation,
      recommendedResponseTeam,
    };
  }

  /**
   * Calculate impact based on business criticality and user count
   */
  private async calculateImpact(
    ci: any,
    affectedBusinessServices: BusinessService[]
  ): Promise<'critical' | 'high' | 'medium' | 'low'> {
    // Get highest criticality from affected services
    let highestCriticality = ci.bsm_attributes.business_criticality;

    for (const service of affectedBusinessServices) {
      const serviceCriticality = service.bsm_attributes.business_criticality;
      if (this.isCriticalityHigher(serviceCriticality, highestCriticality)) {
        highestCriticality = serviceCriticality;
      }
    }

    // Calculate total user impact
    const totalUserImpact = affectedBusinessServices.reduce(
      (sum, service) => sum + (service.bsm_attributes.customer_count || 0),
      0
    );

    // Check if any service is customer facing
    // Note: BSMBusinessServiceAttributes doesn't have customer_facing, check if critical
    const isCustomerFacing = affectedBusinessServices.some(
      (service) => service.bsm_attributes.business_criticality === 'tier_1' || service.bsm_attributes.business_criticality === 'tier_0'
    );

    return PriorityCalculator.calculateImpact(
      highestCriticality as any,
      totalUserImpact,
      isCustomerFacing
    );
  }

  /**
   * Calculate urgency based on operational status and SLA
   */
  private async calculateUrgency(
    _ci: any,
    affectedBusinessServices: BusinessService[]
  ): Promise<'critical' | 'high' | 'medium' | 'low'> {
    // Get operational status from most critical service
    let operationalStatus: string = 'operational';
    let highestSLA = 0;

    for (const service of affectedBusinessServices) {
      // Get operational status
      if (service.operational_status === 'outage') {
        operationalStatus = 'outage';
      } else if (
        service.operational_status === 'degraded' &&
        operationalStatus !== 'outage'
      ) {
        operationalStatus = 'degraded';
      }

      // Get highest SLA
      const slaTarget = service.itil_attributes.sla_targets.availability_percentage;
      if (slaTarget > highestSLA) {
        highestSLA = slaTarget;
      }
    }

    // Check if currently business hours
    const serviceHours =
      affectedBusinessServices.length > 0
        ? affectedBusinessServices[0].itil_attributes.service_hours
        : null;
    const isBusinessHours = serviceHours
      ? PriorityCalculator.isBusinessHours(serviceHours)
      : true;

    return PriorityCalculator.calculateUrgency(
      operationalStatus,
      highestSLA,
      isBusinessHours
    );
  }

  /**
   * Calculate business impact metrics
   */
  private calculateBusinessImpact(
    _ci: any,
    affectedBusinessServices: BusinessService[],
    impact: 'critical' | 'high' | 'medium' | 'low'
  ): {
    userImpact: number;
    revenueImpact: number;
    costOfDowntime: number;
  } {
    // Calculate user impact
    const userImpact = affectedBusinessServices.reduce(
      (sum, service) => sum + (service.bsm_attributes.customer_count || 0),
      0
    );

    // Calculate revenue impact (annual revenue / business hours per year)
    const annualRevenue = affectedBusinessServices.reduce(
      (sum, service) => sum + (service.bsm_attributes.annual_revenue_supported || 0),
      0
    );

    const hourlyRevenue = PriorityCalculator.estimateCostOfDowntime(annualRevenue);

    // Estimate downtime based on impact
    const estimatedDowntimeHours = this.estimateDowntimeByImpact(impact);

    const revenueImpact = hourlyRevenue * estimatedDowntimeHours;
    const costOfDowntime = revenueImpact;

    return {
      userImpact,
      revenueImpact,
      costOfDowntime,
    };
  }

  /**
   * Estimate downtime based on impact level
   */
  private estimateDowntimeByImpact(
    impact: 'critical' | 'high' | 'medium' | 'low'
  ): number {
    // Estimated hours until resolution
    const estimates: Record<string, number> = {
      critical: 4, // 4 hours
      high: 8, // 8 hours
      medium: 24, // 24 hours
      low: 48, // 48 hours
    };

    return estimates[impact];
  }

  /**
   * Compare criticality levels
   */
  private isCriticalityHigher(a: string, b: string): boolean {
    const levels = ['tier_4', 'tier_3', 'tier_2', 'tier_1'];
    return levels.indexOf(a) > levels.indexOf(b);
  }

  /**
   * Generate reasoning for priority calculation
   */
  private generateReasoning(
    impact: string,
    urgency: string,
    priority: number,
    affectedBusinessServices: BusinessService[]
  ): string {
    const parts: string[] = [];

    // Impact reasoning
    parts.push(`Impact: ${impact.toUpperCase()}`);
    if (affectedBusinessServices.length > 0) {
      const criticalServices = affectedBusinessServices.filter(
        (s) => s.bsm_attributes.business_criticality === 'tier_1'
      );
      if (criticalServices.length > 0) {
        parts.push(
          `- Affects ${criticalServices.length} critical (Tier 1) business service(s)`
        );
      }
      const customerFacing = affectedBusinessServices.filter(
        (s) => s.bsm_attributes.business_criticality === 'tier_1' || s.bsm_attributes.business_criticality === 'tier_0'
      );
      if (customerFacing.length > 0) {
        parts.push(`- Impacts ${customerFacing.length} customer-facing service(s)`);
      }
    }

    // Urgency reasoning
    parts.push(`\nUrgency: ${urgency.toUpperCase()}`);
    const downServices = affectedBusinessServices.filter(
      (s) => s.operational_status === 'outage'
    );
    if (downServices.length > 0) {
      parts.push(`- ${downServices.length} service(s) currently in outage`);
    }

    // Priority result
    parts.push(`\nResult: Priority ${priority} (P${priority})`);
    const responsePriority = priority as 1 | 2 | 3 | 4 | 5;
    parts.push(
      `- Expected response time: ${PriorityCalculator.getRecommendedResponseTime(responsePriority)} minutes`
    );
    parts.push(
      `- Expected resolution time: ${PriorityCalculator.getRecommendedResolutionTime(responsePriority)} minutes`
    );

    return parts.join('\n');
  }

  /**
   * Get priority matrix
   */
  getPriorityMatrix(): PriorityMatrix {
    return PriorityCalculator.getPriorityMatrix();
  }

  /**
   * Create incident with calculated priority
   */
  async createIncident(input: IncidentInput): Promise<Incident> {
    // Calculate priority
    const priority = await this.calculatePriority(input);

    // Create incident in database
    const incident = await this.incidentRepository.createIncident(input, priority);

    return incident;
  }

  /**
   * Get incidents by CI
   */
  async getIncidentsByCIId(ciId: string, limit: number = 100): Promise<Incident[]> {
    return await this.incidentRepository.getIncidentsByCIId(ciId, limit);
  }

  /**
   * Get open incidents
   */
  async getOpenIncidents(limit: number = 100): Promise<Incident[]> {
    return await this.incidentRepository.getOpenIncidents(limit);
  }

  /**
   * Check if escalation required
   */
  isEscalationRequired(priority: IncidentPriority): boolean {
    return priority.requiresEscalation;
  }

  /**
   * Get recommended response team
   */
  async getRecommendedResponseTeam(
    priority: IncidentPriority
  ): Promise<string[]> {
    return priority.recommendedResponseTeam;
  }
}
