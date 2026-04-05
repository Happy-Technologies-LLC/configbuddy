// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Test Data Helpers for TBM Cost Engine
 */

import { CostPool, TowerType, CostDriver } from '../../src/types/tbm-types';

export const mockCostPool = (overrides?: Partial<CostPool>): CostPool => ({
  pool_id: 'pool-001',
  pool_name: 'Compute Infrastructure',
  tower: 'Compute',
  total_cost: 100000,
  period_start: new Date('2024-01-01'),
  period_end: new Date('2024-01-31'),
  cost_breakdown: {
    hardware: 50000,
    software: 30000,
    labor: 20000,
  },
  ...overrides,
});

export const mockAsset = () => ({
  asset_id: 'asset-001',
  asset_name: 'Database Server',
  ci_type: 'server',
  acquisition_cost: 50000,
  acquisition_date: new Date('2023-01-01'),
  useful_life_years: 5,
  depreciation_method: 'straight-line' as const,
  current_value: 40000,
});

export const mockCloudCost = () => ({
  cloud_provider: 'aws' as const,
  account_id: '123456789012',
  service: 'EC2',
  region: 'us-east-1',
  cost: 5000,
  usage_quantity: 730,
  usage_unit: 'hours',
  period_start: new Date('2024-01-01'),
  period_end: new Date('2024-01-31'),
});

export const mockTowerMapping = () => ({
  ci_type: 'server',
  tower: 'Compute' as TowerType,
  sub_tower: 'Servers',
  cost_category: 'Infrastructure',
});

export const mockCostDriver = (): CostDriver => ({
  driver_id: 'driver-001',
  driver_name: 'CPU Hours',
  driver_type: 'usage',
  unit: 'hours',
  cost_per_unit: 0.10,
});
