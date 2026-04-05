// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Unified Types for Framework Integration
 * Complete service views combining ITIL, TBM, and BSM
 */

import {
  BusinessService,
  BusinessCriticality,
  RiskRating
} from '@cmdb/unified-model';
import {
  IncidentPriority,
  IncidentInput,
  ChangeRequest,
  ChangeRiskAssessment
} from '@cmdb/itil-service-manager';
import { UnifiedKPIs, ITILMetrics, TBMCosts, BSMImpact } from './kpi-types';

/**
 * Complete Service View
 * Unified view combining all framework data for a service
 */
export interface CompleteServiceView {
  /** Service identifier */
  serviceId: string;

  /** Service name */
  serviceName: string;

  /** Service description */
  serviceDescription: string;

  /** ITIL service management metrics */
  itil: ITILMetrics;

  /** TBM cost transparency metrics */
  tbm: TBMCosts;

  /** BSM business impact metrics */
  bsm: BSMImpact;

  /** Unified KPIs across all frameworks */
  kpis: UnifiedKPIs;

  /** Underlying business service record */
  businessService: BusinessService;

  /** Timestamp when this view was generated */
  generatedAt: Date;

  /** Cache TTL in seconds */
  cacheTTL: number;
}

/**
 * Enriched Incident
 * Incident with ITIL + TBM + BSM enrichment data
 */
export interface EnrichedIncident {
  // Standard incident fields
  id: string;
  title: string;
  description: string;
  affectedCIId: string;
  affectedCIName: string;
  reportedBy: string;
  category?: string;
  subcategory?: string;
  symptoms: string[];

  // ITIL enrichment
  itilPriority: IncidentPriority;

  // BSM enrichment
  businessImpact: ImpactAnalysis;
  blastRadius: BlastRadiusAnalysis;
  estimatedRevenueImpact: number;
  estimatedCustomerImpact: number;

  // TBM enrichment
  downtimeCostPerHour: number;
  totalEstimatedCost: number;

  // Response orchestration
  responseTeam: string[];
  escalationRequired: boolean;
  executiveNotificationRequired: boolean;

  // Recommended actions
  recommendedActions: string[];

  // SLA targets
  targetResponseTime: number; // minutes
  targetResolutionTime: number; // minutes

  /** Timestamp when enrichment was calculated */
  enrichedAt: Date;
}

/**
 * Unified Change Risk Assessment
 * Change risk with ITIL + TBM + BSM analysis
 */
export interface UnifiedChangeRisk {
  /** Change identifier */
  changeId: string;

  /** Change title */
  changeTitle: string;

  /** Change type */
  changeType: 'standard' | 'normal' | 'emergency' | 'major';

  // ITIL risk assessment
  itilRisk: ChangeRiskAssessment;

  // BSM business impact
  businessImpact: ImpactAnalysis;

  // TBM cost estimation
  costEstimate: CostEstimate;

  // Unified approval requirements
  approvalRequirements: ApprovalRequirements;

  /** Requires CAB (Change Advisory Board) approval */
  requiresCABApproval: boolean;

  /** Requires executive approval (Tier 0 services) */
  requiresExecutiveApproval: boolean;

  /** Requires financial approval (cost threshold) */
  requiresFinancialApproval: boolean;

  /** Overall risk level */
  overallRiskLevel: 'very_high' | 'high' | 'medium' | 'low';

  /** Risk-adjusted recommendations */
  recommendations: string[];

  /** Optimal change window */
  optimalChangeWindow?: {
    start: Date;
    end: Date;
    reason: string;
  };

  /** Timestamp when assessment was performed */
  assessedAt: Date;
}

/**
 * Impact Analysis
 * Business impact from BSM framework
 */
export interface ImpactAnalysis {
  /** Affected service ID */
  serviceId: string;

  /** Service name */
  serviceName: string;

  /** Business criticality tier */
  criticality: BusinessCriticality;

  /** Overall impact score (0-100) */
  impactScore: number;

  /** Revenue at risk (annual) */
  annualRevenueAtRisk: number;

  /** Revenue at risk per hour */
  revenueAtRiskPerHour: number;

  /** Number of customers impacted */
  customersImpacted: number;

  /** Number of users impacted */
  usersImpacted: number;

  /** Daily transactions impacted */
  transactionsImpacted: number;

  /** Customer-facing service */
  customerFacing: boolean;

  /** Compliance frameworks affected */
  complianceFrameworks: string[];

  /** Compliance impact level */
  complianceImpact: 'critical' | 'high' | 'medium' | 'low' | 'none';

  /** Overall risk rating */
  riskRating: RiskRating;

  /** Dependent services affected */
  dependentServices: Array<{
    serviceId: string;
    serviceName: string;
    criticality: BusinessCriticality;
  }>;
}

/**
 * Blast Radius Analysis
 * Cascading impact analysis from BSM
 */
export interface BlastRadiusAnalysis {
  /** Source CI or service ID */
  sourceId: string;

  /** Source name */
  sourceName: string;

