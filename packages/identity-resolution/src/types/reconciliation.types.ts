// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Identity Resolution Types (v2.0)
 * Types for multi-source CI reconciliation
 */

/**
 * Match Result from identification
 */
export interface MatchResult {
  ci_id: string;
  confidence: number;
  match_strategy: string;
  matched_attributes: string[];
}

/**
 * Identification Rule
 */
export interface IdentificationRule {
  attribute: string;
  priority: number;
  match_type: 'exact' | 'fuzzy' | 'composite';
  match_confidence: number;
  fuzzy_threshold?: number;
}

/**
 * Source Authority
 */
export interface SourceAuthority {
  source_name: string;
  authority_score: number;
  description?: string;
}

/**
 * Merge Strategy
 */
export type MergeStrategy = 'highest_authority' | 'most_recent' | 'aggregate' | 'manual_review';

/**
 * Field Merge Rule
 */
export interface FieldMergeRule {
  field_name: string;
  strategy: MergeStrategy;
  conflict_threshold?: number;
}

/**
 * Reconciliation Configuration
 */
export interface ReconciliationConfig {
  name: string;
  identification_rules: IdentificationRule[];
  merge_rules: FieldMergeRule[];
  source_authorities: Record<string, number>;
}

/**
 * Reconciliation Conflict
 */
export interface ReconciliationConflict {
  id?: string;
  ci_id?: string;
  conflict_type: 'duplicate_ci' | 'field_conflict' | 'identity_mismatch';
  source_data: any;
  target_data?: any;
  conflicting_fields: string[];
  status: 'pending' | 'resolved' | 'dismissed';
  created_at?: Date;
}

/**
 * Merge Result
 */
export interface MergeResult {
  success: boolean;
  ci_id: string;
  merged_fields: string[];
  conflicts?: ReconciliationConflict[];
}
