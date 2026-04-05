// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type {
  ApiResponse,
  PaginatedResponse,
  ConfigurationItem,
  CIRelationship,
  DiscoveryJob,
  DiscoverySchedule,
  User,
  AuthToken,
  LoginCredentials,
  FilterOptions,
  SortOptions,
  PaginationOptions,
} from '../types';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Service class
class ApiService {
  // Authentication
  async login(credentials: LoginCredentials): Promise<AuthToken> {
    const response = await apiClient.post<{success: boolean; data: any}>('/auth/login', {
      _username: credentials.username,
      _password: credentials.password,
    });
    return {
      access_token: response.data.data._accessToken,
      refresh_token: response.data.data._refreshToken,
      expires_in: response.data.data._expiresIn,
      token_type: 'Bearer',
    };
  }

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  }

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<{success: boolean; data: any}>('/auth/me');
    const userData = response.data.data;
    return {
      user_id: userData.userId || userData._userId,
      username: userData.username || userData._username,
      email: userData.email || userData.username || userData._username,
      full_name: userData.name || userData.username || userData._username,
      role: userData.role || userData._role || 'viewer',
      created_at: userData.createdAt || userData._createdAt || new Date().toISOString(),
      last_login: userData.lastLoginAt || userData._lastLoginAt,
    };
  }

  // Configuration Items
  async getCIs(
    filters?: FilterOptions,
    sort?: SortOptions,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<ConfigurationItem>> {
    const params = {
      ...filters,
      sort_by: sort?.field,
      sort_order: sort?.order,
      page: pagination?.page,
      limit: pagination?.limit,
    };
    const response = await apiClient.get<PaginatedResponse<ConfigurationItem>>('/cis', { params });
    return response.data;
  }

  async getCIById(ciId: string): Promise<ConfigurationItem> {
    const response = await apiClient.get<ConfigurationItem>(`/cis/${ciId}`);
    return response.data;
  }

  async createCI(ci: Partial<ConfigurationItem>): Promise<ConfigurationItem> {
    const response = await apiClient.post<ConfigurationItem>('/cis', ci);
    return response.data;
  }

  async updateCI(ciId: string, updates: Partial<ConfigurationItem>): Promise<ConfigurationItem> {
    const response = await apiClient.patch<ConfigurationItem>(`/cis/${ciId}`, updates);
    return response.data;
  }

  async deleteCI(ciId: string): Promise<void> {
    await apiClient.delete(`/cis/${ciId}`);
  }

  async searchCIs(query: string): Promise<ConfigurationItem[]> {
    const response = await apiClient.get<ConfigurationItem[]>('/cis/search', {
      params: { q: query },
    });
    return response.data;
  }

  // Relationships
  async getCIRelationships(ciId: string): Promise<CIRelationship[]> {
    const response = await apiClient.get<CIRelationship[]>(`/cis/${ciId}/relationships`);
    return response.data;
  }

  async createRelationship(relationship: Partial<CIRelationship>): Promise<CIRelationship> {
    const response = await apiClient.post<CIRelationship>('/relationships', relationship);
    return response.data;
  }

  async deleteRelationship(relationshipId: string): Promise<void> {
    await apiClient.delete(`/relationships/${relationshipId}`);
  }

  // Discovery Jobs
  async getDiscoveryJobs(
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<DiscoveryJob>> {
    const params = {
      page: pagination?.page,
      limit: pagination?.limit,
    };
    const response = await apiClient.get<PaginatedResponse<DiscoveryJob>>('/discovery/jobs', {
      params,
    });
    return response.data;
  }

  async getDiscoveryJobById(jobId: string): Promise<DiscoveryJob> {
    const response = await apiClient.get<DiscoveryJob>(`/discovery/jobs/${jobId}`);
    return response.data;
  }

  async triggerDiscovery(provider: string, config?: Record<string, unknown>): Promise<DiscoveryJob> {
    const response = await apiClient.post<DiscoveryJob>('/discovery/trigger', {
      provider,
      config,
    });
    return response.data;
  }

  // Discovery Schedules
  async getDiscoverySchedules(): Promise<DiscoverySchedule[]> {
    const response = await apiClient.get<DiscoverySchedule[]>('/discovery/schedules');
    return response.data;
  }

  async createDiscoverySchedule(
    schedule: Partial<DiscoverySchedule>
  ): Promise<DiscoverySchedule> {
    const response = await apiClient.post<DiscoverySchedule>('/discovery/schedules', schedule);
    return response.data;
  }

  async updateDiscoverySchedule(
    scheduleId: string,
    updates: Partial<DiscoverySchedule>
  ): Promise<DiscoverySchedule> {
    const response = await apiClient.patch<DiscoverySchedule>(
      `/discovery/schedules/${scheduleId}`,
      updates
    );
    return response.data;
  }

  async deleteDiscoverySchedule(scheduleId: string): Promise<void> {
    await apiClient.delete(`/discovery/schedules/${scheduleId}`);
  }

  // Dashboard
  async getDashboardStats(): Promise<any> {
    const response = await apiClient.get('/dashboard/stats');
    return response.data;
  }

  // Users (Admin)
  async getUsers(pagination?: PaginationOptions): Promise<PaginatedResponse<User>> {
    const params = {
      page: pagination?.page,
      limit: pagination?.limit,
    };
    const response = await apiClient.get<PaginatedResponse<User>>('/users', { params });
    return response.data;
  }

  async createUser(user: Partial<User>): Promise<User> {
    const response = await apiClient.post<User>('/users', user);
    return response.data;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const response = await apiClient.patch<User>(`/users/${userId}`, updates);
    return response.data;
  }

  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete(`/users/${userId}`);
  }
}

// Export singleton instance
export const api = new ApiService();

// Export axios instance for custom requests
export { apiClient };

// Export types
export type { AxiosError, AxiosRequestConfig, AxiosResponse };
