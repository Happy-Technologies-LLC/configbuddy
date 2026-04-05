// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordEtlBatchSize = exports.updateActiveEtlJobs = exports.recordEtlError = exports.recordChangeDetection = exports.updateDataQualityScore = exports.updateEtlSyncLag = exports.recordCiSync = exports.recordEtlJob = exports.etlBatchSize = exports.activeEtlJobs = exports.etlErrors = exports.changeDetectionRate = exports.dataQualityScore = exports.etlSyncLag = exports.cisSynced = exports.etlRecordsProcessed = exports.etlJobsTotal = exports.etlJobDuration = void 0;
const prom_client_1 = require("prom-client");
const registry_1 = require("./registry");
const registry = (0, registry_1.getMetricsRegistry)().register;
exports.etlJobDuration = new prom_client_1.Histogram({
    name: 'cmdb_etl_job_duration_seconds',
    help: 'Duration of ETL jobs in seconds',
    labelNames: ['job_type', 'status'],
    buckets: [1, 5, 10, 30, 60, 120, 300, 600, 1800, 3600],
    registers: [registry],
});
exports.etlJobsTotal = new prom_client_1.Counter({
    name: 'cmdb_etl_jobs_total',
    help: 'Total number of ETL jobs',
    labelNames: ['job_type', 'status'],
    registers: [registry],
});
exports.etlRecordsProcessed = new prom_client_1.Counter({
    name: 'cmdb_etl_records_processed_total',
    help: 'Total number of records processed by ETL',
    labelNames: ['job_type', 'operation'],
    registers: [registry],
});
exports.cisSynced = new prom_client_1.Counter({
    name: 'cmdb_cis_synced_total',
    help: 'Total number of CIs synced to data mart',
    labelNames: ['ci_type', 'operation'],
    registers: [registry],
});
exports.etlSyncLag = new prom_client_1.Gauge({
    name: 'cmdb_etl_sync_lag_seconds',
    help: 'Time since last successful ETL sync in seconds',
    labelNames: ['job_type'],
    registers: [registry],
});
exports.dataQualityScore = new prom_client_1.Gauge({
    name: 'cmdb_data_quality_score',
    help: 'Data quality score (0-1)',
    labelNames: ['dimension', 'ci_type'],
    registers: [registry],
});
exports.changeDetectionRate = new prom_client_1.Counter({
    name: 'cmdb_changes_detected_total',
    help: 'Total number of changes detected',
    labelNames: ['change_type', 'ci_type'],
    registers: [registry],
});
exports.etlErrors = new prom_client_1.Counter({
    name: 'cmdb_etl_errors_total',
    help: 'Total number of ETL errors',
    labelNames: ['job_type', 'error_type'],
    registers: [registry],
});
exports.activeEtlJobs = new prom_client_1.Gauge({
    name: 'cmdb_etl_jobs_active',
    help: 'Number of currently active ETL jobs',
    labelNames: ['job_type'],
    registers: [registry],
});
exports.etlBatchSize = new prom_client_1.Histogram({
    name: 'cmdb_etl_batch_size',
    help: 'Size of ETL processing batches',
    labelNames: ['job_type'],
    buckets: [10, 50, 100, 500, 1000, 5000, 10000],
    registers: [registry],
});
const recordEtlJob = (_jobType, _status, _duration, _recordsProcessed) => {
    exports.etlJobDuration.observe({ job_type: _jobType, status: _status }, _duration);
    exports.etlJobsTotal.inc({ job_type: _jobType, status: _status });
    exports.etlRecordsProcessed.inc({ job_type: _jobType, operation: 'processed' }, _recordsProcessed);
};
exports.recordEtlJob = recordEtlJob;
const recordCiSync = (_ciType, _operation) => {
    exports.cisSynced.inc({ ci_type: _ciType, operation: _operation });
};
exports.recordCiSync = recordCiSync;
const updateEtlSyncLag = (jobType, lagSeconds) => {
    exports.etlSyncLag.set({ job_type: jobType }, lagSeconds);
};
exports.updateEtlSyncLag = updateEtlSyncLag;
const updateDataQualityScore = (_dimension, _ciType, _score) => {
    exports.dataQualityScore.set({ dimension: _dimension, ci_type: _ciType }, _score);
};
exports.updateDataQualityScore = updateDataQualityScore;
const recordChangeDetection = (_changeType, _ciType) => {
    exports.changeDetectionRate.inc({ change_type: _changeType, ci_type: _ciType });
};
exports.recordChangeDetection = recordChangeDetection;
const recordEtlError = (jobType, errorType) => {
    exports.etlErrors.inc({ job_type: jobType, error_type: errorType });
};
exports.recordEtlError = recordEtlError;
const updateActiveEtlJobs = (jobType, count) => {
    exports.activeEtlJobs.set({ job_type: jobType }, count);
};
exports.updateActiveEtlJobs = updateActiveEtlJobs;
const recordEtlBatchSize = (jobType, size) => {
    exports.etlBatchSize.observe({ job_type: jobType }, size);
};
exports.recordEtlBatchSize = recordEtlBatchSize;
//# sourceMappingURL=etl-metrics.js.map