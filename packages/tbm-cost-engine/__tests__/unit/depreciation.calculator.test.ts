/**
 * Unit Tests for Depreciation Calculator
 */

import { calculateDepreciation, calculateMonthlyDepreciation } from '../../src/calculators/depreciation.calculator';
import { DepreciationMethod } from '../../src/types/tbm-types';
import { DepreciationSchedule } from '../../src/types/cost-types';

describe('Depreciation Calculator', () => {
  describe('calculateDepreciation', () => {
    describe('straight-line method', () => {
      it('should calculate correct straight-line depreciation', () => {
        const schedule: DepreciationSchedule = {
          purchaseDate: new Date('2023-01-01'),
          purchasePrice: 36000,
          method: DepreciationMethod.STRAIGHT_LINE,
          depreciationYears: 3,
          residualValue: 0,
        };

        // Calculate as of 12 months later
        const asOfDate = new Date('2024-01-01');
        const result = calculateDepreciation('ci-001', schedule, asOfDate);

        expect(result.monthlyDepreciation).toBe(1000); // 36000 / 36 months
        expect(result.accumulatedDepreciation).toBe(12000); // 12 months * 1000
        expect(result.currentBookValue).toBe(24000); // 36000 - 12000
        expect(result.remainingLife).toBe(24); // 24 months remaining
        expect(result.isFullyDepreciated).toBe(false);
      });

      it('should handle residual value correctly', () => {
        const schedule: DepreciationSchedule = {
          purchaseDate: new Date('2023-01-01'),
          purchasePrice: 36000,
          method: DepreciationMethod.STRAIGHT_LINE,
          depreciationYears: 3,
          residualValue: 3600, // 10% residual
        };

        const asOfDate = new Date('2024-01-01');
        const result = calculateDepreciation('ci-002', schedule, asOfDate);

        const depreciableAmount = 36000 - 3600; // 32400
        expect(result.monthlyDepreciation).toBe(900); // 32400 / 36 months
        expect(result.accumulatedDepreciation).toBe(10800); // 12 months * 900
        expect(result.currentBookValue).toBe(25200); // 36000 - 10800
      });

      it('should mark asset as fully deprecated after useful life', () => {
        const schedule: DepreciationSchedule = {
          purchaseDate: new Date('2020-01-01'),
          purchasePrice: 36000,
          method: DepreciationMethod.STRAIGHT_LINE,
          depreciationYears: 3,
          residualValue: 0,
        };

        // Calculate as of 4 years later (beyond useful life)
        const asOfDate = new Date('2024-01-01');
        const result = calculateDepreciation('ci-003', schedule, asOfDate);

        expect(result.accumulatedDepreciation).toBe(36000); // Fully depreciated
        expect(result.currentBookValue).toBe(0);
        expect(result.remainingLife).toBe(0);
        expect(result.isFullyDepreciated).toBe(true);
        expect(result.monthlyDepreciation).toBe(0); // No more depreciation
      });

      it('should handle asset purchased today', () => {
        const today = new Date();
        const schedule: DepreciationSchedule = {
          purchaseDate: today,
          purchasePrice: 12000,
          method: DepreciationMethod.STRAIGHT_LINE,
          depreciationYears: 2,
          residualValue: 0,
        };

        const result = calculateDepreciation('ci-004', schedule, today);

        expect(result.accumulatedDepreciation).toBe(0);
        expect(result.currentBookValue).toBe(12000);
        expect(result.monthlyDepreciation).toBe(500); // 12000 / 24 months
        expect(result.remainingLife).toBe(24);
      });
    });

    describe('declining-balance method', () => {
      it('should calculate correct declining balance depreciation', () => {
        const schedule: DepreciationSchedule = {
          purchaseDate: new Date('2023-01-01'),
          purchasePrice: 36000,
          method: DepreciationMethod.DECLINING_BALANCE,
          depreciationYears: 3,
          residualValue: 0,
        };

        // Calculate as of 12 months later
        const asOfDate = new Date('2024-01-01');
        const result = calculateDepreciation('ci-005', schedule, asOfDate);

        // Double-declining balance: 2/3 = 66.67% annual rate = 5.56% monthly rate
        expect(result.accumulatedDepreciation).toBeGreaterThan(0);
        expect(result.currentBookValue).toBeLessThan(36000);
        expect(result.currentBookValue).toBeGreaterThan(0);
        expect(result.isFullyDepreciated).toBe(false);
      });

      it('should not depreciate below residual value', () => {
        const schedule: DepreciationSchedule = {
          purchaseDate: new Date('2020-01-01'),
          purchasePrice: 36000,
          method: DepreciationMethod.DECLINING_BALANCE,
          depreciationYears: 3,
          residualValue: 3600,
        };

        // Calculate as of 4 years later
        const asOfDate = new Date('2024-01-01');
        const result = calculateDepreciation('ci-006', schedule, asOfDate);

        expect(result.currentBookValue).toBeGreaterThanOrEqual(3600);
        expect(result.accumulatedDepreciation).toBeLessThanOrEqual(32400); // 36000 - 3600
      });

      it('should have higher initial depreciation than straight-line', () => {
        const straightLineSchedule: DepreciationSchedule = {
          purchaseDate: new Date('2023-01-01'),
          purchasePrice: 36000,
          method: DepreciationMethod.STRAIGHT_LINE,
          depreciationYears: 3,
          residualValue: 0,
        };

        const decliningSchedule: DepreciationSchedule = {
          ...straightLineSchedule,
          method: DepreciationMethod.DECLINING_BALANCE,
        };

        const asOfDate = new Date('2024-01-01');
        const slResult = calculateDepreciation('ci-007', straightLineSchedule, asOfDate);
        const dbResult = calculateDepreciation('ci-008', decliningSchedule, asOfDate);

        // Declining balance should have more depreciation in first year
        expect(dbResult.accumulatedDepreciation).toBeGreaterThan(slResult.accumulatedDepreciation);
      });
    });

    describe('edge cases', () => {
      it('should handle zero purchase price', () => {
        const schedule: DepreciationSchedule = {
          purchaseDate: new Date('2023-01-01'),
          purchasePrice: 0,
          method: DepreciationMethod.STRAIGHT_LINE,
          depreciationYears: 3,
          residualValue: 0,
        };

        const result = calculateDepreciation('ci-009', schedule);

        expect(result.monthlyDepreciation).toBe(0);
        expect(result.currentBookValue).toBe(0);
        expect(result.accumulatedDepreciation).toBe(0);
      });

      it('should handle very short depreciation period', () => {
        const schedule: DepreciationSchedule = {
          purchaseDate: new Date('2024-01-01'),
          purchasePrice: 12000,
          method: DepreciationMethod.STRAIGHT_LINE,
          depreciationYears: 1,
          residualValue: 0,
        };

        const result = calculateDepreciation('ci-010', schedule);

        expect(result.monthlyDepreciation).toBe(1000); // 12000 / 12 months
        expect(result.remainingLife).toBe(12);
      });

      it('should handle very long depreciation period', () => {
        const schedule: DepreciationSchedule = {
          purchaseDate: new Date('2024-01-01'),
          purchasePrice: 120000,
          method: DepreciationMethod.STRAIGHT_LINE,
          depreciationYears: 10,
          residualValue: 0,
        };

        const result = calculateDepreciation('ci-011', schedule);

        expect(result.monthlyDepreciation).toBe(1000); // 120000 / 120 months
        expect(result.remainingLife).toBe(120);
      });

      it('should handle residual value equal to purchase price', () => {
        const schedule: DepreciationSchedule = {
          purchaseDate: new Date('2023-01-01'),
          purchasePrice: 36000,
          method: DepreciationMethod.STRAIGHT_LINE,
          depreciationYears: 3,
          residualValue: 36000, // No depreciation
        };

        const result = calculateDepreciation('ci-012', schedule);

        expect(result.monthlyDepreciation).toBe(0);
        expect(result.accumulatedDepreciation).toBe(0);
        expect(result.currentBookValue).toBe(36000);
      });

      it('should round cents correctly', () => {
        const schedule: DepreciationSchedule = {
          purchaseDate: new Date('2023-01-01'),
          purchasePrice: 10000,
          method: DepreciationMethod.STRAIGHT_LINE,
          depreciationYears: 3,
          residualValue: 0,
        };

        const result = calculateDepreciation('ci-013', schedule);

        // All monetary values should be rounded to 2 decimal places
        expect(Number.isInteger(result.monthlyDepreciation * 100)).toBe(true);
        expect(Number.isInteger(result.currentBookValue * 100)).toBe(true);
        expect(Number.isInteger(result.accumulatedDepreciation * 100)).toBe(true);
      });
    });
  });

  describe('calculateMonthlyDepreciation', () => {
    it('should calculate monthly depreciation amount', () => {
      const monthly = calculateMonthlyDepreciation(36000, 3, 0);

      expect(monthly).toBe(1000); // 36000 / 36 months
    });

    it('should handle residual value', () => {
      const monthly = calculateMonthlyDepreciation(36000, 3, 3600);

      expect(monthly).toBe(900); // (36000 - 3600) / 36 months
    });

    it('should handle zero purchase price', () => {
      const monthly = calculateMonthlyDepreciation(0, 3, 0);

      expect(monthly).toBe(0);
    });

    it('should handle 1 year depreciation', () => {
      const monthly = calculateMonthlyDepreciation(12000, 1, 0);

      expect(monthly).toBe(1000); // 12000 / 12 months
    });

    it('should return 0 when residual equals purchase price', () => {
      const monthly = calculateMonthlyDepreciation(36000, 3, 36000);

      expect(monthly).toBe(0);
    });
  });

  describe('depreciation consistency', () => {
    it('should have accumulated = monthly * months for straight-line', () => {
      const schedule: DepreciationSchedule = {
        purchaseDate: new Date('2023-01-01'),
        purchasePrice: 36000,
        method: DepreciationMethod.STRAIGHT_LINE,
        depreciationYears: 3,
        residualValue: 0,
      };

      const asOfDate = new Date('2023-07-01'); // 6 months later
      const result = calculateDepreciation('ci-014', schedule, asOfDate);

      const expectedAccumulated = result.monthlyDepreciation * 6;
      expect(result.accumulatedDepreciation).toBeCloseTo(expectedAccumulated, 2);
    });

    it('should have current book value = purchase price - accumulated', () => {
      const schedule: DepreciationSchedule = {
        purchaseDate: new Date('2023-01-01'),
        purchasePrice: 36000,
        method: DepreciationMethod.STRAIGHT_LINE,
        depreciationYears: 3,
        residualValue: 3600,
      };

      const asOfDate = new Date('2024-01-01');
      const result = calculateDepreciation('ci-015', schedule, asOfDate);

      const expectedBookValue = schedule.purchasePrice - result.accumulatedDepreciation;
      expect(result.currentBookValue).toBeCloseTo(expectedBookValue, 2);
    });
  });
});
