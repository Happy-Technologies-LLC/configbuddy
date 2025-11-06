/**
 * ITIL Lifecycle Stage Detector
 * Detects the lifecycle stage of a CI based on metadata and status
 */

import { ITILLifecycle, Environment } from '@cmdb/unified-model';

/**
 * Configuration Item (partial interface for lifecycle detection)
 */
interface CIForLifecycle {
  metadata?: Record<string, any>;
  environment?: Environment | string;
  last_discovered?: Date;
  status?: string;
}

export class LifecycleDetector {
  /**
   * Detect CI lifecycle stage from metadata and status
   *
   * ITIL Lifecycle Stages:
   * - planning: Being planned/designed
   * - design: Design phase
   * - build: Being built/provisioned
   * - test: In testing
   * - deploy: Being deployed
   * - operate: In production operation (most common)
   * - retire: Being decommissioned
   *
   * @param ci - The configuration item (partial)
   * @returns The detected lifecycle stage
   */
  detectLifecycleStage(ci: CIForLifecycle): ITILLifecycle {
    const metadata = ci.metadata || {};

    // Check various metadata fields that indicate lifecycle

    // AWS/Azure provisioning states
    if (
      metadata.provisioning_state === 'creating' ||
      metadata.provisioning_state === 'pending' ||
      metadata.state === 'pending' ||
      metadata.state === 'creating'
    ) {
      return 'build';
    }

    if (
      metadata.provisioning_state === 'updating' ||
      metadata.state === 'updating' ||
      metadata.state === 'deploying'
    ) {
      return 'deploy';
    }

    if (
      metadata.provisioning_state === 'deleting' ||
      metadata.provisioning_state === 'deprovisioning' ||
      metadata.state === 'terminating' ||
      metadata.state === 'terminated' ||
      metadata.state === 'deleted'
    ) {
      return 'retire';
    }

    // Kubernetes pod phases
    if (metadata.phase === 'Pending') return 'build';
    if (metadata.phase === 'Running') return 'operate';
    if (metadata.phase === 'Failed' || metadata.phase === 'Succeeded') {
      return 'retire';
    }

    // Docker container states
    if (metadata.container_state === 'created') return 'build';
    if (metadata.container_state === 'running') return 'operate';
    if (metadata.container_state === 'exited' || metadata.container_state === 'dead') {
      return 'retire';
    }

    // Check for test/staging environments
    if (ci.environment === 'test' || ci.environment === 'staging') {
      // If metadata suggests it's actively running, it's in test
      if (
        metadata.state === 'running' ||
        metadata.phase === 'Running' ||
        metadata.status === 'running'
      ) {
        return 'test';
      }
    }

    // Development environment typically indicates build or design
    if (ci.environment === 'development') {
      if (
        metadata.state === 'running' ||
        metadata.phase === 'Running' ||
        metadata.status === 'running'
      ) {
        return 'build'; // Active development
      }
      return 'design'; // Not yet running
    }

    // Check if CI is inactive or decommissioned
    if (ci.status === 'inactive' || ci.status === 'decommissioned') {
      return 'retire';
    }

    // Check if CI has recent discovery (active operation)
    if (ci.last_discovered) {
      const daysSinceDiscovery = this.getDaysSinceDiscovery(ci.last_discovered);
      if (daysSinceDiscovery > 90) {
        // Not seen in 90 days - might be retired
        return 'retire';
      }
    }

    // Check metadata for lifecycle hints
    if (metadata.lifecycle) {
      const lifecycle = metadata.lifecycle.toLowerCase();
      if (lifecycle === 'planning') return 'planning';
      if (lifecycle === 'design') return 'design';
      if (lifecycle === 'build' || lifecycle === 'building') return 'build';
      if (lifecycle === 'test' || lifecycle === 'testing') return 'test';
      if (lifecycle === 'deploy' || lifecycle === 'deploying') return 'deploy';
      if (lifecycle === 'operate' || lifecycle === 'operational') return 'operate';
      if (lifecycle === 'retire' || lifecycle === 'retired') return 'retire';
    }

    // Default to operate for most discovered CIs
    // This is the most common state for actively discovered infrastructure
    return 'operate';
  }

  /**
   * Calculate days since last discovery
   * @param lastDiscovered - Date of last discovery
   * @returns Number of days since discovery
   */
  private getDaysSinceDiscovery(lastDiscovered: Date | string): number {
    const now = new Date();
    const lastSeen = new Date(lastDiscovered);
    const diffMs = now.getTime() - lastSeen.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Determine if lifecycle transition is valid
   * Follows ITIL lifecycle progression rules
   *
   * @param from - Current lifecycle stage
   * @param to - Target lifecycle stage
   * @returns True if transition is valid
   */
  isValidTransition(from: ITILLifecycle, to: ITILLifecycle): boolean {
    // Define valid state transitions based on ITIL best practices
    const validTransitions: Record<ITILLifecycle, ITILLifecycle[]> = {
      planning: ['design', 'retire'], // Can move to design or cancel (retire)
      design: ['build', 'planning', 'retire'], // Can go back to planning, forward to build, or cancel
      build: ['test', 'design', 'retire'], // Can go back to design, forward to test, or cancel
      test: ['deploy', 'build', 'retire'], // Can go back to build, forward to deploy, or cancel
      deploy: ['operate', 'test', 'retire'], // Can go back to test, forward to operate, or cancel
      operate: ['deploy', 'retire'], // Can redeploy changes or retire
      retire: [], // Terminal state - no transitions allowed
    };

    return validTransitions[from]?.includes(to) || false;
  }

  /**
   * Get the next expected lifecycle stage
   * @param current - Current lifecycle stage
   * @returns Next expected stage(s)
   */
  getNextStages(current: ITILLifecycle): ITILLifecycle[] {
    const progressions: Record<ITILLifecycle, ITILLifecycle[]> = {
      planning: ['design'],
      design: ['build'],
      build: ['test'],
      test: ['deploy'],
      deploy: ['operate'],
      operate: ['retire'], // Only forward movement is to retire
      retire: [], // Terminal state
    };

    return progressions[current] || [];
  }

  /**
   * Check if a lifecycle stage is terminal (no further progression)
   * @param stage - The lifecycle stage to check
   * @returns True if the stage is terminal
   */
  isTerminalStage(stage: ITILLifecycle): boolean {
    return stage === 'retire';
  }

  /**
   * Check if a lifecycle stage is operational (CI is in use)
   * @param stage - The lifecycle stage to check
   * @returns True if the stage represents operational use
   */
  isOperationalStage(stage: ITILLifecycle): boolean {
    return stage === 'operate' || stage === 'deploy';
  }
}
