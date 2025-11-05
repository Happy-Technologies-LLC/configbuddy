/**
 * Tenable.io Connector Tests (v1.0)
 * Tests for multi-resource vulnerability management connector
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';
import TenableConnector from './index';
import { ConnectorConfiguration } from '@cmdb/integration-framework';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('TenableConnector - Multi-Resource Tests', () => {
  let connector: TenableConnector;
  let mockAxiosInstance: any;

  const baseConfig: ConnectorConfiguration = {
    name: 'Test Tenable Connector',
    type: 'tenable',
    enabled: true,
    connection: {
      api_url: 'https://cloud.tenable.com',
      access_key: 'test_access_key',
      secret_key: 'test_secret_key',
      verify_ssl: true,
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

    connector = new TenableConnector(baseConfig);
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
        'devices',
        'vulnerabilities',
        'assets',
        'plugins',
        'relationships',
      ]);
    });

    it('should use default enabled resources', () => {
      const enabledResources = connector.getEnabledResources();
      expect(enabledResources).toEqual([
        'devices',
        'vulnerabilities',
        'assets',
        'relationships',
      ]);
    });

    it('should respect custom enabled resources', () => {
      const customConfig: ConnectorConfiguration = {
        ...baseConfig,
        enabled_resources: ['devices', 'vulnerabilities'],
      };
      const customConnector = new TenableConnector(customConfig);
      expect(customConnector.getEnabledResources()).toEqual(['devices', 'vulnerabilities']);
    });

    it('should configure X-ApiKeys header correctly', async () => {
      await connector.initialize();
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-ApiKeys': 'accessKey=test_access_key; secretKey=test_secret_key',
          }),
        })
      );
    });
  });

  describe('Test Connection', () => {
    it('should successfully test connection', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          server_version: '10.5.0',
          nessus_ui_version: '10.5.0',
        },
      });

      const result = await connector.testConnection();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully connected');
      expect(result.details?.server_version).toBe('10.5.0');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/server/properties');
    });

    it('should handle connection failure', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Unauthorized'));

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection failed');
    });
  });

  describe('Extract Devices', () => {
    beforeEach(async () => {
      await connector.initialize();
    });

    it('should extract devices with pagination', async () => {
      const mockDevices = [
        {
          id: 'device-1',
          uuid: 'uuid-device-1',
          hostname: 'web-server-01',
          fqdn: 'web-server-01.example.com',
          ipv4: ['10.0.1.10'],
          ipv6: [],
          mac_address: ['00:11:22:33:44:55'],
          operating_system: ['Ubuntu 22.04 LTS'],
          system_type: ['general-purpose'],
          has_agent: true,
          first_seen: '2023-06-01T08:00:00Z',
          last_seen: '2024-01-15T10:30:00Z',
          sources: [
            {
              name: 'NESSUS_SCAN',
              first_seen: '2023-06-01T08:00:00Z',
              last_seen: '2024-01-15T10:30:00Z',
            },
          ],
        },
        {
          id: 'device-2',
          uuid: 'uuid-device-2',
          hostname: 'db-server-01',
          ipv4: ['10.0.2.20'],
          mac_address: ['00:11:22:33:44:66'],
          operating_system: ['Red Hat Enterprise Linux 8'],
          has_agent: false,
          first_seen: '2023-07-15T10:00:00Z',
          last_seen: '2024-01-14T22:00:00Z',
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: { devices: mockDevices },
      });

      const extractedData = await connector.extractResource('devices');

      expect(extractedData).toHaveLength(2);
      expect(extractedData[0].external_id).toBe('uuid-device-1');
      expect(extractedData[0].source_type).toBe('tenable');
      expect(extractedData[0].data.hostname).toBe('web-server-01');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/devices/v2',
        expect.objectContaining({
          params: expect.objectContaining({
            size: 1000,
            offset: 0,
          }),
        })
      );
    });

    it('should apply device filters', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { devices: [] } });

      await connector.extractResource('devices', {
        source_filter: ['NESSUS_SCAN'],
        has_agent_filter: true,
        operating_systems: ['Linux'],
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/devices/v2',
        expect.objectContaining({
          params: expect.objectContaining({
            filter: expect.any(String),
          }),
        })
      );
    });
  });

  describe('Extract Vulnerabilities', () => {
    beforeEach(async () => {
      await connector.initialize();
    });

    it('should extract vulnerabilities with filters', async () => {
      const mockVulnerabilities = [
        {
          plugin_id: 19506,
          plugin_name: 'Nessus Scan Information',
          plugin_family: 'Settings',
          severity: 4,
          severity_name: 'critical',
          count: 5,
          vpr_score: 9.2,
          cvss_base_score: 9.8,
          cvss3_base_score: 9.8,
          cvss3_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
          cve: ['CVE-2024-1234', 'CVE-2024-5678'],
          description: 'Critical vulnerability description',
          solution: 'Update to latest version',
          synopsis: 'Remote code execution vulnerability',
          first_found: '2024-01-01T00:00:00Z',
          last_found: '2024-01-15T00:00:00Z',
          state: 'open',
          accepted_count: 0,
          recasted_count: 0,
          asset_uuids: ['uuid-device-1', 'uuid-device-2'],
        },
        {
          plugin_id: 12345,
          plugin_name: 'Apache HTTP Server Vulnerability',
          plugin_family: 'Web Servers',
          severity: 3,
          severity_name: 'high',
          count: 2,
          cvss3_base_score: 7.5,
          cve: ['CVE-2024-9999'],
          description: 'High severity vulnerability',
          solution: 'Apply security patch',
          first_found: '2024-01-10T00:00:00Z',
          last_found: '2024-01-15T00:00:00Z',
          state: 'open',
          asset_uuids: ['uuid-device-3'],
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: { vulnerabilities: mockVulnerabilities },
      });

      const extractedData = await connector.extractResource('vulnerabilities', {
        severity_filter: ['critical', 'high'],
        state_filter: ['open'],
        days_back: 90,
      });

      expect(extractedData).toHaveLength(2);
      expect(extractedData[0].external_id).toBe('19506');
      expect(extractedData[0].data.severity_name).toBe('critical');
      expect(extractedData[0].data.cve).toContain('CVE-2024-1234');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/workbenches/vulnerabilities',
        expect.objectContaining({
          params: expect.objectContaining({
            size: 5000,
            filter_search_type: 'and',
          }),
        })
      );
    });

    it('should skip accepted risk vulnerabilities when configured', async () => {
      const mockVulnerabilities = [
        {
          plugin_id: 1001,
          plugin_name: 'Accepted Risk Vulnerability',
          plugin_family: 'Test',
          severity: 4,
          severity_name: 'critical',
          count: 1,
          state: 'open',
          accepted_count: 1,
          asset_uuids: ['uuid-device-1'],
        },
        {
          plugin_id: 1002,
          plugin_name: 'Active Vulnerability',
          plugin_family: 'Test',
          severity: 4,
          severity_name: 'critical',
          count: 1,
          state: 'open',
          accepted_count: 0,
          asset_uuids: ['uuid-device-2'],
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: { vulnerabilities: mockVulnerabilities },
      });

      const extractedData = await connector.extractResource('vulnerabilities', {
        include_accepted_risk: false,
      });

      // Should only extract the non-accepted vulnerability
      expect(extractedData).toHaveLength(1);
      expect(extractedData[0].data.plugin_id).toBe(1002);
    });
  });

  describe('Extract Assets', () => {
    beforeEach(async () => {
      await connector.initialize();
    });

    it('should extract assets with cloud metadata', async () => {
      const mockAssets = [
        {
          id: 'asset-1',
          uuid: 'uuid-asset-1',
          has_agent: true,
          ipv4: ['10.0.1.50'],
          hostname: ['app-server-01'],
          fqdn: ['app-server-01.example.com'],
          mac_address: ['00:11:22:33:44:77'],
          operating_system: ['Amazon Linux 2'],
          exposure_score: 750,
          aws_ec2_instance_id: ['i-1234567890abcdef0'],
          aws_ec2_name: ['production-app-server'],
          aws_region: ['us-east-1'],
          tags: [
            { key: 'Environment', value: 'Production', uuid: 'tag-1' },
            { key: 'Application', value: 'WebApp', uuid: 'tag-2' },
          ],
          first_seen: '2023-08-01T00:00:00Z',
          last_seen: '2024-01-15T12:00:00Z',
        },
        {
          id: 'asset-2',
          uuid: 'uuid-asset-2',
          has_agent: false,
          ipv4: ['10.0.2.60'],
          hostname: ['azure-vm-01'],
          operating_system: ['Windows Server 2022'],
          exposure_score: 450,
          azure_vm_id: ['vm-abcd1234'],
          azure_resource_id: ['/subscriptions/sub-id/resourceGroups/rg-1/providers/Microsoft.Compute/virtualMachines/azure-vm-01'],
          tags: [
            { key: 'Environment', value: 'Staging', uuid: 'tag-3' },
          ],
          first_seen: '2023-09-15T00:00:00Z',
          last_seen: '2024-01-14T18:00:00Z',
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: { assets: mockAssets },
      });

      const extractedData = await connector.extractResource('assets');

      expect(extractedData).toHaveLength(2);
      expect(extractedData[0].external_id).toBe('uuid-asset-1');
      expect(extractedData[0].data.aws_ec2_instance_id).toEqual(['i-1234567890abcdef0']);
      expect(extractedData[0].data.exposure_score).toBe(750);
      expect(extractedData[1].data.azure_vm_id).toEqual(['vm-abcd1234']);
    });

    it('should filter assets by exposure score', async () => {
      const mockAssets = [
        {
          id: 'asset-1',
          uuid: 'uuid-asset-1',
          ipv4: ['10.0.1.100'],
          hostname: ['high-risk-server'],
          exposure_score: 850,
        },
        {
          id: 'asset-2',
          uuid: 'uuid-asset-2',
          ipv4: ['10.0.1.101'],
          hostname: ['low-risk-server'],
          exposure_score: 250,
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: { assets: mockAssets },
      });

      const extractedData = await connector.extractResource('assets', {
        exposure_score_min: 500,
      });

      // Should only extract high-exposure assets
      expect(extractedData).toHaveLength(1);
      expect(extractedData[0].data.exposure_score).toBe(850);
    });
  });

  describe('Extract Plugins', () => {
    beforeEach(async () => {
      await connector.initialize();
    });

    it('should extract plugin definitions', async () => {
      const mockPlugins = [
        {
          id: 19506,
          name: 'Nessus Scan Information',
          family_name: 'Settings',
          description: 'This plugin displays information about the Nessus scan.',
          synopsis: 'This plugin displays information about the Nessus scan.',
          solution: 'n/a',
          risk_factor: 'None',
          cvss3_base_score: 0.0,
          plugin_publication_date: '2005-08-26',
          plugin_modification_date: '2024-01-01',
        },
        {
          id: 51192,
          name: 'SSL Certificate Cannot Be Trusted',
          family_name: 'General',
          description: 'The SSL certificate cannot be trusted.',
          synopsis: 'The SSL certificate for this service cannot be trusted.',
          solution: 'Purchase or generate a proper SSL certificate for this service.',
          risk_factor: 'Medium',
          cvss3_base_score: 6.5,
          cve: ['CVE-2020-1234'],
          plugin_publication_date: '2010-11-15',
          plugin_modification_date: '2024-01-10',
          vpr_score: 5.8,
        },
      ];

      // Mock family list
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { families: [{ name: 'Settings' }, { name: 'General' }] },
      });

      // Mock plugins for each family
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { plugins: [mockPlugins[0]] },
      });

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { plugins: [mockPlugins[1]] },
      });

      const extractedData = await connector.extractResource('plugins', {
        severity_filter: ['critical', 'high', 'medium'],
      });

      expect(extractedData.length).toBeGreaterThan(0);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/plugins/families');
    });
  });

  describe('Transform Resources', () => {
    it('should transform device to CMDB CI', async () => {
      const deviceData = {
        id: 'device-1',
        uuid: 'uuid-device-1',
        hostname: 'web-server-01',
        fqdn: 'web-server-01.example.com',
        ipv4: ['10.0.1.10', '192.168.1.10'],
        mac_address: ['00:11:22:33:44:55'],
        operating_system: ['Ubuntu 22.04 LTS'],
        system_type: ['general-purpose'],
        has_agent: true,
        first_seen: '2023-06-01T08:00:00Z',
        last_seen: '2024-01-15T10:30:00Z',
        tags: [
          { key: 'Environment', value: 'Production', uuid: 'tag-1' },
        ],
      };

      const transformedCI = await connector.transformResource('devices', deviceData);

      expect(transformedCI.ci_type).toBe('server');
      expect(transformedCI.name).toBe('web-server-01');
      expect(transformedCI.status).toBe('active');
      expect(transformedCI.source).toBe('tenable');
      expect(transformedCI.source_id).toBe('uuid-device-1');
      expect(transformedCI.confidence_score).toBe(95); // Has agent = higher confidence
      expect(transformedCI.attributes.has_agent).toBe(true);
      expect(transformedCI.attributes.ipv4).toEqual(['10.0.1.10', '192.168.1.10']);
      expect(transformedCI.identifiers.hostname).toBe('web-server-01');
      expect(transformedCI.identifiers.fqdn).toBe('web-server-01.example.com');
    });

    it('should transform vulnerability to CMDB CI', async () => {
      const vulnData = {
        plugin_id: 19506,
        plugin_name: 'Critical Vulnerability',
        plugin_family: 'Web Servers',
        severity: 4,
        severity_name: 'critical',
        count: 5,
        vpr_score: 9.2,
        cvss3_base_score: 9.8,
        cvss3_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
        cve: ['CVE-2024-1234'],
        description: 'Critical remote code execution vulnerability',
        solution: 'Update to latest version',
        first_found: '2024-01-01T00:00:00Z',
        last_found: '2024-01-15T00:00:00Z',
        state: 'open',
        asset_uuids: ['uuid-device-1', 'uuid-device-2'],
      };

      const transformedCI = await connector.transformResource('vulnerabilities', vulnData);

      expect(transformedCI.ci_type).toBe('vulnerability');
      expect(transformedCI.name).toBe('Critical Vulnerability');
      expect(transformedCI.status).toBe('active');
      expect(transformedCI.attributes.severity).toBe('critical');
      expect(transformedCI.attributes.cvss3_base_score).toBe(9.8);
      expect(transformedCI.attributes.cve).toEqual(['CVE-2024-1234']);
      expect(transformedCI.attributes.affected_assets).toBe(2);
      expect(transformedCI.confidence_score).toBe(90);
    });

    it('should transform asset to CMDB CI with cloud metadata', async () => {
      const assetData = {
        id: 'asset-1',
        uuid: 'uuid-asset-1',
        has_agent: true,
        ipv4: ['10.0.1.50'],
        hostname: ['app-server-01'],
        operating_system: ['Amazon Linux 2'],
        exposure_score: 750,
        aws_ec2_instance_id: ['i-1234567890abcdef0'],
        aws_ec2_name: ['production-app-server'],
        aws_region: ['us-east-1'],
        tags: [
          { key: 'Environment', value: 'Production', uuid: 'tag-1' },
        ],
      };

      const transformedCI = await connector.transformResource('assets', assetData);

      expect(transformedCI.ci_type).toBe('virtual-machine'); // AWS instance = VM
      expect(transformedCI.name).toBe('app-server-01');
      expect(transformedCI.environment).toBe('production'); // Extracted from tags
      expect(transformedCI.status).toBe('active');
      expect(transformedCI.attributes.aws_ec2_instance_id).toEqual(['i-1234567890abcdef0']);
      expect(transformedCI.attributes.exposure_score).toBe(750);
      expect(transformedCI.confidence_score).toBe(95);
    });

    it('should transform plugin to CMDB CI', async () => {
      const pluginData = {
        id: 51192,
        name: 'SSL Certificate Cannot Be Trusted',
        family_name: 'General',
        description: 'The SSL certificate cannot be trusted.',
        risk_factor: 'Medium',
        cvss3_base_score: 6.5,
        cve: ['CVE-2020-1234'],
        plugin_publication_date: '2010-11-15',
        exploit_available: false,
        vpr_score: 5.8,
      };

      const transformedCI = await connector.transformResource('plugins', pluginData);

      expect(transformedCI.ci_type).toBe('plugin');
      expect(transformedCI.name).toBe('SSL Certificate Cannot Be Trusted');
      expect(transformedCI.status).toBe('active');
      expect(transformedCI.attributes.risk_factor).toBe('Medium');
      expect(transformedCI.attributes.cvss3_base_score).toBe(6.5);
      expect(transformedCI.attributes.cve).toEqual(['CVE-2020-1234']);
      expect(transformedCI.confidence_score).toBe(100); // Plugin definitions are authoritative
    });
  });

  describe('Status Mapping', () => {
    it('should map device status based on last seen date', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10); // 10 days ago

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60); // 60 days ago

      const activeDevice = {
        id: 'device-1',
        uuid: 'uuid-1',
        hostname: 'active-server',
        last_seen: recentDate.toISOString(),
      };

      const inactiveDevice = {
        id: 'device-2',
        uuid: 'uuid-2',
        hostname: 'inactive-server',
        last_seen: oldDate.toISOString(),
      };

      const activeCI = await connector.transformResource('devices', activeDevice);
      const inactiveCI = await connector.transformResource('devices', inactiveDevice);

      expect(activeCI.status).toBe('active');
      expect(inactiveCI.status).toBe('inactive');
    });

    it('should map vulnerability status correctly', async () => {
      const testCases = [
        { state: 'open', expected: 'active' },
        { state: 'reopened', expected: 'active' },
        { state: 'fixed', expected: 'inactive' },
      ];

      for (const testCase of testCases) {
        const vulnData = {
          plugin_id: 123,
          plugin_name: 'Test Vuln',
          plugin_family: 'Test',
          severity: 3,
          severity_name: 'high',
          count: 1,
          state: testCase.state,
        };

        const transformedCI = await connector.transformResource('vulnerabilities', vulnData);
        expect(transformedCI.status).toBe(testCase.expected);
      }
    });
  });

  describe('Relationship Inference', () => {
    it('should infer vulnerability-to-device relationships', () => {
      const vulnerabilities = [
        {
          external_id: '19506',
          data: {
            plugin_id: 19506,
            plugin_name: 'Vuln 1',
            severity_name: 'critical',
            cvss3_base_score: 9.8,
            asset_uuids: ['uuid-device-1', 'uuid-device-2'],
            first_found: '2024-01-01T00:00:00Z',
            last_found: '2024-01-15T00:00:00Z',
            state: 'open',
          },
          source_type: 'tenable',
          extracted_at: new Date(),
        },
      ];

      const relationships = connector.inferRelationships(vulnerabilities);

      expect(relationships).toHaveLength(2);
      expect(relationships[0].source_external_id).toBe('19506');
      expect(relationships[0].target_external_id).toBe('uuid-device-1');
      expect(relationships[0].relationship_type).toBe('AFFECTS');
      expect(relationships[0].properties?.severity).toBe('critical');
      expect(relationships[1].target_external_id).toBe('uuid-device-2');
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

    it('should handle API errors gracefully', async () => {
      await connector.initialize();
      mockAxiosInstance.get.mockRejectedValue(new Error('API Rate Limit'));

      await expect(
        connector.extractResource('devices')
      ).rejects.toThrow('API Rate Limit');
    });
  });

  describe('Configuration Overrides', () => {
    it('should use resource-specific configuration', async () => {
      await connector.initialize();
      mockAxiosInstance.get.mockResolvedValue({ data: { vulnerabilities: [] } });

      await connector.extractResource('vulnerabilities', {
        severity_filter: ['critical'],
        state_filter: ['open'],
        days_back: 30,
        include_accepted_risk: true,
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/workbenches/vulnerabilities',
        expect.objectContaining({
          params: expect.objectContaining({
            'filter.0.value': '4', // Critical = 4
            'filter.1.value': 'open',
            'filter.2.quality': 'gt',
            'filter.2.value': 30,
          }),
        })
      );
    });
  });

  describe('Identifier Extraction', () => {
    it('should extract comprehensive identifiers', () => {
      const deviceData = {
        id: 'device-1',
        uuid: 'uuid-device-1',
        hostname: ['web-server-01'],
        fqdn: ['web-server-01.example.com'],
        ipv4: ['10.0.1.10'],
        ipv6: ['fe80::1'],
        mac_address: ['00:11:22:33:44:55'],
        netbios_name: ['WEBSERVER01'],
        bios_uuid: ['12345678-1234-1234-1234-123456789012'],
        aws_ec2_instance_id: ['i-1234567890abcdef0'],
      };

      const identifiers = connector.extractIdentifiers(deviceData);

      expect(identifiers.external_id).toBe('uuid-device-1');
      expect(identifiers.uuid).toBe('uuid-device-1');
      expect(identifiers.hostname).toBe('web-server-01');
      expect(identifiers.fqdn).toBe('web-server-01.example.com');
      expect(identifiers.ip_address).toEqual(['10.0.1.10', 'fe80::1']);
      expect(identifiers.mac_address).toEqual(['00:11:22:33:44:55']);
      expect(identifiers.custom_identifiers?.netbios_name).toBe('WEBSERVER01');
      expect(identifiers.custom_identifiers?.aws_instance_id).toBe('i-1234567890abcdef0');
    });
  });
});
