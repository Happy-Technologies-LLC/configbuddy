// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Lifecycle Manager Utility
 * Validates and manages ITIL CI lifecycle transitions
 */

import { ITILLifecycle, ITILConfigStatus } from '@cmdb/unified-model';

export class LifecycleManager {
  /**
   * Valid lifecycle stage transitions
   * Defines which transitions are allowed
   */
  private static readonly VALID_TRANSITIONS: Record<
    ITILLifecycle,
    ITILLifecycle[]
  > = {
    planning: ['design', 'retire'], // Can plan, then design, or cancel (retire)
    design: ['build', 'planning', 'retire'], // Can build, go back to planning, or cancel
    build: ['test', 'design', 'retire'], // Can test, go back to design, or cancel
    test: ['deploy', 'build', 'retire'], // Can deploy, go back to build, or cancel
    deploy: ['operate', 'test', 'retire'], // Can go live, go back to test, or cancel
    operate: ['retire'], // In production, can only retire
    retire: [], // Retired is final state
  };

  /**
   * Valid configuration status transitions
   */
  private static readonly VALID_STATUS_TRANSITIONS: Record<
    ITILConfigStatus,
    ITILConfigStatus[]
  > = {
    planned: ['ordered', 'disposed'], // Planned can be ordered or cancelled
    ordered: ['in_development', 'planned', 'disposed'], // Ordered can start dev, go back, or cancel
    in_development: ['active', 'ordered', 'disposed'], // Dev can go active, back to ordered, or cancel
    active: ['maintenance', 'retired'], // Active can go to maintenance or be retired
    maintenance: ['active', 'retired'], // Maintenance can return to active or be retired
    retired: ['disposed'], // Retired can be disposed
    disposed: [], // Disposed is final state
  };

  /**
   * Validate lifecycle stage transition
   */
  static isValidLifecycleTransition(
    currentStage: ITILLifecycle,
    newStage: ITILLifecycle
  ): boolean {
    // Same stage is always valid (no-op)
    if (currentStage === newStage) {
      return true;
    }

    const validTargets = this.VALID_TRANSITIONS[currentStage] || [];
    return validTargets.includes(newStage);
  }

  /**
   * Validate configuration status transition
   */
  static isValidStatusTransition(
    currentStatus: ITILConfigStatus,
    newStatus: ITILConfigStatus
  ): boolean {
    // Same status is always valid (no-op)
    if (currentStatus === newStatus) {
      return true;
    }

    const validTargets = this.VALID_STATUS_TRANSITIONS[currentStatus] || [];
    return validTargets.includes(newStatus);
  }

  /**
   * Get valid next lifecycle stages
   */
  static getValidNextLifecycleStages(
    currentStage: ITILLifecycle
  ): ITILLifecycle[] {
    return this.VALID_TRANSITIONS[currentStage] || [];
  }

  /**
   * Get valid next configuration statuses
   */
  static getValidNextStatuses(currentStatus: ITILConfigStatus): ITILConfigStatus[] {
    return this.VALID_STATUS_TRANSITIONS[currentStatus] || [];
  }

  /**
   * Get lifecycle stage description
   */
  static getLifecycleDescription(stage: ITILLifecycle): string {
    const descriptions: Record<ITILLifecycle, string> = {
      planning: 'Initial planning and requirements gathering phase',
      design: 'Design and architecture definition phase',
      build: 'Development and construction phase',
      test: 'Testing and quality assurance phase',
      deploy: 'Deployment and rollout phase',
      operate: 'Production operation and maintenance',
      retire: 'Decommissioned and no longer in use',
    };

    return descriptions[stage];
  }

  /**
   * Get configuration status description
   */
  static getStatusDescription(status: ITILConfigStatus): string {
    const descriptions: Record<ITILConfigStatus, string> = {
      planned: 'Planned for procurement or development',
      ordered: 'Ordered from vendor or approved for development',
      in_development: 'Under active development or configuration',
      active: 'In production and actively used',
      maintenance: 'Undergoing maintenance or updates',
      retired: 'Retired from production but not disposed',
      disposed: 'Physically disposed or deleted',
    };

    return descriptions[status];
  }

  /**
   * Determine if CI is in production
   */
  static isInProduction(
    lifecycleStage: ITILLifecycle,
    configStatus: ITILConfigStatus
  ): boolean {
    return lifecycleStage === 'operate' && configStatus === 'active';
  }

  /**
   * Determine if CI can be modified
   */
  static canModify(
    lifecycleStage: ITILLifecycle,
    configStatus: ITILConfigStatus
  ): boolean {
    // Cannot modify retired or disposed CIs
    if (
      configStatus === 'retired' ||
      configStatus === 'disposed' ||
      lifecycleStage === 'retire'
    ) {
      return false;
    }

    return true;
  }

