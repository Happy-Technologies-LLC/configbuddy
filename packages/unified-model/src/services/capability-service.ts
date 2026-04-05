// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Business Capability Service Interface
 */

import {
  BusinessCapability,
  BusinessCapabilityInput,
  BusinessCapabilityUpdate,
  BusinessCapabilityFilters,
} from '../types/business-capability.types';

/**
 * Service interface for Business Capability CRUD operations
 */
export interface IBusinessCapabilityService {
  /**
   * Create a new Business Capability
   * @param capability - Business capability data
   * @returns Created business capability with generated ID
   */
  create(capability: BusinessCapabilityInput): Promise<BusinessCapability>;

  /**
   * Find a Business Capability by ID
   * @param id - Capability ID
   * @returns Business capability or null if not found
   */
  findById(id: string): Promise<BusinessCapability | null>;

  /**
   * Update a Business Capability
   * @param id - Capability ID
   * @param updates - Partial updates to apply
   * @returns Updated business capability
   */
  update(id: string, updates: BusinessCapabilityUpdate): Promise<BusinessCapability>;

  /**
   * Delete a Business Capability
   * @param id - Capability ID
   */
  delete(id: string): Promise<void>;

  /**
   * Find all Business Capabilities matching filters
   * @param filters - Query filters
   * @returns Array of business capabilities
   */
  findAll(filters?: BusinessCapabilityFilters): Promise<BusinessCapability[]>;

  /**
   * Count Business Capabilities matching filters
   * @param filters - Query filters
   * @returns Count of matching capabilities
   */
  count(filters?: BusinessCapabilityFilters): Promise<number>;

  /**
   * Get child capabilities
   * @param id - Parent capability ID
   * @returns Array of child capabilities
   */
  getChildCapabilities(id: string): Promise<BusinessCapability[]>;

  /**
   * Get capability hierarchy tree
   * @param id - Root capability ID
   * @returns Hierarchical capability tree
   */
  getCapabilityTree(id: string): Promise<CapabilityTree>;

  /**
   * Get business services supporting this capability
   * @param id - Capability ID
   * @returns Array of business service IDs
   */
  getBusinessServices(id: string): Promise<string[]>;

  /**
   * Calculate total cost including all child capabilities
   * @param id - Capability ID
   * @returns Total monthly cost
   */
  calculateTotalCost(id: string): Promise<number>;
}

/**
 * Capability Tree structure
 */
export interface CapabilityTree {
  capability: BusinessCapability;
  children: CapabilityTree[];
  total_cost: number;
  depth: number;
}
