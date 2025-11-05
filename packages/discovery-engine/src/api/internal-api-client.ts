// packages/discovery-engine/src/api/internal-api-client.ts

import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '@cmdb/common';
import { DiscoveredCI } from '@cmdb/common';

/**
 * Internal API Client for Discovery Engine
 *
 * This client communicates with the CMDB API server to create/update CIs.
 * All requests include the 'x-actor: discovery-engine' header to identify
 * the source for audit logging.
 */
export class InternalAPIClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    // Get API base URL from environment or use default
    this.baseURL = process.env['CMDB_API_URL'] || 'http://localhost:3000';

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'x-actor': 'discovery-engine', // Identify the source for audit logs
      },
      timeout: 30000, // 30 second timeout
    });

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        logger.error('API request failed', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Create a new CI via API
   *
   * @param ci - The discovered CI to create
   * @returns The created CI from the API
   */
  async createCI(ci: DiscoveredCI): Promise<any> {
    try {
      // Map DiscoveredCI to API input format
      const ciInput = {
        id: ci._id,
        external_id: ci.external_id,
        name: ci.name,
        type: ci._type,
        status: ci.status || 'active',
        environment: ci.environment,
        discovered_at: ci.discovered_at || new Date().toISOString(),
        metadata: {
          ...ci.metadata,
          discovery_job_id: ci.discovery_job_id,
          discovery_provider: ci.discovery_provider,
          confidence_score: ci.confidence_score,
        },
      };

      const response = await this.client.post('/api/v1/cis', ciInput);

      if (response.data._success) {
        logger.debug('CI created via API', { id: ci._id });
        return response.data._data;
      } else {
        throw new Error(response.data._message || 'Failed to create CI');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError = error.response?.data;
        logger.error('Failed to create CI via API', {
          id: ci._id,
          status: error.response?.status,
          error: apiError?._message || error.message,
        });
        throw new Error(apiError?._message || `API error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Update an existing CI via API
   *
   * @param id - The CI ID to update
   * @param ci - The discovered CI with updated data
   * @returns The updated CI from the API
   */
  async updateCI(id: string, ci: DiscoveredCI): Promise<any> {
    try {
      // Map DiscoveredCI to API update format (only include changed fields)
      const updateData: any = {
        _name: ci.name,
        _status: ci.status || 'active',
      };

      if (ci.environment) {
        updateData._environment = ci.environment;
      }

      // Merge discovery metadata with existing metadata
      updateData._metadata = {
        ...ci.metadata,
        discovery_job_id: ci.discovery_job_id,
        discovery_provider: ci.discovery_provider,
        confidence_score: ci.confidence_score,
        last_discovered_at: new Date().toISOString(),
      };

      const response = await this.client.put(`/api/v1/cis/${id}`, updateData);

      if (response.data._success) {
        logger.debug('CI updated via API', { id });
        return response.data._data;
      } else {
        throw new Error(response.data._message || 'Failed to update CI');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError = error.response?.data;
        logger.error('Failed to update CI via API', {
          id,
          status: error.response?.status,
          error: apiError?._message || error.message,
        });
        throw new Error(apiError?._message || `API error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get a CI by ID via API
   *
   * @param id - The CI ID to retrieve
   * @returns The CI if found, null otherwise
   */
  async getCI(id: string): Promise<any | null> {
    try {
      const response = await this.client.get(`/api/v1/cis/${id}`);

      if (response.data._success) {
        return response.data._data;
      }
      return null;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // 404 is expected when CI doesn't exist
        if (error.response?.status === 404) {
          return null;
        }
        logger.error('Failed to get CI via API', {
          id,
          status: error.response?.status,
          error: error.message,
        });
      }
      throw error;
    }
  }

  /**
   * Check if the API is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      logger.warn('API health check failed', { error });
      return false;
    }
  }
}

// Singleton instance
let apiClient: InternalAPIClient | null = null;

/**
 * Get or create the singleton API client instance
 */
export function getInternalAPIClient(): InternalAPIClient {
  if (!apiClient) {
    apiClient = new InternalAPIClient();
  }
  return apiClient;
}
