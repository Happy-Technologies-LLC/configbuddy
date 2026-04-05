// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Datadog Connector Tests
 */

import DatadogConnector from './index';
import { ConnectorConfiguration } from '@cmdb/integration-framework';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DatadogConnector', () => {
  let connector: DatadogConnector;
  let mockAxiosInstance: any;

  const validConfig: ConnectorConfiguration = {
    name: 'Test Datadog',
    type: 'datadog',
    enabled: true,
    connection: {
      api_key: 'test-api-key',
      app_key: 'test-app-key',
      site: 'datadoghq.com',
    },
  };

  beforeEach(() => {
    // Mock axios.create to return a mock instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };
    mockedAxios.create = jest.fn(() => mockAxiosInstance);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with valid configuration', async () => {
      connector = new DatadogConnector(validConfig);
      await connector.initialize();
      expect(connector['isInitialized']).toBe(true);
    });

    it('should create axios client with correct headers', () => {
      connector = new DatadogConnector(validConfig);
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.datadoghq.com/api',
        headers: {
          'DD-API-KEY': 'test-api-key',
          'DD-APPLICATION-KEY': 'test-app-key',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 30000,
      });
    });

    it('should support EU site configuration', () => {
      const euConfig = {
        ...validConfig,
        connection: {
          ...validConfig.connection,
          site: 'datadoghq.eu',
        },
      };
      connector = new DatadogConnector(euConfig);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.datadoghq.eu/api',
        })
      );
    });
  });

  describe('testConnection', () => {
    beforeEach(() => {
      connector = new DatadogConnector(validConfig);
    });

    it('should return success when API keys are valid', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { valid: true },
      });

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully connected');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/v1/validate');
    });

    it('should return failure when API keys are invalid', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { valid: false },
      });

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid API or Application key');
    });

    it('should handle connection errors', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection failed');
    });
  });

  describe('extractResource - hosts', () => {
    beforeEach(() => {
      connector = new DatadogConnector(validConfig);
    });

    it('should extract hosts successfully', async () => {
      const mockHosts = {
        host_list: [
          {
            id: 123456,
            name: 'web-server-01',
            host_name: 'web-server-01.example.com',
            is_muted: false,
            up: true,
            tags_by_source: {
              Datadog: ['env:production', 'role:web'],
            },
            meta: {
              agent_version: '7.40.0',
              platform: 'linux',
              cpuCores: 4,
              os: 'Ubuntu 20.04',
            },
            metrics: {
              cpu: 45.2,
              load: 1.5,
            },
          },
          {
            id: 123457,
            name: 'db-server-01',
            host_name: 'db-server-01.example.com',
            is_muted: false,
            up: true,
            tags_by_source: {
              Datadog: ['env:production', 'role:database'],
            },
          },
        ],
        total_returned: 2,
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockHosts });

      const result = await connector.extractResource('hosts');

      expect(result).toHaveLength(2);
      expect(result[0].external_id).toBe('123456');
      expect(result[0].source_type).toBe('datadog');
      expect(result[1].external_id).toBe('123457');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/v1/hosts',
        expect.objectContaining({
          params: expect.objectContaining({
            count: 1000,
          }),
        })
      );
    });

    it('should apply host filters', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { host_list: [] },
      });

      await connector.extractResource('hosts', {
        filter: 'env:production',
        include_muted: false,
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/v1/hosts',
        expect.objectContaining({
          params: expect.objectContaining({
            filter: 'env:production',
            include_muted_hosts_data: false,
          }),
        })
      );
    });
  });

  describe('extractResource - containers', () => {
    beforeEach(() => {
      connector = new DatadogConnector(validConfig);
    });

    it('should extract containers successfully', async () => {
      const mockContainers = {
        data: [
          {
            id: 'container-123',
            attributes: {
              container_id: 'abc123',
              name: 'nginx-proxy',
              image_name: 'nginx',
              image_tag: 'latest',
              state: 'running',
              host: 'web-server-01',
              tags: ['env:production'],
            },
          },
        ],
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockContainers });

      const result = await connector.extractResource('containers');

      expect(result).toHaveLength(1);
      expect(result[0].external_id).toBe('container-123');
      expect(result[0].data.attributes.name).toBe('nginx-proxy');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/v2/containers',
        expect.any(Object)
      );
    });
  });

  describe('extractResource - services', () => {
    beforeEach(() => {
      connector = new DatadogConnector(validConfig);
    });

    it('should extract APM services successfully', async () => {
      const mockServices = {
        data: [
          {
            id: 'service-456',
            attributes: {
              name: 'web-api',
              env: 'production',
              last_seen: '2024-01-15T10:00:00Z',
              schema: {
                languages: ['python'],
                type: 'web',
              },
            },
          },
        ],
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockServices });

      const result = await connector.extractResource('services');

      expect(result).toHaveLength(1);
      expect(result[0].external_id).toBe('service-456');
      expect(result[0].data.attributes.name).toBe('web-api');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/v2/services/definitions',
        expect.any(Object)
      );
    });

    it('should apply environment filter', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { data: [] } });

      await connector.extractResource('services', { env: 'production' });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/v2/services/definitions',
        expect.objectContaining({
          params: expect.objectContaining({
            env: 'production',
          }),
        })
      );
    });
  });

  describe('extractResource - monitors', () => {
    beforeEach(() => {
      connector = new DatadogConnector(validConfig);
    });

    it('should extract monitors successfully', async () => {
      const mockMonitors = [
        {
          id: 789,
          name: 'CPU Usage High',
          type: 'metric alert',
          query: 'avg(last_5m):avg:system.cpu.user{*} > 90',
          message: 'CPU usage is high',
          tags: ['team:platform', 'service:web-api'],
          overall_state: 'OK',
          created: '2024-01-01T00:00:00Z',
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({ data: mockMonitors });

      const result = await connector.extractResource('monitors');

      expect(result).toHaveLength(1);
      expect(result[0].external_id).toBe('789');
      expect(result[0].data.name).toBe('CPU Usage High');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/v1/monitor',
        expect.any(Object)
      );
    });
  });

  describe('transformResource - hosts', () => {
    beforeEach(() => {
      connector = new DatadogConnector(validConfig);
    });

    it('should transform host data to CMDB CI', async () => {
      const hostData = {
        id: 123456,
        name: 'web-server-01',
        host_name: 'web-server-01.example.com',
        is_muted: false,
        up: true,
        tags_by_source: {
          Datadog: ['env:production', 'role:web'],
        },
        meta: {
          agent_version: '7.40.0',
          platform: 'linux',
          cpuCores: 4,
          os: 'Ubuntu 20.04',
        },
        metrics: {
          cpu: 45.2,
          load: 1.5,
        },
      };

      const result = await connector.transformResource('hosts', hostData);

      expect(result.name).toBe('web-server-01');
      expect(result.ci_type).toBe('server');
      expect(result.environment).toBe('production');
      expect(result.status).toBe('active');
      expect(result.attributes.cpu_cores).toBe(4);
      expect(result.attributes.os).toBe('Ubuntu 20.04');
      expect(result.source).toBe('datadog');
      expect(result.confidence_score).toBe(95);
    });

    it('should map muted hosts to maintenance status', async () => {
      const mutedHost = {
        id: 123456,
        name: 'maintenance-server',
        is_muted: true,
        up: true,
      };

      const result = await connector.transformResource('hosts', mutedHost);

      expect(result.status).toBe('maintenance');
    });

    it('should map down hosts to inactive status', async () => {
      const downHost = {
        id: 123456,
        name: 'down-server',
        is_muted: false,
        up: false,
      };

      const result = await connector.transformResource('hosts', downHost);

      expect(result.status).toBe('inactive');
    });
  });

  describe('transformResource - containers', () => {
    beforeEach(() => {
      connector = new DatadogConnector(validConfig);
    });

    it('should transform container data to CMDB CI', async () => {
      const containerData = {
        id: 'container-123',
        attributes: {
          container_id: 'abc123',
          name: 'nginx-proxy',
          image_name: 'nginx',
          image_tag: 'latest',
          state: 'running',
          host: 'web-server-01',
          tags: ['env:production'],
        },
      };

      const result = await connector.transformResource('containers', containerData);

      expect(result.name).toBe('nginx-proxy');
      expect(result.ci_type).toBe('container');
      expect(result.environment).toBe('production');
      expect(result.status).toBe('active');
      expect(result.attributes.image_name).toBe('nginx');
      expect(result.attributes.image_tag).toBe('latest');
    });

    it('should map stopped containers to inactive status', async () => {
      const stoppedContainer = {
        id: 'container-456',
        attributes: {
          name: 'stopped-app',
          state: 'stopped',
        },
      };

      const result = await connector.transformResource('containers', stoppedContainer);

      expect(result.status).toBe('inactive');
    });
  });

  describe('transformResource - services', () => {
    beforeEach(() => {
      connector = new DatadogConnector(validConfig);
    });

    it('should transform service data to CMDB CI', async () => {
      const serviceData = {
        id: 'service-456',
        attributes: {
          name: 'web-api',
          env: 'production',
          last_seen: '2024-01-15T10:00:00Z',
          schema: {
            languages: ['python'],
            type: 'web',
          },
        },
      };

      const result = await connector.transformResource('services', serviceData);

      expect(result.name).toBe('web-api');
      expect(result.ci_type).toBe('service');
      expect(result.environment).toBe('production');
      expect(result.status).toBe('active');
      expect(result.attributes.languages).toEqual(['python']);
      expect(result.confidence_score).toBe(90);
    });
  });

  describe('inferRelationships', () => {
    beforeEach(() => {
      connector = new DatadogConnector(validConfig);
    });

    it('should infer container to host relationships', () => {
      const extractedData = new Map([
        [
          'containers',
          [
            {
              external_id: 'container-123',
              data: {
                attributes: {
                  name: 'nginx',
                  host: 'web-server-01',
                },
              },
              source_type: 'datadog',
              extracted_at: new Date(),
            },
          ],
        ],
        [
          'hosts',
          [
            {
              external_id: 'web-server-01',
              data: { name: 'web-server-01' },
              source_type: 'datadog',
              extracted_at: new Date(),
            },
          ],
        ],
      ]);

      const relationships = connector.inferRelationships(extractedData);

      expect(relationships).toHaveLength(1);
      expect(relationships[0].source_external_id).toBe('container-123');
      expect(relationships[0].target_external_id).toBe('web-server-01');
      expect(relationships[0].relationship_type).toBe('HOSTED_ON');
    });

    it('should infer monitor to service relationships', () => {
      const extractedData = new Map([
        [
          'services',
          [
            {
              external_id: 'service-web-api',
              data: {
                attributes: { name: 'web-api' },
              },
              source_type: 'datadog',
              extracted_at: new Date(),
            },
          ],
        ],
        [
          'monitors',
          [
            {
              external_id: '789',
              data: {
                name: 'Web API Latency',
                query: 'avg(last_5m):avg:trace.web-api.request.duration{*} > 1000',
                tags: ['service:web-api'],
                type: 'metric alert',
              },
              source_type: 'datadog',
              extracted_at: new Date(),
            },
          ],
        ],
      ]);

      const relationships = connector.inferRelationships(extractedData);

      expect(relationships).toHaveLength(1);
      expect(relationships[0].source_external_id).toBe('789');
      expect(relationships[0].target_external_id).toBe('service-web-api');
      expect(relationships[0].relationship_type).toBe('MONITORS');
      expect(relationships[0].properties?.monitor_type).toBe('metric alert');
    });
  });

  describe('extractIdentifiers', () => {
    beforeEach(() => {
      connector = new DatadogConnector(validConfig);
    });

    it('should extract host identifiers', () => {
      const hostData = {
        id: 123456,
        name: 'web-server-01',
        aws_name: 'i-0123456789abcdef0',
        meta: {
          socketHostname: 'web-server-01',
          socketFqdn: 'web-server-01.example.com',
        },
      };

      const identifiers = connector.extractIdentifiers(hostData);

      expect(identifiers.external_id).toBe('123456');
      expect(identifiers.hostname).toBe('web-server-01');
      expect(identifiers.fqdn).toBe('web-server-01.example.com');
      expect(identifiers.custom_identifiers?.datadog_id).toBe('123456');
      expect(identifiers.custom_identifiers?.aws_name).toBe('i-0123456789abcdef0');
    });
  });

  describe('getEnabledResources', () => {
    it('should return all default enabled resources', () => {
      connector = new DatadogConnector(validConfig);
      const enabledResources = connector.getEnabledResources();

      expect(enabledResources).toContain('hosts');
      expect(enabledResources).toContain('containers');
      expect(enabledResources).toContain('services');
      expect(enabledResources).toContain('monitors');
    });

    it('should respect custom enabled resources configuration', () => {
      const customConfig = {
        ...validConfig,
        enabled_resources: ['hosts', 'services'],
      };
      connector = new DatadogConnector(customConfig);
      const enabledResources = connector.getEnabledResources();

      expect(enabledResources).toEqual(['hosts', 'services']);
    });
  });
});