  /**
   * Determine if CI requires change control
   */
  static requiresChangeControl(
    lifecycleStage: ITILLifecycle,
    configStatus: ITILConfigStatus
  ): boolean {
    // Production CIs require change control
    return this.isInProduction(lifecycleStage, configStatus);
  }

  /**
   * Get audit frequency based on lifecycle stage
   * Returns recommended days between audits
   */
  static getRecommendedAuditFrequency(
    lifecycleStage: ITILLifecycle,
    businessCriticality: 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4'
  ): number {
    // Base frequency by lifecycle stage
    const baseFrequency: Record<ITILLifecycle, number> = {
      planning: 180, // 6 months
      design: 180,
      build: 90, // 3 months
      test: 90,
      deploy: 30, // 1 month
      operate: 90, // 3 months
      retire: 365, // 1 year
    };

    // Adjust by criticality
    const criticalityMultiplier: Record<string, number> = {
      tier_1: 0.5, // More frequent for critical
      tier_2: 0.75,
      tier_3: 1.0,
      tier_4: 1.5, // Less frequent for low criticality
    };

    const base = baseFrequency[lifecycleStage];
    const multiplier = criticalityMultiplier[businessCriticality] || 1.0;

    return Math.round(base * multiplier);
  }

  /**
   * Validate lifecycle and status combination
   */
  static isValidCombination(
    lifecycleStage: ITILLifecycle,
    configStatus: ITILConfigStatus
  ): boolean {
    // Define valid combinations
    const validCombinations: Record<ITILLifecycle, ITILConfigStatus[]> = {
      planning: ['planned'],
      design: ['planned', 'ordered'],
      build: ['ordered', 'in_development'],
      test: ['in_development'],
      deploy: ['in_development', 'active'],
      operate: ['active', 'maintenance'],
      retire: ['retired', 'disposed'],
    };

    const validStatuses = validCombinations[lifecycleStage] || [];
    return validStatuses.includes(configStatus);
  }

  /**
   * Suggest configuration status based on lifecycle stage
   */
  static suggestConfigStatus(lifecycleStage: ITILLifecycle): ITILConfigStatus {
    const suggestions: Record<ITILLifecycle, ITILConfigStatus> = {
      planning: 'planned',
      design: 'planned',
      build: 'in_development',
      test: 'in_development',
      deploy: 'active',
      operate: 'active',
      retire: 'retired',
    };

    return suggestions[lifecycleStage];
  }

  /**
   * Generate lifecycle transition reasoning
   */
  static generateTransitionReasoning(
    fromStage: ITILLifecycle,
    toStage: ITILLifecycle
  ): string {
    if (fromStage === toStage) {
      return 'No transition required';
    }

    // Forward progression
    if (this.isForwardProgression(fromStage, toStage)) {
      return `Progressing from ${fromStage} to ${toStage} as part of normal lifecycle`;
    }

    // Backward progression (rework)
    if (this.isBackwardProgression(fromStage, toStage)) {
      return `Rolling back from ${fromStage} to ${toStage} for rework`;
    }

    // Retirement
    if (toStage === 'retire') {
      return `Retiring CI from ${fromStage} stage`;
    }

    return `Transitioning from ${fromStage} to ${toStage}`;
  }

  /**
   * Check if transition is forward progression
   */
  private static isForwardProgression(
    fromStage: ITILLifecycle,
    toStage: ITILLifecycle
  ): boolean {
    const progression: ITILLifecycle[] = [
      'planning',
      'design',
      'build',
      'test',
      'deploy',
      'operate',
    ];

    const fromIndex = progression.indexOf(fromStage);
    const toIndex = progression.indexOf(toStage);

    return fromIndex >= 0 && toIndex >= 0 && toIndex > fromIndex;
  }

  /**
   * Check if transition is backward progression (rework)
   */
  private static isBackwardProgression(
    fromStage: ITILLifecycle,
    toStage: ITILLifecycle
  ): boolean {
    const progression: ITILLifecycle[] = [
      'planning',
      'design',
      'build',
      'test',
      'deploy',
      'operate',
    ];

    const fromIndex = progression.indexOf(fromStage);
    const toIndex = progression.indexOf(toStage);

    return fromIndex >= 0 && toIndex >= 0 && toIndex < fromIndex;
  }

  /**
   * Calculate lifecycle completeness percentage
   */
  static calculateLifecycleCompleteness(lifecycleStage: ITILLifecycle): number {
    const completeness: Record<ITILLifecycle, number> = {
      planning: 10,
      design: 25,
      build: 50,
      test: 75,
      deploy: 90,
      operate: 100,
      retire: 100,
    };

    return completeness[lifecycleStage];
  }
}
