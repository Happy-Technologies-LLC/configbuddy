// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Dynatrace APM Connector Tests (v1.0)
 * Tests for multi-resource connector functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import DynatraceConnector from './index';
import { ConnectorConfiguration } from '@cmdb/integration-framework';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('DynatraceConnector - Multi-Resource Tests', () => {
  let connector: DynatraceConnector;
  let mockAxiosInstance: any;

  const baseConfig: ConnectorConfiguration = {
    name: 'Test Dynatrace Connector',
    type: 'dynatrace',
    enabled: true,
    connection: {
      environment_url: 'https://abc12345.live.dynatrace.com',
      api_token: 'dt0c01.test_token',
    },
  };

  beforeEach(() => {
    // Create mock axios instance
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    connector = new DynatraceConnector(baseConfig);
  });

  describe('Initialization', () => {
    it('should initialize with correct metadata', () => {
      expect(connector).toBeDefined();
      const resources = connector.getAvailableResources();
      expect(resources).toHaveLength(4);
      expect(resources.map(r => r.id)).toEqual([
        'hosts',
        'processes',
        'services',
        'applications'
      ]);
    });

    it('should use default enabled resources', () => {
      const enabledResources = connector.getEnabledResources();
      expect(enabledResources).toEqual([
        'hosts',
        'processes',
        'services',
        'applications'
      ]);
    });

    it('should respect custom enabled resources', () => {
      const customConfig: ConnectorConfiguration = {
        ...baseConfig,
        enabled_resources: ['hosts', 'services'],
      };
      const customConnector = new DynatraceConnector(customConfig);
      expect(customConnector.getEnabledResources()).toEqual(['hosts', 'services']);
    });
  });

  describe('Test Connection', () => {
    it('should successfully test connection', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { types: ['HOST', 'PROCESS_GROUP_INSTANCE', 'SERVICE'] }
      });

      const result = await connector.testConnection();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully connected');
      expect(result.details?.entity_types).toBe(3);
    });

    it('should handle connection failure', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Invalid API token'));

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection failed');
    });
  });

  describe('Extract Resource - Hosts', () => {
    it('should extract hosts from Dynatrace API', async () => {
      const mockHosts = [
        {
          entityId: 'HOST-12345',
          displayName: 'web-server-01',
          firstSeenTms: 1609459200000,
          lastSeenTms: Date.now(),
          properties: {
            osType: 'LINUX',
            osVersion: 'Ubuntu 22.04',
            cpuCores: 8,
            physicalMemory: 16777216,
            ipAddress: '10.0.1.10',
            hostname: 'web-server-01',
          },
          tags: [
            { key: 'environment', value: 'production' },
            { key: 'team', value: 'platform' },
          ],
          toRelationships: {
            runs: ['PROCESS_GROUP_INSTANCE-001', 'PROCESS_GROUP_INSTANCE-002'],
          },
        },
        {
          entityId: 'HOST-12346',
          displayName: 'app-server-01',
          firstSeenTms: 1609459200000,
          lastSeenTms: Date.now(),
          properties: {
            osType: 'WINDOWS',
            osVersion: 'Windows Server 2022',
            cpuCores: 16,
            physicalMemory: 33554432,
            ipAddress: '10.0.1.20',
            hostname: 'app-server-01',
          },
          tags: [{ key: 'environment', value: 'staging' }],
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: {
          entities: mockHosts,
          totalCount: 2,
        }
      });

      const extractedData = await connector.extractResource('hosts');
      expect(extractedData).toHaveLength(2);
      expect(extractedData[0].external_id).toBe('HOST-12345');
      expect(extractedData[0].source_type).toBe('dynatrace');
      expect(extractedData[0].data.displayName).toBe('web-server-01');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/entities',
        expect.objectContaining({
          params: expect.objectContaining({
            entitySelector: 'type("HOST")',
            pageSize: 500,
          })
        })
      );
    });

    it('should handle pagination', async () => {
      const batch1 = {
        entities: Array.from({ length: 500 }, (_, i) => ({
          entityId: `HOST-${i}`,
          displayName: `host-${i}`,
        })),
        totalCount: 1200,
        nextPageKey: 'page2',
      };

      const batch2 = {
        entities: Array.from({ length: 500 }, (_, i) => ({
          entityId: `HOST-${i + 500}`,
          displayName: `host-${i + 500}`,
        })),
        totalCount: 1200,
        nextPageKey: 'page3',
      };

      const batch3 = {
        entities: Array.from({ length: 200 }, (_, i) => ({
          entityId: `HOST-${i + 1000}`,
          displayName: `host-${i + 1000}`,
        })),
        totalCount: 1200,
      };

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: batch1 })
        .mockResolvedValueOnce({ data: batch2 })
        .mockResolvedValueOnce({ data: batch3 });

      const extractedData = await connector.extractResource('hosts');
      expect(extractedData).toHaveLength(1200);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
    });
  });

  describe('Extract Resource - Processes', () => {
    it('should extract processes from Dynatrace API', async () => {
      const mockProcesses = [
        {
          entityId: 'PROCESS_GROUP_INSTANCE-001',
          displayName: 'nginx',
          firstSeenTms: 1609459200000,
          lastSeenTms: Date.now(),
          properties: {
            softwareTechnologies: ['NGINX'],
            listeningPorts: [80, 443],
          },
          tags: [{ key: 'role', value: 'webserver' }],
          toRelationships: {
            runsOn: ['HOST-12345'],
          },
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: {
          entities: mockProcesses,
          totalCount: 1,
        }
      });

      const extractedData = await connector.extractResource('processes');
      expect(extractedData).toHaveLength(1);
      expect(extractedData[0].external_id).toBe('PROCESS_GROUP_INSTANCE-001');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/entities',
        expect.objectContaining({
          params: expect.objectContaining({
            entitySelector: 'type("PROCESS_GROUP_INSTANCE")',
          })
        })
      );
    });
  });

  describe('Extract Resource - Services', () => {
    it('should extract services from Dynatrace API', async () => {
      const mockServices = [
        {
          entityId: 'SERVICE-001',
          displayName: 'user-api',
          firstSeenTms: 1609459200000,
          lastSeenTms: Date.now(),
          properties: {
            serviceType: 'WEB_SERVICE',
            serviceTechnologyTypes: ['NODEJS'],
            webServiceName: 'UserAPI',
          },
          tags: [{ key: 'app', value: 'user-service' }],
          toRelationships: {
            runs: ['PROCESS_GROUP_INSTANCE-001'],
            calls: ['SERVICE-002', 'SERVICE-003'],
          },
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: {
          entities: mockServices,
          totalCount: 1,
        }
      });

      const extractedData = await connector.extractResource('services');
      expect(extractedData).toHaveLength(1);
      expect(extractedData[0].external_id).toBe('SERVICE-001');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/entities',
        expect.objectContaining({
          params: expect.objectContaining({
            entitySelector: 'type("SERVICE")',
          })
        })
      );
    });
  });

  describe('Extract Resource - Applications', () => {
    it('should extract applications from Dynatrace API', async () => {
      const mockApplications = [
        {
          entityId: 'APPLICATION-001',
          displayName: 'Customer Portal',
          firstSeenTms: 1609459200000,
          lastSeenTms: Date.now(),
          properties: {
            applicationType: 'BROWSER',
            applicationName: 'Customer Portal',
            publicDomainNames: ['portal.example.com'],
            realUserMonitoringEnabled: true,
          },
          tags: [{ key: 'business-unit', value: 'sales' }],
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: {
          entities: mockApplications,
          totalCount: 1,
        }
      });

      const extractedData = await connector.extractResource('applications');
      expect(extractedData).toHaveLength(1);
      expect(extractedData[0].external_id).toBe('APPLICATION-001');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/entities',
        expect.objectContaining({
          params: expect.objectContaining({
            entitySelector: 'type("APPLICATION")',
          })
        })
      );
    });
  });

  describe('Transform Resource - Hosts', () => {
    it('should transform host with host-specific attributes', async () => {
      const hostData = {
        entityId: 'HOST-12345',
        displayName: 'web-server-01',
        firstSeenTms: 1609459200000,
        lastSeenTms: Date.now(),
        properties: {
          osType: 'LINUX',
          osVersion: 'Ubuntu 22.04',
          cpuCores: 8,
          physicalMemory: 16777216,
          ipAddress: '10.0.1.10',
          hostname: 'web-server-01',
          monitoringMode: 'FULL_STACK',
        },
        tags: [
          { key: 'environment', value: 'production' },
          { key: 'team', value: 'platform' },
        ],
      };

      const transformedCI = await connector.transformResource('hosts', hostData);

      expect(transformedCI.ci_type).toBe('server');
      expect(transformedCI.name).toBe('web-server-01');
      expect(transformedCI.status).toBe('active');
      expect(transformedCI.environment).toBe('production');
      expect(transformedCI.attributes.os_type).toBe('LINUX');
      expect(transformedCI.attributes.cpu_cores).toBe(8);
      expect(transformedCI.attributes.monitoring_mode).toBe('FULL_STACK');
      expect(transformedCI.attributes.tags).toContain('environment:production');
      expect(transformedCI.attributes.tags).toContain('team:platform');
      expect(transformedCI.confidence_score).toBe(95);
      expect(transformedCI.identifiers.hostname).toBe('web-server-01');
      expect(transformedCI.identifiers.ip_address).toContain('10.0.1.10');
    });

    it('should mark host as inactive if not seen in 24 hours', async () => {
      const oneDayAgo = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      const hostData = {
        entityId: 'HOST-12345',
        displayName: 'old-server-01',
        lastSeenTms: oneDayAgo,
        properties: {},
        tags: [],
      };

      const transformedCI = await connector.transformResource('hosts', hostData);
      expect(transformedCI.status).toBe('inactive');
    });
  });

  describe('Transform Resource - Processes', () => {
    it('should transform process with process-specific attributes', async () => {
      const processData = {
        entityId: 'PROCESS_GROUP_INSTANCE-001',
        displayName: 'nginx',
        firstSeenTms: 1609459200000,
        lastSeenTms: Date.now(),
        properties: {
          softwareTechnologies: ['NGINX', 'OPENSSL'],
          listeningPorts: [80, 443],
          metadata: { version: '1.21.6' },
        },
        tags: [{ key: 'role', value: 'webserver' }],
      };

      const transformedCI = await connector.transformResource('processes', processData);

      expect(transformedCI.ci_type).toBe('process');
      expect(transformedCI.name).toBe('nginx');
      expect(transformedCI.attributes.process_type).toBe('NGINX');
      expect(transformedCI.attributes.software_technologies).toEqual(['NGINX', 'OPENSSL']);
      expect(transformedCI.attributes.listening_ports).toEqual([80, 443]);
    });
  });

  describe('Transform Resource - Services', () => {
    it('should transform service with service-specific attributes', async () => {
      const serviceData = {
        entityId: 'SERVICE-001',
        displayName: 'user-api',
        firstSeenTms: 1609459200000,
        lastSeenTms: Date.now(),
        properties: {
          serviceType: 'WEB_SERVICE',
          serviceTechnologyTypes: ['NODEJS', 'EXPRESS'],
          webServiceName: 'UserAPI',
          webServiceNamespace: 'api.v1',
        },
        tags: [{ key: 'app', value: 'user-service' }],
      };

      const transformedCI = await connector.transformResource('services', serviceData);

      expect(transformedCI.ci_type).toBe('service');
      expect(transformedCI.name).toBe('user-api');
      expect(transformedCI.attributes.service_type).toBe('WEB_SERVICE');
      expect(transformedCI.attributes.service_technology_types).toEqual(['NODEJS', 'EXPRESS']);
      expect(transformedCI.attributes.web_service_name).toBe('UserAPI');
    });
  });

  describe('Transform Resource - Applications', () => {
    it('should transform application with application-specific attributes', async () => {
      const appData = {
        entityId: 'APPLICATION-001',
        displayName: 'Customer Portal',
        firstSeenTms: 1609459200000,
        lastSeenTms: Date.now(),
        properties: {
          applicationType: 'BROWSER',
          applicationName: 'Customer Portal',
          publicDomainNames: ['portal.example.com', 'portal.example.net'],
          realUserMonitoringEnabled: true,
          costControlUserSessionPercentage: 100,
        },
        tags: [{ key: 'business-unit', value: 'sales' }],
      };

      const transformedCI = await connector.transformResource('applications', appData);

      expect(transformedCI.ci_type).toBe('application');
      expect(transformedCI.name).toBe('Customer Portal');
      expect(transformedCI.attributes.application_type).toBe('BROWSER');
      expect(transformedCI.attributes.public_domain_names).toEqual([
        'portal.example.com',
        'portal.example.net'
      ]);
      expect(transformedCI.attributes.real_user_monitoring_enabled).toBe(true);
    });
  });

  describe('Extract Relationships', () => {
    it('should infer relationships from toRelationships', async () => {
      // First extract some entities to populate cache
      const mockHosts = [
        {
          entityId: 'HOST-12345',
          displayName: 'web-server-01',
          toRelationships: {
            runs: ['PROCESS_GROUP_INSTANCE-001', 'PROCESS_GROUP_INSTANCE-002'],
          },
        },
      ];

      const mockProcesses = [
        {
          entityId: 'PROCESS_GROUP_INSTANCE-001',
          displayName: 'nginx',
          toRelationships: {
            runsOn: ['HOST-12345'],
          },
        },
      ];

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: { entities: mockHosts, totalCount: 1 } })
        .mockResolvedValueOnce({ data: { entities: mockProcesses, totalCount: 1 } });

      // Extract to populate cache
      await connector.extractResource('hosts');
      await connector.extractResource('processes');

      // Now extract relationships
      const relationships = await connector.extractRelationships();

      expect(relationships.length).toBeGreaterThan(0);

      // Check for process-to-host relationship
      const processToHost = relationships.find(
        r => r.source_external_id === 'PROCESS_GROUP_INSTANCE-001' &&
             r.target_external_id === 'HOST-12345'
      );
      expect(processToHost).toBeDefined();
      expect(processToHost?.relationship_type).toBe('RUNS_ON');

      // Check for host-to-process relationship
      const hostToProcess = relationships.find(
        r => r.source_external_id === 'HOST-12345' &&
             r.target_external_id === 'PROCESS_GROUP_INSTANCE-001'
      );
      expect(hostToProcess).toBeDefined();
      expect(hostToProcess?.relationship_type).toBe('HOSTS');
    });
  });

  describe('Resource Configuration', () => {
    it('should use resource-specific configuration', async () => {
      const configWithResources: ConnectorConfiguration = {
        ...baseConfig,
        enabled_resources: ['hosts'],
        resource_configs: {
          hosts: {
            pageSize: 100,
            fields: '+properties',
          },
        },
      };

      const customConnector = new DynatraceConnector(configWithResources);
      mockAxiosInstance.get.mockResolvedValue({
        data: { entities: [], totalCount: 0 }
      });

      await customConnector.extractResource(
        'hosts',
        configWithResources.resource_configs!.hosts
      );

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/entities',
        expect.objectContaining({
          params: expect.objectContaining({
            pageSize: 100,
            fields: '+properties',
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unknown resource', async () => {
      await expect(
        connector.extractResource('invalid_resource')
      ).rejects.toThrow('Unknown resource: invalid_resource');
    });

    it('should handle API errors gracefully', async () => {
      mockAxiosInstance.get.mockRejectedValue({
        response: {
          status: 403,
          data: { error: { message: 'Token missing required permissions' } }
        }
      });

      await expect(
        connector.extractResource('hosts')
      ).rejects.toThrow();
    });
  });

  describe('Environment Detection', () => {
    it('should detect environment from tags', async () => {
      const testCases = [
        { tag: { key: 'environment', value: 'production' }, expected: 'production' },
        { tag: { key: 'env', value: 'staging' }, expected: 'staging' },
        { tag: { key: 'environment', value: 'dev' }, expected: 'development' },
        { tag: { key: 'env', value: 'test' }, expected: 'test' },
      ];

      for (const testCase of testCases) {
        const hostData = {
          entityId: 'HOST-TEST',
          displayName: 'test-host',
          tags: [testCase.tag],
          properties: {},
        };

        const transformedCI = await connector.transformResource('hosts', hostData);
        expect(transformedCI.environment).toBe(testCase.expected);
      }
    });

    it('should default to production if no environment found', async () => {
      const hostData = {
        entityId: 'HOST-TEST',
        displayName: 'test-host',
        tags: [],
        properties: {},
      };

      const transformedCI = await connector.transformResource('hosts', hostData);
      expect(transformedCI.environment).toBe('production');
    });
  });
});
