/**
 * Anomaly Detection Engine Unit Tests
 * Tests for ML-based anomaly detection using statistical analysis
 */

import { AnomalyDetectionEngine } from '../../src/engines/anomaly-detection-engine';
import {
  AnomalyType,
  AnomalySeverity,
  AnomalyStatus,
} from '../../src/types/anomaly.types';
import {
  mockChangeStatistics,
  mockCIs,
  createMockNeo4jSession,
  createMockPgClient,
  createMockEventProducer,
} from '../fixtures/test-data';

// Mock dependencies
jest.mock('@cmdb/database');
jest.mock('@cmdb/event-processor');
jest.mock('uuid', () => ({ v4: () => 'test-uuid-123' }));

import { getNeo4jClient, getPostgresClient } from '@cmdb/database';
import { getEventProducer } from '@cmdb/event-processor';

describe('AnomalyDetectionEngine', () => {
  let engine: AnomalyDetectionEngine;
  let mockNeo4jClient: any;
  let mockPgClient: any;
  let mockEventProducer: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock clients
    mockNeo4jClient = {
      getSession: jest.fn(),
    };
    mockPgClient = createMockPgClient([]);
    mockEventProducer = createMockEventProducer();

    (getNeo4jClient as jest.Mock).mockReturnValue(mockNeo4jClient);
    (getPostgresClient as jest.Mock).mockReturnValue(mockPgClient);
    (getEventProducer as jest.Mock).mockReturnValue(mockEventProducer);

    // Get singleton instance
    engine = AnomalyDetectionEngine.getInstance();
  });

  describe('loadConfiguration', () => {
    it('should load configuration from database', async () => {
      const mockConfig = {
        enabled: true,
        sensitivity: 'high',
        min_confidence_score: 80,
        check_interval_minutes: 30,
        lookback_days: 14,
        notification_enabled: true,
      };

      mockPgClient.query.mockResolvedValueOnce({
        rows: [{ config_value: mockConfig }],
      });

      await engine.loadConfiguration();

      expect(mockPgClient.query).toHaveBeenCalledWith(
        'SELECT config_value FROM system_config WHERE config_key = $1',
        ['anomaly_detection']
      );
    });

    it('should use default configuration if none exists in database', async () => {
      mockPgClient.query.mockResolvedValueOnce({ rows: [] });

      await engine.loadConfiguration();

      expect(mockPgClient.query).toHaveBeenCalled();
      // Should not throw error
    });
  });

  describe('detectChangeFrequencyAnomalies', () => {
    it('should detect excessive changes using statistical analysis', async () => {
      // Mock database query for change statistics
      mockPgClient.query
        .mockResolvedValueOnce({
          rows: mockChangeStatistics.withAnomalies,
        })
        .mockResolvedValueOnce({ rows: [] }); // For storeAnomaly

      const anomalies = await engine.detectAnomalies();

      // Should detect the server with 150 changes (anomaly) vs normal ~10 changes
      const excessiveChangeAnomaly = anomalies.find(
        a => a.anomaly_type === AnomalyType.EXCESSIVE_CHANGES
      );

      expect(excessiveChangeAnomaly).toBeDefined();
      expect(excessiveChangeAnomaly?.ci_id).toBe('ci-anomaly-001');
      expect(excessiveChangeAnomaly?.severity).toBe(AnomalySeverity.CRITICAL);
      expect(excessiveChangeAnomaly?.confidence_score).toBeGreaterThan(70);
    });

    it('should not detect anomalies when all changes are normal', async () => {
      mockPgClient.query.mockResolvedValueOnce({
        rows: mockChangeStatistics.normal,
      });

      const anomalies = await engine.detectAnomalies();

      const excessiveChangeAnomalies = anomalies.filter(
        a => a.anomaly_type === AnomalyType.EXCESSIVE_CHANGES
      );

      expect(excessiveChangeAnomalies).toHaveLength(0);
    });

    it('should skip detection if sample size is too small', async () => {
      mockPgClient.query.mockResolvedValueOnce({
        rows: [{ ci_id: 'ci-001', change_count: '10', ci_name: 'server-01' }],
      });

      const anomalies = await engine.detectAnomalies();

      const excessiveChangeAnomalies = anomalies.filter(
        a => a.anomaly_type === AnomalyType.EXCESSIVE_CHANGES
      );

      expect(excessiveChangeAnomalies).toHaveLength(0);
    });

    it('should calculate correct severity based on Z-score', async () => {
      // Z-score > 4 = CRITICAL
      // Z-score > 3 = HIGH
      // Z-score > 2 = MEDIUM
      // Z-score <= 2 = LOW

      mockPgClient.query
        .mockResolvedValueOnce({
          rows: [
            { ci_id: 'ci-001', change_count: '10', ci_name: 'server-01' },
            { ci_id: 'ci-002', change_count: '12', ci_name: 'server-02' },
            { ci_id: 'ci-003', change_count: '11', ci_name: 'server-03' },
            { ci_id: 'ci-critical', change_count: '100', ci_name: 'critical-server' },
          ],
        })
        .mockResolvedValue({ rows: [] });

      const anomalies = await engine.detectAnomalies();

      const criticalAnomaly = anomalies.find(a => a.ci_id === 'ci-critical');
      expect(criticalAnomaly?.severity).toBe(AnomalySeverity.CRITICAL);
    });
  });

  describe('detectRelationshipAnomalies', () => {
    it('should detect orphaned CIs (no relationships)', async () => {
      const mockSession = createMockNeo4jSession([
        {
          ci_id: mockCIs.orphanedCI.id,
          ci_name: mockCIs.orphanedCI.name,
          ci_type: 'server',
        },
      ]);

      mockNeo4jClient.getSession.mockReturnValue(mockSession);
      mockPgClient.query.mockResolvedValue({ rows: [] });

      const anomalies = await engine.detectAnomalies();

      const orphanedAnomaly = anomalies.find(
        a => a.anomaly_type === AnomalyType.ORPHANED_CI
      );

      expect(orphanedAnomaly).toBeDefined();
      expect(orphanedAnomaly?.ci_id).toBe(mockCIs.orphanedCI.id);
      expect(orphanedAnomaly?.severity).toBe(AnomalySeverity.MEDIUM);
      expect(orphanedAnomaly?.confidence_score).toBe(95);
    });

    it('should detect unusual dependency counts', async () => {
      const mockSession = createMockNeo4jSession([
        {
          ci_id: 'ci-high-deps',
          ci_name: 'server-with-many-deps',
          dep_count: 75,
        },
      ]);

      mockNeo4jClient.getSession.mockReturnValue(mockSession);
      mockPgClient.query.mockResolvedValue({ rows: [] });

      const anomalies = await engine.detectAnomalies();

      const highDepAnomaly = anomalies.find(
        a => a.anomaly_type === AnomalyType.UNUSUAL_DEPENDENCY_COUNT
      );

      expect(highDepAnomaly).toBeDefined();
      expect(highDepAnomaly?.metrics.actual_value).toBe(75);
      expect(highDepAnomaly?.metrics.threshold_exceeded).toBe(50);
    });

    it('should detect circular dependencies', async () => {
      const mockSession = createMockNeo4jSession([
        {
          ci_id: 'ci-circular',
          ci_name: 'circular-dependency-server',
          cycle_length: 3,
        },
      ]);

      mockNeo4jClient.getSession.mockReturnValue(mockSession);
      mockPgClient.query.mockResolvedValue({ rows: [] });

      const anomalies = await engine.detectAnomalies();

      const circularAnomaly = anomalies.find(
        a => a.anomaly_type === AnomalyType.CIRCULAR_DEPENDENCY
      );

      expect(circularAnomaly).toBeDefined();
      expect(circularAnomaly?.severity).toBe(AnomalySeverity.HIGH);
      expect(circularAnomaly?.confidence_score).toBe(100);
    });
  });

  describe('detectConfigurationAnomalies', () => {
    it('should detect missing required attributes', async () => {
      const mockSession = createMockNeo4jSession([
        {
          ci_id: 'ci-incomplete',
          ci_name: 'incomplete-server',
          ci_type: 'server',
        },
      ]);

      mockNeo4jClient.getSession.mockReturnValue(mockSession);
      mockPgClient.query.mockResolvedValue({ rows: [] });

      const anomalies = await engine.detectAnomalies();

      const missingAttrAnomaly = anomalies.find(
        a => a.anomaly_type === AnomalyType.MISSING_REQUIRED_ATTRIBUTE
      );

      expect(missingAttrAnomaly).toBeDefined();
      expect(missingAttrAnomaly?.severity).toBe(AnomalySeverity.MEDIUM);
      expect(missingAttrAnomaly?.confidence_score).toBe(100);
    });
  });

  describe('storeAnomaly', () => {
    it('should store anomaly in database', async () => {
      mockPgClient.query.mockResolvedValue({ rows: [] });

      const mockAnomaly = {
        id: 'anomaly-123',
        ci_id: 'ci-001',
        ci_name: 'test-server',
        anomaly_type: AnomalyType.EXCESSIVE_CHANGES,
        severity: AnomalySeverity.HIGH,
        confidence_score: 85,
        detected_at: new Date(),
        description: 'Test anomaly',
        metrics: { actual_value: 100, expected_value: 10 },
        context: { test: true },
        status: AnomalyStatus.DETECTED,
      };

      await engine.detectAnomalies();

      // Mock returns empty initially, then we test storage
      mockPgClient.query.mockClear();
      mockPgClient.query
        .mockResolvedValueOnce({ rows: mockChangeStatistics.withAnomalies })
        .mockResolvedValueOnce({ rows: [] });

      await engine.detectAnomalies();

      // Should have called INSERT for anomaly storage
      expect(mockPgClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO anomalies'),
        expect.any(Array)
      );
    });

    it('should emit event for high-severity anomalies', async () => {
      mockPgClient.query
        .mockResolvedValueOnce({
          rows: mockChangeStatistics.withAnomalies,
        })
        .mockResolvedValue({ rows: [] });

      await engine.detectAnomalies();

      // Should emit event for the critical anomaly
      expect(mockEventProducer.emit).toHaveBeenCalled();
    });

    it('should not emit event for low-severity anomalies', async () => {
      mockPgClient.query.mockResolvedValue({ rows: [] });

      const mockSession = createMockNeo4jSession([
        {
          ci_id: 'ci-low',
          ci_name: 'low-severity-ci',
          ci_type: 'server',
        },
      ]);

      mockNeo4jClient.getSession.mockReturnValue(mockSession);

      await engine.detectAnomalies();

      // Should not emit event for MEDIUM severity
      expect(mockEventProducer.emit).not.toHaveBeenCalled();
    });
  });

  describe('getAnomaliesForCI', () => {
    it('should retrieve anomalies for specific CI', async () => {
      const mockAnomalies = [
        {
          id: 'anomaly-1',
          ci_id: 'ci-001',
          ci_name: 'test-server',
          anomaly_type: AnomalyType.EXCESSIVE_CHANGES,
          severity: AnomalySeverity.HIGH,
          confidence_score: 85,
          detected_at: new Date(),
          description: 'Test',
          metrics: {},
          context: {},
          status: AnomalyStatus.DETECTED,
        },
      ];

      mockPgClient.query.mockResolvedValueOnce({ rows: mockAnomalies });

      const result = await engine.getAnomaliesForCI('ci-001', 10);

      expect(result).toHaveLength(1);
      expect(result[0].ci_id).toBe('ci-001');
      expect(mockPgClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ci_id = $1'),
        ['ci-001', 10]
      );
    });
  });

  describe('getRecentAnomalies', () => {
    it('should retrieve recent anomalies within time window', async () => {
      const mockAnomalies = [
        {
          id: 'anomaly-1',
          ci_id: 'ci-001',
          ci_name: 'server-1',
          anomaly_type: AnomalyType.EXCESSIVE_CHANGES,
          severity: AnomalySeverity.HIGH,
          confidence_score: 85,
          detected_at: new Date(),
          description: 'Recent anomaly',
          metrics: {},
          context: {},
          status: AnomalyStatus.DETECTED,
        },
      ];

      mockPgClient.query.mockResolvedValueOnce({ rows: mockAnomalies });

      const result = await engine.getRecentAnomalies(24, 50);

      expect(result).toHaveLength(1);
      expect(mockPgClient.query).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '24 hours'"),
        [50]
      );
    });
  });

  describe('sensitivity settings', () => {
    it('should detect more anomalies with high sensitivity', async () => {
      const configWithHighSensitivity = {
        enabled: true,
        sensitivity: 'high' as const,
        min_confidence_score: 60,
        check_interval_minutes: 30,
        lookback_days: 30,
        notification_enabled: true,
      };

      mockPgClient.query
        .mockResolvedValueOnce({
          rows: [{ config_value: configWithHighSensitivity }],
        })
        .mockResolvedValueOnce({
          rows: mockChangeStatistics.withAnomalies,
        })
        .mockResolvedValue({ rows: [] });

      await engine.loadConfiguration();
      const anomalies = await engine.detectAnomalies();

      // High sensitivity should detect anomalies with lower threshold
      expect(anomalies.length).toBeGreaterThan(0);
    });

    it('should detect fewer anomalies with low sensitivity', async () => {
      const configWithLowSensitivity = {
        enabled: true,
        sensitivity: 'low' as const,
        min_confidence_score: 90,
        check_interval_minutes: 30,
        lookback_days: 30,
        notification_enabled: true,
      };

      mockPgClient.query
        .mockResolvedValueOnce({
          rows: [{ config_value: configWithLowSensitivity }],
        })
        .mockResolvedValueOnce({
          rows: mockChangeStatistics.normal,
        })
        .mockResolvedValue({ rows: [] });

      await engine.loadConfiguration();
      const anomalies = await engine.detectAnomalies();

      // Low sensitivity should not detect anomalies in normal data
      expect(anomalies.filter(a => a.anomaly_type === AnomalyType.EXCESSIVE_CHANGES)).toHaveLength(0);
    });
  });

  describe('disabled detection', () => {
    it('should skip detection when disabled', async () => {
      const disabledConfig = {
        enabled: false,
        sensitivity: 'medium' as const,
        min_confidence_score: 70,
        check_interval_minutes: 60,
        lookback_days: 30,
        notification_enabled: false,
      };

      mockPgClient.query.mockResolvedValueOnce({
        rows: [{ config_value: disabledConfig }],
      });

      await engine.loadConfiguration();
      const anomalies = await engine.detectAnomalies();

      expect(anomalies).toHaveLength(0);
      expect(mockPgClient.query).toHaveBeenCalledTimes(1); // Only config load
    });
  });
});
