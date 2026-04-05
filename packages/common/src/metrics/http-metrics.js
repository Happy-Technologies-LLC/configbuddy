// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordHttpMetrics = exports.httpActiveConnections = exports.httpResponseSize = exports.httpRequestSize = exports.httpRequestTotal = exports.httpRequestDuration = void 0;
const prom_client_1 = require("prom-client");
const registry_1 = require("./registry");
const registry = (0, registry_1.getMetricsRegistry)().register;
exports.httpRequestDuration = new prom_client_1.Histogram({
    name: 'cmdb_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [registry],
});
exports.httpRequestTotal = new prom_client_1.Counter({
    name: 'cmdb_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [registry],
});
exports.httpRequestSize = new prom_client_1.Histogram({
    name: 'cmdb_http_request_size_bytes',
    help: 'Size of HTTP requests in bytes',
    labelNames: ['method', 'route'],
    buckets: [100, 1000, 10000, 100000, 1000000],
    registers: [registry],
});
exports.httpResponseSize = new prom_client_1.Histogram({
    name: 'cmdb_http_response_size_bytes',
    help: 'Size of HTTP responses in bytes',
    labelNames: ['method', 'route'],
    buckets: [100, 1000, 10000, 100000, 1000000, 10000000],
    registers: [registry],
});
exports.httpActiveConnections = new prom_client_1.Gauge({
    name: 'cmdb_http_active_connections',
    help: 'Number of active HTTP connections',
    registers: [registry],
});
const recordHttpMetrics = (method, _route, _statusCode, _duration, requestSize, responseSize) => {
    const labels = { method, route: _route, status_code: _statusCode.toString() };
    exports.httpRequestDuration.observe(labels, _duration);
    exports.httpRequestTotal.inc(labels);
    if (requestSize !== undefined) {
        exports.httpRequestSize.observe({ method, route: _route }, requestSize);
    }
    if (responseSize !== undefined) {
        exports.httpResponseSize.observe({ method, route: _route }, responseSize);
    }
};
exports.recordHttpMetrics = recordHttpMetrics;
//# sourceMappingURL=http-metrics.js.map