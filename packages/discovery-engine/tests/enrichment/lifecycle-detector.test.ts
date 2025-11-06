/**
 * Tests for LifecycleDetector
 */

import { LifecycleDetector } from '../../src/enrichment/lifecycle-detector';
import { ITILLifecycle } from '@cmdb/unified-model';

describe('LifecycleDetector', () => {
  let detector: LifecycleDetector;

  beforeEach(() => {
    detector = new LifecycleDetector();
  });

  describe('detectLifecycleStage', () => {
    describe('Build stage detection', () => {
      it('should detect build stage from provisioning_state=creating', () => {
        const ci = {
          metadata: { provisioning_state: 'creating' },
        };
        expect(detector.detectLifecycleStage(ci)).toBe('build');
      });

      it('should detect build stage from state=pending', () => {
        const ci = {
          metadata: { state: 'pending' },
        };
        expect(detector.detectLifecycleStage(ci)).toBe('build');
      });

      it('should detect build stage from Kubernetes Pending phase', () => {
        const ci = {
          metadata: { phase: 'Pending' },
        };
        expect(detector.detectLifecycleStage(ci)).toBe('build');
      });

      it('should detect build stage from Docker created state', () => {
        const ci = {
          metadata: { container_state: 'created' },
        };
        expect(detector.detectLifecycleStage(ci)).toBe('build');
      });

      it('should detect build stage from development environment with running state', () => {
        const ci = {
          environment: 'development' as any,
          metadata: { state: 'running' },
        };
        expect(detector.detectLifecycleStage(ci)).toBe('build');
      });
    });

    describe('Deploy stage detection', () => {
      it('should detect deploy stage from provisioning_state=updating', () => {
        const ci = {
          metadata: { provisioning_state: 'updating' },
        };
        expect(detector.detectLifecycleStage(ci)).toBe('deploy');
      });

      it('should detect deploy stage from state=deploying', () => {
        const ci = {
          metadata: { state: 'deploying' },
        };
        expect(detector.detectLifecycleStage(ci)).toBe('deploy');
      });
    });

    describe('Test stage detection', () => {
      it('should detect test stage from test environment', () => {
        const ci = {
          environment: 'test' as any,
          metadata: { state: 'running' },
        };
        expect(detector.detectLifecycleStage(ci)).toBe('test');
      });

      it('should detect test stage from staging environment', () => {
        const ci = {
          environment: 'staging' as any,
          metadata: { phase: 'Running' },
        };
        expect(detector.detectLifecycleStage(ci)).toBe('test');
      });
    });

    describe('Operate stage detection', () => {
      it('should detect operate stage from Kubernetes Running phase', () => {
        const ci = {
          metadata: { phase: 'Running' },
        };
        expect(detector.detectLifecycleStage(ci)).toBe('operate');
      });

      it('should detect operate stage from Docker running state', () => {
        const ci = {
          metadata: { container_state: 'running' },
        };
        expect(detector.detectLifecycleStage(ci)).toBe('operate');
      });

      it('should default to operate for discovered CIs without specific indicators', () => {
        const ci = {
          metadata: {},
        };
        expect(detector.detectLifecycleStage(ci)).toBe('operate');
      });

      it('should detect operate from metadata lifecycle hint', () => {
        const ci = {
          metadata: { lifecycle: 'operational' },
        };
        expect(detector.detectLifecycleStage(ci)).toBe('operate');
      });
    });

    describe('Retire stage detection', () => {
      it('should detect retire stage from provisioning_state=deleting', () => {
        const ci = {
          metadata: { provisioning_state: 'deleting' },
        };
        expect(detector.detectLifecycleStage(ci)).toBe('retire');
      });

      it('should detect retire stage from state=terminated', () => {
        const ci = {
          metadata: { state: 'terminated' },
        };
        expect(detector.detectLifecycleStage(ci)).toBe('retire');
      });

      it('should detect retire stage from Kubernetes Failed phase', () => {
        const ci = {
          metadata: { phase: 'Failed' },
        };
        expect(detector.detectLifecycleStage(ci)).toBe('retire');
      });

      it('should detect retire stage from Docker exited state', () => {
        const ci = {
          metadata: { container_state: 'exited' },
        };
        expect(detector.detectLifecycleStage(ci)).toBe('retire');
      });

      it('should detect retire stage from inactive status', () => {
        const ci = {
          status: 'inactive',
          metadata: {},
        };
        expect(detector.detectLifecycleStage(ci)).toBe('retire');
      });

      it('should detect retire stage from decommissioned status', () => {
        const ci = {
          status: 'decommissioned',
          metadata: {},
        };
        expect(detector.detectLifecycleStage(ci)).toBe('retire');
      });

      it('should detect retire stage from old last_discovered date', () => {
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 100); // 100 days ago

        const ci = {
          last_discovered: oldDate,
          metadata: {},
        };
        expect(detector.detectLifecycleStage(ci)).toBe('retire');
      });
    });

    describe('Design stage detection', () => {
      it('should detect design stage from development environment without running state', () => {
        const ci = {
          environment: 'development' as any,
          metadata: {},
        };
        expect(detector.detectLifecycleStage(ci)).toBe('design');
      });

      it('should detect design stage from metadata lifecycle hint', () => {
        const ci = {
          metadata: { lifecycle: 'design' },
        };
        expect(detector.detectLifecycleStage(ci)).toBe('design');
      });
    });

    describe('Planning stage detection', () => {
      it('should detect planning stage from metadata lifecycle hint', () => {
        const ci = {
          metadata: { lifecycle: 'planning' },
        };
        expect(detector.detectLifecycleStage(ci)).toBe('planning');
      });
    });
  });

  describe('isValidTransition', () => {
    it('should allow valid forward progression', () => {
      expect(detector.isValidTransition('planning', 'design')).toBe(true);
      expect(detector.isValidTransition('design', 'build')).toBe(true);
      expect(detector.isValidTransition('build', 'test')).toBe(true);
      expect(detector.isValidTransition('test', 'deploy')).toBe(true);
      expect(detector.isValidTransition('deploy', 'operate')).toBe(true);
      expect(detector.isValidTransition('operate', 'retire')).toBe(true);
    });

    it('should allow valid backward progression', () => {
      expect(detector.isValidTransition('design', 'planning')).toBe(true);
      expect(detector.isValidTransition('build', 'design')).toBe(true);
      expect(detector.isValidTransition('test', 'build')).toBe(true);
      expect(detector.isValidTransition('deploy', 'test')).toBe(true);
    });

    it('should allow early retirement from any stage', () => {
      expect(detector.isValidTransition('planning', 'retire')).toBe(true);
      expect(detector.isValidTransition('design', 'retire')).toBe(true);
      expect(detector.isValidTransition('build', 'retire')).toBe(true);
      expect(detector.isValidTransition('test', 'retire')).toBe(true);
      expect(detector.isValidTransition('deploy', 'retire')).toBe(true);
      expect(detector.isValidTransition('operate', 'retire')).toBe(true);
    });

    it('should allow redeployment from operate', () => {
      expect(detector.isValidTransition('operate', 'deploy')).toBe(true);
    });

    it('should not allow transitions from retire', () => {
      expect(detector.isValidTransition('retire', 'planning')).toBe(false);
      expect(detector.isValidTransition('retire', 'operate')).toBe(false);
      expect(detector.isValidTransition('retire', 'deploy')).toBe(false);
    });

    it('should not allow invalid jumps', () => {
      expect(detector.isValidTransition('planning', 'build')).toBe(false);
      expect(detector.isValidTransition('planning', 'test')).toBe(false);
      expect(detector.isValidTransition('design', 'test')).toBe(false);
      expect(detector.isValidTransition('build', 'operate')).toBe(false);
    });
  });

  describe('getNextStages', () => {
    it('should return correct next stages for each lifecycle', () => {
      expect(detector.getNextStages('planning')).toEqual(['design']);
      expect(detector.getNextStages('design')).toEqual(['build']);
      expect(detector.getNextStages('build')).toEqual(['test']);
      expect(detector.getNextStages('test')).toEqual(['deploy']);
      expect(detector.getNextStages('deploy')).toEqual(['operate']);
      expect(detector.getNextStages('operate')).toEqual(['retire']);
      expect(detector.getNextStages('retire')).toEqual([]);
    });
  });

  describe('isTerminalStage', () => {
    it('should identify retire as terminal stage', () => {
      expect(detector.isTerminalStage('retire')).toBe(true);
    });

    it('should identify non-terminal stages', () => {
      expect(detector.isTerminalStage('planning')).toBe(false);
      expect(detector.isTerminalStage('design')).toBe(false);
      expect(detector.isTerminalStage('build')).toBe(false);
      expect(detector.isTerminalStage('test')).toBe(false);
      expect(detector.isTerminalStage('deploy')).toBe(false);
      expect(detector.isTerminalStage('operate')).toBe(false);
    });
  });

  describe('isOperationalStage', () => {
    it('should identify operational stages', () => {
      expect(detector.isOperationalStage('operate')).toBe(true);
      expect(detector.isOperationalStage('deploy')).toBe(true);
    });

    it('should identify non-operational stages', () => {
      expect(detector.isOperationalStage('planning')).toBe(false);
      expect(detector.isOperationalStage('design')).toBe(false);
      expect(detector.isOperationalStage('build')).toBe(false);
      expect(detector.isOperationalStage('test')).toBe(false);
      expect(detector.isOperationalStage('retire')).toBe(false);
    });
  });
});
