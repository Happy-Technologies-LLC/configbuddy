/**
 * Tests for ITILClassifier
 */

import { ITILClassifier } from '../../src/enrichment/itil-classifier';
import { CIType, ITILCIClass } from '@cmdb/unified-model';

describe('ITILClassifier', () => {
  let classifier: ITILClassifier;

  beforeEach(() => {
    classifier = new ITILClassifier();
  });

  describe('inferITILClass', () => {
    describe('Hardware CIs', () => {
      it('should classify server as hardware', () => {
        const result = classifier.inferITILClass('server' as CIType);
        expect(result).toBe('hardware');
      });

      it('should classify storage as hardware', () => {
        const result = classifier.inferITILClass('storage' as CIType);
        expect(result).toBe('hardware');
      });

      it('should classify network-device as hardware', () => {
        const result = classifier.inferITILClass('network-device' as CIType);
        expect(result).toBe('hardware');
      });

      it('should classify load-balancer as hardware', () => {
        const result = classifier.inferITILClass('load-balancer' as CIType);
        expect(result).toBe('hardware');
      });
    });

    describe('Software CIs', () => {
      it('should classify virtual-machine as software', () => {
        const result = classifier.inferITILClass('virtual-machine' as CIType);
        expect(result).toBe('software');
      });

      it('should classify container as software', () => {
        const result = classifier.inferITILClass('container' as CIType);
        expect(result).toBe('software');
      });

      it('should classify application as software', () => {
        const result = classifier.inferITILClass('application' as CIType);
        expect(result).toBe('software');
      });

      it('should classify database as software', () => {
        const result = classifier.inferITILClass('database' as CIType);
        expect(result).toBe('software');
      });

      it('should classify software as software', () => {
        const result = classifier.inferITILClass('software' as CIType);
        expect(result).toBe('software');
      });
    });

    describe('Service CIs', () => {
      it('should classify service as service', () => {
        const result = classifier.inferITILClass('service' as CIType);
        expect(result).toBe('service');
      });
    });

    describe('Network CIs', () => {
      it('should classify cloud-resource as network', () => {
        const result = classifier.inferITILClass('cloud-resource' as CIType);
        expect(result).toBe('network');
      });
    });

    describe('Facility CIs', () => {
      it('should classify facility as facility', () => {
        const result = classifier.inferITILClass('facility' as CIType);
        expect(result).toBe('facility');
      });
    });

    describe('Documentation CIs', () => {
      it('should classify documentation as documentation', () => {
        const result = classifier.inferITILClass('documentation' as CIType);
        expect(result).toBe('documentation');
      });
    });

    describe('Metadata overrides', () => {
      it('should override to hardware when metadata.physical is true', () => {
        const result = classifier.inferITILClass('virtual-machine' as CIType, {
          physical: true,
        });
        expect(result).toBe('hardware');
      });

      it('should override to hardware when metadata.hardware_type exists', () => {
        const result = classifier.inferITILClass('cloud-resource' as CIType, {
          hardware_type: 'blade-server',
        });
        expect(result).toBe('hardware');
      });

      it('should override to software when metadata.virtual is true', () => {
        const result = classifier.inferITILClass('server' as CIType, {
          virtual: true,
        });
        expect(result).toBe('software');
      });

      it('should override to service when metadata.service_type exists', () => {
        const result = classifier.inferITILClass('application' as CIType, {
          service_type: 'business_service',
        });
        expect(result).toBe('service');
      });

      it('should override to network when metadata.network_type exists', () => {
        const result = classifier.inferITILClass('cloud-resource' as CIType, {
          network_type: 'vpc',
        });
        expect(result).toBe('network');
      });

      it('should override to network when metadata.vpc_id exists', () => {
        const result = classifier.inferITILClass('cloud-resource' as CIType, {
          vpc_id: 'vpc-12345',
        });
        expect(result).toBe('network');
      });
    });

    describe('Unknown CI types', () => {
      it('should default to hardware for unknown CI types', () => {
        const result = classifier.inferITILClass('unknown-type' as any);
        expect(result).toBe('hardware');
      });

      it('should use metadata to infer class for unknown types', () => {
        const result = classifier.inferITILClass('unknown-type' as any, {
          service_type: 'technical_service',
        });
        expect(result).toBe('service');
      });

      it('should use metadata.datacenter to infer facility', () => {
        const result = classifier.inferITILClass('unknown-type' as any, {
          datacenter: 'dc-us-west-1',
        });
        expect(result).toBe('facility');
      });
    });
  });

  describe('getClassificationRules', () => {
    it('should return a map of classification rules', () => {
      const rules = classifier.getClassificationRules();
      expect(rules).toBeInstanceOf(Map);
      expect(rules.size).toBeGreaterThan(0);
    });

    it('should not modify the internal rules', () => {
      const rules = classifier.getClassificationRules();
      const originalSize = rules.size;
      rules.set('new-type' as CIType, 'hardware');

      const rulesAgain = classifier.getClassificationRules();
      expect(rulesAgain.size).toBe(originalSize);
    });
  });

  describe('hasDirectRule', () => {
    it('should return true for known CI types', () => {
      expect(classifier.hasDirectRule('server' as CIType)).toBe(true);
      expect(classifier.hasDirectRule('application' as CIType)).toBe(true);
      expect(classifier.hasDirectRule('service' as CIType)).toBe(true);
    });

    it('should return false for unknown CI types', () => {
      expect(classifier.hasDirectRule('unknown-type' as any)).toBe(false);
    });
  });

  describe('getSupportedCITypes', () => {
    it('should return array of supported CI types', () => {
      const types = classifier.getSupportedCITypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
      expect(types).toContain('server');
      expect(types).toContain('virtual-machine');
      expect(types).toContain('application');
    });
  });
});
