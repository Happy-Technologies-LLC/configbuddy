// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Unit Tests for Anomaly Detection Engine
 */

import { AnomalyDetectionEngine } from '../../src/engines/anomaly-detection-engine';

describe('AnomalyDetectionEngine', () => {
  let engine: AnomalyDetectionEngine;

  beforeEach(() => {
    engine = new AnomalyDetectionEngine();
  });

  describe('detectAnomalies', () => {
    it('should detect anomalies in metric data using z-score', async () => {
      const metrics = [
        { timestamp: new Date('2024-01-01'), value: 100 },
        { timestamp: new Date('2024-01-02'), value: 105 },
        { timestamp: new Date('2024-01-03'), value: 98 },
        { timestamp: new Date('2024-01-04'), value: 102 },
        { timestamp: new Date('2024-01-05'), value: 500 }, // Anomaly
        { timestamp: new Date('2024-01-06'), value: 99 },
      ];

      const result = await engine.detectAnomalies('ci-001', 'cpu_usage', metrics, {
        method: 'z-score',
        threshold: 3,
      });

      expect(result.anomaliesDetected).toBeGreaterThan(0);
      expect(result.anomalies.length).toBeGreaterThan(0);
      expect(result.anomalies[0].value).toBe(500);
      expect(result.anomalies[0].severity).toBeDefined();
    });

    it('should detect anomalies using IQR method', async () => {
      const metrics = [
        { timestamp: new Date('2024-01-01'), value: 10 },
        { timestamp: new Date('2024-01-02'), value: 12 },
        { timestamp: new Date('2024-01-03'), value: 11 },
        { timestamp: new Date('2024-01-04'), value: 13 },
        { timestamp: new Date('2024-01-05'), value: 100 }, // Outlier
        { timestamp: new Date('2024-01-06'), value: 11 },
      ];

      const result = await engine.detectAnomalies('ci-002', 'memory_usage', metrics, {
        method: 'iqr',
        threshold: 1.5,
      });

      expect(result.anomaliesDetected).toBeGreaterThan(0);
      expect(result.method).toBe('iqr');
    });

    it('should classify anomaly severity correctly', async () => {
      const metrics = [
        { timestamp: new Date('2024-01-01'), value: 50 },
        { timestamp: new Date('2024-01-02'), value: 52 },
        { timestamp: new Date('2024-01-03'), value: 48 },
        { timestamp: new Date('2024-01-04'), value: 51 },
        { timestamp: new Date('2024-01-05'), value: 200 }, // High severity
        { timestamp: new Date('2024-01-06'), value: 80 }, // Medium severity
      ];

      const result = await engine.detectAnomalies('ci-003', 'disk_io', metrics);

      expect(result.anomalies.length).toBeGreaterThan(0);
      const severities = result.anomalies.map((a) => a.severity);
      expect(severities).toContain('high');
    });

    it('should handle normal data with no anomalies', async () => {
      const metrics = [
        { timestamp: new Date('2024-01-01'), value: 50 },
        { timestamp: new Date('2024-01-02'), value: 52 },
        { timestamp: new Date('2024-01-03'), value: 48 },
        { timestamp: new Date('2024-01-04'), value: 51 },
        { timestamp: new Date('2024-01-05'), value: 49 },
      ];

      const result = await engine.detectAnomalies('ci-004', 'response_time', metrics);

      expect(result.anomaliesDetected).toBe(0);
      expect(result.anomalies).toHaveLength(0);
    });

    it('should include statistical summary', async () => {
      const metrics = [
        { timestamp: new Date('2024-01-01'), value: 100 },
        { timestamp: new Date('2024-01-02'), value: 105 },
        { timestamp: new Date('2024-01-03'), value: 98 },
        { timestamp: new Date('2024-01-04'), value: 102 },
      ];

      const result = await engine.detectAnomalies('ci-005', 'network_latency', metrics);

      expect(result.statistics).toBeDefined();
      expect(result.statistics.mean).toBeGreaterThan(0);
      expect(result.statistics.stdDev).toBeGreaterThanOrEqual(0);
      expect(result.statistics.min).toBeLessThanOrEqual(result.statistics.max);
    });

    it('should handle insufficient data', async () => {
      const metrics = [
        { timestamp: new Date('2024-01-01'), value: 50 },
        { timestamp: new Date('2024-01-02'), value: 52 },
      ];

      const result = await engine.detectAnomalies('ci-006', 'metric', metrics);

      expect(result.anomaliesDetected).toBe(0);
      expect(result.confidence).toBeLessThan(0.5); // Low confidence with little data
    });

    it('should calculate confidence score', async () => {
      const metrics = Array.from({ length: 100 }, (_, i) => ({
        timestamp: new Date(2024, 0, i + 1),
        value: 50 + Math.random() * 10,
      }));

      // Add one clear anomaly
      metrics.push({ timestamp: new Date(2024, 0, 101), value: 500 });

      const result = await engine.detectAnomalies('ci-007', 'throughput', metrics);

      expect(result.confidence).toBeGreaterThan(0.7); // High confidence with more data
    });
  });

  describe('detectSeasonalAnomalies', () => {
    it('should detect anomalies considering seasonal patterns', async () => {
      // Simulate weekly pattern: high on weekdays, low on weekends
      const metrics = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date(2024, 0, i + 1);
        const dayOfWeek = date.getDay();
        const baseValue = dayOfWeek === 0 || dayOfWeek === 6 ? 20 : 100; // Weekend vs weekday
        metrics.push({
          timestamp: date,
          value: baseValue + Math.random() * 10,
        });
      }

      // Add anomaly on a weekday (should be detected)
      metrics.push({
        timestamp: new Date(2024, 0, 31),
        value: 500,
      });

      const result = await engine.detectSeasonalAnomalies('ci-008', 'traffic', metrics, {
        seasonalPeriod: 7, // Weekly pattern
      });

      expect(result.anomaliesDetected).toBeGreaterThan(0);
      expect(result.seasonalityDetected).toBe(true);
    });
  });

  describe('predictNextValue', () => {
    it('should predict next metric value using time series', async () => {
      const metrics = Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(2024, 0, i + 1),
        value: 100 + i * 2, // Linear trend
      }));

      const prediction = await engine.predictNextValue('ci-009', 'growth_metric', metrics);

      expect(prediction.predictedValue).toBeGreaterThan(150);
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.predictedAt).toBeInstanceOf(Date);
    });

    it('should provide confidence interval', async () => {
      const metrics = Array.from({ length: 50 }, (_, i) => ({
        timestamp: new Date(2024, 0, i + 1),
        value: 100 + Math.random() * 20,
      }));

      const prediction = await engine.predictNextValue('ci-010', 'variable_metric', metrics);

      expect(prediction.confidenceInterval).toBeDefined();
      expect(prediction.confidenceInterval.lower).toBeLessThan(prediction.predictedValue);
      expect(prediction.confidenceInterval.upper).toBeGreaterThan(prediction.predictedValue);
    });
  });

  describe('edge cases', () => {
    it('should handle empty metrics array', async () => {
      const metrics: any[] = [];

      const result = await engine.detectAnomalies('ci-011', 'empty', metrics);

      expect(result.anomaliesDetected).toBe(0);
      expect(result.confidence).toBe(0);
    });

    it('should handle all identical values', async () => {
      const metrics = Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date(2024, 0, i + 1),
        value: 100, // All same
      }));

      const result = await engine.detectAnomalies('ci-012', 'constant', metrics);

      expect(result.statistics.stdDev).toBe(0);
      expect(result.anomaliesDetected).toBe(0);
    });

    it('should handle negative values', async () => {
      const metrics = [
        { timestamp: new Date('2024-01-01'), value: -10 },
        { timestamp: new Date('2024-01-02'), value: -12 },
        { timestamp: new Date('2024-01-03'), value: -11 },
        { timestamp: new Date('2024-01-04'), value: -100 }, // Anomaly
      ];

      const result = await engine.detectAnomalies('ci-013', 'negative_metric', metrics);

      expect(result.anomaliesDetected).toBeGreaterThan(0);
    });

    it('should handle very large datasets efficiently', async () => {
      const metrics = Array.from({ length: 10000 }, (_, i) => ({
        timestamp: new Date(2024, 0, 1, i),
        value: 100 + Math.random() * 10,
      }));

      const startTime = Date.now();
      const result = await engine.detectAnomalies('ci-014', 'large_dataset', metrics);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds
    });
  });
});
