/**
 * Metrics Module - Centralized exports for all metrics
 */

export * from './registry';
export * from './http-metrics';
export * from './graphql-metrics';
export * from './discovery-metrics';
export * from './etl-metrics';
export * from './database-metrics';
export * from './queue-metrics';
export * from './system-metrics';

// Convenience function to get all metrics in Prometheus format
export { getMetricsRegistry } from './registry';
