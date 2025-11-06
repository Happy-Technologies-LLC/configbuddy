/**
 * Integration Tests for Framework Integration
 * Tests end-to-end workflows combining BSM, TBM, and ITIL
 */

import { UnifiedServiceInterface } from '../../src/unified-service-interface';
import { ITILServiceManager } from '../../src/services/itil-service-manager';
import { BSMServiceManager } from '../../src/services/bsm-service-manager';
import { TBMServiceManager } from '../../src/services/tbm-service-manager';

describe('Framework Integration E2E', () => {
  let unifiedService: UnifiedServiceInterface;
  let itilManager: ITILServiceManager;
  let bsmManager: BSMServiceManager;
  let tbmManager: TBMServiceManager;

  beforeAll(() => {
    unifiedService = new UnifiedServiceInterface();
    itilManager = new ITILServiceManager();
    bsmManager = new BSMServiceManager();
    tbmManager = new TBMServiceManager();
  });

  describe('Complete CI Lifecycle', () => {
    it('should enrich CI through all frameworks', async () => {
      // Arrange: Create a new CI
      const newCI = {
        ci_id: 'ci-lifecycle-001',
        ci_name: 'Production Application Server',
        ci_type: 'server',
        ci_status: 'active',
        environment: 'production',
        discovered_at: new Date(),
        metadata: {
          cpu_cores: 16,
          memory_gb: 64,
          storage_gb: 500,
        },
      };

      // Act: Enrich through all frameworks
      const enrichedCI = await unifiedService.enrichCI(newCI);

      // Assert: Verify BSM enrichment
      expect(enrichedCI.bsm).toBeDefined();
      expect(enrichedCI.bsm.criticality_score).toBeGreaterThanOrEqual(0);
      expect(enrichedCI.bsm.blast_radius).toBeGreaterThanOrEqual(0);

      // Assert: Verify TBM enrichment
      expect(enrichedCI.tbm).toBeDefined();
      expect(enrichedCI.tbm.tower).toBeDefined();
      expect(enrichedCI.tbm.monthly_cost).toBeGreaterThanOrEqual(0);

      // Assert: Verify ITIL enrichment
      expect(enrichedCI.itil).toBeDefined();
      expect(enrichedCI.itil.mtbf).toBeGreaterThanOrEqual(0);
      expect(enrichedCI.itil.mttr).toBeGreaterThanOrEqual(0);
    });

    it('should propagate criticality changes through frameworks', async () => {
      // Arrange: CI with initial criticality
      const ci = {
        ci_id: 'ci-criticality-001',
        ci_name: 'E-commerce Database',
        ci_type: 'database',
        ci_status: 'active',
        environment: 'production',
      };

      // Act: Enrich initially
      const initialEnriched = await unifiedService.enrichCI(ci);

      // Update criticality via BSM
      await bsmManager.updateCriticality(ci.ci_id, 'tier_0');

      // Re-enrich to get updated data
      const updatedEnriched = await unifiedService.enrichCI(ci);

      // Assert: Criticality should propagate to other frameworks
      expect(updatedEnriched.bsm.criticality_score).toBeGreaterThan(initialEnriched.bsm.criticality_score);
      expect(updatedEnriched.itil.mttr).toBeLessThan(initialEnriched.itil.mttr); // Higher priority = faster recovery
    });
  });

  describe('Cross-Framework Dependencies', () => {
    it('should calculate impact considering all frameworks', async () => {
      // Arrange: High-value, high-cost, critical service
      const criticalCI = {
        ci_id: 'ci-critical-001',
        ci_name: 'Payment Processing Service',
        ci_type: 'application',
        ci_status: 'active',
        environment: 'production',
        metadata: {
          annual_revenue_supported: 100_000_000,
          customer_count: 1_000_000,
          monthly_cost: 50_000,
        },
      };

      // Act: Enrich and calculate unified metrics
      const enriched = await unifiedService.enrichCI(criticalCI);
      const dashboard = await unifiedService.getUnifiedDashboard([criticalCI.ci_id]);

      // Assert: Should appear as top risk and critical service
      expect(dashboard.criticalServices).toContainEqual(
        expect.objectContaining({ ci_id: criticalCI.ci_id })
      );
      expect(dashboard.topRisks.length).toBeGreaterThan(0);
    });

    it('should optimize costs based on usage and criticality', async () => {
      // Arrange: Over-provisioned low-criticality CI
      const overProvisionedCI = {
        ci_id: 'ci-optimize-001',
        ci_name: 'Development Server',
        ci_type: 'server',
        ci_status: 'active',
        environment: 'development',
        metadata: {
          cpu_cores: 32,
          memory_gb: 128,
          utilization: 15, // Low utilization
        },
      };

      // Act: Enrich and get optimization recommendations
      const enriched = await unifiedService.enrichCI(overProvisionedCI);

      // Assert: Should identify cost optimization opportunity
      expect(enriched.tbm.monthly_cost).toBeGreaterThan(1000);
      expect(enriched.bsm.criticality_score).toBeLessThan(50); // Low criticality
      // Low criticality + high cost + low utilization = optimization candidate
    });
  });

  describe('Incident Impact Analysis', () => {
    it('should calculate comprehensive incident impact', async () => {
      // Arrange: CI with incident
      const affectedCI = {
        ci_id: 'ci-incident-001',
        ci_name: 'Customer API',
        ci_type: 'application',
        ci_status: 'degraded',
        environment: 'production',
      };

      // Act: Enrich and analyze impact
      const enriched = await unifiedService.enrichCI(affectedCI);

      // Simulate incident
      const incidentImpact = await unifiedService.calculateIncidentImpact(affectedCI.ci_id, {
        severity: 'critical',
        startTime: new Date(),
        affectedServices: ['payment', 'checkout'],
      });

      // Assert: Should calculate multi-dimensional impact
      expect(incidentImpact.revenueImpactPerHour).toBeGreaterThan(0);
      expect(incidentImpact.customersAffected).toBeGreaterThan(0);
      expect(incidentImpact.blastRadius).toBeGreaterThan(0);
      expect(incidentImpact.slaBreachRisk).toBeDefined();
    });
  });

  describe('Cost Allocation with Business Context', () => {
    it('should allocate costs considering business criticality', async () => {
      // Arrange: Shared infrastructure with multiple consumers
      const sharedInfra = {
        ci_id: 'ci-shared-001',
        ci_name: 'Kubernetes Cluster',
        ci_type: 'infrastructure',
        ci_status: 'active',
        environment: 'production',
      };

      // Consumers with different criticality
      const consumers = [
        { ci_id: 'app-tier0', criticality: 'tier_0', usage: 100 },
        { ci_id: 'app-tier2', criticality: 'tier_2', usage: 50 },
        { ci_id: 'app-tier4', criticality: 'tier_4', usage: 25 },
      ];

      // Act: Allocate costs with criticality weighting
      const allocation = await tbmManager.allocateCostsWithPriority(
        sharedInfra.ci_id,
        10000, // $10k monthly cost
        consumers
      );

      // Assert: Higher criticality should get proportionally more cost
      const tier0Allocation = allocation.find((a: any) => a.consumer_id === 'app-tier0');
      const tier4Allocation = allocation.find((a: any) => a.consumer_id === 'app-tier4');

      expect(tier0Allocation.allocated_amount).toBeGreaterThan(tier4Allocation.allocated_amount);
    });
  });

  describe('Change Risk Assessment', () => {
    it('should assess change risk across all frameworks', async () => {
      // Arrange: Proposed change
      const targetCI = {
        ci_id: 'ci-change-001',
        ci_name: 'Core Database',
        ci_type: 'database',
        ci_status: 'active',
        environment: 'production',
      };

      const proposedChange = {
        change_id: 'chg-001',
        change_type: 'major_upgrade',
        description: 'Upgrade PostgreSQL 14 to 16',
        scheduled_start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      };

      // Act: Assess risk
      const enriched = await unifiedService.enrichCI(targetCI);
      const riskAssessment = await itilManager.assessChangeRisk(
        proposedChange.change_id,
        targetCI.ci_id,
        proposedChange
      );

      // Assert: Risk should consider BSM criticality, TBM cost, and ITIL history
      expect(riskAssessment.overallRisk).toBeDefined();
      expect(riskAssessment.factors).toBeDefined();
      expect(riskAssessment.factors.businessCriticality).toBeDefined();
      expect(riskAssessment.factors.financialImpact).toBeDefined();
      expect(riskAssessment.factors.changeHistory).toBeDefined();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large-scale enrichment efficiently', async () => {
      // Arrange: 100 CIs to enrich
      const cis = Array.from({ length: 100 }, (_, i) => ({
        ci_id: `ci-scale-${i}`,
        ci_name: `Server ${i}`,
        ci_type: 'server',
        ci_status: 'active',
        environment: 'production',
      }));

      // Act: Batch enrich
      const startTime = Date.now();
      const results = await unifiedService.batchEnrichCIs(cis, {
        parallel: true,
        batchSize: 10,
      });
      const duration = Date.now() - startTime;

      // Assert: Should complete in reasonable time
      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(30000); // <30 seconds for 100 CIs
    });

    it('should use caching to improve performance', async () => {
      const ci = {
        ci_id: 'ci-cache-001',
        ci_name: 'Cached Server',
        ci_type: 'server',
        ci_status: 'active',
        environment: 'production',
      };

      // First call - cache miss
      const start1 = Date.now();
      await unifiedService.enrichCI(ci, { useCache: true });
      const duration1 = Date.now() - start1;

      // Second call - cache hit
      const start2 = Date.now();
      await unifiedService.enrichCI(ci, { useCache: true });
      const duration2 = Date.now() - start2;

      // Assert: Cache hit should be significantly faster
      expect(duration2).toBeLessThan(duration1 * 0.2); // At least 5x faster
    });
  });

  describe('Real-time Updates', () => {
    it('should propagate updates across frameworks', async () => {
      // Arrange: CI that will be updated
      const ci = {
        ci_id: 'ci-realtime-001',
        ci_name: 'Live Application',
        ci_type: 'application',
        ci_status: 'active',
        environment: 'production',
      };

      // Act: Initial enrichment
      const initial = await unifiedService.enrichCI(ci);

      // Simulate cost update in TBM
      await tbmManager.updateCost(ci.ci_id, 15000); // Increase to $15k/month

      // Re-enrich to get updated data
      const updated = await unifiedService.enrichCI(ci, { useCache: false });

      // Assert: Update should reflect in unified view
      expect(updated.tbm.monthly_cost).toBeGreaterThan(initial.tbm.monthly_cost);
    });
  });
});
