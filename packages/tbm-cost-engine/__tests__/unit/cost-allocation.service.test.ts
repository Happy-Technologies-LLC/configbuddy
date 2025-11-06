/**
 * Unit Tests for Cost Allocation Service
 */

import { CostAllocationService } from '../../src/services/cost-allocation.service';
import { CostAllocationMethod, TBMResourceTower } from '../../src/types/tbm-types';
import { DirectCostItem } from '../../src/types/cost-types';

describe('CostAllocationService', () => {
  let service: CostAllocationService;

  beforeEach(() => {
    service = CostAllocationService.getInstance();
  });

  describe('allocateDirectCosts', () => {
    it('should allocate direct costs correctly', () => {
      const directCosts: DirectCostItem[] = [
        {
          ciId: 'ci-001',
          costType: 'purchase',
          amount: 36000,
          frequency: 'one_time',
          startDate: new Date('2024-01-01'),
        },
      ];

      const targets = [
        {
          targetId: 'app-001',
          targetType: 'application_service',
          targetName: 'E-commerce',
          allocatedAmount: 1000,
          allocationBasis: 'direct',
          allocationPercentage: 100,
        },
      ];

      const result = service.allocateDirectCosts('ci-001', 'Production Server', 'server', directCosts, targets);

      expect(result.ciId).toBe('ci-001');
      expect(result.ciName).toBe('Production Server');
      expect(result.allocationMethod).toBe(CostAllocationMethod.DIRECT);
      expect(result.allocatedTo).toHaveLength(1);
      expect(result.monthlyCost).toBeGreaterThan(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should calculate unallocated costs', () => {
      const directCosts: DirectCostItem[] = [
        {
          ciId: 'ci-002',
          costType: 'purchase',
          amount: 36000,
          frequency: 'one_time',
          startDate: new Date('2024-01-01'),
        },
        {
          ciId: 'ci-002',
          costType: 'maintenance',
          amount: 500,
          frequency: 'monthly',
          startDate: new Date('2024-01-01'),
        },
      ];

      const targets = [
        {
          targetId: 'app-001',
          targetType: 'application_service',
          targetName: 'App 1',
          allocatedAmount: 800,
          allocationBasis: 'direct',
          allocationPercentage: 50,
        },
      ];

      const result = service.allocateDirectCosts('ci-002', 'Database Server', 'database', directCosts, targets);

      expect(result.monthlyCost).toBeGreaterThan(800);
      expect(result.unallocatedCost).toBeGreaterThan(0);
      expect(result.unallocatedCost).toBe(result.monthlyCost - 800);
    });

    it('should include tower mapping information', () => {
      const directCosts: DirectCostItem[] = [
        {
          ciId: 'ci-003',
          costType: 'purchase',
          amount: 24000,
          frequency: 'one_time',
          startDate: new Date('2024-01-01'),
        },
      ];

      const targets = [
        {
          targetId: 'app-001',
          targetType: 'application_service',
          targetName: 'Web App',
          allocatedAmount: 500,
          allocationBasis: 'direct',
          allocationPercentage: 100,
        },
      ];

      const result = service.allocateDirectCosts('ci-003', 'Web Server', 'server', directCosts, targets);

      expect(result.tower).toBe(TBMResourceTower.COMPUTE);
      expect(result.subTower).toBeDefined();
      expect(result.costPool).toBeDefined();
    });

    it('should handle multiple allocation targets', () => {
      const directCosts: DirectCostItem[] = [
        {
          ciId: 'ci-004',
          costType: 'purchase',
          amount: 48000,
          frequency: 'one_time',
          startDate: new Date('2024-01-01'),
        },
      ];

      const targets = [
        {
          targetId: 'app-001',
          targetType: 'application_service',
          targetName: 'App 1',
          allocatedAmount: 600,
          allocationBasis: 'usage',
          allocationPercentage: 50,
        },
        {
          targetId: 'app-002',
          targetType: 'application_service',
          targetName: 'App 2',
          allocatedAmount: 400,
          allocationBasis: 'usage',
          allocationPercentage: 33,
        },
        {
          targetId: 'app-003',
          targetType: 'application_service',
          targetName: 'App 3',
          allocatedAmount: 200,
          allocationBasis: 'usage',
          allocationPercentage: 17,
        },
      ];

      const result = service.allocateDirectCosts('ci-004', 'Shared Server', 'server', directCosts, targets);

      expect(result.allocatedTo).toHaveLength(3);
      const totalAllocated = result.allocatedTo.reduce((sum, t) => sum + t.allocatedAmount, 0);
      expect(totalAllocated).toBe(1200);
      expect(result.unallocatedCost).toBeGreaterThan(0);
    });

    it('should handle zero-cost CIs', () => {
      const directCosts: DirectCostItem[] = [];

      const targets = [];

      const result = service.allocateDirectCosts('ci-005', 'Free Service', 'service', directCosts, targets);

      expect(result.monthlyCost).toBe(0);
      expect(result.unallocatedCost).toBe(0);
      expect(result.allocatedTo).toHaveLength(0);
    });

    it('should handle fully allocated costs', () => {
      const directCosts: DirectCostItem[] = [
        {
          ciId: 'ci-006',
          costType: 'license',
          amount: 1000,
          frequency: 'monthly',
          startDate: new Date('2024-01-01'),
        },
      ];

      const targets = [
        {
          targetId: 'app-001',
          targetType: 'application_service',
          targetName: 'App 1',
          allocatedAmount: 1000,
          allocationBasis: 'direct',
          allocationPercentage: 100,
        },
      ];

      const result = service.allocateDirectCosts('ci-006', 'Software License', 'license', directCosts, targets);

      expect(result.unallocatedCost).toBe(0);
    });
  });

  describe('allocateUsageBased', () => {
    it('should allocate costs based on usage metrics', () => {
      const consumers = [
        { consumerId: 'app-001', consumerName: 'App 1', usageMetric: 100 },
        { consumerId: 'app-002', consumerName: 'App 2', usageMetric: 50 },
        { consumerId: 'app-003', consumerName: 'App 3', usageMetric: 50 },
      ];

      const result = service.allocateUsageBased(
        'ci-007',
        'Database',
        'database',
        2000, // Total monthly cost
        consumers,
        'cpu_hours'
      );

      expect(result.allocationMethod).toBe(CostAllocationMethod.USAGE_BASED);
      expect(result.allocatedTo).toHaveLength(3);

      // App 1 should get 50% (100/200)
      expect(result.allocatedTo[0].allocationPercentage).toBeCloseTo(50, 1);
      expect(result.allocatedTo[0].allocatedAmount).toBeCloseTo(1000, 0);

      // App 2 and 3 should each get 25% (50/200)
      expect(result.allocatedTo[1].allocationPercentage).toBeCloseTo(25, 1);
      expect(result.allocatedTo[2].allocationPercentage).toBeCloseTo(25, 1);
    });

    it('should handle zero usage gracefully', () => {
      const consumers = [
        { consumerId: 'app-001', consumerName: 'App 1', usageMetric: 0 },
        { consumerId: 'app-002', consumerName: 'App 2', usageMetric: 0 },
      ];

      const result = service.allocateUsageBased(
        'ci-008',
        'Unused Resource',
        'server',
        1000,
        consumers,
        'cpu_hours'
      );

      // With zero usage, should fall back to equal split
      expect(result.allocatedTo).toHaveLength(2);
      expect(result.allocatedTo[0].allocationPercentage).toBeCloseTo(50, 1);
      expect(result.allocatedTo[1].allocationPercentage).toBeCloseTo(50, 1);
    });
  });

  describe('allocateEqualSplit', () => {
    it('should split costs equally among consumers', () => {
      const consumers = [
        { consumerId: 'app-001', consumerName: 'App 1' },
        { consumerId: 'app-002', consumerName: 'App 2' },
        { consumerId: 'app-003', consumerName: 'App 3' },
      ];

      const result = service.allocateEqualSplit('ci-009', 'Shared Infrastructure', 'infrastructure', 3000, consumers);

      expect(result.allocationMethod).toBe(CostAllocationMethod.EQUAL_SPLIT);
      expect(result.allocatedTo).toHaveLength(3);

      // Each should get exactly 1/3
      result.allocatedTo.forEach((target) => {
        expect(target.allocatedAmount).toBeCloseTo(1000, 0);
        expect(target.allocationPercentage).toBeCloseTo(33.33, 1);
      });

      expect(result.unallocatedCost).toBeCloseTo(0, 0);
    });

    it('should handle single consumer', () => {
      const consumers = [{ consumerId: 'app-001', consumerName: 'Single App' }];

      const result = service.allocateEqualSplit('ci-010', 'Dedicated Resource', 'server', 2000, consumers);

      expect(result.allocatedTo).toHaveLength(1);
      expect(result.allocatedTo[0].allocatedAmount).toBe(2000);
      expect(result.allocatedTo[0].allocationPercentage).toBe(100);
      expect(result.unallocatedCost).toBe(0);
    });

    it('should handle no consumers', () => {
      const consumers: any[] = [];

      const result = service.allocateEqualSplit('ci-011', 'Orphaned Resource', 'server', 1000, consumers);

      expect(result.allocatedTo).toHaveLength(0);
      expect(result.unallocatedCost).toBe(1000);
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = CostAllocationService.getInstance();
      const instance2 = CostAllocationService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('edge cases', () => {
    it('should handle very small costs', () => {
      const directCosts: DirectCostItem[] = [
        {
          ciId: 'ci-012',
          costType: 'maintenance',
          amount: 0.01,
          frequency: 'monthly',
          startDate: new Date('2024-01-01'),
        },
      ];

      const targets = [
        {
          targetId: 'app-001',
          targetType: 'application_service',
          targetName: 'App',
          allocatedAmount: 0.01,
          allocationBasis: 'direct',
          allocationPercentage: 100,
        },
      ];

      const result = service.allocateDirectCosts('ci-012', 'Tiny Cost', 'service', directCosts, targets);

      expect(result.monthlyCost).toBeCloseTo(0.01, 2);
    });

    it('should handle very large costs', () => {
      const directCosts: DirectCostItem[] = [
        {
          ciId: 'ci-013',
          costType: 'purchase',
          amount: 10_000_000,
          frequency: 'one_time',
          startDate: new Date('2024-01-01'),
        },
      ];

      const targets = [];

      const result = service.allocateDirectCosts('ci-013', 'Expensive System', 'mainframe', directCosts, targets);

      expect(result.monthlyCost).toBeGreaterThan(100000);
      expect(result.unallocatedCost).toBe(result.monthlyCost);
    });
  });
});
