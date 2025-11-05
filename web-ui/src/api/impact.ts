/**
 * Impact Prediction API endpoints
 */

import { apiClient } from '../lib/api-client';
import { ImpactAnalysis, DependencyGraph } from '../types';

export const impactApi = {
  // Predict change impact
  predict: (ciId: string, changeType: string) =>
    apiClient.post<ImpactAnalysis>('/impact/predict', {
      ci_id: ciId,
      change_type: changeType,
    }),

  // Get dependency graph
  getGraph: (rootCiId: string, maxDepth = 3) =>
    apiClient.get<DependencyGraph>(`/impact/graph/${rootCiId}`, {
      params: { max_depth: maxDepth },
    }),

  // Get CI criticality score
  getCriticalityScore: (ciId: string) =>
    apiClient.get<{
      ci_id: string;
      ci_name: string;
      criticality_score: number;
      factors: Record<string, any>;
      calculated_at: string;
    }>(`/impact/criticality/${ciId}`),

  // Get impact analysis history
  getHistory: (ciId: string, limit = 20) =>
    apiClient.get<ImpactAnalysis[]>(`/impact/history/${ciId}`, {
      params: { limit },
    }),
};
