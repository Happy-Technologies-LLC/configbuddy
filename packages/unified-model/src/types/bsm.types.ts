// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * BSM (Business Service Mapping) types
 */

/**
 * Business Criticality Tier
 * Tier 0 = Business-stopping, Tier 4 = Low priority
 */
export type BusinessCriticality =
  | 'tier_0' // Business-stopping
  | 'tier_1' // Mission-critical
  | 'tier_2' // Important
  | 'tier_3' // Standard
  | 'tier_4'; // Low priority

/**
 * Data Classification
 */
export type DataClassification =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'restricted'
  | 'highly_restricted';

/**
 * Risk Rating
 */
export type RiskRating = 'critical' | 'high' | 'medium' | 'low';

/**
 * BSM attributes for Configuration Items
 */
export interface BSMCIAttributes {
  business_criticality: BusinessCriticality;
  supports_business_services: string[];
  customer_facing: boolean;
  compliance_scope: string[];
  data_classification: DataClassification;
}

/**
 * Compliance Framework
 */
export type ComplianceFramework =
  | 'GDPR'
  | 'HIPAA'
  | 'PCI_DSS'
  | 'SOX'
  | 'FINRA'
  | 'ISO27001'
  | 'SOC2';

/**
 * Compliance Requirement
 */
export interface ComplianceRequirement {
  framework: ComplianceFramework;
  applicable: boolean;
  last_audit: Date;
  next_audit: Date;
  compliance_status: 'compliant' | 'non_compliant' | 'unknown';
  findings_count: number;
}

/**
 * BSM Business Service attributes
 */
export interface BSMBusinessServiceAttributes {
  business_criticality: BusinessCriticality;
  capabilities_enabled: string[];
  value_streams: string[];
  business_impact_score: number;
  risk_rating: RiskRating;
  annual_revenue_supported: number;
  customer_count: number;
  transaction_volume_daily: number;
  compliance_requirements: ComplianceRequirement[];
  data_sensitivity: DataClassification;
  sox_scope: boolean;
  pci_scope: boolean;
  recovery_time_objective: number;
  recovery_point_objective: number;
  disaster_recovery_tier: 1 | 2 | 3 | 4;
}

/**
 * Operational Status
 */
export type OperationalStatus =
  | 'operational'
  | 'degraded'
  | 'outage'
  | 'maintenance';

/**
 * Capability Type
 */
export type CapabilityType =
  | 'core' // Essential to business operation
  | 'supporting' // Enables core capabilities
  | 'strategic' // Competitive differentiator
  | 'commodity'; // Standard industry practice

/**
 * Strategic Importance
 */
export type StrategicImportance =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low';

/**
 * Maturity Level (CMMI-based)
 */
export type MaturityLevel =
  | 'initial'
  | 'managed'
  | 'defined'
  | 'quantitatively_managed'
  | 'optimizing';

/**
 * Lifecycle Stage (Business Capability)
 */
export type LifecycleStage =
  | 'strategic' // Planning
  | 'invest' // Active investment
  | 'maintain' // Steady state
  | 'divest'; // Sunset

/**
 * Revenue Impact
 */
export interface RevenueImpact {
  direct_revenue: boolean;
  annual_revenue_supported: number;
  customer_count_impacted: number;
  transaction_volume: number;
}
