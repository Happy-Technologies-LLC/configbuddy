// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Configuration Drift API endpoints
 */

import { apiClient } from '../lib/api-client';
import { DriftDetectionResult, BaselineSnapshot } from '../types';

export const driftApi = {
  // Detect drift for a CI
  detect: (ciId: string) =>
    apiClient.post<DriftDetectionResult>(`/drift/detect/${ciId}`),

  // Get drift history
  getHistory: (ciId: string, limit = 50) =>
    apiClient.get<DriftDetectionResult[]>(`/drift/history/${ciId}`, {
      params: { limit },
    }),

  // Create baseline
  createBaseline: (
    ciId: string,
    snapshotType: 'configuration' | 'performance' | 'relationships',
    createdBy = 'user'
  ) =>
    apiClient.post<BaselineSnapshot>('/drift/baseline', {
      ci_id: ciId,
      snapshot_type: snapshotType,
      created_by: createdBy,
    }),

  // Approve baseline
  approveBaseline: (baselineId: string, approvedBy: string) =>
    apiClient.post<BaselineSnapshot>(`/drift/baseline/${baselineId}/approve`, {
      approved_by: approvedBy,
    }),

  // Get approved baseline
  getApprovedBaseline: (
    ciId: string,
    snapshotType: 'configuration' | 'performance' | 'relationships'
  ) =>
    apiClient.get<BaselineSnapshot | null>(`/drift/baseline/${ciId}`, {
      params: { snapshot_type: snapshotType },
    }),
};
