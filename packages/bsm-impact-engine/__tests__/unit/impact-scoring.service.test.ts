// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Unit Tests for Impact Scoring Service
 */

import { ImpactScoringService } from '../../src/services/impact-scoring.service';
import { BusinessService } from '@cmdb/unified-model';

describe('ImpactScoringService', () => {
  let service: ImpactScoringService;

  beforeEach(() => {
    service = new ImpactScoringService();
  });

  describe('calculateImpactScore', () => {
    it('should calculate high impact score for critical service', () => {
      const businessService: Partial<BusinessService> = {
        id: 'svc-001',
        service_name: 'Core Banking System',
        bsm_attributes: {
          annual_revenue_supported: 100_000_000, // $100M
          customer_count: 1_000_000,
          transaction_volume_daily: 1_000_000,
          compliance_requirements: [
            { framework: 'PCI-DSS', compliance_status: 'compliant', last_audit: new Date() },
            { framework: 'SOX', compliance_status: 'compliant', last_audit: new Date() },
          ],
          data_sensitivity: 'confidential',
          business_criticality: 'tier_0',
        },
        itil_attributes: {
          service_type: 'customer-facing',
          sla_targets: { availability_percentage: 99.99 },
          incident_count_30d: 0,
          change_count_30d: 5,
          availability_30d: 99.99,
        },
      } as BusinessService;

      const result = service.calculateImpactScore(businessService);

      expect(result.totalScore).toBeGreaterThan(70);
      expect(result.components.revenue).toBeGreaterThan(30);
      expect(result.components.customers).toBeGreaterThan(20);
      expect(result.components.transactions).toBeGreaterThan(10);
      expect(result.revenueImpact).toBe(100_000_000);
      expect(result.customerImpact).toBe(1_000_000);
      expect(result.dataClassification).toBe('confidential');
    });

    it('should calculate medium impact score for standard service', () => {
      const businessService: Partial<BusinessService> = {
        id: 'svc-002',
        service_name: 'Customer Support Portal',
        bsm_attributes: {
          annual_revenue_supported: 5_000_000, // $5M
          customer_count: 50_000,
          transaction_volume_daily: 10_000,
          compliance_requirements: [],
          data_sensitivity: 'internal',
          business_criticality: 'tier_2',
        },
        itil_attributes: {
          service_type: 'customer-facing',
          sla_targets: { availability_percentage: 99.5 },
          incident_count_30d: 3,
          change_count_30d: 8,
          availability_30d: 99.7,
        },
      } as BusinessService;

      const result = service.calculateImpactScore(businessService);

      expect(result.totalScore).toBeGreaterThan(30);
      expect(result.totalScore).toBeLessThan(70);
    });

    it('should calculate low impact score for internal service', () => {
      const businessService: Partial<BusinessService> = {
        id: 'svc-003',
        service_name: 'Internal Wiki',
        bsm_attributes: {
          annual_revenue_supported: 0,
          customer_count: 0,
          transaction_volume_daily: 0,
          compliance_requirements: [],
          data_sensitivity: 'public',
          business_criticality: 'tier_4',
        },
        itil_attributes: {
          service_type: 'internal',
          sla_targets: { availability_percentage: 99.0 },
          incident_count_30d: 1,
          change_count_30d: 2,
          availability_30d: 99.5,
        },
      } as BusinessService;

      const result = service.calculateImpactScore(businessService);

      expect(result.totalScore).toBeLessThan(30);
      expect(result.components.revenue).toBe(0);
      expect(result.components.customers).toBe(0);
      expect(result.components.transactions).toBe(0);
    });

    it('should include compliance score for regulated services', () => {
      const businessService: Partial<BusinessService> = {
        id: 'svc-004',
        service_name: 'Healthcare Records System',
        bsm_attributes: {
          annual_revenue_supported: 20_000_000,
          customer_count: 100_000,
          transaction_volume_daily: 50_000,
          compliance_requirements: [
            { framework: 'HIPAA', compliance_status: 'compliant', last_audit: new Date() },
            { framework: 'HITECH', compliance_status: 'compliant', last_audit: new Date() },
            { framework: 'SOC2', compliance_status: 'compliant', last_audit: new Date() },
          ],
          data_sensitivity: 'confidential',
          business_criticality: 'tier_1',
        },
        itil_attributes: {
          service_type: 'customer-facing',
          sla_targets: { availability_percentage: 99.9 },
          incident_count_30d: 0,
          change_count_30d: 0,
          availability_30d: 100,
        },
      } as BusinessService;

      const result = service.calculateImpactScore(businessService);

      expect(result.components.compliance).toBeGreaterThan(0);
      expect(result.complianceImpact.frameworks.length).toBe(3);
      expect(result.complianceImpact.weight).toBeGreaterThan(0);
    });
  });

  describe('classifyImpactLevel', () => {
    it('should classify score >= 80 as critical', () => {
      const level = service.classifyImpactLevel(85);
      expect(level).toBe('critical');
    });

    it('should classify score 60-79 as high', () => {
      expect(service.classifyImpactLevel(60)).toBe('high');
      expect(service.classifyImpactLevel(70)).toBe('high');
      expect(service.classifyImpactLevel(79)).toBe('high');
    });

    it('should classify score 40-59 as medium', () => {
      expect(service.classifyImpactLevel(40)).toBe('medium');
      expect(service.classifyImpactLevel(50)).toBe('medium');
      expect(service.classifyImpactLevel(59)).toBe('medium');
    });

    it('should classify score < 40 as low', () => {
      expect(service.classifyImpactLevel(0)).toBe('low');
      expect(service.classifyImpactLevel(20)).toBe('low');
      expect(service.classifyImpactLevel(39)).toBe('low');
    });
  });

  describe('generateImpactSummary', () => {
    it('should generate comprehensive summary for high-impact service', () => {
      const impactScore = {
        totalScore: 85,
        components: {
          revenue: 38,
          customers: 23,
          transactions: 14,
          compliance: 8,
          users: 2,
        },
        revenueImpact: 100_000_000,
        customerImpact: 1_000_000,
        transactionVolume: 1_000_000,
        complianceImpact: {
          frameworks: ['PCI-DSS', 'SOX'],
          weight: 0.8,
          penaltyRisk: 'high',
          description: 'Financial compliance required',
        },
        userImpact: 500,
        dataClassification: 'confidential' as const,
        calculatedAt: new Date(),
      };

      const summary = service.generateImpactSummary(impactScore);

      expect(summary).toContain('CRITICAL');
      expect(summary).toContain('85');
      expect(summary).toContain('Revenue');
      expect(summary).toContain('$100');
      expect(summary).toContain('1,000,000');
      expect(summary).toContain('PCI-DSS');
    });

    it('should identify primary drivers correctly', () => {
      const impactScore = {
        totalScore: 65,
        components: {
          revenue: 5,
          customers: 40,
          transactions: 10,
          compliance: 8,
          users: 2,
        },
        revenueImpact: 1_000_000,
        customerImpact: 500_000,
        transactionVolume: 100_000,
        complianceImpact: {
          frameworks: ['GDPR'],
          weight: 0.8,
          penaltyRisk: 'medium',
          description: 'Data privacy compliance',
        },
        userImpact: 200,
        dataClassification: 'internal' as const,
        calculatedAt: new Date(),
      };

      const summary = service.generateImpactSummary(impactScore);

      expect(summary).toContain('Customers');
      expect(summary).not.toContain('Revenue and Customers'); // Revenue shouldn't be top 2
    });
  });

  describe('compareImpactScores', () => {
    it('should return 1 when first score is higher', () => {
      const score1 = {
        totalScore: 80,
        revenueImpact: 50_000_000,
      } as any;

      const score2 = {
        totalScore: 60,
        revenueImpact: 30_000_000,
      } as any;

      expect(service.compareImpactScores(score1, score2)).toBe(1);
    });

    it('should return -1 when second score is higher', () => {
      const score1 = {
        totalScore: 50,
        revenueImpact: 20_000_000,
      } as any;

      const score2 = {
        totalScore: 75,
        revenueImpact: 40_000_000,
      } as any;

      expect(service.compareImpactScores(score1, score2)).toBe(-1);
    });

    it('should use revenue as tiebreaker when scores are equal', () => {
      const score1 = {
        totalScore: 70,
        revenueImpact: 50_000_000,
      } as any;

      const score2 = {
        totalScore: 70,
        revenueImpact: 30_000_000,
      } as any;

      expect(service.compareImpactScores(score1, score2)).toBe(1);
    });

    it('should return 0 when scores and revenue are equal', () => {
      const score1 = {
        totalScore: 70,
        revenueImpact: 50_000_000,
      } as any;

      const score2 = {
        totalScore: 70,
        revenueImpact: 50_000_000,
      } as any;

      expect(service.compareImpactScores(score1, score2)).toBe(0);
    });
  });

  describe('batchCalculateImpactScores', () => {
    it('should calculate scores for multiple services', () => {
      const services: Partial<BusinessService>[] = [
        {
          id: 'svc-001',
          bsm_attributes: {
            annual_revenue_supported: 50_000_000,
            customer_count: 500_000,
            transaction_volume_daily: 100_000,
            compliance_requirements: [],
            data_sensitivity: 'internal',
            business_criticality: 'tier_0',
          },
          itil_attributes: {
            service_type: 'customer-facing',
            sla_targets: { availability_percentage: 99.9 },
            incident_count_30d: 0,
            change_count_30d: 0,
            availability_30d: 100,
          },
        },
        {
          id: 'svc-002',
          bsm_attributes: {
            annual_revenue_supported: 10_000_000,
            customer_count: 100_000,
            transaction_volume_daily: 10_000,
            compliance_requirements: [],
            data_sensitivity: 'internal',
            business_criticality: 'tier_2',
          },
          itil_attributes: {
            service_type: 'customer-facing',
            sla_targets: { availability_percentage: 99.0 },
            incident_count_30d: 0,
            change_count_30d: 0,
            availability_30d: 100,
          },
        },
      ] as BusinessService[];

      const results = service.batchCalculateImpactScores(services);

      expect(results).toHaveLength(2);
      expect(results[0].totalScore).toBeGreaterThan(results[1].totalScore);
    });
  });

  describe('calculateAggregateImpact', () => {
    it('should aggregate impact across multiple services', () => {
      const services: Partial<BusinessService>[] = [
        {
          id: 'svc-001',
          bsm_attributes: {
            annual_revenue_supported: 30_000_000,
            customer_count: 300_000,
            transaction_volume_daily: 50_000,
            compliance_requirements: [
              { framework: 'PCI-DSS', compliance_status: 'compliant', last_audit: new Date() },
            ],
            data_sensitivity: 'confidential',
            business_criticality: 'tier_1',
          },
          itil_attributes: {
            service_type: 'customer-facing',
            sla_targets: { availability_percentage: 99.9 },
            incident_count_30d: 0,
            change_count_30d: 0,
            availability_30d: 100,
          },
        },
        {
          id: 'svc-002',
          bsm_attributes: {
            annual_revenue_supported: 20_000_000,
            customer_count: 200_000,
            transaction_volume_daily: 30_000,
            compliance_requirements: [
              { framework: 'SOC2', compliance_status: 'compliant', last_audit: new Date() },
            ],
            data_sensitivity: 'internal',
            business_criticality: 'tier_2',
          },
          itil_attributes: {
            service_type: 'customer-facing',
            sla_targets: { availability_percentage: 99.5 },
            incident_count_30d: 0,
            change_count_30d: 0,
            availability_30d: 100,
          },
        },
      ] as BusinessService[];

      const aggregate = service.calculateAggregateImpact(services);

      expect(aggregate.revenueImpact).toBe(50_000_000); // Sum of revenues
      expect(aggregate.customerImpact).toBe(500_000); // Sum of customers
      expect(aggregate.transactionVolume).toBe(80_000); // Sum of transactions
      expect(aggregate.complianceImpact.frameworks).toContain('PCI-DSS');
      expect(aggregate.complianceImpact.frameworks).toContain('SOC2');
      expect(aggregate.complianceImpact.description).toContain('2 services');
    });

    it('should handle empty service array', () => {
      const aggregate = service.calculateAggregateImpact([]);

      expect(aggregate.revenueImpact).toBe(0);
      expect(aggregate.customerImpact).toBe(0);
      expect(aggregate.totalScore).toBeGreaterThanOrEqual(0);
    });
  });
});
