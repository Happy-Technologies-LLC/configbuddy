// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Analytics API Service
 * Handles all analytics and reporting API calls
 */

import { apiClient } from './api';

export interface DashboardStats {
  totalCIs: number;
  activeCIs: number;
  totalRelationships: number;
  discoveryJobsToday: number;
  healthScore: number;
}

export interface CICountByType {
  ci_type: string;
  count: number;
}

export interface CICountByStatus {
  status: string;
  count: number;
}

export interface CICountByEnvironment {
  environment: string;
  count: number;
}

export interface DiscoveryStats {
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  successRate: number;
  avgDuration: number;
  lastRunTime?: string;
}

export interface TopConnectedCI {
  ci_id: string;
  ci_name: string;
  ci_type: string;
  connection_count: number;
}

export interface RelationshipMatrix {
  source_type: string;
  target_type: string;
  relationship_type: string;
  count: number;
}

export interface ChangeTimelinePoint {
  date: string;
  created: number;
  updated: number;
  deleted: number;
}

export interface HealthMetric {
  timestamp: string;
  cpu_usage?: number;
  memory_usage?: number;
  disk_usage?: number;
  network_latency?: number;
  status: string;
}

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

class AnalyticsService {
  /**
   * Get dashboard summary statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiClient.get<DashboardStats>('/analytics/dashboard');
    return response.data;
  }

  /**
   * Get CI counts grouped by type
   */
  async getCICountsByType(): Promise<CICountByType[]> {
    const response = await apiClient.get<CICountByType[]>('/analytics/ci-counts/by-type');
    return response.data;
  }

  /**
   * Get CI counts grouped by status
   */
  async getCICountsByStatus(): Promise<CICountByStatus[]> {
    const response = await apiClient.get<CICountByStatus[]>('/analytics/ci-counts/by-status');
    return response.data;
  }

  /**
   * Get CI counts grouped by environment
   */
  async getCICountsByEnvironment(): Promise<CICountByEnvironment[]> {
    const response = await apiClient.get<CICountByEnvironment[]>('/analytics/ci-counts/by-environment');
    return response.data;
  }

  /**
   * Get discovery job statistics
   */
  async getDiscoveryStats(params?: DateRangeParams): Promise<DiscoveryStats> {
    const response = await apiClient.get<DiscoveryStats>('/analytics/discovery-stats', {
      params,
    });
    return response.data;
  }

  /**
   * Get top N most connected CIs
   */
  async getTopConnectedCIs(limit: number = 10): Promise<TopConnectedCI[]> {
    const response = await apiClient.get<TopConnectedCI[]>('/analytics/top-connected', {
      params: { limit },
    });
    return response.data;
  }

  /**
   * Get relationship type matrix
   */
  async getRelationshipMatrix(): Promise<RelationshipMatrix[]> {
    const response = await apiClient.get<RelationshipMatrix[]>('/analytics/relationship-matrix');
    return response.data;
  }

  /**
   * Get change timeline data
   */
  async getChangeTimeline(params?: DateRangeParams): Promise<ChangeTimelinePoint[]> {
    const response = await apiClient.get<ChangeTimelinePoint[]>('/analytics/change-timeline', {
      params,
    });
    return response.data;
  }

  /**
   * Get health metrics for a specific CI
   */
  async getHealthMetrics(ciId: string, params?: DateRangeParams): Promise<HealthMetric[]> {
    const response = await apiClient.get<HealthMetric[]>(`/analytics/health-metrics/${ciId}`, {
      params,
    });
    return response.data;
  }

  /**
   * Export analytics data to CSV
   */
  async exportToCSV(data: any[], filename: string): Promise<void> {
    const csv = this.convertToCSV(data);
    this.downloadFile(csv, filename, 'text/csv');
  }

  /**
   * Export analytics data to JSON
   */
  async exportToJSON(data: any[], filename: string): Promise<void> {
    const json = JSON.stringify(data, null, 2);
    this.downloadFile(json, filename, 'application/json');
  }

  /**
   * Convert array of objects to CSV format
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Add header row
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of data) {
      const values = headers.map((header) => {
        const value = row[header];
        // Escape commas and quotes
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Trigger file download in browser
   */
  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const analyticsService = new AnalyticsService();
