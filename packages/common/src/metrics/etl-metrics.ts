// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * ETL Job Metrics
 * Tracks ETL operations, sync lag, and data quality
 */

import { Counter, Histogram, Gauge } from 'prom-client';
import { getMetricsRegistry } from './registry';

const registry = getMetricsRegistry().register;

// ETL job duration
export const etlJobDuration = new Histogram({
  name: 'cmdb_etl_job_duration_seconds',
  help: 'Duration of ETL jobs in seconds',
  labelNames: ['job_type', 'status'],
  buckets: [1, 5, 10, 30, 60, 120, 300, 600, 1800, 3600],
  registers: [registry],
});

// ETL jobs total
export const etlJobsTotal = new Counter({
  name: 'cmdb_etl_jobs_total',
  help: 'Total number of ETL jobs',
  labelNames: ['job_type', 'status'],
  registers: [registry],
});

// Records processed
export const etlRecordsProcessed = new Counter({
  name: 'cmdb_etl_records_processed_total',
  help: 'Total number of records processed by ETL',
  labelNames: ['job_type', 'operation'],
  registers: [registry],
});

// CIs synced
export const cisSynced = new Counter({
  name: 'cmdb_cis_synced_total',
  help: 'Total number of CIs synced to data mart',
  labelNames: ['ci_type', 'operation'],
  registers: [registry],
});

// ETL sync lag (time since last sync)
export const etlSyncLag = new Gauge({
  name: 'cmdb_etl_sync_lag_seconds',
  help: 'Time since last successful ETL sync in seconds',
  labelNames: ['job_type'],
  registers: [registry],
});

// Data quality score
export const dataQualityScore = new Gauge({
  name: 'cmdb_data_quality_score',
  help: 'Data quality score (0-1)',
  labelNames: ['dimension', 'ci_type'],
  registers: [registry],
});

// Change detection rate
export const changeDetectionRate = new Counter({
  name: 'cmdb_changes_detected_total',
  help: 'Total number of changes detected',
  labelNames: ['change_type', 'ci_type'],
  registers: [registry],
});

// ETL errors
export const etlErrors = new Counter({
  name: 'cmdb_etl_errors_total',
  help: 'Total number of ETL errors',
  labelNames: ['job_type', 'error_type'],
  registers: [registry],
});

// Active ETL jobs
export const activeEtlJobs = new Gauge({
  name: 'cmdb_etl_jobs_active',
  help: 'Number of currently active ETL jobs',
  labelNames: ['job_type'],
  registers: [registry],
});

// ETL batch size
export const etlBatchSize = new Histogram({
  name: 'cmdb_etl_batch_size',
  help: 'Size of ETL processing batches',
  labelNames: ['job_type'],
  buckets: [10, 50, 100, 500, 1000, 5000, 10000],
  registers: [registry],
});

/**
 * Record ETL job metrics
 */
export const recordEtlJob = (
  _jobType: string,
  _status: 'success' | 'failure',
  _duration: number,
  _recordsProcessed: number
): void => {
  etlJobDuration.observe({ job_type: _jobType, status: _status }, _duration);
  etlJobsTotal.inc({ job_type: _jobType, status: _status });
  etlRecordsProcessed.inc({ job_type: _jobType, operation: 'processed' }, _recordsProcessed);
};

/**
 * Record CI sync
 */
export const recordCiSync = (
  _ciType: string,
  _operation: 'insert' | 'update' | 'delete'
): void => {
  cisSynced.inc({ ci_type: _ciType, operation: _operation });
};

/**
 * Update ETL sync lag
 */
export const updateEtlSyncLag = (jobType: string, lagSeconds: number): void => {
  etlSyncLag.set({ job_type: jobType }, lagSeconds);
};

/**
 * Update data quality score
 */
export const updateDataQualityScore = (
  _dimension: string,
  _ciType: string,
  _score: number
): void => {
  dataQualityScore.set({ dimension: _dimension, ci_type: _ciType }, _score);
};

/**
 * Record change detection
 */
export const recordChangeDetection = (
  _changeType: 'create' | 'update' | 'delete',
  _ciType: string
): void => {
  changeDetectionRate.inc({ change_type: _changeType, ci_type: _ciType });
};

/**
 * Record ETL error
 */
export const recordEtlError = (jobType: string, errorType: string): void => {
  etlErrors.inc({ job_type: jobType, error_type: errorType });
};

/**
 * Update active ETL jobs
 */
export const updateActiveEtlJobs = (jobType: string, count: number): void => {
  activeEtlJobs.set({ job_type: jobType }, count);
};

/**
 * Record ETL batch size
 */
export const recordEtlBatchSize = (jobType: string, size: number): void => {
  etlBatchSize.observe({ job_type: jobType }, size);
};
