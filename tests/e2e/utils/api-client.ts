/**
 * E2E Test API Client
 *
 * HTTP client for interacting with the CMDB API during E2E tests
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { CI, CIInput, Relationship } from '../../../packages/common/src/types/ci.types';
import {
  DiscoveryJob,
  DiscoveryProvider,
  DiscoveryConfig,
} from '../../../packages/common/src/types/discovery.types';
import { logger } from './logger';

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  debug?: boolean;
}

export class ApiClient {
  private client: AxiosInstance;
  private debug: boolean;

  constructor(config: ApiClientConfig) {
    this.debug = config.debug || false;
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for debugging
    if (this.debug) {
      this.client.interceptors.request.use((config) => {
        logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        if (config.data) {
          logger.debug('Request Body:', JSON.stringify(config.data, null, 2));
        }
        return config;
      });

      this.client.interceptors.response.use(
        (response) => {
          logger.debug(`API Response: ${response.status} ${response.config.url}`);
          return response;
        },
        (error) => {
          logger.error(`API Error: ${error.message}`);
          if (error.response) {
            logger.error('Response Data:', error.response.data);
          }
          return Promise.reject(error);
        }
      );
    }
  }

  // Health Check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }

  // CI Operations
  async createCI(ci: CIInput): Promise<CI> {
    const response = await this.client.post('/api/v1/cis', ci);
    return response.data;
  }

  async getCI(id: string): Promise<CI> {
    const response = await this.client.get(`/api/v1/cis/${id}`);
    return response.data;
  }

  async updateCI(id: string, updates: Partial<CIInput>): Promise<CI> {
    const response = await this.client.put(`/api/v1/cis/${id}`, updates);
    return response.data;
  }

  async deleteCI(id: string): Promise<void> {
    await this.client.delete(`/api/v1/cis/${id}`);
  }

  async listCIs(filters?: {
    type?: string;
    status?: string;
    environment?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: CI[]; total: number }> {
    const response = await this.client.get('/api/v1/cis', { params: filters });
    return response.data;
  }

  async searchCIs(query: string): Promise<CI[]> {
    const response = await this.client.get('/api/v1/cis/search', {
      params: { q: query },
    });
    return response.data;
  }

  // Relationship Operations
  async createRelationship(relationship: Relationship): Promise<Relationship> {
    const response = await this.client.post('/api/v1/relationships', relationship);
    return response.data;
  }

  async getRelationships(ciId: string): Promise<Relationship[]> {
    const response = await this.client.get(`/api/v1/cis/${ciId}/relationships`);
    return response.data;
  }

  async deleteRelationship(fromId: string, toId: string, type: string): Promise<void> {
    await this.client.delete('/api/v1/relationships', {
      data: { from_id: fromId, to_id: toId, type },
    });
  }

  // Impact Analysis
  async getImpactAnalysis(ciId: string, depth?: number): Promise<{
    ci: CI;
    upstream: CI[];
    downstream: CI[];
    total_affected: number;
  }> {
    const response = await this.client.get(`/api/v1/cis/${ciId}/impact`, {
      params: { depth },
    });
    return response.data;
  }

  // Discovery Operations
  async scheduleDiscovery(
    provider: DiscoveryProvider,
    config: DiscoveryConfig
  ): Promise<DiscoveryJob> {
    const response = await this.client.post('/api/v1/discovery/schedule', {
      provider,
      config,
    });
    return response.data;
  }

  async getDiscoveryJob(jobId: string): Promise<DiscoveryJob> {
    const response = await this.client.get(`/api/v1/discovery/jobs/${jobId}`);
    return response.data;
  }

  async listDiscoveryJobs(filters?: {
    provider?: string;
    status?: string;
    limit?: number;
  }): Promise<{ data: DiscoveryJob[]; total: number }> {
    const response = await this.client.get('/api/v1/discovery/jobs', {
      params: filters,
    });
    return response.data;
  }

  async cancelDiscoveryJob(jobId: string): Promise<void> {
    await this.client.post(`/api/v1/discovery/jobs/${jobId}/cancel`);
  }

  // Wait for Discovery Job Completion
  async waitForDiscoveryJob(
    jobId: string,
    options?: { timeout?: number; interval?: number }
  ): Promise<DiscoveryJob> {
    const timeout = options?.timeout || 60000;
    const interval = options?.interval || 2000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const job = await this.getDiscoveryJob(jobId);

      if (job.status === 'completed') {
        return job;
      }

      if (job.status === 'failed') {
        throw new Error(`Discovery job ${jobId} failed: ${job.error}`);
      }

      // Job is still pending or running
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`Timeout waiting for discovery job ${jobId} to complete`);
  }

  // Wait for ETL Sync
  async waitForETLSync(ciId: string, options?: { timeout?: number; interval?: number }): Promise<void> {
    const timeout = options?.timeout || 30000;
    const interval = options?.interval || 1000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        // Check if CI exists in data mart by querying via API
        // Assuming there's an endpoint that queries the data mart
        const response = await this.client.get(`/api/v1/datamart/cis/${ciId}`);
        if (response.status === 200 && response.data) {
          return; // CI found in data mart
        }
      } catch (error) {
        // CI not yet synced, continue waiting
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`Timeout waiting for CI ${ciId} to sync to data mart`);
  }
}

/**
 * Create an API client for E2E tests
 */
export function createApiClient(config?: Partial<ApiClientConfig>): ApiClient {
  return new ApiClient({
    baseURL: config?.baseURL || 'http://localhost:3001',
    timeout: config?.timeout || 30000,
    debug: config?.debug || process.env.DEBUG === 'true',
  });
}
