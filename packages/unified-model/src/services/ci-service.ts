// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Configuration Item Service Interface
 */

import {
  ConfigurationItem,
  ConfigurationItemInput,
  ConfigurationItemUpdate,
  CIFilters,
} from '../types/configuration-item.types';

/**
 * Service interface for Configuration Item CRUD operations
 *
 * This is the interface definition only. Implementations will be provided
 * by database-specific packages (e.g., @cmdb/database).
 */
export interface ICIService {
  /**
   * Create a new Configuration Item
   * @param ci - Configuration item data
   * @returns Created configuration item with generated ID
   */
  create(ci: ConfigurationItemInput): Promise<ConfigurationItem>;

  /**
   * Find a Configuration Item by ID
   * @param id - CI ID
   * @returns Configuration item or null if not found
   */
  findById(id: string): Promise<ConfigurationItem | null>;

  /**
   * Find Configuration Items by external ID
   * @param externalId - External system ID
   * @returns Configuration items matching the external ID
   */
  findByExternalId(externalId: string): Promise<ConfigurationItem[]>;

  /**
   * Update a Configuration Item
   * @param id - CI ID
   * @param updates - Partial updates to apply
   * @returns Updated configuration item
   */
  update(id: string, updates: ConfigurationItemUpdate): Promise<ConfigurationItem>;

  /**
   * Delete a Configuration Item
   * @param id - CI ID
   */
  delete(id: string): Promise<void>;

  /**
   * Find all Configuration Items matching filters
   * @param filters - Query filters
   * @returns Array of configuration items
   */
  findAll(filters?: CIFilters): Promise<ConfigurationItem[]>;

  /**
   * Count Configuration Items matching filters
   * @param filters - Query filters
   * @returns Count of matching CIs
   */
  count(filters?: CIFilters): Promise<number>;

  /**
   * Get upstream dependencies for a CI
   * @param id - CI ID
   * @param depth - How many levels to traverse (default: 1)
   * @returns Array of upstream CIs
   */
  getUpstreamDependencies(id: string, depth?: number): Promise<ConfigurationItem[]>;

  /**
   * Get downstream dependencies for a CI
   * @param id - CI ID
   * @param depth - How many levels to traverse (default: 1)
   * @returns Array of downstream CIs
   */
  getDownstreamDependencies(id: string, depth?: number): Promise<ConfigurationItem[]>;

  /**
   * Get the complete dependency graph for a CI
   * @param id - CI ID
   * @returns Dependency graph structure
   */
  getDependencyGraph(id: string): Promise<DependencyGraph>;
}

/**
 * Dependency Graph structure
 */
export interface DependencyGraph {
  root: ConfigurationItem;
  upstream: ConfigurationItem[];
  downstream: ConfigurationItem[];
  relationships: Relationship[];
}

/**
 * Relationship between CIs
 */
export interface Relationship {
  from_ci_id: string;
  to_ci_id: string;
  relationship_type: RelationshipType;
  metadata?: Record<string, any>;
}

/**
 * Relationship types
 */
export type RelationshipType =
  | 'HOSTS'
  | 'RUNS_ON'
  | 'DEPENDS_ON'
  | 'CONNECTS_TO'
  | 'USES'
  | 'OWNED_BY'
  | 'MANAGED_BY'
  | 'PROTECTS'
  | 'MONITORS';
