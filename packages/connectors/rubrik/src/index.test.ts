// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Rubrik CDM Connector Tests (v1.0)
 * Tests for multi-resource connector functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';
import RubrikConnector from './index';
import { ConnectorConfiguration } from '@cmdb/integration-framework';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('RubrikConnector - Multi-Resource Tests', () => {
  let connector: RubrikConnector;
  let mockAxiosInstance: any;

  const baseConfig: ConnectorConfiguration = {
    name: 'Test Rubrik Connector',
    type: 'rubrik',
    enabled: true,
    connection: {
      cluster_url: 'https://rubrik-cluster.example.com',
      username: 'admin',
      password: 'password123',
      api_version: 'v1',
      verify_ssl: false,
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

    // Mock axios.create to return our mock instance
    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    connector = new RubrikConnector(baseConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct metadata', () => {
      expect(connector).toBeDefined();
      const resources = connector.getAvailableResources();
      expect(resources).toHaveLength(5);
      expect(resources.map(r => r.id)).toEqual([
        'clusters',
        'vms',
        'physical_hosts',
        'sla_domains',
        'relationships',
      ]);
    });

    it('should use default enabled resources', () => {
      const enabledResources = connector.getEnabledResources();
      expect(enabledResources).toEqual([
        'clusters',
        'vms',
        'physical_hosts',
        'sla_domains',
        'relationships',
      ]);
    });

    it('should respect custom enabled resources', () => {
      const customConfig: ConnectorConfiguration = {
        ...baseConfig,
        enabled_resources: ['clusters', 'vms'],
      };
      const customConnector = new RubrikConnector(customConfig);
      expect(customConnector.getEnabledResources()).toEqual(['clusters', 'vms']);
    });

    it('should initialize successfully', async () => {
      await connector.initialize();
      expect(connector['isInitialized']).toBe(true);
    });
  });

  describe('Test Connection', () => {
    it('should successfully test connection', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          id: 'cluster-001',
          name: 'Production Rubrik',
          version: '8.1.2-p1-23456',
          apiVersion: 'v1',
        },
      });

      const result = await connector.testConnection();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully connected');
      expect(result.details?.cluster_name).toBe('Production Rubrik');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/cluster/me');
    });

    it('should handle connection failure', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Connection refused'));

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection failed');
    });

    it('should handle authentication failure', async () => {
      mockAxiosInstance.get.mockRejectedValue({
        response: {
          status: 401,
          data: { message: 'Invalid credentials' },
        },
        message: 'Request failed with status code 401',
      });

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection failed');
    });
  });

  describe('Extract Clusters', () => {
    beforeEach(async () => {
      await connector.initialize();
    });

    it('should extract cluster information', async () => {
      const mockCluster = {
        id: 'cluster-001',
        name: 'Production Rubrik',
        version: '8.1.2-p1-23456',
        apiVersion: 'v1',
        timezone: {
          timezone: 'America/New_York',
        },
        geolocation: {
          address: 'New York, NY, USA',
        },
        acceptedEulaVersion: '1.0',
        latestEulaVersion: '1.0',
      };

      mockAxiosInstance.get.mockResolvedValue({
        data: mockCluster,
      });

      const extractedData = await connector.extractResource('clusters');

      expect(extractedData).toHaveLength(1);
      expect(extractedData[0].external_id).toBe('cluster-001');
      expect(extractedData[0].source_type).toBe('rubrik');
      expect(extractedData[0].data.name).toBe('Production Rubrik');
      expect(extractedData[0].data.version).toBe('8.1.2-p1-23456');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/cluster/me');
    });

    it('should handle cluster extraction failure', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('API error'));

      await expect(connector.extractResource('clusters')).rejects.toThrow('API error');
    });
  });

  describe('Extract VMs', () => {
    beforeEach(async () => {
      await connector.initialize();
    });

    it('should extract VMs with pagination', async () => {
      const mockVMs = [
        {
          id: 'VirtualMachine:::vm-001',
          name: 'web-server-01',
          configuredSlaDomainId: 'sla-domain-001',
          configuredSlaDomainName: 'Gold',
          effectiveSlaDomainId: 'sla-domain-001',
          effectiveSlaDomainName: 'Gold',
          primaryClusterId: 'cluster-001',
          vmwareToolsInstalled: true,
          guestOsName: 'Ubuntu Linux (64-bit)',
          ipAddress: '10.0.1.10',
          powerStatus: 'PoweredOn',
          isRelic: false,
          slaAssignment: 'Direct',
          objectType: 'VmwareVirtualMachine',
        },
        {
          id: 'VirtualMachine:::vm-002',
          name: 'db-server-01',
          configuredSlaDomainId: 'sla-domain-002',
          configuredSlaDomainName: 'Platinum',
          effectiveSlaDomainId: 'sla-domain-002',
          effectiveSlaDomainName: 'Platinum',
          primaryClusterId: 'cluster-001',
          vmwareToolsInstalled: true,
          guestOsName: 'Microsoft Windows Server 2019 (64-bit)',
          ipAddress: '10.0.1.20',
          powerStatus: 'PoweredOn',
          isRelic: false,
          slaAssignment: 'Direct',
          objectType: 'VmwareVirtualMachine',
        },
      ];

      // First page
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          hasMore: false,
          data: mockVMs,
        },
      });

      const extractedData = await connector.extractResource('vms');

      expect(extractedData).toHaveLength(2);
      expect(extractedData[0].external_id).toBe('VirtualMachine:::vm-001');
      expect(extractedData[0].data.name).toBe('web-server-01');
      expect(extractedData[1].external_id).toBe('VirtualMachine:::vm-002');
      expect(extractedData[1].data.name).toBe('db-server-01');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/vmware/vm',
        expect.objectContaining({
          params: expect.objectContaining({
            limit: 500,
            offset: 0,
          }),
        })
      );
    });

    it('should handle VM pagination with multiple pages', async () => {
      const mockVMsPage1 = Array.from({ length: 500 }, (_, i) => ({
        id: `VirtualMachine:::vm-${String(i).padStart(3, '0')}`,
        name: `vm-${String(i).padStart(3, '0')}`,
        configuredSlaDomainId: 'sla-domain-001',
        effectiveSlaDomainId: 'sla-domain-001',
        primaryClusterId: 'cluster-001',
        vmwareToolsInstalled: true,
        isRelic: false,
        slaAssignment: 'Direct',
        objectType: 'VmwareVirtualMachine',
      }));

      const mockVMsPage2 = Array.from({ length: 100 }, (_, i) => ({
        id: `VirtualMachine:::vm-${String(i + 500).padStart(3, '0')}`,
        name: `vm-${String(i + 500).padStart(3, '0')}`,
        configuredSlaDomainId: 'sla-domain-001',
        effectiveSlaDomainId: 'sla-domain-001',
        primaryClusterId: 'cluster-001',
        vmwareToolsInstalled: true,
        isRelic: false,
        slaAssignment: 'Direct',
        objectType: 'VmwareVirtualMachine',
      }));

      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: { hasMore: true, data: mockVMsPage1 },
        })
        .mockResolvedValueOnce({
          data: { hasMore: false, data: mockVMsPage2 },
        });

      const extractedData = await connector.extractResource('vms');

      expect(extractedData).toHaveLength(600);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });

    it('should apply VM filters', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { hasMore: false, data: [] },
      });

      await connector.extractResource('vms', {
        primary_cluster_id: 'cluster-001',
        sla_domain_id: 'sla-domain-001',
        is_relic: false,
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/vmware/vm',
        expect.objectContaining({
          params: expect.objectContaining({
            primary_cluster_id: 'cluster-001',
            effective_sla_domain_id: 'sla-domain-001',
            is_relic: false,
          }),
        })
      );
    });
  });

  describe('Extract Physical Hosts', () => {
    beforeEach(async () => {
      await connector.initialize();
    });

    it('should extract physical hosts with pagination', async () => {
      const mockHosts = [
        {
          id: 'Host:::host-001',
          name: 'linux-server-01',
          hostname: 'linux-server-01.example.com',
          configuredSlaDomainId: 'sla-domain-001',
          configuredSlaDomainName: 'Gold',
          effectiveSlaDomainId: 'sla-domain-001',
          effectiveSlaDomainName: 'Gold',
          primaryClusterId: 'cluster-001',
          operatingSystem: 'Linux',
          operatingSystemType: 'Linux',
          status: 'Ok',
          connectivity: 'Connected',
          compressionEnabled: true,
          isRelic: false,
          agentId: 'agent-001',
          ipAddress: '10.0.2.10',
        },
        {
          id: 'Host:::host-002',
          name: 'windows-server-01',
          hostname: 'windows-server-01.example.com',
          configuredSlaDomainId: 'sla-domain-002',
          configuredSlaDomainName: 'Platinum',
          effectiveSlaDomainId: 'sla-domain-002',
          effectiveSlaDomainName: 'Platinum',
          primaryClusterId: 'cluster-001',
          operatingSystem: 'Windows',
          operatingSystemType: 'Windows',
          status: 'Ok',
          connectivity: 'Connected',
          compressionEnabled: true,
          isRelic: false,
          agentId: 'agent-002',
          ipAddress: '10.0.2.20',
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: { hasMore: false, data: mockHosts },
      });

      const extractedData = await connector.extractResource('physical_hosts');

      expect(extractedData).toHaveLength(2);
      expect(extractedData[0].external_id).toBe('Host:::host-001');
      expect(extractedData[0].data.name).toBe('linux-server-01');
      expect(extractedData[1].external_id).toBe('Host:::host-002');
      expect(extractedData[1].data.operatingSystem).toBe('Windows');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/host',
        expect.objectContaining({
          params: expect.objectContaining({
            limit: 500,
            offset: 0,
          }),
        })
      );
    });

    it('should apply physical host filters', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { hasMore: false, data: [] },
      });

      await connector.extractResource('physical_hosts', {
        primary_cluster_id: 'cluster-001',
        operating_system: 'Linux',
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/host',
        expect.objectContaining({
          params: expect.objectContaining({
            primary_cluster_id: 'cluster-001',
            operating_system_type: 'Linux',
          }),
        })
      );
    });
  });

  describe('Extract SLA Domains', () => {
    beforeEach(async () => {
      await connector.initialize();
    });

    it('should extract SLA domains with pagination', async () => {
      const mockSLADomains = [
        {
          id: 'sla-domain-001',
          name: 'Gold',
          frequencies: {
            hourly: { frequency: 4, retention: 24 },
            daily: { frequency: 1, retention: 30 },
            weekly: { frequency: 1, retention: 52 },
            monthly: { frequency: 1, retention: 12 },
          },
          localRetentionLimit: 90,
          archivalSpecs: [],
          replicationSpecs: [],
          numVms: 150,
          numDbs: 25,
          numFilesets: 10,
          numHypervVms: 0,
          numMssqlDbs: 10,
          numOracleDbs: 5,
          numWindowsVolumeGroups: 0,
          numLinuxHosts: 20,
          numShares: 5,
          numWindowsHosts: 15,
          numManagedVolumes: 0,
          isDefault: false,
          uiColor: '#FFD700',
        },
        {
          id: 'sla-domain-002',
          name: 'Platinum',
          frequencies: {
            hourly: { frequency: 2, retention: 48 },
            daily: { frequency: 1, retention: 60 },
            weekly: { frequency: 1, retention: 104 },
            monthly: { frequency: 1, retention: 24 },
          },
          localRetentionLimit: 180,
          archivalSpecs: [],
          replicationSpecs: [],
          numVms: 50,
          numDbs: 15,
          numFilesets: 5,
          numHypervVms: 0,
          numMssqlDbs: 8,
          numOracleDbs: 7,
          numWindowsVolumeGroups: 0,
          numLinuxHosts: 10,
          numShares: 2,
          numWindowsHosts: 8,
          numManagedVolumes: 0,
          isDefault: false,
          uiColor: '#E5E4E2',
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: { hasMore: false, data: mockSLADomains },
      });

      const extractedData = await connector.extractResource('sla_domains');

      expect(extractedData).toHaveLength(2);
      expect(extractedData[0].external_id).toBe('sla-domain-001');
      expect(extractedData[0].data.name).toBe('Gold');
      expect(extractedData[0].data.numVms).toBe(150);
      expect(extractedData[1].external_id).toBe('sla-domain-002');
      expect(extractedData[1].data.name).toBe('Platinum');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/sla_domain',
        expect.objectContaining({
          params: expect.objectContaining({
            limit: 100,
            offset: 0,
          }),
        })
      );
    });

    it('should apply SLA domain filters', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { hasMore: false, data: [] },
      });

      await connector.extractResource('sla_domains', {
        primary_cluster_id: 'cluster-001',
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/sla_domain',
        expect.objectContaining({
          params: expect.objectContaining({
            primary_cluster_id: 'cluster-001',
          }),
        })
      );
    });
  });

  describe('Transform Resources', () => {
    it('should transform cluster to CMDB CI', async () => {
      const clusterData = {
        id: 'cluster-001',
        name: 'Production Rubrik',
        version: '8.1.2-p1-23456',
        apiVersion: 'v1',
        timezone: {
          timezone: 'America/New_York',
        },
        geolocation: {
          address: 'New York, NY, USA',
        },
        acceptedEulaVersion: '1.0',
      };

      const transformedCI = await connector.transformResource('clusters', clusterData);

      expect(transformedCI.ci_type).toBe('server');
      expect(transformedCI.name).toBe('Production Rubrik');
      expect(transformedCI.status).toBe('active');
      expect(transformedCI.source).toBe('rubrik');
      expect(transformedCI.source_id).toBe('cluster-001');
      expect(transformedCI.confidence_score).toBe(100);
      expect(transformedCI.attributes.version).toBe('8.1.2-p1-23456');
      expect(transformedCI.attributes.timezone).toBe('America/New_York');
      expect(transformedCI.attributes.location).toBe('New York, NY, USA');
    });

    it('should transform VM to CMDB CI', async () => {
      const vmData = {
        id: 'VirtualMachine:::vm-001',
        name: 'web-server-01',
        configuredSlaDomainId: 'sla-domain-001',
        configuredSlaDomainName: 'Gold',
        effectiveSlaDomainId: 'sla-domain-001',
        effectiveSlaDomainName: 'Gold',
        primaryClusterId: 'cluster-001',
        vmwareToolsInstalled: true,
        guestOsName: 'Ubuntu Linux (64-bit)',
        ipAddress: '10.0.1.10',
        powerStatus: 'PoweredOn',
        isRelic: false,
        slaAssignment: 'Direct',
        objectType: 'VmwareVirtualMachine',
      };

      const transformedCI = await connector.transformResource('vms', vmData);

      expect(transformedCI.ci_type).toBe('virtual-machine');
      expect(transformedCI.name).toBe('web-server-01');
      expect(transformedCI.status).toBe('active');
      expect(transformedCI.attributes.guest_os).toBe('Ubuntu Linux (64-bit)');
      expect(transformedCI.attributes.ip_address).toBe('10.0.1.10');
      expect(transformedCI.attributes.power_status).toBe('PoweredOn');
      expect(transformedCI.attributes.effective_sla_domain_name).toBe('Gold');
      expect(transformedCI.confidence_score).toBe(95);
    });

    it('should transform physical host to CMDB CI', async () => {
      const hostData = {
        id: 'Host:::host-001',
        name: 'linux-server-01',
        hostname: 'linux-server-01.example.com',
        configuredSlaDomainId: 'sla-domain-001',
        configuredSlaDomainName: 'Gold',
        effectiveSlaDomainId: 'sla-domain-001',
        effectiveSlaDomainName: 'Gold',
        primaryClusterId: 'cluster-001',
        operatingSystem: 'Linux',
        operatingSystemType: 'Linux',
        status: 'Ok',
        connectivity: 'Connected',
        compressionEnabled: true,
        isRelic: false,
        agentId: 'agent-001',
        ipAddress: '10.0.2.10',
      };

      const transformedCI = await connector.transformResource('physical_hosts', hostData);

      expect(transformedCI.ci_type).toBe('server');
      expect(transformedCI.name).toBe('linux-server-01');
      expect(transformedCI.status).toBe('active');
      expect(transformedCI.attributes.hostname).toBe('linux-server-01.example.com');
      expect(transformedCI.attributes.operating_system).toBe('Linux');
      expect(transformedCI.attributes.ip_address).toBe('10.0.2.10');
      expect(transformedCI.attributes.compression_enabled).toBe(true);
      expect(transformedCI.confidence_score).toBe(95);
    });

    it('should transform SLA domain to CMDB CI', async () => {
      const slaDomainData = {
        id: 'sla-domain-001',
        name: 'Gold',
        frequencies: {
          hourly: { frequency: 4, retention: 24 },
          daily: { frequency: 1, retention: 30 },
        },
        localRetentionLimit: 90,
        archivalSpecs: [],
        replicationSpecs: [],
        numVms: 150,
        numDbs: 25,
        isDefault: false,
        uiColor: '#FFD700',
      };

      const transformedCI = await connector.transformResource('sla_domains', slaDomainData);

      expect(transformedCI.ci_type).toBe('policy');
      expect(transformedCI.name).toBe('Gold');
      expect(transformedCI.status).toBe('active');
      expect(transformedCI.attributes.is_default).toBe(false);
      expect(transformedCI.attributes.num_vms).toBe(150);
      expect(transformedCI.attributes.num_dbs).toBe(25);
      expect(transformedCI.attributes.local_retention_limit).toBe(90);
      expect(transformedCI.confidence_score).toBe(100);
    });
  });

  describe('Status Mapping', () => {
    it('should map VM power status correctly', async () => {
      const testCases = [
        { powerStatus: 'PoweredOn', expected: 'active' },
        { powerStatus: 'PoweredOff', expected: 'inactive' },
        { powerStatus: 'Suspended', expected: 'maintenance' },
        { powerStatus: undefined, expected: 'active' },
      ];

      for (const testCase of testCases) {
        const vmData = {
          id: 'vm-001',
          name: 'test-vm',
          configuredSlaDomainId: 'sla-001',
          effectiveSlaDomainId: 'sla-001',
          primaryClusterId: 'cluster-001',
          vmwareToolsInstalled: true,
          isRelic: false,
          slaAssignment: 'Direct',
          objectType: 'VmwareVirtualMachine',
          powerStatus: testCase.powerStatus,
        };

        const transformedCI = await connector.transformResource('vms', vmData);
        expect(transformedCI.status).toBe(testCase.expected);
      }
    });

    it('should map physical host status correctly', async () => {
      const testCases = [
        { status: 'Ok', connectivity: 'Connected', expected: 'active' },
        { status: 'Warning', connectivity: 'Connected', expected: 'active' },
        { status: 'Error', connectivity: 'Connected', expected: 'inactive' },
        { status: 'Ok', connectivity: 'Disconnected', expected: 'inactive' },
        { status: 'Ok', connectivity: 'Error', expected: 'inactive' },
      ];

      for (const testCase of testCases) {
        const hostData = {
          id: 'host-001',
          name: 'test-host',
          hostname: 'test-host.example.com',
          configuredSlaDomainId: 'sla-001',
          effectiveSlaDomainId: 'sla-001',
          primaryClusterId: 'cluster-001',
          operatingSystem: 'Linux',
          operatingSystemType: 'Linux',
          status: testCase.status,
          connectivity: testCase.connectivity,
          isRelic: false,
        };

        const transformedCI = await connector.transformResource('physical_hosts', hostData);
        expect(transformedCI.status).toBe(testCase.expected);
      }
    });
  });

  describe('Infer Relationships', () => {
    it('should infer relationships from VMs to SLA domains', () => {
      const extractedData = [
        {
          external_id: 'vm-001',
          data: {
            id: 'vm-001',
            name: 'web-server-01',
            effectiveSlaDomainId: 'sla-domain-001',
            effectiveSlaDomainName: 'Gold',
            primaryClusterId: 'cluster-001',
            slaAssignment: 'Direct',
          },
          source_type: 'rubrik',
          extracted_at: new Date(),
        },
        {
          external_id: 'vm-002',
          data: {
            id: 'vm-002',
            name: 'db-server-01',
            effectiveSlaDomainId: 'sla-domain-002',
            effectiveSlaDomainName: 'Platinum',
            primaryClusterId: 'cluster-001',
            slaAssignment: 'Direct',
          },
          source_type: 'rubrik',
          extracted_at: new Date(),
        },
      ];

      const relationships = connector.inferRelationships(extractedData);

      expect(relationships).toHaveLength(4); // 2 PROTECTED_BY + 2 MANAGED_BY

      // Check PROTECTED_BY relationships
      const protectedByRelationships = relationships.filter(r => r.relationship_type === 'PROTECTED_BY');
      expect(protectedByRelationships).toHaveLength(2);
      expect(protectedByRelationships[0].source_external_id).toBe('vm-001');
      expect(protectedByRelationships[0].target_external_id).toBe('sla-domain-001');
      expect(protectedByRelationships[0].properties?.sla_domain_name).toBe('Gold');

      // Check MANAGED_BY relationships
      const managedByRelationships = relationships.filter(r => r.relationship_type === 'MANAGED_BY');
      expect(managedByRelationships).toHaveLength(2);
      expect(managedByRelationships[0].source_external_id).toBe('vm-001');
      expect(managedByRelationships[0].target_external_id).toBe('cluster-001');
    });

    it('should infer relationships from physical hosts to SLA domains', () => {
      const extractedData = [
        {
          external_id: 'host-001',
          data: {
            id: 'host-001',
            name: 'linux-server-01',
            effectiveSlaDomainId: 'sla-domain-001',
            effectiveSlaDomainName: 'Gold',
            primaryClusterId: 'cluster-001',
            slaAssignment: 'Direct',
          },
          source_type: 'rubrik',
          extracted_at: new Date(),
        },
      ];

      const relationships = connector.inferRelationships(extractedData);

      expect(relationships).toHaveLength(2); // PROTECTED_BY + MANAGED_BY
      expect(relationships[0].relationship_type).toBe('PROTECTED_BY');
      expect(relationships[0].source_external_id).toBe('host-001');
      expect(relationships[0].target_external_id).toBe('sla-domain-001');
    });

    it('should handle data without SLA domain assignments', () => {
      const extractedData = [
        {
          external_id: 'vm-001',
          data: {
            id: 'vm-001',
            name: 'unprotected-vm',
            primaryClusterId: 'cluster-001',
          },
          source_type: 'rubrik',
          extracted_at: new Date(),
        },
      ];

      const relationships = connector.inferRelationships(extractedData);

      // Should only have MANAGED_BY relationship, no PROTECTED_BY
      expect(relationships).toHaveLength(1);
      expect(relationships[0].relationship_type).toBe('MANAGED_BY');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unknown resource', async () => {
      await connector.initialize();
      await expect(
        connector.extractResource('invalid_resource')
      ).rejects.toThrow('Unknown resource: invalid_resource');
    });

    it('should throw error for unsupported transformation', async () => {
      await expect(
        connector.transformResource('invalid_resource', {})
      ).rejects.toThrow('Unknown resource: invalid_resource');
    });

    it('should handle API errors during extraction', async () => {
      await connector.initialize();
      mockAxiosInstance.get.mockRejectedValue(new Error('API error'));

      await expect(connector.extractResource('vms')).rejects.toThrow('API error');
    });
  });

  describe('Resource Configuration', () => {
    it('should support resource-specific configuration', async () => {
      const configWithResourceConfig: ConnectorConfiguration = {
        ...baseConfig,
        resource_configs: {
          vms: {
            primary_cluster_id: 'cluster-001',
            sla_domain_id: 'sla-domain-001',
            is_relic: false,
          },
        },
      };

      const customConnector = new RubrikConnector(configWithResourceConfig);
      await customConnector.initialize();

      mockAxiosInstance.get.mockResolvedValue({
        data: { hasMore: false, data: [] },
      });

      const resourceConfig = customConnector.getConfig().resource_configs?.['vms'];
      await customConnector.extractResource('vms', resourceConfig);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/vmware/vm',
        expect.objectContaining({
          params: expect.objectContaining({
            primary_cluster_id: 'cluster-001',
            effective_sla_domain_id: 'sla-domain-001',
            is_relic: false,
          }),
        })
      );
    });
  });

  describe('Extract Identifiers', () => {
    it('should extract identifiers from VM data', () => {
      const vmData = {
        id: 'vm-001',
        name: 'web-server-01',
        hostname: 'web-server-01.example.com',
        ipAddress: '10.0.1.10',
        objectType: 'VmwareVirtualMachine',
      };

      const identifiers = connector.extractIdentifiers(vmData);

      expect(identifiers.external_id).toBe('vm-001');
      expect(identifiers.hostname).toBe('web-server-01.example.com');
      expect(identifiers.ip_address).toEqual(['10.0.1.10']);
      expect(identifiers.custom_identifiers?.rubrik_id).toBe('vm-001');
      expect(identifiers.custom_identifiers?.rubrik_object_type).toBe('VmwareVirtualMachine');
    });

    it('should extract identifiers from physical host data', () => {
      const hostData = {
        id: 'host-001',
        name: 'linux-server-01',
        hostname: 'linux-server-01.example.com',
        ipAddress: '10.0.2.10',
        operatingSystemType: 'Linux',
      };

      const identifiers = connector.extractIdentifiers(hostData);

      expect(identifiers.external_id).toBe('host-001');
      expect(identifiers.hostname).toBe('linux-server-01.example.com');
      expect(identifiers.ip_address).toEqual(['10.0.2.10']);
      expect(identifiers.custom_identifiers?.rubrik_id).toBe('host-001');
      expect(identifiers.custom_identifiers?.rubrik_object_type).toBe('Linux');
    });
  });
});
