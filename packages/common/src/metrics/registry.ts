// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Prometheus Metrics Registry
 * Central registry for all application metrics
 */

import { Registry, collectDefaultMetrics } from 'prom-client';

export class MetricsRegistry {
  private static instance: MetricsRegistry;
  public readonly register: Registry;

  private constructor() {
    this.register = new Registry();

    // Collect default metrics (CPU, memory, etc.)
    collectDefaultMetrics({
      register: this.register,
      prefix: 'cmdb_',
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    });
  }

  public static getInstance(): MetricsRegistry {
    if (!MetricsRegistry.instance) {
      MetricsRegistry.instance = new MetricsRegistry();
    }
    return MetricsRegistry.instance;
  }

  public getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  public getContentType(): string {
    return this.register.contentType;
  }

  public clear(): void {
    this.register.clear();
  }
}

export const getMetricsRegistry = (): MetricsRegistry => MetricsRegistry.getInstance();
