/**
 * HTTP Request Metrics
 * Tracks HTTP request duration, count, and status codes
 */

import { Counter, Histogram, Gauge } from 'prom-client';
import { getMetricsRegistry } from './registry';

const registry = getMetricsRegistry().register;

// HTTP request duration histogram
export const httpRequestDuration = new Histogram({
  name: 'cmdb_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

// HTTP request counter
export const httpRequestTotal = new Counter({
  name: 'cmdb_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

// HTTP request size
export const httpRequestSize = new Histogram({
  name: 'cmdb_http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [registry],
});

// HTTP response size
export const httpResponseSize = new Histogram({
  name: 'cmdb_http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 10000, 100000, 1000000, 10000000],
  registers: [registry],
});

// Active HTTP connections
export const httpActiveConnections = new Gauge({
  name: 'cmdb_http_active_connections',
  help: 'Number of active HTTP connections',
  registers: [registry],
});

/**
 * Middleware to record HTTP metrics
 */
export const recordHttpMetrics = (
  method: string,
  _route: string,
  _statusCode: number,
  _duration: number,
  requestSize?: number,
  responseSize?: number
): void => {
  const labels = { method, route: _route, status_code: _statusCode.toString() };

  httpRequestDuration.observe(labels, _duration);
  httpRequestTotal.inc(labels);

  if (requestSize !== undefined) {
    httpRequestSize.observe({ method, route: _route }, requestSize);
  }

  if (responseSize !== undefined) {
    httpResponseSize.observe({ method, route: _route }, responseSize);
  }
};
