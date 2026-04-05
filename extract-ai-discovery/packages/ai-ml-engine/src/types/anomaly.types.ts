// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Anomaly Detection Types
 */

export interface Anomaly {
  id: string;
  ci_id: string;
  ci_name: string;
  anomaly_type: AnomalyType;
  severity: AnomalySeverity;
  confidence_score: number; // 0-100
  detected_at: Date;
  description: string;
  metrics: AnomalyMetrics;
  context: Record<string, any>;
  status: AnomalyStatus;
  resolved_at?: Date;
  resolved_by?: string;
}

export enum AnomalyType {
  // Change frequency anomalies
  EXCESSIVE_CHANGES = 'excessive_changes',
  UNUSUAL_CHANGE_PATTERN = 'unusual_change_pattern',
  UNEXPECTED_DOWNTIME = 'unexpected_downtime',

  // Relationship anomalies
  ORPHANED_CI = 'orphaned_ci',
  UNUSUAL_DEPENDENCY_COUNT = 'unusual_dependency_count',
  CIRCULAR_DEPENDENCY = 'circular_dependency',

  // Configuration anomalies
  CONFIGURATION_DRIFT = 'configuration_drift',
  UNAUTHORIZED_CHANGE = 'unauthorized_change',
  MISSING_REQUIRED_ATTRIBUTE = 'missing_required_attribute',

  // Performance anomalies
  DEGRADED_PERFORMANCE = 'degraded_performance',
  RESOURCE_EXHAUSTION = 'resource_exhaustion',

  // Security anomalies
  SECURITY_POLICY_VIOLATION = 'security_policy_violation',
  SUSPICIOUS_ACCESS_PATTERN = 'suspicious_access_pattern',
}

export enum AnomalySeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export enum AnomalyStatus {
  DETECTED = 'detected',
  INVESTIGATING = 'investigating',
  CONFIRMED = 'confirmed',
  FALSE_POSITIVE = 'false_positive',
  RESOLVED = 'resolved',
  IGNORED = 'ignored',
}

export interface AnomalyMetrics {
  expected_value?: number;
  actual_value?: number;
  deviation_percentage?: number;
  threshold_exceeded?: number;
  historical_average?: number;
  standard_deviation?: number;
}

export interface AnomalyDetectionConfig {
  enabled: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  min_confidence_score: number;
  check_interval_minutes: number;
  lookback_days: number;
  notification_enabled: boolean;
}

export interface BaselineSnapshot {
  id: string;
  ci_id: string;
  snapshot_type: 'configuration' | 'performance' | 'relationships';
  snapshot_data: Record<string, any>;
  created_at: Date;
  created_by: string;
  is_approved: boolean;
  approved_by?: string;
  approved_at?: Date;
}

export interface DriftDetectionResult {
  ci_id: string;
  ci_name: string;
  has_drift: boolean;
  drift_score: number; // 0-100
  drifted_fields: DriftedField[];
  baseline_snapshot_id: string;
  detected_at: Date;
}

export interface DriftedField {
  field_name: string;
  baseline_value: any;
  current_value: any;
  change_type: 'added' | 'removed' | 'modified';
  severity: AnomalySeverity;
}
