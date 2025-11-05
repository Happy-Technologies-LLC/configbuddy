/**
 * Application Service Service Interface
 */

import {
  ApplicationService,
  ApplicationServiceInput,
  ApplicationServiceUpdate,
  ApplicationServiceFilters,
} from '../types/application-service.types';

/**
 * Service interface for Application Service CRUD operations
 */
export interface IApplicationServiceService {
  /**
   * Create a new Application Service
   * @param service - Application service data
   * @returns Created application service with generated ID
   */
  create(service: ApplicationServiceInput): Promise<ApplicationService>;

  /**
   * Find an Application Service by ID
   * @param id - Service ID
   * @returns Application service or null if not found
   */
  findById(id: string): Promise<ApplicationService | null>;

  /**
   * Update an Application Service
   * @param id - Service ID
   * @param updates - Partial updates to apply
   * @returns Updated application service
   */
  update(id: string, updates: ApplicationServiceUpdate): Promise<ApplicationService>;

  /**
   * Delete an Application Service
   * @param id - Service ID
   */
  delete(id: string): Promise<void>;

  /**
   * Find all Application Services matching filters
   * @param filters - Query filters
   * @returns Array of application services
   */
  findAll(filters?: ApplicationServiceFilters): Promise<ApplicationService[]>;

  /**
   * Count Application Services matching filters
   * @param filters - Query filters
   * @returns Count of matching services
   */
  count(filters?: ApplicationServiceFilters): Promise<number>;

  /**
   * Get infrastructure components supporting this application service
   * @param id - Service ID
   * @returns Array of CI IDs
   */
  getInfrastructureComponents(id: string): Promise<string[]>;

  /**
   * Get business services enabled by this application service
   * @param id - Service ID
   * @returns Array of business service IDs
   */
  getBusinessServices(id: string): Promise<string[]>;

  /**
   * Calculate total cost for an application service
   * @param id - Service ID
   * @returns Total monthly cost
   */
  calculateTotalCost(id: string): Promise<number>;
}
