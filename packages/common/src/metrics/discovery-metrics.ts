// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Discovery Job Metrics
 * Tracks discovery operations, CI counts, and confidence scores
 */

import { Counter, Histogram, Gauge } from 'prom-client';
import { getMetricsRegistry } from './registry';

const registry = getMetricsRegistry().register;

// Discovery job duration
export const discoveryJobDuration = new Histogram({
  name: 'cmdb_discovery_job_duration_seconds',
  help: 'Duration of discovery jobs in seconds',
  labelNames: ['provider', 'job_type', 'status'],
  buckets: [1, 5, 10, 30, 60, 120, 300, 600, 1800, 3600],
  registers: [registry],
});

// Discovery jobs total
export const discoveryJobsTotal = new Counter({
  name: 'cmdb_discovery_jobs_total',
  help: 'Total number of discovery jobs',
  labelNames: ['provider', 'job_type', 'status'],
  registers: [registry],
});

// CIs discovered
export const cisDiscovered = new Counter({
  name: 'cmdb_cis_discovered_total',
  help: 'Total number of CIs discovered',
  labelNames: ['provider', 'ci_type'],
  registers: [registry],
});

// Discovery confidence score
export const discoveryConfidenceScore = new Histogram({
  name: 'cmdb_discovery_confidence_score',
  help: 'Confidence score of discovered CIs',
  labelNames: ['provider', 'ci_type'],
  buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1.0],
  registers: [registry],
});

// Active discovery jobs
export const activeDiscoveryJobs = new Gauge({
  name: 'cmdb_discovery_jobs_active',
  help: 'Number of currently active discovery jobs',
  labelNames: ['provider'],
  registers: [registry],
});

// Discovery errors
export const discoveryErrors = new Counter({
  name: 'cmdb_discovery_errors_total',
  help: 'Total number of discovery errors',
  labelNames: ['provider', 'error_type'],
  registers: [registry],
});

// Discovery API calls
export const discoveryApiCalls = new Counter({
  name: 'cmdb_discovery_api_calls_total',
  help: 'Total number of cloud provider API calls',
  labelNames: ['provider', 'service', 'operation'],
  registers: [registry],
});

// Discovery API rate limit hits
export const discoveryRateLimitHits = new Counter({
  name: 'cmdb_discovery_rate_limit_hits_total',
  help: 'Number of times discovery hit rate limits',
  labelNames: ['provider', 'service'],
  registers: [registry],
});

/**
 * Record discovery job metrics
 */
export const recordDiscoveryJob = (
  _provider: string,
  _jobType: string,
  _status: 'success' | 'failure',
  _duration: number
): void => {
  const labels = { provider: _provider, job_type: _jobType, status: _status };
  discoveryJobDuration.observe(labels, _duration);
  discoveryJobsTotal.inc(labels);
};

/**
 * Record discovered CI
 */
export const recordDiscoveredCI = (
  _provider: string,
  _ciType: string,
  _confidenceScore: number
): void => {
  cisDiscovered.inc({ provider: _provider, ci_type: _ciType });
  discoveryConfidenceScore.observe({ provider: _provider, ci_type: _ciType }, _confidenceScore);
};

/**
 * Update active discovery jobs gauge
 */
export const updateActiveDiscoveryJobs = (provider: string, count: number): void => {
  activeDiscoveryJobs.set({ provider }, count);
};

/**
 * Record discovery error
 */
export const recordDiscoveryError = (provider: string, errorType: string): void => {
  discoveryErrors.inc({ provider, error_type: errorType });
};

/**
 * Record discovery API call
 */
export const recordDiscoveryApiCall = (
  _provider: string,
  _service: string,
  _operation: string
): void => {
  discoveryApiCalls.inc({ provider: _provider, service: _service, operation: _operation });
};

/**
 * Record rate limit hit
 */
export const recordRateLimitHit = (provider: string, service: string): void => {
  discoveryRateLimitHits.inc({ provider, service });
};
