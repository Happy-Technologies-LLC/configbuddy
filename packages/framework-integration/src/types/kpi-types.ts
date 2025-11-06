/**
 * KPI Types for Framework Integration
 * Unified key performance indicators across ITIL, TBM, and BSM
 */

import {
  BusinessCriticality,
  RiskRating,
  OperationalStatus
} from '@cmdb/unified-model';
import { TBMResourceTower, TBMCostPool } from '@cmdb/tbm-cost-engine';

/**
 * Unified KPIs
 * Consolidated metrics from ITIL + TBM + BSM frameworks
 */
export interface UnifiedKPIs {
  /** Service health score (0-100) - composite of availability, incident rate, change success */
  serviceHealth: number;

  /** Cost efficiency metrics */
  costEfficiency: CostEfficiency;

  /** Risk score (0-100) - composite of ITIL change risk, BSM criticality, incident frequency */
  riskScore: number;

  /** Value score - ratio of business value to IT cost */
  valueScore: number;

  /** Compliance score (0-100) - based on audit status, baseline adherence */
  complianceScore: number;

  /** Service availability percentage (0-100) */
  availability: number;

  /** Return on IT investment - (revenue - cost) / cost */
  roi: number;

  /** Mean time to resolution for incidents (minutes) */
  mttr: number;

  /** Mean time between failures (hours) */
  mtbf: number;

  /** Change success rate (0-100) */
  changeSuccessRate: number;
}

/**
 * Cost Efficiency Metrics
 * Measures cost effectiveness from TBM data
 */
export interface CostEfficiency {
  /** Cost per transaction */
  costPerTransaction: number;

  /** Cost per active user */
  costPerUser: number;

  /** Cost as percentage of revenue generated */
  costPerRevenue: number;

  /** Cost trend indicator */
  trend: 'increasing' | 'stable' | 'decreasing';

  /** Budget variance (positive = under budget) */
  budgetVariance: number;
}

/**
 * ITIL Metrics
 * Service management metrics from ITIL framework
 */
export interface ITILMetrics {
  /** Service name */
  serviceName: string;

  /** Number of open incidents */
  openIncidents: number;

  /** Average mean time to resolution (minutes) */
  averageMTTR: number;

  /** Number of changes in last 30 days */
  changesLast30Days: number;

  /** Change success rate (0-1) */
  changeSuccessRate: number;

  /** Configuration accuracy (0-1) */
  configurationAccuracy: number;

  /** Service availability (0-1) */
  availability: number;

  /** Last audit date */
  lastAuditDate: Date | null;

  /** Audit compliance status */
  auditStatus: 'compliant' | 'non_compliant' | 'unknown';

  /** Number of critical incidents (30 days) */
  criticalIncidents: number;

  /** Number of CIs in baseline */
  baselinedCIs: number;

  /** Number of CIs with configuration drift */
  driftedCIs: number;

  /** Average baseline compliance (0-100) */
  baselineCompliance: number;
}

/**
 * TBM Costs
 * Cost transparency metrics from TBM framework
 */
export interface TBMCosts {
  /** Total monthly cost */
  monthlyCost: number;

  /** Cost breakdown by TBM tower */
  costByTower: Map<TBMResourceTower, number>;

  /** Cost breakdown by cost pool */
  costByPool: Map<TBMCostPool, number>;

  /** Cost trend over time */
  costTrend: 'increasing' | 'stable' | 'decreasing';

  /** Budget variance (positive = under budget, negative = over budget) */
  budgetVariance: number;

  /** Allocated cost percentage (0-100) */
  allocationPercentage: number;

  /** Largest cost contributors */
  topCostDrivers: Array<{
    ciId: string;
    ciName: string;
    cost: number;
    percentage: number;
  }>;

  /** Year-over-year cost change */
  yoyChange: number;

  /** Month-over-month cost change */
  momChange: number;
}

/**
 * BSM Impact
 * Business impact metrics from BSM framework
 */
export interface BSMImpact {
  /** Business criticality tier */
  criticality: BusinessCriticality;

  /** Overall impact score (0-100) */
  impactScore: number;

  /** Annual revenue supported by this service */
  annualRevenue: number;

  /** Number of customers served */
  customerCount: number;

  /** Number of active users */
  userCount: number;

  /** Daily transaction volume */
  transactionVolume: number;

  /** Compliance frameworks in scope */
  complianceScope: string[];

  /** Overall risk level */
  riskLevel: RiskRating;

  /** Customer-facing service indicator */
  customerFacing: boolean;

  /** Revenue at risk per hour of downtime */
  revenueAtRiskPerHour: number;

  /** Estimated customers impacted by outage */
  customersImpactedByOutage: number;

  /** Recovery time objective (minutes) */
  rto: number;

  /** Recovery point objective (minutes) */
  rpo: number;
}

/**
 * Service Health Details
 * Breakdown of service health calculation
 */
export interface ServiceHealthDetails {
  /** Overall health score (0-100) */
  overallScore: number;

  /** Availability component (0-100) */
  availabilityScore: number;

  /** Incident management component (0-100) */
  incidentScore: number;

  /** Change management component (0-100) */
  changeScore: number;

  /** Configuration compliance component (0-100) */
  complianceScore: number;

  /** Performance SLA adherence (0-100) */
  performanceScore: number;

  /** Operational status */
  operationalStatus: OperationalStatus;

  /** Health trend */
  trend: 'improving' | 'stable' | 'degrading';

  /** Last calculated timestamp */
  calculatedAt: Date;
}

/**
 * Risk Score Details
 * Breakdown of risk score calculation
 */
export interface RiskScoreDetails {
  /** Overall risk score (0-100, higher = more risk) */
  overallScore: number;

  /** ITIL change risk component */
  changeRisk: number;

  /** BSM business criticality component */
  criticalityRisk: number;

  /** Incident frequency component */
  incidentRisk: number;

  /** Configuration drift component */
  driftRisk: number;

  /** Compliance gap component */
  complianceRisk: number;

  /** Risk level classification */
  riskLevel: 'critical' | 'high' | 'medium' | 'low';

  /** Risk trend */
  trend: 'increasing' | 'stable' | 'decreasing';

  /** Top risk factors */
  topRiskFactors: string[];

  /** Last calculated timestamp */
  calculatedAt: Date;
}

/**
 * Value Score Details
 * Breakdown of business value calculation
 */
export interface ValueScoreDetails {
  /** Overall value score (revenue/cost ratio) */
  overallScore: number;

  /** Revenue generated (annual) */
  annualRevenue: number;

  /** IT cost (annual) */
  annualCost: number;

  /** Return on investment percentage */
  roiPercentage: number;

  /** Value classification */
  valueClassification: 'high_value' | 'medium_value' | 'low_value' | 'cost_center';

  /** Revenue per dollar spent */
  revenuePerDollar: number;

  /** Cost optimization opportunities */
  costOptimizationOpportunities: string[];

  /** Value trend */
  trend: 'increasing' | 'stable' | 'decreasing';

  /** Last calculated timestamp */
  calculatedAt: Date;
}
