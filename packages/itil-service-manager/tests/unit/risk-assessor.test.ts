// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Risk Assessor Unit Tests
 */

import { RiskAssessor } from '../../src/utils/risk-assessor';
import { RiskFactors } from '../../src/types';

describe('RiskAssessor', () => {
  describe('calculateOverallRiskScore', () => {
    it('should calculate weighted average correctly', () => {
      const factors: RiskFactors = {
        businessCriticalityScore: 90,
        complexityScore: 60,
        historicalRiskScore: 40,
        changeWindowScore: 20,
        dependencyScore: 30,
      };

      const score = RiskAssessor.calculateOverallRiskScore(factors);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should return 0 for all zero factors', () => {
      const factors: RiskFactors = {
        businessCriticalityScore: 0,
        complexityScore: 0,
        historicalRiskScore: 0,
        changeWindowScore: 0,
        dependencyScore: 0,
      };

      const score = RiskAssessor.calculateOverallRiskScore(factors);
      expect(score).toBe(0);
    });

    it('should return high score for all high factors', () => {
      const factors: RiskFactors = {
        businessCriticalityScore: 100,
        complexityScore: 100,
        historicalRiskScore: 100,
        changeWindowScore: 100,
        dependencyScore: 100,
      };

      const score = RiskAssessor.calculateOverallRiskScore(factors);
      expect(score).toBe(100);
    });
  });

  describe('determineRiskLevel', () => {
    it('should return very_high for score >= 75', () => {
      expect(RiskAssessor.determineRiskLevel(75)).toBe('very_high');
      expect(RiskAssessor.determineRiskLevel(100)).toBe('very_high');
    });

    it('should return high for score >= 50', () => {
      expect(RiskAssessor.determineRiskLevel(50)).toBe('high');
      expect(RiskAssessor.determineRiskLevel(74)).toBe('high');
    });

    it('should return medium for score >= 25', () => {
      expect(RiskAssessor.determineRiskLevel(25)).toBe('medium');
      expect(RiskAssessor.determineRiskLevel(49)).toBe('medium');
    });

    it('should return low for score < 25', () => {
      expect(RiskAssessor.determineRiskLevel(0)).toBe('low');
      expect(RiskAssessor.determineRiskLevel(24)).toBe('low');
    });
  });

  describe('calculateBusinessCriticalityScore', () => {
    it('should return high score for tier_1 services', () => {
      const score = RiskAssessor.calculateBusinessCriticalityScore('tier_1', 1, 0);
      expect(score).toBeGreaterThanOrEqual(90);
    });

    it('should return low score for tier_4 services', () => {
      const score = RiskAssessor.calculateBusinessCriticalityScore('tier_4', 1, 0);
      expect(score).toBeLessThan(20);
    });

    it('should increase score for customer-facing services', () => {
      const scoreWithoutCustomer = RiskAssessor.calculateBusinessCriticalityScore(
        'tier_2',
        1,
        0
      );
      const scoreWithCustomer = RiskAssessor.calculateBusinessCriticalityScore(
        'tier_2',
        1,
        1
      );
      expect(scoreWithCustomer).toBeGreaterThan(scoreWithoutCustomer);
    });
  });

  describe('calculateComplexityScore', () => {
    it('should return high score for emergency changes', () => {
      const score = RiskAssessor.calculateComplexityScore(1, 'emergency', true, true);
      expect(score).toBeGreaterThanOrEqual(70);
    });

    it('should return low score for standard changes', () => {
      const score = RiskAssessor.calculateComplexityScore(1, 'standard', true, true);
      expect(score).toBeLessThan(30);
    });

    it('should increase score for missing rollback plan', () => {
      const withRollback = RiskAssessor.calculateComplexityScore(
        1,
        'normal',
        true,
        true
      );
      const withoutRollback = RiskAssessor.calculateComplexityScore(
        1,
        'normal',
        false,
        true
      );
      expect(withoutRollback).toBeGreaterThan(withRollback);
    });

    it('should increase score for untested changes', () => {
      const tested = RiskAssessor.calculateComplexityScore(1, 'normal', true, true);
      const untested = RiskAssessor.calculateComplexityScore(1, 'normal', true, false);
      expect(untested).toBeGreaterThan(tested);
    });
  });

  describe('calculateHistoricalRiskScore', () => {
    it('should return low score for high success rate', () => {
      const score = RiskAssessor.calculateHistoricalRiskScore(95, 0);
      expect(score).toBeLessThan(20);
    });

    it('should return high score for low success rate', () => {
      const score = RiskAssessor.calculateHistoricalRiskScore(20, 0);
      expect(score).toBeGreaterThanOrEqual(80);
    });

    it('should increase score for recent failures', () => {
      const noFailures = RiskAssessor.calculateHistoricalRiskScore(80, 0);
      const manyFailures = RiskAssessor.calculateHistoricalRiskScore(80, 5);
      expect(manyFailures).toBeGreaterThan(noFailures);
    });
  });

  describe('requiresCABApproval', () => {
    it('should require CAB for very_high risk', () => {
      expect(RiskAssessor.requiresCABApproval('very_high', 'normal', 0)).toBe(true);
    });

    it('should require CAB for major changes', () => {
      expect(RiskAssessor.requiresCABApproval('low', 'major', 0)).toBe(true);
    });

    it('should require CAB for high revenue at risk', () => {
      expect(RiskAssessor.requiresCABApproval('low', 'normal', 200000)).toBe(true);
    });

    it('should not require CAB for low risk standard changes', () => {
      expect(RiskAssessor.requiresCABApproval('low', 'standard', 0)).toBe(false);
    });
  });

  describe('generateMitigationStrategies', () => {
    it('should generate strategies for high business criticality', () => {
      const factors: RiskFactors = {
        businessCriticalityScore: 80,
        complexityScore: 20,
        historicalRiskScore: 20,
        changeWindowScore: 20,
        dependencyScore: 20,
      };

      const strategies = RiskAssessor.generateMitigationStrategies(factors);
      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies.some((s) => s.includes('maintenance window'))).toBe(true);
    });

    it('should generate strategies for high complexity', () => {
      const factors: RiskFactors = {
        businessCriticalityScore: 20,
        complexityScore: 70,
        historicalRiskScore: 20,
        changeWindowScore: 20,
        dependencyScore: 20,
      };

      const strategies = RiskAssessor.generateMitigationStrategies(factors);
      expect(strategies.some((s) => s.includes('incremental'))).toBe(true);
    });
  });

  describe('estimateDowntime', () => {
    it('should estimate no downtime for standard changes', () => {
      const downtime = RiskAssessor.estimateDowntime('standard', 1, 60);
      expect(downtime).toBe(0);
    });

    it('should estimate downtime for emergency changes', () => {
      const downtime = RiskAssessor.estimateDowntime('emergency', 1, 120);
      expect(downtime).toBeGreaterThan(0);
    });

    it('should increase downtime estimate with more affected CIs', () => {
      const fewCIs = RiskAssessor.estimateDowntime('normal', 2, 60);
      const manyCIs = RiskAssessor.estimateDowntime('normal', 10, 60);
      expect(manyCIs).toBeGreaterThan(fewCIs);
    });
  });
});
