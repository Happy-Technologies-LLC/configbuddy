import { Gauge, Histogram } from 'prom-client';
export declare const eventLoopLag: Gauge<string>;
export declare const heapMemoryUsage: Gauge<"type">;
export declare const heapMemoryTotal: Gauge<string>;
export declare const externalMemoryUsage: Gauge<string>;
export declare const cpuUsagePercent: Gauge<string>;
export declare const systemMemoryUsage: Gauge<"type">;
export declare const systemLoadAverage: Gauge<"period">;
export declare const processUptime: Gauge<string>;
export declare const activeHandles: Gauge<string>;
export declare const activeRequests: Gauge<string>;
export declare const fileDescriptors: Gauge<string>;
export declare const gcDuration: Histogram<"gc_type">;
export declare const collectSystemMetrics: () => void;
export declare const measureEventLoopLag: () => void;
export declare const startSystemMetricsCollection: (intervalMs?: number) => NodeJS.Timer;
export declare const recordGCEvent: (gcType: string, duration: number) => void;
export declare const updateActiveResources: () => void;
//# sourceMappingURL=system-metrics.d.ts.map