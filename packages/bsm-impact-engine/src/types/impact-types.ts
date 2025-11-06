/**
 * Impact Analysis Types
 * Types for impact scoring, blast radius, and risk analysis
 */

import {
  BusinessCriticality,
  DataClassification,
  RiskRating,
  ComplianceFramework,
} from './bsm-types';

/**
 * Impact Score Components
 * Individual scores that contribute to the total impact score
 */
export interface ImpactScoreComponents {
  revenue: number; // 0-40 points (40% weight)
  customers: number; // 0-25 points (25% weight)
  transactions: number; // 0-15 points (15% weight)
  compliance: number; // 0-10 points (10% weight)
  users: number; // 0-10 points (10% weight)
}

/**
 * Complete Impact Score (0-100)
 */
export interface ImpactScore {
  totalScore: number; // 0-100
  components: ImpactScoreComponents;
  revenueImpact: number; // Annual revenue supported in USD
  customerImpact: number; // Number of customers affected
  transactionVolume: number; // Daily transactions
  complianceImpact: ComplianceImpactWeight; // Regulatory scope weight
  userImpact: number; // Number of internal users
  dataClassification: DataClassification;
  calculatedAt: Date;
}

/**
 * Compliance Impact Weight
 */
export interface ComplianceImpactWeight {
  frameworks: ComplianceFramework[];
  weight: number; // 0-1 scale
  penaltyRisk: number; // Estimated penalty amount in USD
  description: string;
}

/**
 * User Impact Analysis
 */
export interface UserImpact {
  internalUsers: number; // Employee count
  externalUsers: number; // Customer count
  totalUsers: number;
  dailyActiveUsers: number;
  peakConcurrentUsers: number;
  userSegments: UserSegment[];
}

/**
 * User Segment
 */
export interface UserSegment {
  segmentName: string;
  userCount: number;
  impactSeverity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

/**
 * Revenue Impact Details
 */
export interface RevenueImpactAnalysis {
  annualRevenue: number; // Total annual revenue in USD
  directRevenue: boolean; // Does this service directly generate revenue?
  revenuePerHour: number; // Hourly revenue rate
  downtimeCostPerHour: number; // Estimated cost per hour of downtime
  criticalityMultiplier: number; // Based on business criticality tier
  estimatedLoss: number; // Total estimated loss for given downtime
  calculatedFor: {
    downtimeHours: number;
    scenario: string;
  };
}

/**
 * Compliance Impact Details
 */
export interface ComplianceImpact {
  applicableFrameworks: ComplianceFramework[];
  dataClassification: DataClassification;
  regulatoryScope: string[];
  penaltyRisk: number; // Estimated penalty in USD
  auditRequirements: string[];
  dataSubjects: number; // Number of people whose data is at risk
  breachNotificationRequired: boolean;
  impactDescription: string;
}

/**
 * Blast Radius - Impacted CI
 */
export interface ImpactedCI {
  ciId: string;
  ciType: string;
  ciName: string;
  relationshipPath: string[]; // Array of relationship types traversed
  hops: number; // Number of hops from source
  criticality: BusinessCriticality;
  impactScore: number; // 0-100
}

/**
 * Blast Radius - Impacted Business Service
 */
export interface ImpactedBusinessService {
  serviceId: string;
  serviceName: string;
  annualRevenue: number;
  customerCount: number;
  criticality: BusinessCriticality;
  impactScore: number;
  relationshipPath: string[];
  hops: number;
}

/**
 * Complete Blast Radius Analysis
 */
export interface BlastRadiusAnalysis {
  sourceCI: string;
  sourceCIName: string;
  sourceCIType: string;
  impactedCIs: ImpactedCI[];
  impactedBusinessServices: ImpactedBusinessService[];
  totalCIsImpacted: number;
  totalServicesImpacted: number;
  totalRevenueAtRisk: number; // Sum of annual revenue
  totalCustomersImpacted: number; // Sum of customer counts
  estimatedDowntimeCostPerHour: number;
  maxHopsTraversed: number;
  analysisTime: number; // milliseconds
  analysisDate: Date;
}

/**
 * Risk Factor
 */
export interface RiskFactor {
  factor: string;
  weight: number; // 0-1
  score: number; // 0-100
  description: string;
}

/**
 * Risk Assessment
 */
export interface RiskAssessment {
  riskRating: RiskRating;
  riskScore: number; // 0-100
  factors: RiskFactor[];
  businessCriticality: BusinessCriticality;
  incidentFrequency: number; // Last 90 days
  changeFailureRate: number; // Percentage
  meanTimeToRecovery: number; // Hours
  configurationDriftStatus: 'compliant' | 'drift_detected' | 'unknown';
  lastAuditDate: Date | null;
  daysSinceLastAudit: number;
  recommendations: string[];
  calculatedAt: Date;
}

/**
 * Criticality Calculation Result
 */
export interface CriticalityCalculation {
  calculatedCriticality: BusinessCriticality;
  impactScore: number; // 0-100
  factors: {
    annualRevenue: number;
    customerCount: number;
    transactionVolume: number;
    complianceWeight: number;
    internalUsers: number;
  };
  tierThresholds: {
    revenue: number;
    customers: number;
    transactions: number;
  };
  recommendation: string;
  confidence: number; // 0-1, how confident we are in this classification
  calculatedAt: Date;
}

/**
 * Dependency Tree Node
 */
export interface DependencyNode {
  ciId: string;
  ciName: string;
  ciType: string;
  criticality: BusinessCriticality;
  depth: number;
  children: DependencyNode[];
}

/**
 * Dependency Tree
 */
export interface DependencyTree {
  root: DependencyNode;
  totalNodes: number;
  maxDepth: number;
  criticalPaths: CriticalPath[];
}

/**
 * Critical Path (from CI to Business Service)
 */
export interface CriticalPath {
  pathId: string;
  fromCiId: string;
  toServiceId: string;
  nodes: Array<{
    ciId: string;
    ciName: string;
    ciType: string;
    relationshipType: string;
  }>;
  pathLength: number;
  totalImpactScore: number;
  bottlenecks: string[]; // CIs that are single points of failure
}

/**
 * Service Health Indicator
 */
export interface ServiceHealthIndicator {
  serviceId: string;
  serviceName: string;
  healthScore: number; // 0-100
  factors: {
    availability: number; // Last 30 days
    incidentCount: number; // Last 30 days
    changeSuccessRate: number; // Percentage
    mttr: number; // Mean Time To Recovery in hours
    mttf: number; // Mean Time To Failure in hours
  };
  trend: 'improving' | 'stable' | 'degrading';
  alerts: string[];
}

/**
 * Options for blast radius calculation
 */
export interface BlastRadiusOptions {
  maxHops?: number; // Maximum relationship hops (default: 10)
  includeInactive?: boolean; // Include inactive CIs (default: false)
  relationshipTypes?: string[]; // Filter by relationship types
  minImpactScore?: number; // Only include CIs above this score (default: 0)
}

/**
 * Options for criticality calculation
 */
export interface CriticalityCalculationOptions {
  weights?: {
    revenue?: number;
    customers?: number;
    transactions?: number;
    compliance?: number;
    users?: number;
  };
  thresholds?: {
    tier_0?: number;
    tier_1?: number;
    tier_2?: number;
    tier_3?: number;
  };
  propagateToChildren?: boolean; // Propagate to downstream CIs (default: true)
}
