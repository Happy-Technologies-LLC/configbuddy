/**
 * Unit Tests for Risk Rating Service
 */

import { RiskRatingService } from '../../src/services/risk-rating.service';
import { BusinessService } from '@cmdb/unified-model';

describe('RiskRatingService', () => {
  let service: RiskRatingService;

  beforeEach(() => {
    service = new RiskRatingService();
  });

  describe('calculateRiskAssessment', () => {
    it('should calculate critical risk for tier_0 service with high incidents', async () => {
      const businessService: Partial<BusinessService> = {
        id: 'svc-001',
        service_name: 'Core Banking',
        bsm_attributes: {
          business_criticality: 'tier_0',
          compliance_requirements: [
            {
              framework: 'PCI-DSS',
              compliance_status: 'compliant',
              last_audit: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            },
          ],
        },
        itil_attributes: {
          incident_count_30d: 25, // High incident count
          change_count_30d: 15,
          availability_30d: 98.5, // Below target
          sla_targets: { availability_percentage: 99.99 },
        },
      } as BusinessService;

      const result = await service.calculateRiskAssessment(businessService);

      expect(result.riskRating).toBe('critical');
      expect(result.riskScore).toBeGreaterThan(50);
      expect(result.incidentFrequency).toBe(25);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some((r) => r.includes('URGENT'))).toBe(true);
    });

    it('should calculate high risk for tier_1 service with moderate issues', async () => {
      const businessService: Partial<BusinessService> = {
        id: 'svc-002',
        service_name: 'Customer Portal',
        bsm_attributes: {
          business_criticality: 'tier_1',
          compliance_requirements: [],
        },
        itil_attributes: {
          incident_count_30d: 8,
          change_count_30d: 10,
          availability_30d: 99.5,
          sla_targets: { availability_percentage: 99.9 },
        },
      } as BusinessService;

      const result = await service.calculateRiskAssessment(businessService);

      expect(result.riskRating).toBe('high');
      expect(result.riskScore).toBeGreaterThan(30);
      expect(result.riskScore).toBeLessThan(70);
    });

    it('should calculate low risk for stable service', async () => {
      const businessService: Partial<BusinessService> = {
        id: 'svc-003',
        service_name: 'Internal Wiki',
        bsm_attributes: {
          business_criticality: 'tier_3',
          compliance_requirements: [
            {
              framework: 'ISO27001',
              compliance_status: 'compliant',
              last_audit: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
            },
          ],
        },
        itil_attributes: {
          incident_count_30d: 0,
          change_count_30d: 2,
          availability_30d: 99.9,
          sla_targets: { availability_percentage: 99.0 },
        },
      } as BusinessService;

      const result = await service.calculateRiskAssessment(businessService);

      expect(result.riskRating).toBe('low');
      expect(result.riskScore).toBeLessThan(25);
      expect(result.incidentFrequency).toBe(0);
    });

    it('should factor in change failure rate', async () => {
      const businessService: Partial<BusinessService> = {
        id: 'svc-004',
        service_name: 'E-commerce Platform',
        bsm_attributes: {
          business_criticality: 'tier_1',
          compliance_requirements: [],
        },
        itil_attributes: {
          incident_count_30d: 15, // High incidents
          change_count_30d: 20, // Many changes
          availability_30d: 99.0,
          sla_targets: { availability_percentage: 99.5 },
        },
      } as BusinessService;

      const result = await service.calculateRiskAssessment(businessService);

      expect(result.changeFailureRate).toBeGreaterThan(0);
      expect(result.recommendations.some((r) => r.includes('change management'))).toBe(true);
    });

    it('should assess compliance risk correctly', async () => {
      const businessService: Partial<BusinessService> = {
        id: 'svc-005',
        service_name: 'Healthcare System',
        bsm_attributes: {
          business_criticality: 'tier_1',
          compliance_requirements: [
            {
              framework: 'HIPAA',
              compliance_status: 'non_compliant',
              last_audit: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
            },
            {
              framework: 'SOC2',
              compliance_status: 'unknown',
              last_audit: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
            },
          ],
        },
        itil_attributes: {
          incident_count_30d: 2,
          change_count_30d: 5,
          availability_30d: 99.9,
          sla_targets: { availability_percentage: 99.9 },
        },
      } as BusinessService;

      const result = await service.calculateRiskAssessment(businessService);

      const complianceFactor = result.factors.find((f) => f.factor === 'Compliance');
      expect(complianceFactor).toBeDefined();
      expect(complianceFactor!.score).toBeGreaterThan(50);
      expect(result.recommendations.some((r) => r.includes('compliance'))).toBe(true);
    });

    it('should calculate days since last audit', async () => {
      const auditDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000); // 180 days ago

      const businessService: Partial<BusinessService> = {
        id: 'svc-006',
        service_name: 'Financial System',
        bsm_attributes: {
          business_criticality: 'tier_1',
          compliance_requirements: [
            {
              framework: 'SOX',
              compliance_status: 'compliant',
              last_audit: auditDate,
            },
          ],
        },
        itil_attributes: {
          incident_count_30d: 0,
          change_count_30d: 0,
          availability_30d: 100,
          sla_targets: { availability_percentage: 99.9 },
        },
      } as BusinessService;

      const result = await service.calculateRiskAssessment(businessService);

      expect(result.daysSinceLastAudit).toBeGreaterThan(150);
      expect(result.daysSinceLastAudit).toBeLessThan(200);
      expect(result.lastAuditDate).toEqual(auditDate);
    });

    it('should handle service with no audit history', async () => {
      const businessService: Partial<BusinessService> = {
        id: 'svc-007',
        service_name: 'New Service',
        bsm_attributes: {
          business_criticality: 'tier_2',
          compliance_requirements: [],
        },
        itil_attributes: {
          incident_count_30d: 0,
          change_count_30d: 0,
          availability_30d: 100,
          sla_targets: { availability_percentage: 99.5 },
        },
      } as BusinessService;

      const result = await service.calculateRiskAssessment(businessService);

      expect(result.lastAuditDate).toBeNull();
      expect(result.daysSinceLastAudit).toBeGreaterThan(900);

      const auditFactor = result.factors.find((f) => f.factor === 'Audit Status');
      expect(auditFactor).toBeDefined();
      expect(auditFactor!.score).toBe(100);
    });

    it('should calculate MTTR based on criticality', async () => {
      const tier0Service: Partial<BusinessService> = {
        id: 'svc-tier0',
        service_name: 'Tier 0 Service',
        bsm_attributes: {
          business_criticality: 'tier_0',
          compliance_requirements: [],
        },
        itil_attributes: {
          incident_count_30d: 0,
          change_count_30d: 0,
          availability_30d: 100,
          sla_targets: { availability_percentage: 99.99 },
        },
      } as BusinessService;

      const tier4Service: Partial<BusinessService> = {
        id: 'svc-tier4',
        service_name: 'Tier 4 Service',
        bsm_attributes: {
          business_criticality: 'tier_4',
          compliance_requirements: [],
        },
        itil_attributes: {
          incident_count_30d: 0,
          change_count_30d: 0,
          availability_30d: 100,
          sla_targets: { availability_percentage: 99.0 },
        },
      } as BusinessService;

      const result0 = await service.calculateRiskAssessment(tier0Service);
      const result4 = await service.calculateRiskAssessment(tier4Service);

      expect(result0.meanTimeToRecovery).toBeLessThan(result4.meanTimeToRecovery);
    });

    it('should generate specific recommendations based on risk factors', async () => {
      const businessService: Partial<BusinessService> = {
        id: 'svc-008',
        service_name: 'Problem Service',
        bsm_attributes: {
          business_criticality: 'tier_1',
          compliance_requirements: [
            {
              framework: 'GDPR',
              compliance_status: 'non_compliant',
              last_audit: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
            },
          ],
        },
        itil_attributes: {
          incident_count_30d: 25,
          change_count_30d: 20,
          availability_30d: 97.0,
          sla_targets: { availability_percentage: 99.5 },
        },
      } as BusinessService;

      const result = await service.calculateRiskAssessment(businessService);

      expect(result.recommendations.length).toBeGreaterThan(5);
      expect(result.recommendations.some((r) => r.includes('root cause'))).toBe(true);
      expect(result.recommendations.some((r) => r.includes('availability'))).toBe(true);
      expect(result.recommendations.some((r) => r.includes('compliance'))).toBe(true);
      expect(result.recommendations.some((r) => r.includes('audit'))).toBe(true);
    });

    it('should assess availability risk factor correctly', async () => {
      const lowAvailabilityService: Partial<BusinessService> = {
        id: 'svc-009',
        service_name: 'Low Availability Service',
        bsm_attributes: {
          business_criticality: 'tier_1',
          compliance_requirements: [],
        },
        itil_attributes: {
          incident_count_30d: 0,
          change_count_30d: 0,
          availability_30d: 97.0, // Significantly below target
          sla_targets: { availability_percentage: 99.9 },
        },
      } as BusinessService;

      const result = await service.calculateRiskAssessment(lowAvailabilityService);

      const availabilityFactor = result.factors.find((f) => f.factor === 'Availability');
      expect(availabilityFactor).toBeDefined();
      expect(availabilityFactor!.score).toBeGreaterThan(80);
    });
  });

  describe('risk factors', () => {
    it('should have correct factor weights summing to 1.0', async () => {
      const businessService: Partial<BusinessService> = {
        id: 'svc-test',
        service_name: 'Test Service',
        bsm_attributes: {
          business_criticality: 'tier_2',
          compliance_requirements: [],
        },
        itil_attributes: {
          incident_count_30d: 5,
          change_count_30d: 10,
          availability_30d: 99.5,
          sla_targets: { availability_percentage: 99.5 },
        },
      } as BusinessService;

      const result = await service.calculateRiskAssessment(businessService);

      const totalWeight = result.factors.reduce((sum, factor) => sum + factor.weight, 0);
      expect(totalWeight).toBeCloseTo(1.0, 2);
    });

    it('should include all expected risk factors', async () => {
      const businessService: Partial<BusinessService> = {
        id: 'svc-test',
        service_name: 'Test Service',
        bsm_attributes: {
          business_criticality: 'tier_2',
          compliance_requirements: [],
        },
        itil_attributes: {
          incident_count_30d: 5,
          change_count_30d: 10,
          availability_30d: 99.5,
          sla_targets: { availability_percentage: 99.5 },
        },
      } as BusinessService;

      const result = await service.calculateRiskAssessment(businessService);

      expect(result.factors).toHaveLength(5);
      expect(result.factors.map((f) => f.factor)).toContain('Incident Frequency');
      expect(result.factors.map((f) => f.factor)).toContain('Change Management');
      expect(result.factors.map((f) => f.factor)).toContain('Availability');
      expect(result.factors.map((f) => f.factor)).toContain('Compliance');
      expect(result.factors.map((f) => f.factor)).toContain('Audit Status');
    });
  });

  describe('edge cases', () => {
    it('should handle service with no incidents or changes', async () => {
      const businessService: Partial<BusinessService> = {
        id: 'svc-stable',
        service_name: 'Perfectly Stable Service',
        bsm_attributes: {
          business_criticality: 'tier_2',
          compliance_requirements: [],
        },
        itil_attributes: {
          incident_count_30d: 0,
          change_count_30d: 0,
          availability_30d: 100,
          sla_targets: { availability_percentage: 99.5 },
        },
      } as BusinessService;

      const result = await service.calculateRiskAssessment(businessService);

      expect(result.incidentFrequency).toBe(0);
      expect(result.changeFailureRate).toBe(0);
      expect(result.riskRating).toBe('low');
    });

    it('should handle missing SLA targets gracefully', async () => {
      const businessService: Partial<BusinessService> = {
        id: 'svc-no-sla',
        service_name: 'Service Without SLA',
        bsm_attributes: {
          business_criticality: 'tier_3',
          compliance_requirements: [],
        },
        itil_attributes: {
          incident_count_30d: 2,
          change_count_30d: 5,
          availability_30d: 99.0,
          sla_targets: {}, // No availability target
        },
      } as BusinessService;

      const result = await service.calculateRiskAssessment(businessService);

      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskRating).toBeDefined();
    });
  });
});
