import { Registry } from 'prom-client';
export declare class MetricsRegistry {
    private static instance;
    readonly register: Registry;
    private constructor();
    static getInstance(): MetricsRegistry;
    getMetrics(): Promise<string>;
    getContentType(): string;
    clear(): void;
}
export declare const getMetricsRegistry: () => MetricsRegistry;
//# sourceMappingURL=registry.d.ts.map