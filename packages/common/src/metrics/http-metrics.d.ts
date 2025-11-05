import { Counter, Histogram, Gauge } from 'prom-client';
export declare const httpRequestDuration: Histogram<"method" | "route" | "status_code">;
export declare const httpRequestTotal: Counter<"method" | "route" | "status_code">;
export declare const httpRequestSize: Histogram<"method" | "route">;
export declare const httpResponseSize: Histogram<"method" | "route">;
export declare const httpActiveConnections: Gauge<string>;
export declare const recordHttpMetrics: (method: string, _route: string, _statusCode: number, _duration: number, requestSize?: number, responseSize?: number) => void;
//# sourceMappingURL=http-metrics.d.ts.map