  /** Total CIs in blast radius */
  totalCIsImpacted: number;

  /** Total services in blast radius */
  totalServicesImpacted: number;

  /** Total customers impacted */
  totalCustomersImpacted: number;

  /** Total users impacted */
  totalUsersImpacted: number;

  /** Total revenue at risk */
  totalRevenueAtRisk: number;

  /** Impacted services breakdown */
  impactedServices: Array<{
    serviceId: string;
    serviceName: string;
    criticality: BusinessCriticality;
    customers: number;
    users: number;
    revenue: number;
  }>;

  /** Impacted CIs breakdown */
  impactedCIs: Array<{
    ciId: string;
    ciName: string;
    ciType: string;
    dependencyDepth: number;
  }>;

  /** Blast radius visualization data */
  visualizationData: {
    nodes: Array<{
      id: string;
      name: string;
      type: 'service' | 'ci';
      criticality: BusinessCriticality;
    }>;
    edges: Array<{
      from: string;
      to: string;
      relationship: string;
    }>;
  };

  /** Maximum dependency depth */
  maxDependencyDepth: number;

  /** Timestamp when analysis was performed */
  analyzedAt: Date;
}

/**
 * Cost Estimate
 * TBM-based cost estimation for changes
 */
export interface CostEstimate {
  /** Implementation labor cost */
  laborCost: number;

  /** Estimated downtime (minutes) */
  estimatedDowntimeMinutes: number;

  /** Downtime cost */
  downtimeCost: number;

  /** Rollback/backout cost */
  rollbackCost: number;

  /** Testing cost */
  testingCost: number;

  /** Total estimated cost */
  totalCost: number;

  /** Cost breakdown by tower */
  costByTower: Record<string, number>;

  /** Risk-adjusted cost (includes potential failure scenarios) */
  riskAdjustedCost: number;

  /** Budget impact */
  budgetImpact: {
    currentBudgetUtilization: number;
    projectedUtilization: number;
    budgetAvailable: boolean;
  };

  /** Cost confidence level */
  confidence: 'high' | 'medium' | 'low';

  /** Assumptions used in estimation */
  assumptions: string[];
}

/**
 * Approval Requirements
 * Unified approval workflow requirements
 */
export interface ApprovalRequirements {
  /** Requires CAB approval */
  cabApproval: boolean;

  /** Requires business owner approval */
  businessOwnerApproval: boolean;

  /** Requires technical owner approval */
  technicalOwnerApproval: boolean;

  /** Requires executive approval */
  executiveApproval: boolean;

  /** Requires finance approval */
  financeApproval: boolean;

  /** Requires security approval */
  securityApproval: boolean;

  /** Requires compliance approval */
  complianceApproval: boolean;

  /** Approvers by role */
  approvers: Array<{
    role: string;
    name: string;
    email: string;
    required: boolean;
  }>;

  /** Approval deadline */
  approvalDeadline: Date;

  /** Estimated approval duration (hours) */
  estimatedApprovalDuration: number;

  /** Reasons for approvals */
  approvalReasons: string[];
}

/**
 * Service Dashboard Data
 * Complete dashboard data for a service
 */
export interface ServiceDashboardData {
  /** Complete service view */
  service: CompleteServiceView;

  /** Recent incidents (30 days) */
  recentIncidents: Array<{
    id: string;
    title: string;
    priority: number;
    status: string;
    createdAt: Date;
    resolvedAt?: Date;
  }>;

  /** Recent changes (30 days) */
  recentChanges: Array<{
    id: string;
    title: string;
    changeType: string;
    status: string;
    scheduledStart: Date;
    outcome?: string;
  }>;

  /** Cost trends (12 months) */
  costTrends: Array<{
    month: string;
    cost: number;
    change: number;
  }>;

  /** Health trends (30 days) */
  healthTrends: Array<{
    date: string;
    healthScore: number;
    availability: number;
  }>;

  /** Alerts and warnings */
  alerts: Array<{
    severity: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: Date;
  }>;

  /** Generated timestamp */
  generatedAt: Date;
}

/**
 * Unified Query Filters
 * Common filters for querying unified data
 */
export interface UnifiedQueryFilters {
  /** Service IDs */
  serviceIds?: string[];

  /** Business criticality tiers */
  criticality?: BusinessCriticality[];

  /** Operational status */
  operationalStatus?: string[];

  /** Cost range */
  costRange?: {
    min: number;
    max: number;
  };

  /** Health score range */
  healthScoreRange?: {
    min: number;
    max: number;
  };

  /** Risk level */
  riskLevel?: RiskRating[];

  /** Compliance frameworks */
  complianceFrameworks?: string[];

  /** Technical owner */
  technicalOwner?: string;

  /** Business owner */
  businessOwner?: string;

  /** Text search */
  search?: string;

  /** Sort by */
  sortBy?: 'name' | 'cost' | 'health' | 'risk' | 'revenue' | 'criticality';

  /** Sort direction */
  sortDirection?: 'asc' | 'desc';

  /** Pagination */
  limit?: number;
  offset?: number;
}
