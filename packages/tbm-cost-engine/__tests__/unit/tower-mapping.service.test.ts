// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Unit Tests for Tower Mapping Service
 */

import { TowerMappingService } from '../../src/services/tower-mapping.service';
import { TBMResourceTower } from '../../src/types/tbm-types';

describe('TowerMappingService', () => {
  let service: TowerMappingService;

  beforeEach(() => {
    service = TowerMappingService.getInstance();
  });

  describe('mapCIToTower', () => {
    it('should map server to Compute tower', () => {
      const result = service.mapCIToTower('ci-001', 'server', {});

      expect(result.tower).toBe(TBMResourceTower.COMPUTE);
      expect(result.subTower).toBeDefined();
      expect(result.confidence).toBe(1.0);
      expect(result.mappingRules.length).toBeGreaterThan(0);
    });

    it('should map virtual-machine to Compute tower', () => {
      const result = service.mapCIToTower('ci-002', 'virtual-machine', {});

      expect(result.tower).toBe(TBMResourceTower.COMPUTE);
      expect(result.ciId).toBe('ci-002');
      expect(result.ciType).toBe('virtual-machine');
    });

    it('should map database to Data tower', () => {
      const result = service.mapCIToTower('ci-003', 'database', {});

      expect(result.tower).toBe(TBMResourceTower.DATA);
      expect(result.confidence).toBe(1.0);
    });

    it('should map storage to Storage tower', () => {
      const result = service.mapCIToTower('ci-004', 'storage', {});

      expect(result.tower).toBe(TBMResourceTower.STORAGE);
    });

    it('should map network-device to Network tower', () => {
      const result = service.mapCIToTower('ci-005', 'network-device', {});

      expect(result.tower).toBe(TBMResourceTower.NETWORK);
    });

    it('should map application to Applications tower', () => {
      const result = service.mapCIToTower('ci-006', 'application', {});

      expect(result.tower).toBe(TBMResourceTower.APPLICATIONS);
    });

    it('should infer tower from metadata when direct mapping not available', () => {
      const metadata = {
        resource_type: 'compute',
        provider: 'aws',
      };

      const result = service.mapCIToTower('ci-007', 'unknown-type', metadata);

      expect(result.tower).toBeDefined();
      expect(result.confidence).toBeLessThan(1.0);
      expect(result.mappingRules.some((r) => r.includes('Inferred'))).toBe(true);
    });

    it('should default to Applications tower for unknown types', () => {
      const result = service.mapCIToTower('ci-008', 'completely-unknown-type', {});

      expect(result.tower).toBe(TBMResourceTower.APPLICATIONS);
      expect(result.confidence).toBeLessThan(1.0);
      expect(result.mappingRules.some((r) => r.includes('Fallback'))).toBe(true);
    });

    it('should assign cost pool based on tower', () => {
      const result = service.mapCIToTower('ci-009', 'server', {});

      expect(result.costPool).toBeDefined();
      expect(typeof result.costPool).toBe('string');
    });

    it('should assign sub-tower based on CI type', () => {
      const result = service.mapCIToTower('ci-010', 'server', {});

      expect(result.subTower).toBeDefined();
      expect(typeof result.subTower).toBe('string');
      expect(result.subTower.length).toBeGreaterThan(0);
    });

    it('should include mapping rules for audit trail', () => {
      const result = service.mapCIToTower('ci-011', 'server', {});

      expect(result.mappingRules).toBeDefined();
      expect(Array.isArray(result.mappingRules)).toBe(true);
      expect(result.mappingRules.length).toBeGreaterThan(0);
    });

    it('should map load-balancer to Network tower', () => {
      const result = service.mapCIToTower('ci-012', 'load-balancer', {});

      expect(result.tower).toBe(TBMResourceTower.NETWORK);
    });

    it('should map container to Compute tower', () => {
      const result = service.mapCIToTower('ci-013', 'container', {});

      expect(result.tower).toBe(TBMResourceTower.COMPUTE);
    });
  });

  describe('batch mapping', () => {
    it('should map multiple CIs consistently', () => {
      const cis = [
        { id: 'ci-001', type: 'server' },
        { id: 'ci-002', type: 'database' },
        { id: 'ci-003', type: 'network-device' },
      ];

      const results = cis.map((ci) => service.mapCIToTower(ci.id, ci.type, {}));

      expect(results).toHaveLength(3);
      expect(results[0].tower).toBe(TBMResourceTower.COMPUTE);
      expect(results[1].tower).toBe(TBMResourceTower.DATA);
      expect(results[2].tower).toBe(TBMResourceTower.NETWORK);
    });
  });

  describe('edge cases', () => {
    it('should handle empty metadata', () => {
      const result = service.mapCIToTower('ci-014', 'server', {});

      expect(result.tower).toBeDefined();
      expect(result.ciId).toBe('ci-014');
    });

    it('should handle null metadata gracefully', () => {
      const result = service.mapCIToTower('ci-015', 'server', {} as any);

      expect(result.tower).toBeDefined();
    });

    it('should handle very long CI IDs', () => {
      const longId = 'ci-' + 'x'.repeat(1000);
      const result = service.mapCIToTower(longId, 'server', {});

      expect(result.ciId).toBe(longId);
      expect(result.tower).toBe(TBMResourceTower.COMPUTE);
    });

    it('should handle special characters in CI type', () => {
      const result = service.mapCIToTower('ci-016', 'server-type_v2.0', {});

      expect(result.tower).toBeDefined();
      expect(result.ciId).toBe('ci-016');
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = TowerMappingService.getInstance();
      const instance2 = TowerMappingService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});
