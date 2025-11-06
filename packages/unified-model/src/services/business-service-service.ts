/**
 * Business Service Service Interface
 */

import {
  BusinessService,
  BusinessServiceInput,
  BusinessServiceUpdate,
  BusinessServiceFilters,
} from '../types/business-service.types';

/**
 * Service interface for Business Service CRUD operations
 */
export interface IBusinessServiceService {
  /**
   * Create a new Business Service
   * @param service - Business service data
   * @returns Created business service with generated ID
   */
  create(service: BusinessServiceInput): Promise<BusinessService>;

  /**
   * Find a Business Service by ID
   * @param id - Service ID
   * @returns Business service or null if not found
   */
  findById(id: string): Promise<BusinessService | null>;

  /**
   * Update a Business Service
   * @param id - Service ID
   * @param updates - Partial updates to apply
   * @returns Updated business service
   */
  update(id: string, updates: BusinessServiceUpdate): Promise<BusinessService>;

  /**
   * Delete a Business Service
   * @param id - Service ID
   */
  delete(id: string): Promise<void>;

  /**
   * Find all Business Services matching filters
   * @param filters - Query filters
   * @returns Array of business services
   */
  findAll(filters?: BusinessServiceFilters): Promise<BusinessService[]>;

  /**
   * Count Business Services matching filters
   * @param filters - Query filters
   * @returns Count of matching services
   */
  count(filters?: BusinessServiceFilters): Promise<number>;

  /**
   * Get application services that enable this business service
   * @param id - Service ID
   * @returns Array of application service IDs
   */
  getApplicationServices(id: string): Promise<string[]>;

  /**
   * Get all configuration items supporting this business service
   * @param id - Service ID
   * @returns Array of CI IDs
   */
  getSupportingCIs(id: string): Promise<string[]>;

  /**
   * Calculate business impact score
   * @param id - Service ID
   * @returns Business impact score (0-100)
   */
  calculateBusinessImpact(id: string): Promise<number>;

  /**
   * Calculate revenue at risk if service is unavailable
   * @param id - Service ID
   * @param durationMinutes - Expected downtime duration
   * @returns Estimated revenue at risk
   */
  calculateRevenueAtRisk(id: string, durationMinutes: number): Promise<number>;
}
