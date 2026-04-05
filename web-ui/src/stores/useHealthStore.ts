// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Health Metrics Store - Zustand
 */

import { create } from 'zustand';
import { MetricsSummary, HealthStatus } from '../types';

interface HealthState {
  metrics: MetricsSummary | null;
  services: HealthStatus[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setMetrics: (metrics: MetricsSummary) => void;
  setServices: (services: HealthStatus[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useHealthStore = create<HealthState>((set) => ({
  metrics: null,
  services: [],
  isLoading: false,
  error: null,

  setMetrics: (metrics) => set({ metrics }),
  setServices: (services) => set({ services }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      metrics: null,
      services: [],
      isLoading: false,
      error: null,
    }),
}));
