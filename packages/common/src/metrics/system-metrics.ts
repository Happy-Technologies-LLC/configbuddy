// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * System Metrics
 * Tracks CPU, memory, event loop, and system health
 */

import { Gauge, Histogram } from 'prom-client';
import { getMetricsRegistry } from './registry';
import * as os from 'os';

const registry = getMetricsRegistry().register;

// Event loop lag
export const eventLoopLag = new Gauge({
  name: 'cmdb_event_loop_lag_seconds',
  help: 'Event loop lag in seconds',
  registers: [registry],
});

// Heap memory usage
export const heapMemoryUsage = new Gauge({
  name: 'cmdb_heap_memory_usage_bytes',
  help: 'Heap memory usage in bytes',
  labelNames: ['type'],
  registers: [registry],
});

// Heap memory total
export const heapMemoryTotal = new Gauge({
  name: 'cmdb_heap_memory_total_bytes',
  help: 'Total heap memory in bytes',
  registers: [registry],
});

// External memory usage
export const externalMemoryUsage = new Gauge({
  name: 'cmdb_external_memory_usage_bytes',
  help: 'External memory usage in bytes',
  registers: [registry],
});

// CPU usage percentage
export const cpuUsagePercent = new Gauge({
  name: 'cmdb_cpu_usage_percent',
  help: 'CPU usage percentage',
  registers: [registry],
});

// System memory usage
export const systemMemoryUsage = new Gauge({
  name: 'cmdb_system_memory_bytes',
  help: 'System memory usage in bytes',
  labelNames: ['type'],
  registers: [registry],
});

// System load average
export const systemLoadAverage = new Gauge({
  name: 'cmdb_system_load_average',
  help: 'System load average',
  labelNames: ['period'],
  registers: [registry],
});

// Process uptime
export const processUptime = new Gauge({
  name: 'cmdb_process_uptime_seconds',
  help: 'Process uptime in seconds',
  registers: [registry],
});

// Active handles
export const activeHandles = new Gauge({
  name: 'cmdb_active_handles',
  help: 'Number of active handles',
  registers: [registry],
});

// Active requests
export const activeRequests = new Gauge({
  name: 'cmdb_active_requests',
  help: 'Number of active requests',
  registers: [registry],
});

// File descriptor usage
export const fileDescriptors = new Gauge({
  name: 'cmdb_file_descriptors',
  help: 'Number of open file descriptors',
  registers: [registry],
});

// GC duration
export const gcDuration = new Histogram({
  name: 'cmdb_gc_duration_seconds',
  help: 'Garbage collection duration in seconds',
  labelNames: ['gc_type'],
  buckets: [0.001, 0.01, 0.1, 1, 2, 5],
  registers: [registry],
});

/**
 * Collect and update system metrics
 */
export const collectSystemMetrics = (): void => {
  // Memory usage
  const memUsage = process.memoryUsage();
  heapMemoryUsage.set({ type: 'used' }, memUsage.heapUsed);
  heapMemoryUsage.set({ type: 'total' }, memUsage.heapTotal);
  heapMemoryTotal.set(memUsage.heapTotal);
  externalMemoryUsage.set(memUsage.external);

  // System memory
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  systemMemoryUsage.set({ type: 'total' }, totalMem);
  systemMemoryUsage.set({ type: 'free' }, freeMem);
  systemMemoryUsage.set({ type: 'used' }, totalMem - freeMem);

  // Load average
  const loadAvg = os.loadavg();
  systemLoadAverage.set({ period: '1m' }, loadAvg[0] || 0);
  systemLoadAverage.set({ period: '5m' }, loadAvg[1] || 0);
  systemLoadAverage.set({ period: '15m' }, loadAvg[2] || 0);

  // Process uptime
  processUptime.set(process.uptime());
};

/**
 * Measure event loop lag
 */
export const measureEventLoopLag = (): void => {
  const start = Date.now();
  setImmediate(() => {
    const lag = (Date.now() - start) / 1000;
    eventLoopLag.set(lag);
  });
};

/**
 * Start collecting system metrics at regular intervals
 */
export const startSystemMetricsCollection = (intervalMs: number = 5000): NodeJS.Timer => {
  const timer = setInterval(() => {
    collectSystemMetrics();
    measureEventLoopLag();
  }, intervalMs);

  // Initial collection
  collectSystemMetrics();
  measureEventLoopLag();

  return timer;
};

/**
 * Record GC event
 */
export const recordGCEvent = (gcType: string, duration: number): void => {
  gcDuration.observe({ gc_type: gcType }, duration);
};

/**
 * Update active handles and requests
 */
export const updateActiveResources = (): void => {
  if (typeof (process as any)._getActiveHandles === 'function') {
    activeHandles.set((process as any)._getActiveHandles().length);
  }
  if (typeof (process as any)._getActiveRequests === 'function') {
    activeRequests.set((process as any)._getActiveRequests().length);
  }
};
