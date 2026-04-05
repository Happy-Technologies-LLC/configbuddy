// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Sync Cost Data to Data Mart Job (v3.0)
 *
 * Validates and enriches TBM cost data in the PostgreSQL data mart
 * Ensures cost data from cloud providers (AWS, Azure, GCP) and GL mappings
 * is properly structured for reporting and analytics.
 *
 * This job works with the tbm_cost_pools table which is already populated
 * by the cloud cost sync jobs (aws-cost-sync, azure-cost-sync, gcp-cost-sync).
 *
 * Schedule: Daily at 4:00 AM UTC (after cost sync jobs complete)
 */

import { Job } from 'bullmq';
import { logger } from '@cmdb/common';
import { getPostgresClient } from '@cmdb/database';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export interface SyncCostsJobData {
  /** Fiscal period to process (YYYY-MM format), defaults to current month */
  fiscalPeriod?: string;
  /** Number of months to process (for backfill), default: 1 */
  monthsToProcess?: number;
  /** Validate cost allocations against CIs */
  validateAllocations?: boolean;
}

export interface SyncCostsJobResult {
  success: boolean;
  periodsProcessed: number;
  costPoolsValidated: number;
  costPoolsEnriched: number;
  totalMonthlyCost: number;
  totalAnnualCost: number;
  validationErrors: string[];
  enrichmentErrors: string[];
  startTime: string;
  endTime: string;
  durationMs: number;
}

/**
 * Main job processor for syncing and validating cost data
 */
