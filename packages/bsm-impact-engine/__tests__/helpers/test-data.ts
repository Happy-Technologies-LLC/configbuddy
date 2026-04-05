// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Test Data Helpers for BSM Impact Engine
 */

import { UnifiedCI } from '@cmdb/unified-model';

export const mockCI = (overrides?: Partial<UnifiedCI>): UnifiedCI => ({
  ci_id: 'test-ci-001',
  ci_name: 'Test Server',
  ci_type: 'server',
  ci_status: 'active',
  environment: 'production',
  discovered_at: new Date('2024-01-01'),
  last_seen: new Date('2024-01-15'),
  source: 'test',
  confidence_score: 0.95,
  metadata: {},
  ...overrides,
});

export const mockBusinessService = () => ({
  service_id: 'biz-svc-001',
  service_name: 'Online Banking',
  criticality: 'critical' as const,
  revenue_impact_per_hour: 50000,
  users_affected: 100000,
  compliance_requirements: ['PCI-DSS', 'SOX'],
});

export const mockImpactMetrics = () => ({
  revenue_impact: 50000,
  user_impact: 100000,
  compliance_impact: 'high' as const,
  operational_impact: 'high' as const,
});

export const mockDependencyGraph = () => ({
  nodes: [
    { id: 'ci-001', label: 'Web Server', type: 'server' },
    { id: 'ci-002', label: 'Database', type: 'database' },
    { id: 'ci-003', label: 'Load Balancer', type: 'load-balancer' },
  ],
  edges: [
    { from: 'ci-001', to: 'ci-002', type: 'DEPENDS_ON' },
    { from: 'ci-003', to: 'ci-001', type: 'ROUTES_TO' },
  ],
});
