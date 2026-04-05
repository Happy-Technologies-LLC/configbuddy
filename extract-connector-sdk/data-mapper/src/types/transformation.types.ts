// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Transformation Rule Data Types (v2.0)
 * Types for visual data transformation
 */

/**
 * Transformation Rule
 */
export interface TransformationRule {
  id: string;
  connector_type: string;
  name: string;
  description?: string;
  enabled: boolean;
  version: string;
  created_at: Date;
  updated_at: Date;
  created_by: string;

  field_mappings: FieldMapping[];
  conditions?: TransformationCondition[];
  validations?: ValidationRule[];
}

/**
 * Field Mapping
 */
export interface FieldMapping {
  id: string;
  source_field: string;
  target_field: string;
  transformation?: TransformationExpression;
  default_value?: any;
  required: boolean;
  description?: string;
}

/**
 * Transformation Expression
 */
export interface TransformationExpression {
  type: 'direct' | 'expression' | 'lookup' | 'conditional';

  // For type='expression'
  expression?: string;

  // For type='lookup'
  lookup_table?: string;
  lookup_key?: string;
  lookup_value?: string;

  // For type='conditional'
  if_condition?: string;
  then_value?: any;
  else_value?: any;
}

/**
 * Transformation Condition
 */
export interface TransformationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'regex' | 'exists';
  value: any;
}

/**
 * Validation Rule
 */
export interface ValidationRule {
  field: string;
  rule_type: 'required' | 'regex' | 'range' | 'custom';
  parameters: Record<string, any>;
  error_message: string;
}

/**
 * Transformation Context
 */
export interface TransformationContext {
  source_data: any;
  connector_type: string;
  metadata: Record<string, any>;
  lookup_tables: Record<string, any>;
}

/**
 * Transformation Result
 */
export interface TransformationResult {
  success: boolean;
  transformed_data?: any;
  errors?: TransformationError[];
  warnings?: string[];
}

export interface TransformationError {
  field: string;
  message: string;
  error_type: 'validation' | 'expression' | 'missing_field';
}
