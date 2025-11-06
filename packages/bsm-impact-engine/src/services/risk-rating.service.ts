/**
 * Risk Rating Service
 * Calculates risk ratings (Critical/High/Medium/Low) based on multiple factors
 */

import { BusinessService } from '@cmdb/unified-model';
import { RiskAssessment, RiskFactor } from '../types/impact-types';
import { RiskRating, BusinessCriticality } from '../types/bsm-types';

/**
 * Risk Rating Service
 * Assesses operational risk based on criticality, incidents, changes, and compliance
 *
 * Risk Matrix:
 * - Tier 0 + High incidents = CRITICAL
 * - Tier 0-1 + Medium incidents = HIGH
 * - Tier 2-3 + Low incidents = MEDIUM
 * - Tier 4 + Low incidents = LOW
 */
export class RiskRatingService {
  /**
   * Calculate comprehensive risk assessment for a business service
   *
   * @param businessService - Business service to analyze
   * @returns Risk assessment with rating and factors
   */
  async calculateRiskAssessment(businessService: BusinessService): Promise<RiskAssessment> {
    const criticality = businessService.bsm_attributes.business_criticality;

    // Calculate risk factors
    const incidentFactor = this.calculateIncidentRiskFactor(businessService);
    const changeFactor = this.calculateChangeRiskFactor(businessService);
    const availabilityFactor = this.calculateAvailabilityRiskFactor(businessService);
    const complianceFactor = this.calculateComplianceRiskFactor(businessService);
    const auditFactor = this.calculateAuditRiskFactor(businessService);

    const factors: RiskFactor[] = [
      incidentFactor,
      changeFactor,
      availabilityFactor,
      complianceFactor,
      auditFactor,
    ];

    // Calculate weighted risk score (0-100)
    const riskScore = this.calculateWeightedRiskScore(factors);

    // Determine risk rating based on score and criticality
    const riskRating = this.determineRiskRating(riskScore, criticality);

    // Get incident and change metrics
    const incidentCount30d = businessService.itil_attributes.incident_count_30d || 0;
    const changeCount30d = businessService.itil_attributes.change_count_30d || 0;
    const availability30d = businessService.itil_attributes.availability_30d || 100;

    // Calculate change failure rate
    const changeFailureRate = this.estimateChangeFailureRate(businessService);

    // Calculate MTTR (Mean Time To Recovery)
    const mttr = this.estimateMTTR(businessService);

    // Determine configuration drift status
    const driftStatus = this.assessConfigurationDrift(businessService);

    // Get last audit date
    const lastAuditDate = this.getLastAuditDate(businessService);
    const daysSinceLastAudit = lastAuditDate
      ? Math.floor((Date.now() - lastAuditDate.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // Generate recommendations
    const recommendations = this.generateRecommendations(riskRating, factors, businessService);

    const assessment: RiskAssessment = {
      riskRating,
      riskScore: Math.round(riskScore * 10) / 10,
      factors,
      businessCriticality: criticality,
      incidentFrequency: incidentCount30d,
      changeFailureRate,
      meanTimeToRecovery: mttr,
      configurationDriftStatus: driftStatus,
      lastAuditDate,
      daysSinceLastAudit,
      recommendations,
      calculatedAt: new Date(),
    };

    return assessment;
  }

  /**
   * Calculate incident risk factor
   * Higher incident frequency = higher risk
   *
   * @param businessService - Business service
   * @returns Risk factor
   */
  private calculateIncidentRiskFactor(businessService: BusinessService): RiskFactor {
    const incidentCount = businessService.itil_attributes.incident_count_30d || 0;

    // Risk score based on incident count (last 30 days)
    // 0 incidents = 0 points
    // 1-3 incidents = 20 points
    // 4-10 incidents = 50 points
    // 11-20 incidents = 75 points
    // 21+ incidents = 100 points

    let score = 0;
    let description = 'No incidents in the last 30 days';

    if (incidentCount === 0) {
      score = 0;
      description = 'No incidents in the last 30 days - excellent stability';
    } else if (incidentCount <= 3) {
      score = 20;
      description = `${incidentCount} incident(s) in the last 30 days - low risk`;
    } else if (incidentCount <= 10) {
      score = 50;
      description = `${incidentCount} incidents in the last 30 days - moderate risk`;
    } else if (incidentCount <= 20) {
      score = 75;
      description = `${incidentCount} incidents in the last 30 days - high risk`;
    } else {
      score = 100;
      description = `${incidentCount} incidents in the last 30 days - critical risk`;
    }

    return {
      factor: 'Incident Frequency',
      weight: 0.30, // 30% of total risk score
      score,
      description,
    };
  }

  /**
   * Calculate change risk factor
   * High change frequency + failures = higher risk
   *
   * @param businessService - Business service
   * @returns Risk factor
   */
  private calculateChangeRiskFactor(businessService: BusinessService): RiskFactor {
    const changeCount = businessService.itil_attributes.change_count_30d || 0;

    // Estimate change failure rate (placeholder - should query actual change records)
    const failureRate = this.estimateChangeFailureRate(businessService);

    let score = 0;
    let description = 'No recent changes';

    if (changeCount === 0) {
      score = 10; // Some risk from no changes (potential drift)
      description = 'No changes in the last 30 days - potential staleness';
    } else if (failureRate < 5) {
      score = 15;
      description = `${changeCount} changes with ${failureRate.toFixed(1)}% failure rate - low risk`;
    } else if (failureRate < 15) {
      score = 40;
      description = `${changeCount} changes with ${failureRate.toFixed(1)}% failure rate - moderate risk`;
    } else if (failureRate < 25) {
      score = 70;
      description = `${changeCount} changes with ${failureRate.toFixed(1)}% failure rate - high risk`;
    } else {
      score = 100;
      description = `${changeCount} changes with ${failureRate.toFixed(1)}% failure rate - critical risk`;
    }

    return {
      factor: 'Change Management',
      weight: 0.25, // 25% of total risk score
      score,
      description,
    };
  }

  /**
   * Calculate availability risk factor
   * Lower availability = higher risk
   *
   * @param businessService - Business service
   * @returns Risk factor
   */
  private calculateAvailabilityRiskFactor(businessService: BusinessService): RiskFactor {
    const availability = businessService.itil_attributes.availability_30d || 100;
    const targetAvailability =
      businessService.itil_attributes.sla_targets?.availability_percentage || 99.9;

    // Risk score based on availability gap
    const availabilityGap = targetAvailability - availability;

    let score = 0;
    let description = 'Availability meets or exceeds SLA target';

    if (availabilityGap <= 0) {
      score = 0;
      description = `${availability.toFixed(2)}% availability - exceeds ${targetAvailability}% target`;
    } else if (availabilityGap <= 0.5) {
      score = 30;
      description = `${availability.toFixed(2)}% availability - slightly below ${targetAvailability}% target`;
    } else if (availabilityGap <= 1.0) {
      score = 60;
      description = `${availability.toFixed(2)}% availability - below ${targetAvailability}% target`;
    } else if (availabilityGap <= 2.0) {
      score = 85;
      description = `${availability.toFixed(2)}% availability - significantly below ${targetAvailability}% target`;
    } else {
      score = 100;
      description = `${availability.toFixed(2)}% availability - critically below ${targetAvailability}% target`;
    }

    return {
      factor: 'Availability',
      weight: 0.25, // 25% of total risk score
      score,
      description,
    };
  }

  /**
   * Calculate compliance risk factor
   * Non-compliance = higher risk
   *
   * @param businessService - Business service
   * @returns Risk factor
   */
  private calculateComplianceRiskFactor(businessService: BusinessService): RiskFactor {
    const complianceRequirements = businessService.bsm_attributes.compliance_requirements || [];

    if (complianceRequirements.length === 0) {
      return {
        factor: 'Compliance',
        weight: 0.10,
        score: 0,
        description: 'No regulatory compliance requirements',
      };
    }

    // Count non-compliant or unknown status
    const nonCompliantCount = complianceRequirements.filter(
      (req) => req.compliance_status === 'non_compliant' || req.compliance_status === 'unknown'
    ).length;

    const complianceRate = ((complianceRequirements.length - nonCompliantCount) / complianceRequirements.length) * 100;

    let score = 0;
    let description = 'Fully compliant with all regulations';

    if (complianceRate === 100) {
      score = 0;
      description = 'Fully compliant with all regulations';
    } else if (complianceRate >= 80) {
      score = 40;
      description = `${complianceRate.toFixed(0)}% compliance rate - some issues identified`;
    } else if (complianceRate >= 50) {
      score = 75;
      description = `${complianceRate.toFixed(0)}% compliance rate - significant issues`;
    } else {
      score = 100;
      description = `${complianceRate.toFixed(0)}% compliance rate - critical issues`;
    }

    return {
      factor: 'Compliance',
      weight: 0.10, // 10% of total risk score
      score,
      description,
    };
  }

  /**
   * Calculate audit risk factor
   * Overdue audits = higher risk
   *
   * @param businessService - Business service
   * @returns Risk factor
   */
  private calculateAuditRiskFactor(businessService: BusinessService): RiskFactor {
    const lastAuditDate = this.getLastAuditDate(businessService);

    if (!lastAuditDate) {
      return {
        factor: 'Audit Status',
        weight: 0.10,
        score: 100,
        description: 'No audit records found - critical risk',
      };
    }

    const daysSinceAudit = Math.floor((Date.now() - lastAuditDate.getTime()) / (1000 * 60 * 60 * 24));

    let score = 0;
    let description = 'Recent audit completed';

    if (daysSinceAudit <= 90) {
      score = 0;
      description = `Audited ${daysSinceAudit} days ago - current`;
    } else if (daysSinceAudit <= 180) {
      score = 30;
      description = `Audited ${daysSinceAudit} days ago - due soon`;
    } else if (daysSinceAudit <= 365) {
      score = 60;
      description = `Audited ${daysSinceAudit} days ago - overdue`;
    } else {
      score = 100;
      description = `Audited ${daysSinceAudit} days ago - critically overdue`;
    }

    return {
      factor: 'Audit Status',
      weight: 0.10, // 10% of total risk score
      score,
      description,
    };
  }

  /**
   * Calculate weighted risk score from factors
   *
   * @param factors - Array of risk factors
   * @returns Weighted risk score (0-100)
   */
  private calculateWeightedRiskScore(factors: RiskFactor[]): number {
    let totalScore = 0;

    for (const factor of factors) {
      totalScore += factor.score * factor.weight;
    }

    return Math.min(Math.max(totalScore, 0), 100);
  }

  /**
   * Determine risk rating based on score and criticality
   *
   * @param riskScore - Risk score (0-100)
   * @param criticality - Business criticality tier
   * @returns Risk rating
   */
  private determineRiskRating(riskScore: number, criticality: BusinessCriticality): RiskRating {
    // Risk matrix combining score and criticality

    // Tier 0 services get elevated risk ratings
    if (criticality === 'tier_0') {
      if (riskScore >= 50) return 'critical';
      if (riskScore >= 30) return 'high';
      if (riskScore >= 15) return 'medium';
      return 'low';
    }

    // Tier 1 services
    if (criticality === 'tier_1') {
      if (riskScore >= 60) return 'critical';
      if (riskScore >= 40) return 'high';
      if (riskScore >= 20) return 'medium';
      return 'low';
    }

    // Tier 2-3 services (standard thresholds)
    if (riskScore >= 75) return 'critical';
    if (riskScore >= 50) return 'high';
    if (riskScore >= 25) return 'medium';
    return 'low';
  }

  /**
   * Estimate change failure rate
   * Placeholder - should query actual change records from ITIL service manager
   *
   * @param businessService - Business service
   * @returns Change failure rate percentage
   */
  private estimateChangeFailureRate(businessService: BusinessService): number {
    const changeCount = businessService.itil_attributes.change_count_30d || 0;
    const incidentCount = businessService.itil_attributes.incident_count_30d || 0;

    if (changeCount === 0) return 0;

    // Rough estimate: assume 30% of incidents are change-related
    const changeRelatedIncidents = Math.ceil(incidentCount * 0.3);
    const failureRate = (changeRelatedIncidents / changeCount) * 100;

    return Math.min(failureRate, 100);
  }

  /**
   * Estimate Mean Time To Recovery (MTTR)
   * Placeholder - should query actual incident records from ITIL service manager
   *
   * @param businessService - Business service
   * @returns MTTR in hours
   */
  private estimateMTTR(businessService: BusinessService): number {
    const criticality = businessService.bsm_attributes.business_criticality;

    // Estimate based on criticality (placeholder values)
    const mttrByTier: Record<BusinessCriticality, number> = {
      tier_0: 0.5, // 30 minutes
      tier_1: 2.0, // 2 hours
      tier_2: 4.0, // 4 hours
      tier_3: 8.0, // 8 hours
      tier_4: 24.0, // 24 hours
    };

    return mttrByTier[criticality] || 4.0;
  }

  /**
   * Assess configuration drift status
   * Placeholder - should integrate with configuration management system
   *
   * @param businessService - Business service
   * @returns Drift status
   */
  private assessConfigurationDrift(
    businessService: BusinessService
  ): 'compliant' | 'drift_detected' | 'unknown' {
    // Placeholder implementation
    // In production, this would query configuration management database
    return 'unknown';
  }

  /**
   * Get last audit date from compliance requirements
   *
   * @param businessService - Business service
   * @returns Last audit date or null
   */
  private getLastAuditDate(businessService: BusinessService): Date | null {
    const complianceRequirements = businessService.bsm_attributes.compliance_requirements || [];

    if (complianceRequirements.length === 0) return null;

    // Find most recent audit
    const auditDates = complianceRequirements
      .map((req) => req.last_audit)
      .filter((date) => date !== null)
      .sort((a, b) => b.getTime() - a.getTime());

    return auditDates.length > 0 ? auditDates[0] : null;
  }

  /**
   * Generate risk mitigation recommendations
   *
   * @param riskRating - Overall risk rating
   * @param factors - Risk factors
   * @param businessService - Business service
   * @returns Array of recommendations
   */
  private generateRecommendations(
    riskRating: RiskRating,
    factors: RiskFactor[],
    businessService: BusinessService
  ): string[] {
    const recommendations: string[] = [];

    // General recommendations based on risk rating
    if (riskRating === 'critical') {
      recommendations.push('URGENT: Implement immediate risk mitigation measures');
      recommendations.push('Schedule risk assessment review with stakeholders');
    }

    // Specific recommendations based on risk factors
    for (const factor of factors) {
      if (factor.score >= 75) {
        switch (factor.factor) {
          case 'Incident Frequency':
            recommendations.push('Conduct root cause analysis for recurring incidents');
            recommendations.push('Implement proactive monitoring and alerting');
            break;
          case 'Change Management':
            recommendations.push('Review and improve change management processes');
            recommendations.push('Implement automated testing before production changes');
            break;
          case 'Availability':
            recommendations.push('Investigate availability issues and implement redundancy');
            recommendations.push('Review and update SLA targets if necessary');
            break;
          case 'Compliance':
            recommendations.push('Address compliance gaps immediately');
            recommendations.push('Schedule compliance remediation with legal/compliance team');
            break;
          case 'Audit Status':
            recommendations.push('Schedule overdue audit as soon as possible');
            recommendations.push('Implement regular audit schedule going forward');
            break;
        }
      }
    }

    // Criticality-based recommendations
    const criticality = businessService.bsm_attributes.business_criticality;
    if ((criticality === 'tier_0' || criticality === 'tier_1') && riskRating !== 'low') {
      recommendations.push('Critical service requires immediate attention to reduce risk');
      recommendations.push('Consider implementing additional redundancy and failover mechanisms');
    }

    return recommendations;
  }
}

/**
 * Singleton instance
 */
let riskRatingInstance: RiskRatingService | null = null;

/**
 * Get Risk Rating Service instance (singleton)
 */
export function getRiskRatingService(): RiskRatingService {
  if (!riskRatingInstance) {
    riskRatingInstance = new RiskRatingService();
  }
  return riskRatingInstance;
}
