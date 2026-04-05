// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Application Service - Unified v3.0
 * Maps to TBM IT Solution + ITIL Application CI
 */

import { AuditFields } from './common.types';
import { TBMITSolutionAttributes } from './tbm.types';
import { ITILServiceAttributes } from './itil.types';

/**
 * Unified Application Service (v3.0)
 *
 * Represents an application or IT solution that enables business services.
 * Combines TBM IT Solution costing with ITIL service management practices.
 *
 * @example
 * ```typescript
 * const ecommerceApp: ApplicationService = {
 *   id: 'app-ecommerce-001',
 *   name: 'E-Commerce Platform',
 *   description: 'Customer-facing online store',
 *   tbm_attributes: {
 *     solution_type: 'application',
 *     it_tower_alignment: 'Application Services',
 *     total_monthly_cost: 45000.00,
 *     cost_breakdown: {
 *       infrastructure: 25000,
 *       licenses: 10000,
 *       labor: 8000,
 *       support: 2000
 *     }
 *   },
 *   // ... other fields
 * };
 * ```
 */
export interface ApplicationService extends AuditFields {
  id: string;
  name: string;
  description: string;

  // TBM IT Solution attributes
  tbm_attributes: TBMITSolutionAttributes;

  // ITIL Service attributes
  itil_attributes: ITILServiceAttributes;

  // Application portfolio management
  application_attributes: ApplicationAttributes;

  // Quality & performance metrics
  quality_metrics: QualityMetrics;

  // Business alignment
  supports_business_services: string[]; // Business service IDs
  business_value_score: number; // Calculated 0-100

  // Infrastructure dependencies
  infrastructure_components: string[]; // CI IDs
}

/**
 * Application-specific attributes
 */
export interface ApplicationAttributes {
  application_type: ApplicationType;
  technology_stack: TechnologyStack;
  deployment_model: DeploymentModel;
  architecture_pattern: ArchitecturePattern;
  product_owner: string;
  development_team: string;
  vendor_product: boolean;
  vendor_name?: string;
}

/**
 * Application Type
 */
export type ApplicationType =
  | 'web_application'
  | 'mobile_application'
  | 'api_service'
  | 'batch_processing'
  | 'data_pipeline'
  | 'messaging_service'
  | 'integration_middleware'
  | 'database_service'
  | 'platform_service';

/**
 * Technology Stack
 */
export interface TechnologyStack {
  primary_language: string;
  frameworks: string[];
  databases: string[];
  messaging: string[];
  caching: string[];
  monitoring: string[];
}

/**
 * Deployment Model
 */
export type DeploymentModel =
  | 'on_premises'
  | 'cloud_native'
  | 'hybrid'
  | 'saas';

/**
 * Architecture Pattern
 */
export type ArchitecturePattern =
  | 'monolithic'
  | 'microservices'
  | 'serverless'
  | 'event_driven'
  | 'layered'
  | 'service_oriented';

/**
 * Quality Metrics
 */
export interface QualityMetrics {
  code_repository: string;
  test_coverage_percentage: number;
  defect_density: number;
  availability_percentage: number; // Last 30 days
  response_time_p95: number; // Milliseconds
}

/**
 * Partial ApplicationService for updates
 */
export type ApplicationServiceUpdate = Partial<Omit<ApplicationService, 'id' | 'created_at' | 'created_by'>>;

/**
 * ApplicationService creation input
 */
export type ApplicationServiceInput = Omit<ApplicationService, 'id' | 'created_at' | 'updated_at'>;

/**
 * Filters for querying Application Services
 */
export interface ApplicationServiceFilters {
  application_type?: ApplicationType | ApplicationType[];
  deployment_model?: DeploymentModel | DeploymentModel[];
  supports_business_service?: string;
  owner?: string;
  development_team?: string;
  search?: string;
  limit?: number;
  offset?: number;
}
