// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordRateLimitHit = exports.recordDiscoveryApiCall = exports.recordDiscoveryError = exports.updateActiveDiscoveryJobs = exports.recordDiscoveredCI = exports.recordDiscoveryJob = exports.discoveryRateLimitHits = exports.discoveryApiCalls = exports.discoveryErrors = exports.activeDiscoveryJobs = exports.discoveryConfidenceScore = exports.cisDiscovered = exports.discoveryJobsTotal = exports.discoveryJobDuration = void 0;
const prom_client_1 = require("prom-client");
const registry_1 = require("./registry");
const registry = (0, registry_1.getMetricsRegistry)().register;
exports.discoveryJobDuration = new prom_client_1.Histogram({
    name: 'cmdb_discovery_job_duration_seconds',
    help: 'Duration of discovery jobs in seconds',
    labelNames: ['provider', 'job_type', 'status'],
    buckets: [1, 5, 10, 30, 60, 120, 300, 600, 1800, 3600],
    registers: [registry],
});
exports.discoveryJobsTotal = new prom_client_1.Counter({
    name: 'cmdb_discovery_jobs_total',
    help: 'Total number of discovery jobs',
    labelNames: ['provider', 'job_type', 'status'],
    registers: [registry],
});
exports.cisDiscovered = new prom_client_1.Counter({
    name: 'cmdb_cis_discovered_total',
    help: 'Total number of CIs discovered',
    labelNames: ['provider', 'ci_type'],
    registers: [registry],
});
exports.discoveryConfidenceScore = new prom_client_1.Histogram({
    name: 'cmdb_discovery_confidence_score',
    help: 'Confidence score of discovered CIs',
    labelNames: ['provider', 'ci_type'],
    buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1.0],
    registers: [registry],
});
exports.activeDiscoveryJobs = new prom_client_1.Gauge({
    name: 'cmdb_discovery_jobs_active',
    help: 'Number of currently active discovery jobs',
    labelNames: ['provider'],
    registers: [registry],
});
exports.discoveryErrors = new prom_client_1.Counter({
    name: 'cmdb_discovery_errors_total',
    help: 'Total number of discovery errors',
    labelNames: ['provider', 'error_type'],
    registers: [registry],
});
exports.discoveryApiCalls = new prom_client_1.Counter({
    name: 'cmdb_discovery_api_calls_total',
    help: 'Total number of cloud provider API calls',
    labelNames: ['provider', 'service', 'operation'],
    registers: [registry],
});
exports.discoveryRateLimitHits = new prom_client_1.Counter({
    name: 'cmdb_discovery_rate_limit_hits_total',
    help: 'Number of times discovery hit rate limits',
    labelNames: ['provider', 'service'],
    registers: [registry],
});
const recordDiscoveryJob = (_provider, _jobType, _status, _duration) => {
    const labels = { provider: _provider, job_type: _jobType, status: _status };
    exports.discoveryJobDuration.observe(labels, _duration);
    exports.discoveryJobsTotal.inc(labels);
};
exports.recordDiscoveryJob = recordDiscoveryJob;
const recordDiscoveredCI = (_provider, _ciType, _confidenceScore) => {
    exports.cisDiscovered.inc({ provider: _provider, ci_type: _ciType });
    exports.discoveryConfidenceScore.observe({ provider: _provider, ci_type: _ciType }, _confidenceScore);
};
exports.recordDiscoveredCI = recordDiscoveredCI;
const updateActiveDiscoveryJobs = (provider, count) => {
    exports.activeDiscoveryJobs.set({ provider }, count);
};
exports.updateActiveDiscoveryJobs = updateActiveDiscoveryJobs;
const recordDiscoveryError = (provider, errorType) => {
    exports.discoveryErrors.inc({ provider, error_type: errorType });
};
exports.recordDiscoveryError = recordDiscoveryError;
const recordDiscoveryApiCall = (_provider, _service, _operation) => {
    exports.discoveryApiCalls.inc({ provider: _provider, service: _service, operation: _operation });
};
exports.recordDiscoveryApiCall = recordDiscoveryApiCall;
const recordRateLimitHit = (provider, service) => {
    exports.discoveryRateLimitHits.inc({ provider, service });
};
exports.recordRateLimitHit = recordRateLimitHit;
//# sourceMappingURL=discovery-metrics.js.map