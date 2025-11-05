/**
 * Queue (BullMQ) Metrics
 * Tracks queue operations, job processing, and worker health
 */

import { Counter, Histogram, Gauge } from 'prom-client';
import { getMetricsRegistry } from './registry';

const registry = getMetricsRegistry().register;

// Queue job duration
export const queueJobDuration = new Histogram({
  name: 'cmdb_queue_job_duration_seconds',
  help: 'Duration of queue job processing in seconds',
  labelNames: ['queue', 'job_name', 'status'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300, 600],
  registers: [registry],
});

// Queue jobs total
export const queueJobsTotal = new Counter({
  name: 'cmdb_queue_jobs_total',
  help: 'Total number of queue jobs',
  labelNames: ['queue', 'job_name', 'status'],
  registers: [registry],
});

// Queue jobs waiting
export const queueJobsWaiting = new Gauge({
  name: 'cmdb_queue_jobs_waiting',
  help: 'Number of jobs waiting in queue',
  labelNames: ['queue'],
  registers: [registry],
});

// Queue jobs active
export const queueJobsActive = new Gauge({
  name: 'cmdb_queue_jobs_active',
  help: 'Number of jobs currently being processed',
  labelNames: ['queue'],
  registers: [registry],
});

// Queue jobs completed
export const queueJobsCompleted = new Gauge({
  name: 'cmdb_queue_jobs_completed',
  help: 'Number of completed jobs in queue',
  labelNames: ['queue'],
  registers: [registry],
});

// Queue jobs failed
export const queueJobsFailed = new Gauge({
  name: 'cmdb_queue_jobs_failed',
  help: 'Number of failed jobs in queue',
  labelNames: ['queue'],
  registers: [registry],
});

// Queue job wait time
export const queueJobWaitTime = new Histogram({
  name: 'cmdb_queue_job_wait_time_seconds',
  help: 'Time jobs spend waiting in queue before processing',
  labelNames: ['queue', 'job_name'],
  buckets: [1, 5, 10, 30, 60, 300, 600, 1800, 3600],
  registers: [registry],
});

// Queue workers active
export const queueWorkersActive = new Gauge({
  name: 'cmdb_queue_workers_active',
  help: 'Number of active workers for queue',
  labelNames: ['queue'],
  registers: [registry],
});

// Queue throughput (jobs per second)
export const queueThroughput = new Gauge({
  name: 'cmdb_queue_throughput_jobs_per_second',
  help: 'Queue throughput in jobs per second',
  labelNames: ['queue'],
  registers: [registry],
});

// Queue errors
export const queueErrors = new Counter({
  name: 'cmdb_queue_errors_total',
  help: 'Total number of queue errors',
  labelNames: ['queue', 'error_type'],
  registers: [registry],
});

// Queue job retries
export const queueJobRetries = new Counter({
  name: 'cmdb_queue_job_retries_total',
  help: 'Total number of job retries',
  labelNames: ['queue', 'job_name'],
  registers: [registry],
});

// Queue job stalledCount
export const queueJobStalled = new Counter({
  name: 'cmdb_queue_jobs_stalled_total',
  help: 'Total number of stalled jobs',
  labelNames: ['queue'],
  registers: [registry],
});

/**
 * Record queue job processing
 */
export const recordQueueJob = (
  _queue: string,
  _jobName: string,
  _status: 'completed' | 'failed',
  _duration: number,
  waitTime?: number
): void => {
  queueJobDuration.observe({ queue: _queue, job_name: _jobName, status: _status }, _duration);
  queueJobsTotal.inc({ queue: _queue, job_name: _jobName, status: _status });

  if (waitTime !== undefined) {
    queueJobWaitTime.observe({ queue: _queue, job_name: _jobName }, waitTime);
  }
};

/**
 * Update queue status metrics
 */
export const updateQueueStatus = (
  _queue: string,
  _waiting: number,
  _active: number,
  _completed: number,
  _failed: number
): void => {
  queueJobsWaiting.set({ queue: _queue }, _waiting);
  queueJobsActive.set({ queue: _queue }, _active);
  queueJobsCompleted.set({ queue: _queue }, _completed);
  queueJobsFailed.set({ queue: _queue }, _failed);
};

/**
 * Update queue workers
 */
export const updateQueueWorkers = (queue: string, count: number): void => {
  queueWorkersActive.set({ queue }, count);
};

/**
 * Update queue throughput
 */
export const updateQueueThroughput = (queue: string, jobsPerSecond: number): void => {
  queueThroughput.set({ queue }, jobsPerSecond);
};

/**
 * Record queue error
 */
export const recordQueueError = (queue: string, errorType: string): void => {
  queueErrors.inc({ queue, error_type: errorType });
};

/**
 * Record job retry
 */
export const recordJobRetry = (queue: string, jobName: string): void => {
  queueJobRetries.inc({ queue, job_name: jobName });
};

/**
 * Record stalled job
 */
export const recordStalledJob = (queue: string): void => {
  queueJobStalled.inc({ queue });
};
