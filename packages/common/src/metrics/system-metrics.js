"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateActiveResources = exports.recordGCEvent = exports.startSystemMetricsCollection = exports.measureEventLoopLag = exports.collectSystemMetrics = exports.gcDuration = exports.fileDescriptors = exports.activeRequests = exports.activeHandles = exports.processUptime = exports.systemLoadAverage = exports.systemMemoryUsage = exports.cpuUsagePercent = exports.externalMemoryUsage = exports.heapMemoryTotal = exports.heapMemoryUsage = exports.eventLoopLag = void 0;
const tslib_1 = require("tslib");
const prom_client_1 = require("prom-client");
const registry_1 = require("./registry");
const os = tslib_1.__importStar(require("os"));
const registry = (0, registry_1.getMetricsRegistry)().register;
exports.eventLoopLag = new prom_client_1.Gauge({
    name: 'cmdb_event_loop_lag_seconds',
    help: 'Event loop lag in seconds',
    registers: [registry],
});
exports.heapMemoryUsage = new prom_client_1.Gauge({
    name: 'cmdb_heap_memory_usage_bytes',
    help: 'Heap memory usage in bytes',
    labelNames: ['type'],
    registers: [registry],
});
exports.heapMemoryTotal = new prom_client_1.Gauge({
    name: 'cmdb_heap_memory_total_bytes',
    help: 'Total heap memory in bytes',
    registers: [registry],
});
exports.externalMemoryUsage = new prom_client_1.Gauge({
    name: 'cmdb_external_memory_usage_bytes',
    help: 'External memory usage in bytes',
    registers: [registry],
});
exports.cpuUsagePercent = new prom_client_1.Gauge({
    name: 'cmdb_cpu_usage_percent',
    help: 'CPU usage percentage',
    registers: [registry],
});
exports.systemMemoryUsage = new prom_client_1.Gauge({
    name: 'cmdb_system_memory_bytes',
    help: 'System memory usage in bytes',
    labelNames: ['type'],
    registers: [registry],
});
exports.systemLoadAverage = new prom_client_1.Gauge({
    name: 'cmdb_system_load_average',
    help: 'System load average',
    labelNames: ['period'],
    registers: [registry],
});
exports.processUptime = new prom_client_1.Gauge({
    name: 'cmdb_process_uptime_seconds',
    help: 'Process uptime in seconds',
    registers: [registry],
});
exports.activeHandles = new prom_client_1.Gauge({
    name: 'cmdb_active_handles',
    help: 'Number of active handles',
    registers: [registry],
});
exports.activeRequests = new prom_client_1.Gauge({
    name: 'cmdb_active_requests',
    help: 'Number of active requests',
    registers: [registry],
});
exports.fileDescriptors = new prom_client_1.Gauge({
    name: 'cmdb_file_descriptors',
    help: 'Number of open file descriptors',
    registers: [registry],
});
exports.gcDuration = new prom_client_1.Histogram({
    name: 'cmdb_gc_duration_seconds',
    help: 'Garbage collection duration in seconds',
    labelNames: ['gc_type'],
    buckets: [0.001, 0.01, 0.1, 1, 2, 5],
    registers: [registry],
});
const collectSystemMetrics = () => {
    const memUsage = process.memoryUsage();
    exports.heapMemoryUsage.set({ type: 'used' }, memUsage.heapUsed);
    exports.heapMemoryUsage.set({ type: 'total' }, memUsage.heapTotal);
    exports.heapMemoryTotal.set(memUsage.heapTotal);
    exports.externalMemoryUsage.set(memUsage.external);
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    exports.systemMemoryUsage.set({ type: 'total' }, totalMem);
    exports.systemMemoryUsage.set({ type: 'free' }, freeMem);
    exports.systemMemoryUsage.set({ type: 'used' }, totalMem - freeMem);
    const loadAvg = os.loadavg();
    exports.systemLoadAverage.set({ period: '1m' }, loadAvg[0] || 0);
    exports.systemLoadAverage.set({ period: '5m' }, loadAvg[1] || 0);
    exports.systemLoadAverage.set({ period: '15m' }, loadAvg[2] || 0);
    exports.processUptime.set(process.uptime());
};
exports.collectSystemMetrics = collectSystemMetrics;
const measureEventLoopLag = () => {
    const start = Date.now();
    setImmediate(() => {
        const lag = (Date.now() - start) / 1000;
        exports.eventLoopLag.set(lag);
    });
};
exports.measureEventLoopLag = measureEventLoopLag;
const startSystemMetricsCollection = (intervalMs = 5000) => {
    const timer = setInterval(() => {
        (0, exports.collectSystemMetrics)();
        (0, exports.measureEventLoopLag)();
    }, intervalMs);
    (0, exports.collectSystemMetrics)();
    (0, exports.measureEventLoopLag)();
    return timer;
};
exports.startSystemMetricsCollection = startSystemMetricsCollection;
const recordGCEvent = (gcType, duration) => {
    exports.gcDuration.observe({ gc_type: gcType }, duration);
};
exports.recordGCEvent = recordGCEvent;
const updateActiveResources = () => {
    if (typeof process._getActiveHandles === 'function') {
        exports.activeHandles.set(process._getActiveHandles().length);
    }
    if (typeof process._getActiveRequests === 'function') {
        exports.activeRequests.set(process._getActiveRequests().length);
    }
};
exports.updateActiveResources = updateActiveResources;
//# sourceMappingURL=system-metrics.js.map