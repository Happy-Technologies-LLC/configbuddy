/**
 * Lifecycle Manager Unit Tests
 */

import { LifecycleManager } from '../../src/utils/lifecycle-manager';

describe('LifecycleManager', () => {
  describe('isValidLifecycleTransition', () => {
    it('should allow forward progression', () => {
      expect(LifecycleManager.isValidLifecycleTransition('planning', 'design')).toBe(true);
      expect(LifecycleManager.isValidLifecycleTransition('design', 'build')).toBe(true);
      expect(LifecycleManager.isValidLifecycleTransition('build', 'test')).toBe(true);
      expect(LifecycleManager.isValidLifecycleTransition('test', 'deploy')).toBe(true);
      expect(LifecycleManager.isValidLifecycleTransition('deploy', 'operate')).toBe(true);
    });

    it('should allow backward progression for rework', () => {
      expect(LifecycleManager.isValidLifecycleTransition('test', 'build')).toBe(true);
      expect(LifecycleManager.isValidLifecycleTransition('deploy', 'test')).toBe(true);
    });

    it('should allow retirement from any stage', () => {
      expect(LifecycleManager.isValidLifecycleTransition('planning', 'retire')).toBe(true);
      expect(LifecycleManager.isValidLifecycleTransition('design', 'retire')).toBe(true);
      expect(LifecycleManager.isValidLifecycleTransition('operate', 'retire')).toBe(true);
    });

    it('should not allow invalid transitions', () => {
      expect(LifecycleManager.isValidLifecycleTransition('planning', 'test')).toBe(false);
      expect(LifecycleManager.isValidLifecycleTransition('retire', 'operate')).toBe(false);
    });

    it('should allow same stage (no-op)', () => {
      expect(LifecycleManager.isValidLifecycleTransition('operate', 'operate')).toBe(true);
    });
  });

  describe('isValidStatusTransition', () => {
    it('should allow planned to ordered', () => {
      expect(LifecycleManager.isValidStatusTransition('planned', 'ordered')).toBe(true);
    });

    it('should allow ordered to in_development', () => {
      expect(LifecycleManager.isValidStatusTransition('ordered', 'in_development')).toBe(true);
    });

    it('should allow in_development to active', () => {
      expect(LifecycleManager.isValidStatusTransition('in_development', 'active')).toBe(true);
    });

    it('should allow active to maintenance', () => {
      expect(LifecycleManager.isValidStatusTransition('active', 'maintenance')).toBe(true);
    });

    it('should allow maintenance to active', () => {
      expect(LifecycleManager.isValidStatusTransition('maintenance', 'active')).toBe(true);
    });

    it('should not allow disposed to any state', () => {
      expect(LifecycleManager.isValidStatusTransition('disposed', 'active')).toBe(false);
    });
  });

  describe('isInProduction', () => {
    it('should return true for operate + active', () => {
      expect(LifecycleManager.isInProduction('operate', 'active')).toBe(true);
    });

    it('should return false for operate + maintenance', () => {
      expect(LifecycleManager.isInProduction('operate', 'maintenance')).toBe(false);
    });

    it('should return false for deploy + active', () => {
      expect(LifecycleManager.isInProduction('deploy', 'active')).toBe(false);
    });
  });

  describe('canModify', () => {
    it('should allow modifications to active CIs', () => {
      expect(LifecycleManager.canModify('operate', 'active')).toBe(true);
    });

    it('should not allow modifications to retired CIs', () => {
      expect(LifecycleManager.canModify('retire', 'retired')).toBe(false);
    });

    it('should not allow modifications to disposed CIs', () => {
      expect(LifecycleManager.canModify('operate', 'disposed')).toBe(false);
    });
  });

  describe('requiresChangeControl', () => {
    it('should require change control for production CIs', () => {
      expect(LifecycleManager.requiresChangeControl('operate', 'active')).toBe(true);
    });

    it('should not require change control for non-production CIs', () => {
      expect(LifecycleManager.requiresChangeControl('build', 'in_development')).toBe(false);
    });
  });

  describe('getRecommendedAuditFrequency', () => {
    it('should recommend more frequent audits for critical CIs', () => {
      const tier1Frequency = LifecycleManager.getRecommendedAuditFrequency('operate', 'tier_1');
      const tier4Frequency = LifecycleManager.getRecommendedAuditFrequency('operate', 'tier_4');
      expect(tier1Frequency).toBeLessThan(tier4Frequency);
    });

    it('should recommend more frequent audits for production', () => {
      const operateFrequency = LifecycleManager.getRecommendedAuditFrequency('operate', 'tier_2');
      const planningFrequency = LifecycleManager.getRecommendedAuditFrequency('planning', 'tier_2');
      expect(operateFrequency).toBeLessThan(planningFrequency);
    });
  });

  describe('isValidCombination', () => {
    it('should validate correct combinations', () => {
      expect(LifecycleManager.isValidCombination('planning', 'planned')).toBe(true);
      expect(LifecycleManager.isValidCombination('operate', 'active')).toBe(true);
      expect(LifecycleManager.isValidCombination('retire', 'retired')).toBe(true);
    });

    it('should reject invalid combinations', () => {
      expect(LifecycleManager.isValidCombination('planning', 'active')).toBe(false);
      expect(LifecycleManager.isValidCombination('operate', 'planned')).toBe(false);
    });
  });

  describe('suggestConfigStatus', () => {
    it('should suggest appropriate status for each lifecycle stage', () => {
      expect(LifecycleManager.suggestConfigStatus('planning')).toBe('planned');
      expect(LifecycleManager.suggestConfigStatus('build')).toBe('in_development');
      expect(LifecycleManager.suggestConfigStatus('operate')).toBe('active');
      expect(LifecycleManager.suggestConfigStatus('retire')).toBe('retired');
    });
  });

  describe('calculateLifecycleCompleteness', () => {
    it('should return increasing percentages through lifecycle', () => {
      expect(LifecycleManager.calculateLifecycleCompleteness('planning')).toBeLessThan(
        LifecycleManager.calculateLifecycleCompleteness('design')
      );
      expect(LifecycleManager.calculateLifecycleCompleteness('design')).toBeLessThan(
        LifecycleManager.calculateLifecycleCompleteness('build')
      );
      expect(LifecycleManager.calculateLifecycleCompleteness('build')).toBeLessThan(
        LifecycleManager.calculateLifecycleCompleteness('test')
      );
    });

    it('should return 100% for operate and retire', () => {
      expect(LifecycleManager.calculateLifecycleCompleteness('operate')).toBe(100);
      expect(LifecycleManager.calculateLifecycleCompleteness('retire')).toBe(100);
    });
  });
});
