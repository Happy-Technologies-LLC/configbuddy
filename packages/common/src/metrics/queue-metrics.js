"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordStalledJob = exports.recordJobRetry = exports.recordQueueError = exports.updateQueueThroughput = exports.updateQueueWorkers = exports.updateQueueStatus = exports.recordQueueJob = exports.queueJobStalled = exports.queueJobRetries = exports.queueErrors = exports.queueThroughput = exports.queueWorkersActive = exports.queueJobWaitTime = exports.queueJobsFailed = exports.queueJobsCompleted = exports.queueJobsActive = exports.queueJobsWaiting = exports.queueJobsTotal = exports.queueJobDuration = void 0;
const prom_client_1 = require("prom-client");
const registry_1 = require("./registry");
const registry = (0, registry_1.getMetricsRegistry)().register;
exports.queueJobDuration = new prom_client_1.Histogram({
    name: 'cmdb_queue_job_duration_seconds',
    help: 'Duration of queue job processing in seconds',
    labelNames: ['queue', 'job_name', 'status'],
    buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300, 600],
    registers: [registry],
});
exports.queueJobsTotal = new prom_client_1.Counter({
    name: 'cmdb_queue_jobs_total',
    help: 'Total number of queue jobs',
    labelNames: ['queue', 'job_name', 'status'],
    registers: [registry],
});
exports.queueJobsWaiting = new prom_client_1.Gauge({
    name: 'cmdb_queue_jobs_waiting',
    help: 'Number of jobs waiting in queue',
    labelNames: ['queue'],
    registers: [registry],
});
exports.queueJobsActive = new prom_client_1.Gauge({
    name: 'cmdb_queue_jobs_active',
    help: 'Number of jobs currently being processed',
    labelNames: ['queue'],
    registers: [registry],
});
exports.queueJobsCompleted = new prom_client_1.Gauge({
    name: 'cmdb_queue_jobs_completed',
    help: 'Number of completed jobs in queue',
    labelNames: ['queue'],
    registers: [registry],
});
exports.queueJobsFailed = new prom_client_1.Gauge({
    name: 'cmdb_queue_jobs_failed',
    help: 'Number of failed jobs in queue',
    labelNames: ['queue'],
    registers: [registry],
});
exports.queueJobWaitTime = new prom_client_1.Histogram({
    name: 'cmdb_queue_job_wait_time_seconds',
    help: 'Time jobs spend waiting in queue before processing',
    labelNames: ['queue', 'job_name'],
    buckets: [1, 5, 10, 30, 60, 300, 600, 1800, 3600],
    registers: [registry],
});
exports.queueWorkersActive = new prom_client_1.Gauge({
    name: 'cmdb_queue_workers_active',
    help: 'Number of active workers for queue',
    labelNames: ['queue'],
    registers: [registry],
});
exports.queueThroughput = new prom_client_1.Gauge({
    name: 'cmdb_queue_throughput_jobs_per_second',
    help: 'Queue throughput in jobs per second',
    labelNames: ['queue'],
    registers: [registry],
});
exports.queueErrors = new prom_client_1.Counter({
    name: 'cmdb_queue_errors_total',
    help: 'Total number of queue errors',
    labelNames: ['queue', 'error_type'],
    registers: [registry],
});
exports.queueJobRetries = new prom_client_1.Counter({
    name: 'cmdb_queue_job_retries_total',
    help: 'Total number of job retries',
    labelNames: ['queue', 'job_name'],
    registers: [registry],
});
exports.queueJobStalled = new prom_client_1.Counter({
    name: 'cmdb_queue_jobs_stalled_total',
    help: 'Total number of stalled jobs',
    labelNames: ['queue'],
    registers: [registry],
});
const recordQueueJob = (_queue, _jobName, _status, _duration, waitTime) => {
    exports.queueJobDuration.observe({ queue: _queue, job_name: _jobName, status: _status }, _duration);
    exports.queueJobsTotal.inc({ queue: _queue, job_name: _jobName, status: _status });
    if (waitTime !== undefined) {
        exports.queueJobWaitTime.observe({ queue: _queue, job_name: _jobName }, waitTime);
    }
};
exports.recordQueueJob = recordQueueJob;
const updateQueueStatus = (_queue, _waiting, _active, _completed, _failed) => {
    exports.queueJobsWaiting.set({ queue: _queue }, _waiting);
    exports.queueJobsActive.set({ queue: _queue }, _active);
    exports.queueJobsCompleted.set({ queue: _queue }, _completed);
    exports.queueJobsFailed.set({ queue: _queue }, _failed);
};
exports.updateQueueStatus = updateQueueStatus;
const updateQueueWorkers = (queue, count) => {
    exports.queueWorkersActive.set({ queue }, count);
};
exports.updateQueueWorkers = updateQueueWorkers;
const updateQueueThroughput = (queue, jobsPerSecond) => {
    exports.queueThroughput.set({ queue }, jobsPerSecond);
};
exports.updateQueueThroughput = updateQueueThroughput;
const recordQueueError = (queue, errorType) => {
    exports.queueErrors.inc({ queue, error_type: errorType });
};
exports.recordQueueError = recordQueueError;
const recordJobRetry = (queue, jobName) => {
    exports.queueJobRetries.inc({ queue, job_name: jobName });
};
exports.recordJobRetry = recordJobRetry;
const recordStalledJob = (queue) => {
    exports.queueJobStalled.inc({ queue });
};
exports.recordStalledJob = recordStalledJob;
//# sourceMappingURL=queue-metrics.js.map