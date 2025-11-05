import { Counter, Histogram, Gauge } from 'prom-client';
export declare const discoveryJobDuration: Histogram<"status" | "provider" | "job_type">;
export declare const discoveryJobsTotal: Counter<"status" | "provider" | "job_type">;
export declare const cisDiscovered: Counter<"provider" | "ci_type">;
export declare const discoveryConfidenceScore: Histogram<"provider" | "ci_type">;
export declare const activeDiscoveryJobs: Gauge<"provider">;
export declare const discoveryErrors: Counter<"provider" | "error_type">;
export declare const discoveryApiCalls: Counter<"service" | "provider" | "operation">;
export declare const discoveryRateLimitHits: Counter<"service" | "provider">;
export declare const recordDiscoveryJob: (_provider: string, _jobType: string, _status: "success" | "failure", _duration: number) => void;
export declare const recordDiscoveredCI: (_provider: string, _ciType: string, _confidenceScore: number) => void;
export declare const updateActiveDiscoveryJobs: (provider: string, count: number) => void;
export declare const recordDiscoveryError: (provider: string, errorType: string) => void;
export declare const recordDiscoveryApiCall: (_provider: string, _service: string, _operation: string) => void;
export declare const recordRateLimitHit: (provider: string, service: string) => void;
//# sourceMappingURL=discovery-metrics.d.ts.map