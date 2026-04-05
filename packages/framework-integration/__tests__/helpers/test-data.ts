// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Test Data Helpers for Framework Integration
 */

export const mockEnrichedCI = () => ({
  // Core CI data
  ci_id: 'ci-001',
  ci_name: 'Production Database',
  ci_type: 'database',
  ci_status: 'active',
  environment: 'production',

  // BSM enrichment
  bsm: {
    criticality_score: 9.5,
    business_services: ['banking-app', 'mobile-app'],
    blast_radius: 45,
    risk_rating: 'critical',
  },

  // TBM enrichment
  tbm: {
    tower: 'Data',
    monthly_cost: 5000,
    cost_allocation: {
      'banking-app': 3000,
      'mobile-app': 2000,
    },
    depreciation: {
      method: 'straight-line',
      current_value: 40000,
      remaining_life_months: 36,
    },
  },

  // ITIL enrichment
  itil: {
    change_freeze: false,
    last_baseline: new Date('2024-01-01'),
    open_incidents: 0,
    mtbf: 720, // hours
    mttr: 2, // hours
  },
});

export const mockKPIs = () => ({
  availability: 99.95,
  performance: 95.5,
  cost_efficiency: 85.0,
  change_success_rate: 98.5,
  incident_resolution_time: 2.5,
});

export const mockFrameworkConfig = () => ({
  bsm_enabled: true,
  tbm_enabled: true,
  itil_enabled: true,
  enrichment_parallel: true,
  cache_ttl: 300,
});
