// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Pattern Workflow
 * Manages pattern lifecycle: draft → review → approved → active
 */

import { DiscoveryPattern } from './types';
import { PatternStorageService } from './pattern-storage';
import { PatternValidator, ValidationResult } from './pattern-validator';
import { PatternCompiler } from './pattern-compiler';
import { logger } from '@cmdb/common';

export interface WorkflowAction {
  action: 'submit' | 'approve' | 'reject' | 'activate' | 'deactivate';
  performedBy: string;
  comment?: string;
  timestamp: Date;
}

export class PatternWorkflow {
  private storage: PatternStorageService;
  private validator: PatternValidator;
  private compiler: PatternCompiler;

  constructor(
    storage?: PatternStorageService,
    validator?: PatternValidator,
    compiler?: PatternCompiler
  ) {
    this.storage = storage || new PatternStorageService();
    this.validator = validator || new PatternValidator();
    this.compiler = compiler || new PatternCompiler();
  }

  /**
   * Submit pattern for review (draft → review)
   */
  async submitForReview(
    patternId: string,
    submittedBy: string,
    comment?: string
  ): Promise<{
    success: boolean;
    validation?: ValidationResult;
    error?: string;
  }> {
    try {
      const pattern = await this.storage.getPattern(patternId);
      if (!pattern) {
        return { success: false, error: 'Pattern not found' };
      }

      if (pattern.status !== 'draft') {
        return {
          success: false,
          error: `Pattern status is ${pattern.status}, expected draft`,
        };
      }

      logger.info('Submitting pattern for review', { patternId, submittedBy });

      // Validate pattern
      const validation = await this.validator.validate(pattern);

      if (!validation.isValid) {
        logger.warn('Pattern validation failed', {
          patternId,
          errors: validation.errors,
        });
        return {
          success: false,
          validation,
          error: 'Pattern validation failed',
        };
      }

      // Update status to review
      await this.storage.updatePattern(patternId, {
        status: 'review',
      });

      logger.info('Pattern submitted for review', { patternId, submittedBy });

      return { success: true, validation };
    } catch (error) {
      logger.error('Error submitting pattern for review', { patternId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Approve pattern (review → approved)
   */
  async approvePattern(
    patternId: string,
    approvedBy: string,
    comment?: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const pattern = await this.storage.getPattern(patternId);
      if (!pattern) {
        return { success: false, error: 'Pattern not found' };
      }

      if (pattern.status !== 'review') {
        return {
          success: false,
          error: `Pattern status is ${pattern.status}, expected review`,
        };
      }

      logger.info('Approving pattern', { patternId, approvedBy });

      // Final validation before approval
      const validation = await this.validator.quickValidate(pattern);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`,
        };
      }

      // Update status to approved
      await this.storage.updatePattern(patternId, {
        status: 'approved',
        approvedBy,
        approvedAt: new Date(),
      } as any);

      logger.info('Pattern approved', { patternId, approvedBy });

      return { success: true };
    } catch (error) {
      logger.error('Error approving pattern', { patternId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Reject pattern (review → draft)
   */
  async rejectPattern(
    patternId: string,
    rejectedBy: string,
    reason: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const pattern = await this.storage.getPattern(patternId);
      if (!pattern) {
        return { success: false, error: 'Pattern not found' };
      }

      if (pattern.status !== 'review') {
        return {
          success: false,
          error: `Pattern status is ${pattern.status}, expected review`,
        };
      }

      logger.info('Rejecting pattern', { patternId, rejectedBy, reason });

      // Update status back to draft
      await this.storage.updatePattern(patternId, {
        status: 'draft',
      });

      logger.info('Pattern rejected', { patternId, rejectedBy, reason });

      return { success: true };
    } catch (error) {
      logger.error('Error rejecting pattern', { patternId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Activate pattern (approved → active)
   */
  async activatePattern(
    patternId: string,
    activatedBy: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const pattern = await this.storage.getPattern(patternId);
      if (!pattern) {
        return { success: false, error: 'Pattern not found' };
      }

      if (pattern.status !== 'approved') {
        return {
          success: false,
          error: `Pattern status is ${pattern.status}, expected approved`,
        };
      }

      logger.info('Activating pattern', { patternId, activatedBy });

      // Update status to active and set is_active flag
      await this.storage.updatePattern(patternId, {
        status: 'active',
        isActive: true,
      });

      logger.info('Pattern activated', { patternId, activatedBy });

      return { success: true };
    } catch (error) {
      logger.error('Error activating pattern', { patternId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Deactivate pattern (active → deprecated)
   */
  async deactivatePattern(
    patternId: string,
    deactivatedBy: string,
    reason?: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const pattern = await this.storage.getPattern(patternId);
      if (!pattern) {
        return { success: false, error: 'Pattern not found' };
      }

      if (pattern.status !== 'active') {
        return {
          success: false,
          error: `Pattern status is ${pattern.status}, expected active`,
        };
      }

      logger.info('Deactivating pattern', { patternId, deactivatedBy, reason });

      // Update status to deprecated and unset is_active flag
      await this.storage.updatePattern(patternId, {
        status: 'deprecated',
        isActive: false,
      });

      logger.info('Pattern deactivated', { patternId, deactivatedBy });

      return { success: true };
    } catch (error) {
      logger.error('Error deactivating pattern', { patternId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Auto-approve patterns based on criteria
   * (for patterns with very high confidence and usage)
   */
  async autoApproveIfEligible(patternId: string): Promise<boolean> {
    try {
      const pattern = await this.storage.getPattern(patternId);
      if (!pattern) {
        return false;
      }

      // Only auto-approve patterns in review state
      if (pattern.status !== 'review') {
        return false;
      }

      // Criteria for auto-approval:
      // 1. Learned from 5+ sessions
      // 2. Confidence score >= 0.90
      // 3. Passes all validation
      const eligibleForAutoApproval =
        pattern.learnedFromSessions &&
        pattern.learnedFromSessions.length >= 5 &&
        pattern.confidenceScore >= 0.9;

      if (!eligibleForAutoApproval) {
        logger.debug('Pattern not eligible for auto-approval', {
          patternId,
          sessions: pattern.learnedFromSessions?.length,
          confidence: pattern.confidenceScore,
        });
        return false;
      }

      // Validate
      const validation = await this.validator.quickValidate(pattern);
      if (!validation.isValid) {
        logger.warn('Pattern auto-approval blocked by validation', {
          patternId,
          errors: validation.errors,
        });
        return false;
      }

      // Auto-approve
      const result = await this.approvePattern(patternId, 'auto-approval-system');

      if (result.success) {
        logger.info('Pattern auto-approved', { patternId });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error in auto-approval check', { patternId, error });
      return false;
    }
  }

  /**
   * Get patterns pending review
   */
  async getPendingReviewPatterns(): Promise<DiscoveryPattern[]> {
    const allPatterns = this.storage.getCachedPatterns();
    return allPatterns.filter(p => p.status === 'review');
  }

  /**
   * Get pattern workflow history (simplified - in production would query audit log)
   */
  async getPatternHistory(patternId: string): Promise<WorkflowAction[]> {
    const pattern = await this.storage.getPattern(patternId);
    if (!pattern) {
      return [];
    }

    // Reconstruct basic history from pattern fields
    const history: WorkflowAction[] = [
      {
        action: 'submit',
        performedBy: pattern.author,
        timestamp: pattern.createdAt,
        comment: 'Pattern created',
      },
    ];

    if (pattern.approvedAt && pattern.approvedBy) {
      history.push({
        action: 'approve',
        performedBy: pattern.approvedBy,
        timestamp: pattern.approvedAt,
      });
    }

    if (pattern.isActive && pattern.status === 'active') {
      history.push({
        action: 'activate',
        performedBy: pattern.approvedBy || 'system',
        timestamp: pattern.updatedAt,
      });
    }

    return history;
  }

  /**
   * Compile and save new patterns from AI discoveries
   */
  async compileAndSubmitPatterns(): Promise<{
    compiled: number;
    submitted: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let compiled = 0;
    let submitted = 0;

    try {
      logger.info('Looking for pattern candidates to compile');

      // Get candidates from compiler
      const candidates = await this.compiler.getCandidates();

      logger.info('Found pattern candidates', { count: candidates.length });

      for (const candidate of candidates) {
        try {
          // Get sessions for this candidate
          const sessions = await this.getSessionsForCandidate(
            candidate.signature.sessions
          );

          if (sessions.length === 0) {
            logger.warn('No sessions found for candidate', {
              signature: candidate.signature.signatureHash,
            });
            continue;
          }

          // Compile pattern
          const pattern = await this.compiler.compilePattern(sessions);
          compiled++;

          // Save as draft
          await this.storage.savePattern(pattern);

          // Submit for review
          const submitResult = await this.submitForReview(
            pattern.patternId,
            'pattern-compiler'
          );

          if (submitResult.success) {
            submitted++;

            // Try auto-approval if eligible
            await this.autoApproveIfEligible(pattern.patternId);
          } else {
            errors.push(
              `Failed to submit ${pattern.patternId}: ${submitResult.error}`
            );
          }

          logger.info('Pattern compiled and submitted', {
            patternId: pattern.patternId,
            name: pattern.name,
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push(`Compilation error: ${errorMsg}`);
          logger.error('Error compiling pattern', { error });
        }
      }

      logger.info('Pattern compilation complete', { compiled, submitted });

      return { compiled, submitted, errors };
    } catch (error) {
      logger.error('Error in pattern compilation workflow', { error });
      return {
        compiled,
        submitted,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Get sessions by IDs (helper method)
   */
  private async getSessionsForCandidate(
    sessionIds: string[]
  ): Promise<any[]> {
    // This would query the database for sessions
    // For now, return empty array (will be implemented when integrated)
    return [];
  }
}
