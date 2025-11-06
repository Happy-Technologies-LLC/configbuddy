/**
 * Unit Tests for Criticality Calculator Service
 */

import { CriticalityCalculatorService } from '../../src/services/criticality-calculator.service';
import { BusinessService } from '@cmdb/unified-model';

describe('CriticalityCalculatorService', () => {
  let service: CriticalityCalculatorService;

  beforeEach(() => {
    service = new CriticalityCalculatorService();
  });

  describe('calculateCriticality', () => {
    it('should calculate tier_0 for high revenue service', async () => {
      const businessService: Partial<BusinessService> = {
        id: 'svc-001',
        service_name: 'Online Banking',
        bsm_attributes: {
          annual_revenue_supported: 100_000_000, // $100M
          customer_count: 1_000_000,
          transaction_volume_daily: 500_000,
          compliance_requirements: [
            { framework: 'PCI-DSS', compliance_status: 'compliant', last_audit: new Date() },
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

      const result = await service.calculateCriticality(businessService, {
        propagateToChildren: false,
      });

      expect(result.calculatedCriticality).toBe('tier_0');
      expect(result.impactScore).toBeGreaterThan(80);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.factors.annualRevenue).toBe(100_000_000);
      expect(result.factors.customerCount).toBe(1_000_000);
    });

    it('should calculate tier_1 for medium-high impact service', async () => {
      const businessService: Partial<BusinessService> = {
        id: 'svc-002',
        service_name: 'Customer Portal',
        bsm_attributes: {
          annual_revenue_supported: 20_000_000, // $20M
          customer_count: 100_000,
          transaction_volume_daily: 50_000,
          compliance_requirements: [],
          data_sensitivity: 'internal',
          business_criticality: 'tier_1',
        },
        itil_attributes: {
          service_type: 'customer-facing',
          sla_targets: { availability_percentage: 99.9 },
          incident_count_30d: 2,
          change_count_30d: 10,
          availability_30d: 99.95,
        },
      } as BusinessService;

      const result = await service.calculateCriticality(businessService, {
        propagateToChildren: false,
      });

      expect(result.calculatedCriticality).toBe('tier_1');
      expect(result.impactScore).toBeGreaterThan(50);
      expect(result.impactScore).toBeLessThan(80);
    });

    it('should calculate tier_4 for low impact service', async () => {
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

      const result = await service.calculateCriticality(businessService, {
        propagateToChildren: false,
      });

      expect(result.calculatedCriticality).toBe('tier_4');
      expect(result.impactScore).toBeLessThan(40);
    });

    it('should apply custom weights when provided', async () => {
      const businessService: Partial<BusinessService> = {
        id: 'svc-004',
        service_name: 'Test Service',
        bsm_attributes: {
          annual_revenue_supported: 50_000_000,
          customer_count: 500_000,
          transaction_volume_daily: 100_000,
          compliance_requirements: [],
          data_sensitivity: 'internal',
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

      const resultDefault = await service.calculateCriticality(businessService, {
        propagateToChildren: false,
      });

      const resultCustom = await service.calculateCriticality(businessService, {
        weights: {
          revenue: 0.60, // Increase revenue weight
          customers: 0.20,
          transactions: 0.10,
          compliance: 0.05,
          users: 0.05,
        },
        propagateToChildren: false,
      });

      // Custom weights should produce different score
      expect(resultCustom.impactScore).not.toBe(resultDefault.impactScore);
    });

    it('should handle services with compliance requirements', async () => {
      const businessService: Partial<BusinessService> = {
        id: 'svc-005',
        service_name: 'Healthcare Portal',
        bsm_attributes: {
          annual_revenue_supported: 10_000_000,
          customer_count: 50_000,
          transaction_volume_daily: 10_000,
          compliance_requirements: [
            { framework: 'HIPAA', compliance_status: 'compliant', last_audit: new Date() },
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

      const result = await service.calculateCriticality(businessService, {
        propagateToChildren: false,
      });

      expect(result.factors.complianceWeight).toBeGreaterThan(0);
      expect(result.recommendation).toContain('compliance');
    });

    it('should calculate lower confidence when data is missing', async () => {
      const businessServiceComplete: Partial<BusinessService> = {
        id: 'svc-006a',
        service_name: 'Complete Service',
        bsm_attributes: {
          annual_revenue_supported: 10_000_000,
          customer_count: 50_000,
          transaction_volume_daily: 10_000,
          compliance_requirements: [
            { framework: 'ISO27001', compliance_status: 'compliant', last_audit: new Date() },
          ],
          data_sensitivity: 'internal',
          business_criticality: 'tier_2',
        },
        itil_attributes: {
          service_type: 'customer-facing',
          sla_targets: { availability_percentage: 99.9 },
          incident_count_30d: 0,
          change_count_30d: 0,
          availability_30d: 100,
        },
      } as BusinessService;

      const businessServiceIncomplete: Partial<BusinessService> = {
        id: 'svc-006b',
        service_name: 'Incomplete Service',
        bsm_attributes: {
          annual_revenue_supported: 0,
          customer_count: 0,
          transaction_volume_daily: 0,
          compliance_requirements: [],
          data_sensitivity: 'internal',
          business_criticality: 'tier_4',
        },
        itil_attributes: {
          service_type: 'internal',
          sla_targets: { availability_percentage: 99.0 },
          incident_count_30d: 0,
          change_count_30d: 0,
          availability_30d: 100,
        },
      } as BusinessService;

      const resultComplete = await service.calculateCriticality(businessServiceComplete, {
        propagateToChildren: false,
      });
      const resultIncomplete = await service.calculateCriticality(businessServiceIncomplete, {
        propagateToChildren: false,
      });

      expect(resultComplete.confidence).toBeGreaterThan(resultIncomplete.confidence);
    });
  });

  describe('batchCalculateCriticality', () => {
    it('should calculate criticality for multiple services', async () => {
      const services: Partial<BusinessService>[] = [
        {
          id: 'svc-001',
          service_name: 'Service 1',
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
            sla_targets: { availability_percentage: 99.99 },
            incident_count_30d: 0,
            change_count_30d: 0,
            availability_30d: 100,
          },
        },
        {
          id: 'svc-002',
          service_name: 'Service 2',
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
            sla_targets: { availability_percentage: 99.9 },
            incident_count_30d: 0,
            change_count_30d: 0,
            availability_30d: 100,
          },
        },
      ] as BusinessService[];

      const results = await service.batchCalculateCriticality(services, {
        propagateToChildren: false,
      });

      expect(results).toHaveLength(2);
      expect(results[0].calculatedCriticality).toBe('tier_0');
      expect(results[1].calculatedCriticality).toBe('tier_2');
    });

    it('should continue processing on individual failures', async () => {
      const services = [
        {
          id: 'svc-001',
          service_name: 'Valid Service',
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
            sla_targets: { availability_percentage: 99.9 },
            incident_count_30d: 0,
            change_count_30d: 0,
            availability_30d: 100,
          },
        },
        null, // Invalid service
      ] as any[];

      const results = await service.batchCalculateCriticality(services, {
        propagateToChildren: false,
      });

      // Should have processed the valid service and skipped the invalid one
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle zero values gracefully', async () => {
      const businessService: Partial<BusinessService> = {
        id: 'svc-zero',
        service_name: 'Zero Values Service',
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
          incident_count_30d: 0,
          change_count_30d: 0,
          availability_30d: 100,
        },
      } as BusinessService;

      const result = await service.calculateCriticality(businessService, {
        propagateToChildren: false,
      });

      expect(result.impactScore).toBeGreaterThanOrEqual(0);
      expect(result.calculatedAt).toBeInstanceOf(Date);
    });

    it('should handle extremely large values', async () => {
      const businessService: Partial<BusinessService> = {
        id: 'svc-large',
        service_name: 'Large Values Service',
        bsm_attributes: {
          annual_revenue_supported: 1_000_000_000_000, // $1 Trillion
          customer_count: 1_000_000_000, // 1 Billion customers
          transaction_volume_daily: 10_000_000_000, // 10 Billion transactions
          compliance_requirements: [],
          data_sensitivity: 'confidential',
          business_criticality: 'tier_0',
        },
        itil_attributes: {
          service_type: 'customer-facing',
          sla_targets: { availability_percentage: 99.999 },
          incident_count_30d: 0,
          change_count_30d: 0,
          availability_30d: 100,
        },
      } as BusinessService;

      const result = await service.calculateCriticality(businessService, {
        propagateToChildren: false,
      });

      // Score should be capped at reasonable values
      expect(result.impactScore).toBeLessThanOrEqual(100);
      expect(result.calculatedCriticality).toBe('tier_0');
    });
  });
});
