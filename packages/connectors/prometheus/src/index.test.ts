// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Prometheus Connector Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import PrometheusConnector from './index';
import { ConnectorConfiguration } from '@cmdb/integration-framework';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('PrometheusConnector', () => {
  let connector: PrometheusConnector;
  let mockConfig: ConnectorConfiguration;

  beforeEach(() => {
    mockConfig = {
      name: 'Test Prometheus',
      type: 'prometheus',
      enabled: true,
      connection: {
        prometheus_url: 'http://prometheus.example.com:9090',
      },
      enabled_resources: ['targets', 'services', 'alerts', 'metrics'],
    };

    // Mock axios.create
    const mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      defaults: {
        headers: {
          common: {},
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockClient);

    connector = new PrometheusConnector(mockConfig);
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await connector.initialize();
      expect(connector['isInitialized']).toBe(true);
    });
  });

  describe('testConnection', () => {
    it('should return success when connection is valid', async () => {
      const mockClient = connector['client'];
      mockClient.get = vi.fn().mockResolvedValue({
        data: {
          status: 'success',
          data: {
            version: '2.40.0',
          },
        },
      });

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully connected');
      expect(result.details).toHaveProperty('version', '2.40.0');
    });

    it('should return failure when connection fails', async () => {
      const mockClient = connector['client'];
      mockClient.get = vi.fn().mockRejectedValue({
        message: 'Connection refused',
      });

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection failed');
    });
  });

  describe('extractResource - targets', () => {
    it('should extract active targets successfully', async () => {
      const mockClient = connector['client'];
      mockClient.get = vi.fn().mockResolvedValue({
        data: {
          status: 'success',
          data: {
            activeTargets: [
              {
                discoveredLabels: { __address__: 'localhost:9090' },
                labels: { job: 'prometheus', instance: 'localhost:9090' },
                scrapePool: 'prometheus',
                scrapeUrl: 'http://localhost:9090/metrics',
                globalUrl: 'http://localhost:9090/metrics',
                lastError: '',
                lastScrape: '2025-10-10T12:00:00Z',
                lastScrapeDuration: 0.05,
                health: 'up',
              },
              {
                discoveredLabels: { __address__: 'node-exporter:9100' },
                labels: { job: 'node', instance: 'node-exporter:9100', env: 'production' },
                scrapePool: 'node',
                scrapeUrl: 'http://node-exporter:9100/metrics',
                globalUrl: 'http://node-exporter:9100/metrics',
                lastError: '',
                lastScrape: '2025-10-10T12:00:00Z',
                lastScrapeDuration: 0.02,
                health: 'up',
              },
            ],
            droppedTargets: [],
          },
        },
      });

      const result = await connector.extractResource('targets');

      expect(result).toHaveLength(2);
      expect(result[0].external_id).toBe('prometheus-localhost:9090');
      expect(result[0].data.labels.job).toBe('prometheus');
      expect(result[1].external_id).toBe('node-node-exporter:9100');
    });

    it('should filter targets by active_only', async () => {
      const mockClient = connector['client'];
      mockClient.get = vi.fn().mockResolvedValue({
        data: {
          status: 'success',
          data: {
            activeTargets: [
              {
                discoveredLabels: {},
                labels: { job: 'prometheus', instance: 'localhost:9090' },
                scrapePool: 'prometheus',
                scrapeUrl: 'http://localhost:9090/metrics',
                globalUrl: 'http://localhost:9090/metrics',
                lastError: '',
                lastScrape: '2025-10-10T12:00:00Z',
                lastScrapeDuration: 0.05,
                health: 'up',
              },
            ],
            droppedTargets: [
              {
                discoveredLabels: {},
                labels: { job: 'failed', instance: 'down:9090' },
              },
            ],
          },
        },
      });

      const result = await connector.extractResource('targets', { active_only: true });

      expect(result).toHaveLength(1);
      expect(result[0].external_id).toBe('prometheus-localhost:9090');
    });

    it('should exclude jobs from exclude_jobs list', async () => {
      const mockClient = connector['client'];
      mockClient.get = vi.fn().mockResolvedValue({
        data: {
          status: 'success',
          data: {
            activeTargets: [
              {
                discoveredLabels: {},
                labels: { job: 'prometheus', instance: 'localhost:9090' },
                scrapePool: 'prometheus',
                scrapeUrl: 'http://localhost:9090/metrics',
                globalUrl: 'http://localhost:9090/metrics',
                lastError: '',
                lastScrape: '2025-10-10T12:00:00Z',
                lastScrapeDuration: 0.05,
                health: 'up',
              },
              {
                discoveredLabels: {},
                labels: { job: 'blackbox', instance: 'blackbox:9115' },
                scrapePool: 'blackbox',
                scrapeUrl: 'http://blackbox:9115/metrics',
                globalUrl: 'http://blackbox:9115/metrics',
                lastError: '',
                lastScrape: '2025-10-10T12:00:00Z',
                lastScrapeDuration: 0.05,
                health: 'up',
              },
            ],
            droppedTargets: [],
          },
        },
      });

      const result = await connector.extractResource('targets', { exclude_jobs: ['blackbox'] });

      expect(result).toHaveLength(1);
      expect(result[0].external_id).toBe('prometheus-localhost:9090');
    });
  });

  describe('extractResource - services', () => {
    it('should extract services successfully', async () => {
      const mockClient = connector['client'];
      mockClient.get = vi.fn().mockResolvedValue({
        data: {
          status: 'success',
          data: [
            {
              target: { job: 'prometheus', instance: 'localhost:9090' },
              metric: 'prometheus_build_info',
              type: 'gauge',
              help: 'Prometheus build info',
              unit: '',
            },
            {
              target: { job: 'prometheus', instance: 'localhost:9090' },
              metric: 'prometheus_http_requests_total',
              type: 'counter',
              help: 'Total HTTP requests',
              unit: '',
            },
            {
              target: { job: 'node', instance: 'node-exporter:9100' },
              metric: 'node_cpu_seconds_total',
              type: 'counter',
              help: 'CPU time',
              unit: 'seconds',
            },
          ],
        },
      });

      const result = await connector.extractResource('services');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].data).toHaveProperty('labels');
      expect(result[0].data).toHaveProperty('metrics');
    });
  });

  describe('extractResource - alerts', () => {
    it('should extract alerts successfully', async () => {
      const mockClient = connector['client'];
      mockClient.get = vi.fn().mockResolvedValue({
        data: {
          status: 'success',
          data: {
            alerts: [
              {
                labels: {
                  alertname: 'HighMemoryUsage',
                  instance: 'server1:9090',
                  job: 'node',
                  severity: 'critical',
                },
                annotations: {
                  summary: 'High memory usage detected',
                  description: 'Memory usage is above 90%',
                },
                state: 'firing',
                activeAt: '2025-10-10T12:00:00Z',
                value: '0.95',
              },
              {
                labels: {
                  alertname: 'HighCPU',
                  instance: 'server2:9090',
                  job: 'node',
                  severity: 'warning',
                },
                annotations: {
                  summary: 'High CPU usage',
                  description: 'CPU usage is above 80%',
                },
                state: 'firing',
                activeAt: '2025-10-10T12:05:00Z',
                value: '0.85',
              },
            ],
          },
        },
      });

      const result = await connector.extractResource('alerts');

      expect(result).toHaveLength(2);
      expect(result[0].data.labels.alertname).toBe('HighMemoryUsage');
      expect(result[1].data.labels.alertname).toBe('HighCPU');
    });

    it('should filter alerts by severity', async () => {
      const mockClient = connector['client'];
      mockClient.get = vi.fn().mockResolvedValue({
        data: {
          status: 'success',
          data: {
            alerts: [
              {
                labels: {
                  alertname: 'CriticalAlert',
                  severity: 'critical',
                },
                annotations: {},
                state: 'firing',
                activeAt: '2025-10-10T12:00:00Z',
                value: '1',
              },
              {
                labels: {
                  alertname: 'WarningAlert',
                  severity: 'warning',
                },
                annotations: {},
                state: 'firing',
                activeAt: '2025-10-10T12:00:00Z',
                value: '1',
              },
            ],
          },
        },
      });

      const result = await connector.extractResource('alerts', { severity_filter: ['critical'] });

      expect(result).toHaveLength(1);
      expect(result[0].data.labels.severity).toBe('critical');
    });
  });

  describe('extractResource - metrics', () => {
    it('should extract metrics successfully', async () => {
      const mockClient = connector['client'];
      mockClient.get = vi.fn().mockResolvedValue({
        data: {
          status: 'success',
          data: [
            'prometheus_build_info',
            'prometheus_http_requests_total',
            'node_cpu_seconds_total',
            'node_memory_bytes',
          ],
        },
      });

      const result = await connector.extractResource('metrics');

      expect(result).toHaveLength(4);
      expect(result[0].external_id).toBe('prometheus_build_info');
      expect(result[0].data.name).toBe('prometheus_build_info');
    });

    it('should apply metric_name_pattern filter', async () => {
      const mockClient = connector['client'];
      mockClient.get = vi.fn().mockResolvedValue({
        data: {
          status: 'success',
          data: [
            'prometheus_build_info',
            'prometheus_http_requests_total',
            'node_cpu_seconds_total',
            'node_memory_bytes',
          ],
        },
      });

      const result = await connector.extractResource('metrics', {
        metric_name_pattern: '^node_.*',
      });

      expect(result).toHaveLength(2);
      expect(result[0].external_id).toContain('node_');
    });

    it('should respect limit', async () => {
      const mockClient = connector['client'];
      mockClient.get = vi.fn().mockResolvedValue({
        data: {
          status: 'success',
          data: Array.from({ length: 100 }, (_, i) => `metric_${i}`),
        },
      });

      const result = await connector.extractResource('metrics', { limit: 10 });

      expect(result).toHaveLength(10);
    });
  });

  describe('extractRelationships', () => {
    it('should extract alert-to-target relationships', async () => {
      const mockClient = connector['client'];

      // Mock alerts response
      mockClient.get = vi
        .fn()
        .mockResolvedValueOnce({
          data: {
            status: 'success',
            data: {
              alerts: [
                {
                  labels: {
                    alertname: 'HighMemory',
                    instance: 'server1:9090',
                    job: 'node',
                    severity: 'critical',
                  },
                  annotations: {},
                  state: 'firing',
                  activeAt: '2025-10-10T12:00:00Z',
                  value: '0.95',
                },
              ],
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            status: 'success',
            data: {
              activeTargets: [
                {
                  discoveredLabels: {},
                  labels: { job: 'node', instance: 'server1:9090' },
                  scrapePool: 'node',
                  scrapeUrl: 'http://server1:9090/metrics',
                  globalUrl: 'http://server1:9090/metrics',
                  lastError: '',
                  lastScrape: '2025-10-10T12:00:00Z',
                  lastScrapeDuration: 0.05,
                  health: 'up',
                },
              ],
              droppedTargets: [],
            },
          },
        });

      const relationships = await connector.extractRelationships();

      expect(relationships).toHaveLength(1);
      expect(relationships[0].relationship_type).toBe('ALERTS_ON');
      expect(relationships[0].properties?.severity).toBe('critical');
    });
  });

  describe('transformResource - targets', () => {
    it('should transform target to CI', async () => {
      const sourceData = {
        labels: { job: 'node', instance: 'server1:9090', env: 'production' },
        discoveredLabels: { __address__: 'server1:9090' },
        scrapePool: 'node',
        scrapeUrl: 'http://server1:9090/metrics',
        globalUrl: 'http://server1:9090/metrics',
        lastError: '',
        lastScrape: '2025-10-10T12:00:00Z',
        lastScrapeDuration: 0.05,
        health: 'up',
        status: 'active',
      };

      const result = await connector.transformResource('targets', sourceData);

      expect(result.name).toBe('server1:9090');
      expect(result.ci_type).toBe('server');
      expect(result.environment).toBe('production');
      expect(result.status).toBe('active');
      expect(result.attributes.job).toBe('node');
      expect(result.confidence_score).toBe(90);
    });

    it('should infer CI type from job label', async () => {
      const testCases = [
        { job: 'kubernetes-pods', expected: 'container' },
        { job: 'postgres-exporter', expected: 'database' },
        { job: 'application-metrics', expected: 'application' },
        { job: 'node-exporter', expected: 'server' },
      ];

      for (const testCase of testCases) {
        const sourceData = {
          labels: { job: testCase.job, instance: 'test:9090' },
          health: 'up',
        };

        const result = await connector.transformResource('targets', sourceData);
        expect(result.ci_type).toBe(testCase.expected);
      }
    });
  });

  describe('transformResource - alerts', () => {
    it('should transform alert to CI', async () => {
      const sourceData = {
        labels: {
          alertname: 'HighMemoryUsage',
          instance: 'server1:9090',
          job: 'node',
          severity: 'critical',
          env: 'production',
        },
        annotations: {
          summary: 'High memory usage detected',
          description: 'Memory usage is above 90%',
        },
        state: 'firing',
        activeAt: '2025-10-10T12:00:00Z',
        value: '0.95',
      };

      const result = await connector.transformResource('alerts', sourceData);

      expect(result.name).toBe('HighMemoryUsage');
      expect(result.ci_type).toBe('alert');
      expect(result.environment).toBe('production');
      expect(result.status).toBe('active');
      expect(result.attributes.severity).toBe('critical');
      expect(result.attributes.summary).toBe('High memory usage detected');
    });
  });

  describe('extractIdentifiers', () => {
    it('should extract identifiers from target', () => {
      const data = {
        labels: {
          job: 'node',
          instance: '192.168.1.100:9090',
        },
      };

      const identifiers = connector.extractIdentifiers(data);

      expect(identifiers.hostname).toBe('192.168.1.100');
      expect(identifiers.ip_address).toEqual(['192.168.1.100']);
      expect(identifiers.custom_identifiers?.prometheus_job).toBe('node');
      expect(identifiers.custom_identifiers?.prometheus_instance).toBe('192.168.1.100:9090');
    });
  });

  describe('basic authentication', () => {
    it('should configure basic auth when credentials provided', () => {
      const configWithAuth: ConnectorConfiguration = {
        name: 'Test Prometheus with Auth',
        type: 'prometheus',
        enabled: true,
        connection: {
          prometheus_url: 'http://prometheus.example.com:9090',
          basic_auth_username: 'admin',
          basic_auth_password: 'secret',
        },
      };

      const mockClient = {
        get: vi.fn(),
        post: vi.fn(),
        defaults: {
          headers: {
            common: {},
          },
        },
      };

      mockedAxios.create.mockReturnValue(mockClient);

      const connectorWithAuth = new PrometheusConnector(configWithAuth);

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: {
            username: 'admin',
            password: 'secret',
          },
        })
      );
    });
  });
});
