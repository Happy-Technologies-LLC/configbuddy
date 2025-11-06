/**
 * ITIL Service Manager Types
 * Type definitions for ITIL v4 Service Management operations
 */

import { BusinessService } from '@cmdb/unified-model';

/**
 * CI History Event
 * Tracks lifecycle transitions and configuration changes
 */
export interface CIHistoryEvent {
  id: string;
  ciId: string;
  ciName: string;
  eventType: 'lifecycle_change' | 'status_change' | 'audit_completed' | 'baseline_created';
  timestamp: Date;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  performedBy: string;
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * Incident Input
 * Input data for creating an incident
 */
export interface IncidentInput {
  affectedCIId: string;
  title: string;
  description: string;
  reportedBy: string;
  category?: string;
  subcategory?: string;
  symptoms: string[];
}

/**
 * Incident Priority Calculation Result
 */
export interface IncidentPriority {
  priority: 1 | 2 | 3 | 4 | 5; // 1=Critical, 5=Low
  impact: 'critical' | 'high' | 'medium' | 'low';
  urgency: 'critical' | 'high' | 'medium' | 'low';
  reasoning: string;
  affectedBusinessServices: BusinessService[];
  estimatedUserImpact: number;
  estimatedRevenueImpact: number;
  estimatedCostOfDowntime: number;
  requiresEscalation: boolean;
  recommendedResponseTeam: string[];
}

/**
 * Priority Matrix
 * Standard ITIL Impact x Urgency = Priority matrix
 */
export interface PriorityMatrix {
  matrix: {
    [impact: string]: {
      [urgency: string]: 1 | 2 | 3 | 4 | 5;
    };
  };
}

/**
 * Change Request Input
 */
export interface ChangeRequest {
  changeId?: string; // Optional for new changes
  affectedCIIds: string[];
  title: string;
  description: string;
  changeType: 'standard' | 'normal' | 'emergency' | 'major';
  category?: string;
  plannedStart: Date;
  plannedEnd: Date;
  implementationPlan: string;
  backoutPlan: string;
  testPlan?: string;
  requestedBy: string;
}

/**
 * Change Risk Assessment Result
 */
export interface ChangeRiskAssessment {
  overallRiskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'very_high';
  requiresCABApproval: boolean;
  affectedBusinessServices: BusinessService[];
  criticalServicesAffected: string[];
  estimatedDowntime: number; // minutes
  estimatedUserImpact: number;
  estimatedRevenueAtRisk: number;
  implementationCost: number;
  downtimeCost: number;
  totalCost: number;
  recommendations: string[];
  mitigationStrategies: string[];
  changeSuccessRate: number; // Historical success rate for similar changes
  isOptimalChangeWindow: boolean;
}

/**
 * Risk Factors
 * Individual risk components for change assessment
 */
export interface RiskFactors {
  businessCriticalityScore: number; // 0-100
  complexityScore: number; // 0-100
  historicalRiskScore: number; // 0-100
  changeWindowScore: number; // 0-100
  dependencyScore: number; // 0-100
}

/**
 * Configuration Baseline
 */
export interface ConfigurationBaseline {
  id: string;
  name: string;
  description: string;
  baselineType: 'configuration' | 'security' | 'performance' | 'compliance';
  scope: {
    ciIds: string[];
    ciTypes: string[];
    environment: string | null;
  };
  baselineData: Record<string, any>; // CI configurations at baseline time
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'deprecated';
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Baseline Comparison Result
 */
export interface BaselineComparison {
  baselineId: string;
  baselineName: string;
  comparisonDate: Date;
  driftedCIs: DriftedCI[];
  totalDriftCount: number;
  driftPercentage: number;
  complianceScore: number; // 0-100
}

/**
 * Drifted CI
 * Represents a CI that has drifted from baseline
 */
export interface DriftedCI {
  ciId: string;
  ciName: string;
  ciType: string;
  changedAttributes: {
    attribute: string;
    baselineValue: any;
    currentValue: any;
    changeDate?: Date;
  }[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  driftScore: number; // 0-100
}

/**
 * Audit Result
 */
export interface AuditResult {
  ciId: string;
  auditDate: Date;
  auditStatus: 'compliant' | 'non_compliant';
  auditedBy: string;
  findings: string[];
  recommendations: string[];
  nextAuditDate: Date;
}

/**
 * Configuration Accuracy Metrics
 */
export interface ConfigurationAccuracyMetrics {
  totalCIs: number;
  auditedCIs: number;
  compliantCIs: number;
  nonCompliantCIs: number;
  uauditedCIs: number;
  accuracyPercentage: number;
  compliancePercentage: number;
  cisDueForAudit: number;
  averageDaysSinceLastAudit: number;
}

/**
 * Incident
 * Full incident record from database
 */
export interface Incident {
  id: string;
  incidentNumber: string;
  title: string;
  description: string;
  category?: string;
  subcategory?: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  urgency: 'critical' | 'high' | 'medium' | 'low';
  priority: 1 | 2 | 3 | 4 | 5;
  affectedCiId?: string;
  affectedBusinessServiceId?: string;
  affectedApplicationServiceId?: string;
  businessImpact: {
    estimatedUserImpact: number;
    estimatedRevenueImpact: number;
    estimatedCostOfDowntime: number;
    affectedServices: string[];
  };
  assignedTo?: string;
  assignedGroup?: string;
  status: 'new' | 'assigned' | 'in_progress' | 'pending' | 'resolved' | 'closed' | 'cancelled';
  resolution?: string;
  resolutionCode?: string;
  reportedAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  timeToAcknowledgeMinutes?: number;
  timeToResolveMinutes?: number;
  reportedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Change
 * Full change record from database
 */
export interface Change {
  id: string;
  changeNumber: string;
  title: string;
  description: string;
  changeType: 'standard' | 'normal' | 'emergency' | 'major';
  category?: string;
  riskAssessment: {
    overallRiskScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'very_high';
    requiresCABApproval: boolean;
  };
  businessImpact: {
    criticalServicesAffected: string[];
    estimatedDowntimeMinutes: number;
    customerImpact: boolean;
    revenueAtRisk: number;
  };
  financialImpact: {
    implementationCost: number;
    downtimeCost: number;
    totalCost: number;
  };
  affectedCiIds: string[];
  affectedBusinessServiceIds: string[];
  affectedApplicationServiceIds: string[];
  implementationPlan: string;
  backoutPlan: string;
  testPlan?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvedBy?: string;
  approvedAt?: Date;
  assignedTo?: string;
  assignedGroup?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'scheduled' | 'in_progress' | 'implemented' | 'closed' | 'cancelled';
  scheduledStart?: Date;
  scheduledEnd?: Date;
  actualStart?: Date;
  actualEnd?: Date;
  outcome?: 'successful' | 'successful_with_issues' | 'failed' | 'backed_out';
  closureNotes?: string;
  requestedBy: string;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
}