export async function processSyncCostsToDatamart(
  job: Job<SyncCostsJobData>
): Promise<SyncCostsJobResult> {
  const startTime = Date.now();
  const result: SyncCostsJobResult = {
    success: false,
    periodsProcessed: 0,
    costPoolsValidated: 0,
    costPoolsEnriched: 0,
    totalMonthlyCost: 0,
    totalAnnualCost: 0,
    validationErrors: [],
    enrichmentErrors: [],
    startTime: new Date().toISOString(),
    endTime: '',
    durationMs: 0,
  };

  logger.info('[SyncCostsToDatamart] Starting cost data sync job', {
    jobId: job.id,
    data: job.data,
  });

  try {
    const fiscalPeriod = job.data.fiscalPeriod || format(new Date(), 'yyyy-MM');
    const monthsToProcess = job.data.monthsToProcess || 1;
    const validateAllocations = job.data.validateAllocations !== false;

    // Generate list of fiscal periods to process
    const periods: string[] = [];
    for (let i = 0; i < monthsToProcess; i++) {
      const date = subMonths(new Date(fiscalPeriod + '-01'), i);
      periods.push(format(date, 'yyyy-MM'));
    }

    logger.info('[SyncCostsToDatamart] Processing fiscal periods', { periods });

    for (const period of periods) {
      try {
        const periodResult = await processFiscalPeriod(period, validateAllocations);

        result.costPoolsValidated += periodResult.validated;
        result.costPoolsEnriched += periodResult.enriched;
        result.totalMonthlyCost += periodResult.monthlyTotal;
        result.totalAnnualCost += periodResult.annualTotal;
        result.validationErrors.push(...periodResult.validationErrors);
        result.enrichmentErrors.push(...periodResult.enrichmentErrors);
        result.periodsProcessed++;

        logger.info('[SyncCostsToDatamart] Processed fiscal period', {
          period,
          ...periodResult,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.validationErrors.push(`Period ${period}: ${errorMsg}`);
        logger.error('[SyncCostsToDatamart] Failed to process fiscal period', {
          period,
          error: errorMsg,
        });
      }
    }

    result.success = result.validationErrors.length === 0;
    result.endTime = new Date().toISOString();
    result.durationMs = Date.now() - startTime;

    logger.info('[SyncCostsToDatamart] Cost data sync job completed', {
      ...result,
      durationSeconds: Math.round(result.durationMs / 1000),
    });

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.validationErrors.push(`Fatal error: ${errorMsg}`);
    result.success = false;
    result.endTime = new Date().toISOString();
    result.durationMs = Date.now() - startTime;

    logger.error('[SyncCostsToDatamart] Cost data sync job failed', {
      jobId: job.id,
      error: errorMsg,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return result;
  }
}

/**
 * Process and validate cost data for a specific fiscal period
 */
async function processFiscalPeriod(
  fiscalPeriod: string,
  validateAllocations: boolean
): Promise<{
  validated: number;
  enriched: number;
  monthlyTotal: number;
  annualTotal: number;
  validationErrors: string[];
  enrichmentErrors: string[];
}> {
  const result = {
    validated: 0,
    enriched: 0,
    monthlyTotal: 0,
    annualTotal: 0,
    validationErrors: [],
    enrichmentErrors: [],
  };

  const pgClient = getPostgresClient();
  const pool = pgClient.getPool();

  // Step 1: Get all cost pools for this fiscal period
  const costPoolsResult = await pool.query(
    `SELECT
      id,
      pool_name,
      cost_category,
      resource_tower,
      monthly_cost,
      annual_cost,
      allocation_method,
      source_system,
      metadata
    FROM tbm_cost_pools
    WHERE fiscal_period = $1
    ORDER BY monthly_cost DESC`,
    [fiscalPeriod]
  );

  const costPools = costPoolsResult.rows;
  logger.info('[SyncCostsToDatamart] Retrieved cost pools for period', {
    fiscalPeriod,
    count: costPools.length,
  });

  // Step 2: Validate and enrich each cost pool
  for (const pool of costPools) {
    try {
      // Validate cost data
      const validationResult = await validateCostPool(pool);
      if (!validationResult.isValid) {
        result.validationErrors.push(
          `Cost pool ${pool.pool_name}: ${validationResult.errors.join(', ')}`
        );
      } else {
        result.validated++;
      }

      // Enrich metadata if needed
      if (validateAllocations) {
        const enrichmentResult = await enrichCostPoolMetadata(pool);
        if (enrichmentResult.enriched) {
          result.enriched++;
        }
        if (enrichmentResult.errors.length > 0) {
          result.enrichmentErrors.push(
            `Cost pool ${pool.pool_name}: ${enrichmentResult.errors.join(', ')}`
          );
        }
      }

      // Aggregate totals
      result.monthlyTotal += parseFloat(pool.monthly_cost) || 0;
      result.annualTotal += parseFloat(pool.annual_cost) || 0;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.validationErrors.push(`Cost pool ${pool.pool_name}: ${errorMsg}`);
      logger.error('[SyncCostsToDatamart] Error processing cost pool', {
        pool_name: pool.pool_name,
        error: errorMsg,
      });
    }
  }

  return result;
}

/**
 * Validate cost pool data integrity
 */
async function validateCostPool(pool: any): Promise<{
  isValid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  // Check for required fields
  if (!pool.pool_name) {
    errors.push('Missing pool_name');
  }

  if (!pool.cost_category || !['opex', 'capex'].includes(pool.cost_category)) {
    errors.push(`Invalid cost_category: ${pool.cost_category}`);
  }

  if (!pool.resource_tower) {
    errors.push('Missing resource_tower');
  }

  // Validate cost values
  const monthlyConst = parseFloat(pool.monthly_cost) || 0;
  const annualCost = parseFloat(pool.annual_cost) || 0;

  if (monthlyConst < 0) {
    errors.push(`Negative monthly_cost: ${monthlyCost}`);
  }

  if (annualCost < 0) {
    errors.push(`Negative annual_cost: ${annualCost}`);
  }

  // Validate annual cost is approximately 12x monthly (allow 10% variance)
  if (monthlyConst > 0 && annualCost > 0) {
    const expectedAnnual = monthlyConst * 12;
    const variance = Math.abs(annualCost - expectedAnnual) / expectedAnnual;
    if (variance > 0.10) {
      errors.push(
        `Annual cost mismatch: expected ${expectedAnnual.toFixed(2)}, got ${annualCost}`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Enrich cost pool metadata with CI mappings and allocation details
 */
async function enrichCostPoolMetadata(pool: any): Promise<{
  enriched: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  let enriched = false;

  const pgClient = getPostgresClient();
  const poolInstance = pgClient.getPool();

  try {
    const metadata = pool.metadata || {};

    // If this is a resource-specific cost pool, verify the CI exists
    if (pool.pool_name.startsWith('AWS-Resource-') ||
        pool.pool_name.startsWith('Azure-Resource-') ||
        pool.pool_name.startsWith('GCP-Resource-')) {

      const resourceId = metadata.resourceId || metadata.resource_id;
      if (resourceId) {
        // Check if CI exists in dim_ci
        const ciResult = await poolInstance.query(
          `SELECT ci_key, ci_name, ci_type
           FROM cmdb.dim_ci
           WHERE external_id = $1 AND is_current = true
           LIMIT 1`,
          [resourceId]
        );

        if (ciResult.rows.length > 0) {
          const ci = ciResult.rows[0];
          metadata.ci_key = ci.ci_key;
          metadata.ci_name = ci.ci_name;
          metadata.ci_type = ci.ci_type;
          metadata.ci_validated = true;
          metadata.ci_validated_at = new Date().toISOString();

          // Update cost pool metadata
          await poolInstance.query(
            `UPDATE tbm_cost_pools
             SET metadata = $1,
                 updated_at = NOW()
             WHERE id = $2`,
            [JSON.stringify(metadata), pool.id]
          );

          enriched = true;
          logger.debug('[SyncCostsToDatamart] Enriched cost pool with CI mapping', {
            pool_name: pool.pool_name,
            ci_key: ci.ci_key,
            ci_name: ci.ci_name,
          });
        } else {
          errors.push(`CI not found for resource: ${resourceId}`);
        }
      }
    }

    return { enriched, errors };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    errors.push(`Enrichment failed: ${errorMsg}`);
    return { enriched, errors };
  }
}

/**
 * Job configuration for BullMQ
 */
export const syncCostsJobConfig = {
  jobName: 'sync-costs-to-datamart',
  defaultOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5 seconds
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs for debugging
  },
  cronSchedule: '0 4 * * *', // Daily at 4:00 AM UTC (after cost sync jobs)
};
