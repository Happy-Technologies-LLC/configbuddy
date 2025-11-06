/**
 * Risk Assessor Utility
 * Calculates risk scores for ITIL changes
 */

import { RiskFactors } from '../types';

export class RiskAssessor {
  /**
   * Calculate overall risk score (0-100)
   * Weighted average of individual risk factors
   */
  static calculateOverallRiskScore(factors: RiskFactors): number {
    const weights = {
      businessCriticality: 0.35,
      complexity: 0.25,
      historicalRisk: 0.20,
      changeWindow: 0.10,
      dependency: 0.10,
    };

    return (
      factors.businessCriticalityScore * weights.businessCriticality +
      factors.complexityScore * weights.complexity +
      factors.historicalRiskScore * weights.historicalRisk +
      factors.changeWindowScore * weights.changeWindow +
      factors.dependencyScore * weights.dependency
    );
  }

  /**
   * Determine risk level from score
   */
  static determineRiskLevel(
    score: number
  ): 'low' | 'medium' | 'high' | 'very_high' {
    if (score >= 75) return 'very_high';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  /**
   * Calculate business criticality risk score
   */
  static calculateBusinessCriticalityScore(
    businessCriticality: 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4',
    affectedServicesCount: number,
    customerFacingCount: number
  ): number {
    let score = 0;

    // Base score from criticality tier
    const tierScores: Record<string, number> = {
      tier_0: 100,
      tier_1: 90,
      tier_2: 60,
      tier_3: 30,
      tier_4: 10,
    };
    score += tierScores[businessCriticality] || 50;

    // Add score for number of affected services (max +10)
    score += Math.min(affectedServicesCount * 2, 10);

    // Add score for customer-facing services (max +10)
    if (customerFacingCount > 0) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate complexity risk score
   */
  static calculateComplexityScore(
    affectedCICount: number,
    changeType: 'standard' | 'normal' | 'emergency' | 'major',
    hasRollbackPlan: boolean,
    hasTested: boolean
  ): number {
    let score = 0;

    // Change type base score
    const typeScores: Record<string, number> = {
      standard: 10,
      normal: 40,
      emergency: 70,
      major: 90,
    };
    score += typeScores[changeType];

    // Affected CI count (more CIs = more complex)
    if (affectedCICount > 10) score += 30;
    else if (affectedCICount > 5) score += 20;
    else if (affectedCICount > 1) score += 10;

    // Rollback plan reduces risk
    if (!hasRollbackPlan) score += 20;

    // Testing reduces risk
    if (!hasTested) score += 20;

    return Math.min(score, 100);
  }

  /**
   * Calculate historical risk score
   */
  static calculateHistoricalRiskScore(
    successRate: number,
    recentFailures: number
  ): number {
    let score = 0;

    // Inverse of success rate
    score = 100 - successRate;

    // Recent failures increase risk
    if (recentFailures > 3) score += 30;
    else if (recentFailures > 1) score += 20;
    else if (recentFailures > 0) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Calculate change window risk score
   */
  static calculateChangeWindowScore(
    isBusinessHours: boolean,
    isMaintenanceWindow: boolean,
    durationHours: number
  ): number {
    let score = 0;

    // Business hours = higher risk
    if (isBusinessHours && !isMaintenanceWindow) {
      score += 60;
    }

    // Long duration = higher risk
    if (durationHours > 8) score += 30;
    else if (durationHours > 4) score += 20;
    else if (durationHours > 2) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Calculate dependency risk score
   */
  static calculateDependencyScore(
    upstreamDependencies: number,
    downstreamDependencies: number
  ): number {
    let score = 0;

    // Upstream dependencies (things we depend on)
    if (upstreamDependencies > 10) score += 40;
    else if (upstreamDependencies > 5) score += 30;
    else if (upstreamDependencies > 2) score += 20;

    // Downstream dependencies (things that depend on us)
    if (downstreamDependencies > 20) score += 60;
    else if (downstreamDependencies > 10) score += 40;
    else if (downstreamDependencies > 5) score += 20;

    return Math.min(score, 100);
  }

  /**
   * Determine if CAB approval is required
   */
  static requiresCABApproval(
    riskLevel: 'low' | 'medium' | 'high' | 'very_high',
    changeType: 'standard' | 'normal' | 'emergency' | 'major',
    estimatedRevenueAtRisk: number
  ): boolean {
    // Very high risk always requires CAB
    if (riskLevel === 'very_high') return true;

    // Major changes always require CAB
    if (changeType === 'major') return true;

    // High revenue at risk requires CAB
    if (estimatedRevenueAtRisk > 100000) return true;

    // High or medium risk for normal changes requires CAB
    if (
      changeType === 'normal' &&
      (riskLevel === 'high' || riskLevel === 'medium')
    ) {
      return true;
    }

    // Standard changes and low risk don't require CAB
    return false;
  }

  /**
   * Generate mitigation strategies based on risk factors
   */
  static generateMitigationStrategies(factors: RiskFactors): string[] {
    const strategies: string[] = [];

    // Business criticality mitigations
    if (factors.businessCriticalityScore > 70) {
      strategies.push('Schedule change during maintenance window');
      strategies.push('Implement blue-green deployment or canary release');
      strategies.push('Have rollback plan ready and tested');
      strategies.push('Staff incident response team on standby');
    }

    // Complexity mitigations
    if (factors.complexityScore > 60) {
      strategies.push('Break change into smaller, incremental steps');
      strategies.push('Conduct thorough pre-production testing');
      strategies.push('Document detailed implementation and rollback procedures');
      strategies.push('Perform dry-run in staging environment');
    }

    // Historical risk mitigations
    if (factors.historicalRiskScore > 50) {
      strategies.push('Review post-incident reports from previous failures');
      strategies.push('Address root causes of previous failures');
      strategies.push('Involve engineering team that implemented original system');
    }

    // Change window mitigations
    if (factors.changeWindowScore > 50) {
      strategies.push('Reschedule to maintenance window if possible');
      strategies.push('Reduce change scope to minimize duration');
      strategies.push('Prepare customer communication plan');
    }

    // Dependency mitigations
    if (factors.dependencyScore > 50) {
      strategies.push('Coordinate with dependent service owners');
      strategies.push('Implement circuit breakers and graceful degradation');
      strategies.push('Monitor upstream and downstream services closely');
    }

    // Default strategy
    if (strategies.length === 0) {
      strategies.push('Follow standard change management procedures');
      strategies.push('Monitor service health during and after change');
    }

    return strategies;
  }

  /**
   * Generate recommendations based on risk level
   */
  static generateRecommendations(
    riskLevel: 'low' | 'medium' | 'high' | 'very_high',
    changeType: 'standard' | 'normal' | 'emergency' | 'major'
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'very_high') {
      recommendations.push('CRITICAL: Schedule CAB review before proceeding');
      recommendations.push('Consider alternative approaches to reduce risk');
      recommendations.push('Ensure executive stakeholders are informed');
      recommendations.push('Plan for extended monitoring period post-change');
    } else if (riskLevel === 'high') {
      recommendations.push('Obtain CAB approval before implementation');
      recommendations.push('Prepare detailed communication plan');
      recommendations.push('Ensure rollback plan is tested');
    } else if (riskLevel === 'medium') {
      recommendations.push('Review with service owner before proceeding');
      recommendations.push('Implement monitoring and alerting');
      recommendations.push('Schedule during low-traffic period if possible');
    } else {
      recommendations.push('Follow standard change procedures');
      recommendations.push('Document change details for future reference');
    }

    // Emergency-specific recommendations
    if (changeType === 'emergency') {
      recommendations.push('EMERGENCY: Expedite approval process');
      recommendations.push('Conduct post-implementation review within 24 hours');
    }

    return recommendations;
  }

  /**
   * Estimate downtime based on change characteristics
   */
  static estimateDowntime(
    changeType: 'standard' | 'normal' | 'emergency' | 'major',
    affectedCICount: number,
    plannedDurationMinutes: number
  ): number {
    // Base downtime estimate
    let downtime = 0;

    // Standard changes typically have no downtime
    if (changeType === 'standard') {
      downtime = 0;
    }
    // Normal changes may have brief downtime
    else if (changeType === 'normal') {
      downtime = Math.min(plannedDurationMinutes * 0.3, 60); // Max 1 hour
    }
    // Emergency changes often require immediate downtime
    else if (changeType === 'emergency') {
      downtime = plannedDurationMinutes * 0.5;
    }
    // Major changes typically require significant downtime
    else {
      downtime = plannedDurationMinutes * 0.8;
    }

    // More affected CIs increases downtime risk
    const ciMultiplier = 1 + Math.min(affectedCICount * 0.1, 0.5);
    downtime *= ciMultiplier;

    return Math.round(downtime);
  }
}
