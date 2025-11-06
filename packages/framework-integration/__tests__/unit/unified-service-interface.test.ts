/**
 * Unit Tests for Unified Service Interface
 */

import { UnifiedServiceInterface } from '../../src/unified-service-interface';

describe('UnifiedServiceInterface', () => {
  let service: UnifiedServiceInterface;

  beforeEach(() => {
    service = new UnifiedServiceInterface();
  });

  describe('enrichCI', () => {
    it('should enrich CI with all framework data', async () => {
      const ci = {
        ci_id: 'ci-001',
        ci_name: 'Production Database',
        ci_type: 'database',
        ci_status: 'active',
        environment: 'production',
      };

      const result = await service.enrichCI(ci);

      expect(result).toBeDefined();
      expect(result.ci_id).toBe('ci-001');

      // Should have BSM enrichment
      expect(result.bsm).toBeDefined();
      expect(result.bsm.criticality_score).toBeGreaterThanOrEqual(0);

      // Should have TBM enrichment
      expect(result.tbm).toBeDefined();
      expect(result.tbm.tower).toBeDefined();
      expect(result.tbm.monthly_cost).toBeGreaterThanOrEqual(0);

      // Should have ITIL enrichment
      expect(result.itil).toBeDefined();
      expect(result.itil.mtbf).toBeGreaterThanOrEqual(0);
    });

    it('should handle enrichment in parallel mode', async () => {
      const ci = {
        ci_id: 'ci-002',
        ci_name: 'Web Server',
        ci_type: 'server',
        ci_status: 'active',
        environment: 'production',
      };

      const startTime = Date.now();
      const result = await service.enrichCI(ci, { parallel: true });
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should be faster in parallel
    });

    it('should handle partial enrichment on framework failure', async () => {
      const ci = {
        ci_id: 'ci-003',
        ci_name: 'Test CI',
        ci_type: 'unknown-type',
        ci_status: 'active',
        environment: 'test',
      };

      const result = await service.enrichCI(ci, { continueOnError: true });

      expect(result).toBeDefined();
      expect(result.ci_id).toBe('ci-003');

      // At least some enrichment should succeed
      const hasEnrichment = result.bsm || result.tbm || result.itil;
      expect(hasEnrichment).toBeTruthy();
    });

    it('should apply selective enrichment when frameworks specified', async () => {
      const ci = {
        ci_id: 'ci-004',
        ci_name: 'App Server',
        ci_type: 'server',
        ci_status: 'active',
        environment: 'production',
      };

      const result = await service.enrichCI(ci, {
        frameworks: ['bsm', 'tbm'], // Only BSM and TBM
      });

      expect(result.bsm).toBeDefined();
      expect(result.tbm).toBeDefined();
      expect(result.itil).toBeUndefined(); // Not requested
    });
  });

  describe('calculateKPIs', () => {
    it('should calculate comprehensive KPIs', async () => {
      const ciIds = ['ci-001', 'ci-002', 'ci-003'];

      const result = await service.calculateKPIs(ciIds);

      expect(result).toBeDefined();
      expect(result.availability).toBeGreaterThanOrEqual(0);
      expect(result.availability).toBeLessThanOrEqual(100);
      expect(result.performance).toBeDefined();
      expect(result.cost_efficiency).toBeDefined();
      expect(result.change_success_rate).toBeDefined();
    });

    it('should calculate availability KPI correctly', async () => {
      const ciIds = ['ci-high-availability'];

      const result = await service.calculateKPIs(ciIds);

      expect(result.availability).toBeGreaterThan(99);
    });

    it('should calculate cost efficiency KPI', async () => {
      const ciIds = ['ci-cost-efficient'];

      const result = await service.calculateKPIs(ciIds);

      expect(result.cost_efficiency).toBeGreaterThanOrEqual(0);
      expect(result.cost_efficiency).toBeLessThanOrEqual(100);
    });

    it('should handle empty CI list', async () => {
      const result = await service.calculateKPIs([]);

      expect(result).toBeDefined();
      expect(result.availability).toBe(0);
      expect(result.cost_efficiency).toBe(0);
    });
  });

  describe('getUnifiedDashboard', () => {
    it('should return unified dashboard data', async () => {
      const ciIds = ['ci-001', 'ci-002', 'ci-003'];

      const result = await service.getUnifiedDashboard(ciIds);

      expect(result).toBeDefined();
      expect(result.kpis).toBeDefined();
      expect(result.topRisks).toBeDefined();
      expect(result.costBreakdown).toBeDefined();
      expect(result.criticalServices).toBeDefined();
    });

    it('should include top risk CIs', async () => {
      const ciIds = ['ci-high-risk', 'ci-low-risk'];

      const result = await service.getUnifiedDashboard(ciIds);

      expect(result.topRisks).toBeDefined();
      expect(Array.isArray(result.topRisks)).toBe(true);
      expect(result.topRisks.length).toBeGreaterThanOrEqual(0);
    });

    it('should include cost breakdown by tower', async () => {
      const ciIds = ['ci-compute', 'ci-storage', 'ci-network'];

      const result = await service.getUnifiedDashboard(ciIds);

      expect(result.costBreakdown).toBeDefined();
      expect(result.costBreakdown.byTower).toBeDefined();
      expect(result.costBreakdown.total).toBeGreaterThanOrEqual(0);
    });

    it('should identify critical services', async () => {
      const ciIds = ['ci-tier0', 'ci-tier1', 'ci-tier4'];

      const result = await service.getUnifiedDashboard(ciIds);

      expect(result.criticalServices).toBeDefined();
      expect(Array.isArray(result.criticalServices)).toBe(true);
    });
  });

  describe('batch operations', () => {
    it('should enrich multiple CIs efficiently', async () => {
      const cis = Array.from({ length: 10 }, (_, i) => ({
        ci_id: `ci-${i}`,
        ci_name: `CI ${i}`,
        ci_type: 'server',
        ci_status: 'active',
        environment: 'production',
      }));

      const startTime = Date.now();
      const results = await service.batchEnrichCIs(cis);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(10);
      expect(duration).toBeLessThan(10000); // Should complete in <10 seconds
    });

    it('should handle partial failures in batch operations', async () => {
      const cis = [
        { ci_id: 'ci-valid', ci_name: 'Valid', ci_type: 'server', ci_status: 'active', environment: 'production' },
        { ci_id: 'ci-invalid', ci_name: 'Invalid', ci_type: null as any, ci_status: 'active', environment: 'production' },
        { ci_id: 'ci-valid2', ci_name: 'Valid 2', ci_type: 'database', ci_status: 'active', environment: 'production' },
      ];

      const results = await service.batchEnrichCIs(cis, { continueOnError: true });

      expect(results.length).toBeGreaterThan(0); // Should have some successes
    });
  });

  describe('caching', () => {
    it('should cache enrichment results', async () => {
      const ci = {
        ci_id: 'ci-cached',
        ci_name: 'Cached CI',
        ci_type: 'server',
        ci_status: 'active',
        environment: 'production',
      };

      // First call - should hit database
      const result1 = await service.enrichCI(ci, { useCache: true });

      // Second call - should hit cache
      const startTime = Date.now();
      const result2 = await service.enrichCI(ci, { useCache: true });
      const duration = Date.now() - startTime;

      expect(result1.ci_id).toBe(result2.ci_id);
      expect(duration).toBeLessThan(100); // Cache hit should be very fast
    });

    it('should bypass cache when disabled', async () => {
      const ci = {
        ci_id: 'ci-no-cache',
        ci_name: 'No Cache CI',
        ci_type: 'server',
        ci_status: 'active',
        environment: 'production',
      };

      const result1 = await service.enrichCI(ci, { useCache: false });
      const result2 = await service.enrichCI(ci, { useCache: false });

      // Results should be independent
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle invalid CI data gracefully', async () => {
      const invalidCI = {
        ci_id: null,
        ci_name: '',
        ci_type: 'invalid',
      } as any;

      await expect(service.enrichCI(invalidCI)).rejects.toThrow();
    });

    it('should throw error when framework fails and continueOnError is false', async () => {
      const ci = {
        ci_id: 'ci-fail',
        ci_name: 'Failing CI',
        ci_type: 'server',
        ci_status: 'active',
        environment: 'production',
      };

      // Mock a framework failure
      jest.spyOn(service as any, 'enrichWithBSM').mockRejectedValue(new Error('BSM failure'));

      await expect(service.enrichCI(ci, { continueOnError: false })).rejects.toThrow();
    });
  });
});
