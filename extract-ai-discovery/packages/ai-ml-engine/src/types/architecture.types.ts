// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Architecture Optimization Types
 */

export enum ArchitectureIssueType {
  SINGLE_POINT_OF_FAILURE = 'single_point_of_failure',
  TIGHT_COUPLING = 'tight_coupling',
  CIRCULAR_DEPENDENCY = 'circular_dependency',
  BOTTLENECK = 'bottleneck',
  MISSING_REDUNDANCY = 'missing_redundancy',
  MONOLITHIC_ARCHITECTURE = 'monolithic_architecture',
  OVER_COMPLICATED = 'over_complicated',
  SECURITY_GAP = 'security_gap',
  SCALABILITY_ISSUE = 'scalability_issue',
  POOR_SEPARATION = 'poor_separation',
  SHARED_DATABASE = 'shared_database',
  SYNCHRONOUS_COUPLING = 'synchronous_coupling',
}

export enum ArchitectureSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export enum ArchitecturePattern {
  MICROSERVICES = 'microservices',
  MONOLITH = 'monolith',
  LAYERED = 'layered',
  EVENT_DRIVEN = 'event_driven',
  SERVICE_ORIENTED = 'service_oriented',
  SERVERLESS = 'serverless',
  MESH = 'mesh',
  HYBRID = 'hybrid',
}

export interface ArchitectureIssue {
  id: string;
  issue_type: ArchitectureIssueType;
  severity: ArchitectureSeverity;
  title: string;
  description: string;
  affected_cis: string[];
  business_service_id?: string;
  confidence_score: number;
  detected_at: Date;
  metrics: {
    dependency_count?: number;
    fan_in?: number;
    fan_out?: number;
    complexity_score?: number;
    coupling_coefficient?: number;
    [key: string]: any;
  };
  recommendations: ArchitectureRecommendation[];
}

export interface ArchitectureRecommendation {
  id: string;
  priority: 'p0' | 'p1' | 'p2' | 'p3';
  category: 'design' | 'refactoring' | 'infrastructure' | 'security' | 'monitoring';
  title: string;
  description: string;
  rationale: string;
  implementation_steps: string[];
  estimated_effort: string;
  expected_benefit: string;
  risk_if_ignored: string;
  architectural_pattern?: ArchitecturePattern;
  references?: string[];
}

export interface ArchitectureAnalysis {
  id: string;
  business_service_id?: string;
  business_service_name?: string;
  analyzed_at: Date;
  overall_score: number;
  architecture_pattern: ArchitecturePattern;
  health_metrics: {
    coupling_score: number;
    cohesion_score: number;
    redundancy_score: number;
    scalability_score: number;
    security_score: number;
    maintainability_score: number;
  };
  issues: ArchitectureIssue[];
  recommendations: ArchitectureRecommendation[];
  dependency_graph_summary: {
    total_cis: number;
    total_dependencies: number;
    max_depth: number;
    circular_dependencies: number;
    bottleneck_count: number;
  };
}

export interface DependencyGraphMetrics {
  ci_id: string;
  ci_name: string;
  ci_type: string;
  fan_in: number; // Number of CIs depending on this CI
  fan_out: number; // Number of CIs this CI depends on
  depth: number; // Distance from leaf nodes
  in_critical_path: boolean;
  is_bottleneck: boolean;
  coupling_coefficient: number; // (fan_in + fan_out) / total_cis
}

export interface CircularDependencyChain {
  cis: string[];
  chain_length: number;
  severity: ArchitectureSeverity;
}

export interface ArchitectureOptimizationConfig {
  enabled: boolean;
  max_fan_in_threshold: number;
  max_fan_out_threshold: number;
  max_coupling_coefficient: number;
  min_redundancy_count: number;
  max_dependency_depth: number;
  detect_circular_dependencies: boolean;
  analyze_business_services: boolean;
}
