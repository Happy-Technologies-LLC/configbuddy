// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * ServiceNow CMDB Connector Tests (v3.0)
 * Tests for multi-resource connector functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import ServiceNowConnector from './index';
import { ConnectorConfiguration } from '@cmdb/integration-framework';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('ServiceNowConnector - Multi-Resource Tests', () => {
  let connector: ServiceNowConnector;
  let mockAxiosInstance: any;

  const baseConfig: ConnectorConfiguration = {
    name: 'Test ServiceNow Connector',
    type: 'servicenow',
    enabled: true,
    connection: {
      instance_url: 'https://test.service-now.com',
      username: 'test_user',
      password: 'test_password',
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

    connector = new ServiceNowConnector(baseConfig);
  });

  describe('Initialization', () => {
    it('should initialize with correct metadata', () => {
      expect(connector).toBeDefined();
      const resources = connector.getAvailableResources();
      expect(resources).toHaveLength(6);
      expect(resources.map(r => r.id)).toEqual([
        'servers',
        'virtual_machines',
        'databases',
        'applications',
        'network_devices',
        'relationships'
      ]);
    });

    it('should use default enabled resources', () => {
      const enabledResources = connector.getEnabledResources();
      expect(enabledResources).toEqual([
        'servers',
        'virtual_machines',
        'databases',
        'network_devices',
        'relationships'
      ]);
    });

    it('should respect custom enabled resources', () => {
      const customConfig: ConnectorConfiguration = {
        ...baseConfig,
        enabled_resources: ['servers', 'databases'],
      };
      const customConnector = new ServiceNowConnector(customConfig);
      expect(customConnector.getEnabledResources()).toEqual(['servers', 'databases']);
    });
  });

  describe('Test Connection', () => {
    it('should successfully test connection', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { result: [{ name: 'test' }] }
      });

      const result = await connector.testConnection();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully connected');
    });

    it('should handle connection failure', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Connection refused'));

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection failed');
    });
  });

  describe('Extract Resource', () => {
    it('should extract servers from cmdb_ci_server', async () => {
      const mockServers = [
        {
          sys_id: 'server-1',
          name: 'web-server-01',
          serial_number: 'SN001',
          sys_class_name: 'cmdb_ci_server',
          operational_status: '1',
        },
        {
          sys_id: 'server-2',
          name: 'web-server-02',
          serial_number: 'SN002',
          sys_class_name: 'cmdb_ci_server',
          operational_status: '1',
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: { result: mockServers }
      });

      const extractedData = await connector.extractResource('servers');
      expect(extractedData).toHaveLength(2);
      expect(extractedData[0].external_id).toBe('server-1');
      expect(extractedData[0].source_type).toBe('servicenow');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/table/cmdb_ci_server',
        expect.objectContaining({
          params: expect.objectContaining({
            sysparm_limit: 1000,
          })
        })
      );
    });

    it('should extract virtual machines from cmdb_ci_vm_instance', async () => {
      const mockVMs = [
        {
          sys_id: 'vm-1',
          name: 'app-vm-01',
          sys_class_name: 'cmdb_ci_vm_instance',
          vcpus: 4,
          memory: 8192,
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: { result: mockVMs }
      });

      const extractedData = await connector.extractResource('virtual_machines');
      expect(extractedData).toHaveLength(1);
      expect(extractedData[0].external_id).toBe('vm-1');
    });

    it('should apply resource-specific query filter', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { result: [] }
      });

      await connector.extractResource('servers', {
        query: 'operational_status=1^environment=production'
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/table/cmdb_ci_server',
        expect.objectContaining({
          params: expect.objectContaining({
            sysparm_query: 'operational_status=1^environment=production'
          })
        })
      );
    });

    it('should use resource-specific batch size', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { result: [] }
      });

      await connector.extractResource('databases');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/table/cmdb_ci_db_instance',
        expect.objectContaining({
          params: expect.objectContaining({
            sysparm_limit: 500  // databases use 500 batch size
          })
        })
      );
    });

    it('should handle pagination', async () => {
      const batch1 = Array.from({ length: 1000 }, (_, i) => ({
        sys_id: `server-${i}`,
        name: `server-${i}`,
        sys_class_name: 'cmdb_ci_server',
      }));

      const batch2 = Array.from({ length: 500 }, (_, i) => ({
        sys_id: `server-${i + 1000}`,
        name: `server-${i + 1000}`,
        sys_class_name: 'cmdb_ci_server',
      }));

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: { result: batch1 } })
        .mockResolvedValueOnce({ data: { result: batch2 } });

      const extractedData = await connector.extractResource('servers');
      expect(extractedData).toHaveLength(1500);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Transform Resource', () => {
    it('should transform server with server-specific attributes', async () => {
      const serverData = {
        sys_id: 'server-1',
        name: 'web-server-01',
        sys_class_name: 'cmdb_ci_server',
        operational_status: '1',
        os: { display_value: 'Linux' },
        os_version: 'Ubuntu 22.04',
        cpu_count: 8,
        ram: 16384,
        manufacturer: { display_value: 'Dell' },
      };

      const transformedCI = await connector.transformResource('servers', serverData);

      expect(transformedCI.ci_type).toBe('server');
      expect(transformedCI.name).toBe('web-server-01');
      expect(transformedCI.status).toBe('active');
      expect(transformedCI.attributes.os).toBe('Linux');
      expect(transformedCI.attributes.cpu_count).toBe(8);
      expect(transformedCI.confidence_score).toBe(100);
    });

    it('should transform virtual machine with VM-specific attributes', async () => {
      const vmData = {
        sys_id: 'vm-1',
        name: 'app-vm-01',
        sys_class_name: 'cmdb_ci_vm_instance',
        operational_status: '1',
        vcpus: 4,
        memory: 8192,
        guest_os: { display_value: 'Windows Server 2022' },
        vm_inst_id: 'vm-500abc123',
      };

      const transformedCI = await connector.transformResource('virtual_machines', vmData);

      expect(transformedCI.ci_type).toBe('virtual-machine');
      expect(transformedCI.attributes.vcpus).toBe(4);
      expect(transformedCI.attributes.memory).toBe(8192);
      expect(transformedCI.attributes.guest_os).toBe('Windows Server 2022');
      expect(transformedCI.attributes.vm_inst_id).toBe('vm-500abc123');
    });

    it('should transform database with database-specific attributes', async () => {
      const dbData = {
        sys_id: 'db-1',
        name: 'prod-mysql-01',
        sys_class_name: 'cmdb_ci_db_instance',
        operational_status: '1',
        db_version: '8.0.32',
        db_type: { display_value: 'MySQL' },
        instance_name: 'prod_db',
        port: 3306,
        size_bytes: 107374182400, // 100GB
      };

      const transformedCI = await connector.transformResource('databases', dbData);

      expect(transformedCI.ci_type).toBe('database');
      expect(transformedCI.attributes.db_version).toBe('8.0.32');
      expect(transformedCI.attributes.db_type).toBe('MySQL');
      expect(transformedCI.attributes.port).toBe(3306);
    });

    it('should transform application with application-specific attributes', async () => {
      const appData = {
        sys_id: 'app-1',
        name: 'Customer Portal',
        sys_class_name: 'cmdb_ci_appl',
        operational_status: '1',
        version: '2.5.0',
        vendor: { display_value: 'Internal' },
        business_criticality: { display_value: 'High' },
      };

      const transformedCI = await connector.transformResource('applications', appData);

      expect(transformedCI.ci_type).toBe('application');
      expect(transformedCI.attributes.version).toBe('2.5.0');
      expect(transformedCI.attributes.business_criticality).toBe('High');
    });

    it('should transform network device with device-specific attributes', async () => {
      const networkData = {
        sys_id: 'net-1',
        name: 'core-switch-01',
        sys_class_name: 'cmdb_ci_netgear',
        operational_status: '1',
        device_type: { display_value: 'Switch' },
        ports: 48,
        firmware_version: '15.2(7)E3',
      };

      const transformedCI = await connector.transformResource('network_devices', networkData);

      expect(transformedCI.ci_type).toBe('network-device');
      expect(transformedCI.attributes.device_type).toBe('Switch');
      expect(transformedCI.attributes.ports).toBe(48);
    });
  });

  describe('Extract Relationships', () => {
    it('should extract CI relationships', async () => {
      const mockRelationships = [
        {
          sys_id: 'rel-1',
          parent: { value: 'server-1' },
          child: { value: 'vm-1' },
          type: { display_value: 'Hosted on::Hosts' },
        },
        {
          sys_id: 'rel-2',
          parent: { value: 'app-1' },
          child: { value: 'db-1' },
          type: { display_value: 'Uses::Used by' },
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: { result: mockRelationships }
      });

      const relationships = await connector.extractRelationships();

      expect(relationships).toHaveLength(2);
      expect(relationships[0].source_external_id).toBe('server-1');
      expect(relationships[0].target_external_id).toBe('vm-1');
      expect(relationships[0].relationship_type).toBe('HOSTS');
      expect(relationships[1].relationship_type).toBe('USES');
    });
  });

  describe('Resource Configuration', () => {
    it('should use resource-specific configuration', async () => {
      const configWithResources: ConnectorConfiguration = {
        ...baseConfig,
        enabled_resources: ['servers', 'databases'],
        resource_configs: {
          servers: {
            table: 'cmdb_ci_server',
            query: 'operational_status=1',
          },
          databases: {
            table: 'cmdb_ci_db_instance',
            query: 'u_tier=tier1',
          },
        },
      };

      const customConnector = new ServiceNowConnector(configWithResources);
      mockAxiosInstance.get.mockResolvedValue({ data: { result: [] } });

      await customConnector.extractResource('servers', configWithResources.resource_configs!.servers);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/table/cmdb_ci_server',
        expect.objectContaining({
          params: expect.objectContaining({
            sysparm_query: 'operational_status=1'
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

    it('should throw error when table is not configured', async () => {
      const badResource = {
        table: undefined, // No table configured
      };

      // This should fail because the resource metadata requires a table
      await expect(
        connector.extractResource('servers', badResource)
      ).rejects.toThrow();
    });
  });
});
