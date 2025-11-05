/**
 * Infoblox IPAM/DNS Connector Tests (v1.0)
 * Comprehensive tests for multi-resource connector functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import InfobloxConnector from './index';
import { ConnectorConfiguration } from '@cmdb/integration-framework';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('InfobloxConnector - Multi-Resource Tests', () => {
  let connector: InfobloxConnector;
  let mockAxiosInstance: any;

  const baseConfig: ConnectorConfiguration = {
    name: 'Test Infoblox Connector',
    type: 'infoblox',
    enabled: true,
    connection: {
      grid_master_url: 'https://infoblox.test.com',
      username: 'test_user',
      password: 'test_password',
      wapi_version: 'v2.12',
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

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    connector = new InfobloxConnector(baseConfig);
  });

  describe('Initialization', () => {
    it('should initialize with correct metadata', () => {
      expect(connector).toBeDefined();
      const resources = connector.getAvailableResources();
      expect(resources).toHaveLength(4);
      expect(resources.map(r => r.id)).toEqual([
        'networks',
        'hosts',
        'dns_records',
        'dhcp_ranges',
      ]);
    });

    it('should use default enabled resources', () => {
      const enabledResources = connector.getEnabledResources();
      expect(enabledResources).toEqual([
        'networks',
        'hosts',
        'dns_records',
        'dhcp_ranges',
      ]);
    });

    it('should respect custom enabled resources', () => {
      const customConfig: ConnectorConfiguration = {
        ...baseConfig,
        enabled_resources: ['networks', 'hosts'],
      };
      const customConnector = new InfobloxConnector(customConfig);
      expect(customConnector.getEnabledResources()).toEqual(['networks', 'hosts']);
    });

    it('should use default WAPI version if not specified', () => {
      const configWithoutVersion: ConnectorConfiguration = {
        ...baseConfig,
        connection: {
          grid_master_url: 'https://infoblox.test.com',
          username: 'test_user',
          password: 'test_password',
        },
      };

      const connectorWithDefault = new InfobloxConnector(configWithoutVersion);
      expect(connectorWithDefault).toBeDefined();
    });
  });

  describe('Test Connection', () => {
    it('should successfully test connection', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: [{ name: 'grid-master' }],
      });

      const result = await connector.testConnection();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully connected');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/grid',
        expect.objectContaining({
          params: { _max_results: 1 },
        })
      );
    });

    it('should handle connection failure', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Connection refused'));

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection failed');
    });
  });

  describe('Extract Resource - Networks', () => {
    it('should extract network objects', async () => {
      const mockNetworks = [
        {
          _ref: 'network/ZG5zLm5ldHdvcmskMTAuMC4wLjAvMTYvMA:10.0.0.0/16/default',
          network: '10.0.0.0/16',
          network_view: 'default',
          comment: 'Corporate network',
          utilization: 45,
        },
        {
          _ref: 'network/ZG5zLm5ldHdvcmskMTkyLjE2OC4xLjAvMjQvMA:192.168.1.0/24/default',
          network: '192.168.1.0/24',
          network_view: 'default',
          comment: 'Management network',
          utilization: 78,
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: mockNetworks,
      });

      const extractedData = await connector.extractResource('networks');
      expect(extractedData).toHaveLength(2);
      expect(extractedData[0].external_id).toContain('10.0.0.0/16');
      expect(extractedData[0].source_type).toBe('infoblox');
      expect(extractedData[0].data.network).toBe('10.0.0.0/16');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/network',
        expect.objectContaining({
          params: expect.objectContaining({
            _max_results: 1000,
            network_view: 'default',
          }),
        })
      );
    });

    it('should apply network view filter', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      await connector.extractResource('networks', {
        network_view: 'production',
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/network',
        expect.objectContaining({
          params: expect.objectContaining({
            network_view: 'production',
          }),
        })
      );
    });
  });

  describe('Extract Resource - Hosts', () => {
    it('should extract host records', async () => {
      const mockHosts = [
        {
          _ref: 'record:host/ZG5zLmhvc3QkLl9kZWZhdWx0LmNvbS50ZXN0LndlYi1zZXJ2ZXItMDE:web-server-01.test.com/default',
          name: 'web-server-01.test.com',
          ipv4addrs: [
            {
              ipv4addr: '10.0.1.10',
              host: 'web-server-01.test.com',
            },
          ],
          view: 'default',
          comment: 'Production web server',
          disable: false,
        },
        {
          _ref: 'record:host/ZG5zLmhvc3QkLl9kZWZhdWx0LmNvbS50ZXN0LmRiLXNlcnZlci0wMQ:db-server-01.test.com/default',
          name: 'db-server-01.test.com',
          ipv4addrs: [
            {
              ipv4addr: '10.0.2.10',
              host: 'db-server-01.test.com',
            },
          ],
          view: 'default',
          comment: 'Production database server',
          disable: false,
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: mockHosts,
      });

      const extractedData = await connector.extractResource('hosts');
      expect(extractedData).toHaveLength(2);
      expect(extractedData[0].data.name).toBe('web-server-01.test.com');
      expect(extractedData[0].data.ipv4addrs[0].ipv4addr).toBe('10.0.1.10');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/record:host',
        expect.objectContaining({
          params: expect.objectContaining({
            _max_results: 1000,
          }),
        })
      );
    });

    it('should filter disabled hosts by default', async () => {
      const mockHosts = [
        {
          _ref: 'record:host/active',
          name: 'active-server.test.com',
          ipv4addrs: [{ ipv4addr: '10.0.1.10', host: 'active-server.test.com' }],
          disable: false,
        },
        {
          _ref: 'record:host/disabled',
          name: 'disabled-server.test.com',
          ipv4addrs: [{ ipv4addr: '10.0.1.11', host: 'disabled-server.test.com' }],
          disable: true,
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: mockHosts,
      });

      const extractedData = await connector.extractResource('hosts');
      expect(extractedData).toHaveLength(1);
      expect(extractedData[0].data.name).toBe('active-server.test.com');
    });

    it('should include disabled hosts when configured', async () => {
      const mockHosts = [
        {
          _ref: 'record:host/active',
          name: 'active-server.test.com',
          ipv4addrs: [{ ipv4addr: '10.0.1.10', host: 'active-server.test.com' }],
          disable: false,
        },
        {
          _ref: 'record:host/disabled',
          name: 'disabled-server.test.com',
          ipv4addrs: [{ ipv4addr: '10.0.1.11', host: 'disabled-server.test.com' }],
          disable: true,
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: mockHosts,
      });

      const extractedData = await connector.extractResource('hosts', {
        include_disabled: true,
      });

      expect(extractedData).toHaveLength(2);
    });

    it('should apply zone filter', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      await connector.extractResource('hosts', {
        zone_filter: 'test.com',
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/record:host',
        expect.objectContaining({
          params: expect.objectContaining({
            zone: 'test.com',
          }),
        })
      );
    });
  });

  describe('Extract Resource - DNS Records', () => {
    it('should extract A records', async () => {
      const mockARecords = [
        {
          _ref: 'record:a/ZG5zLmEkLl9kZWZhdWx0LmNvbS50ZXN0LndlYg:web.test.com/default',
          name: 'web.test.com',
          ipv4addr: '10.0.1.20',
          view: 'default',
          ttl: 3600,
          zone: 'test.com',
        },
      ];

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockARecords })  // A records
        .mockResolvedValueOnce({ data: [] });            // CNAME records

      const extractedData = await connector.extractResource('dns_records');
      expect(extractedData.length).toBeGreaterThan(0);
      expect(extractedData[0].data.record_type).toBe('A');
      expect(extractedData[0].data.name).toBe('web.test.com');
      expect(extractedData[0].data.ipv4addr).toBe('10.0.1.20');
    });

    it('should extract CNAME records', async () => {
      const mockCNAMERecords = [
        {
          _ref: 'record:cname/ZG5zLmNuYW1lJC5fZGVmYXVsdC5jb20udGVzdC53d3c:www.test.com/default',
          name: 'www.test.com',
          canonical: 'web.test.com',
          view: 'default',
          ttl: 3600,
          zone: 'test.com',
        },
      ];

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: [] })                  // A records
        .mockResolvedValueOnce({ data: mockCNAMERecords });   // CNAME records

      const extractedData = await connector.extractResource('dns_records');
      expect(extractedData.length).toBeGreaterThan(0);
      expect(extractedData[0].data.record_type).toBe('CNAME');
      expect(extractedData[0].data.name).toBe('www.test.com');
      expect(extractedData[0].data.canonical).toBe('web.test.com');
    });

    it('should extract only specified record types', async () => {
      const mockARecords = [{ _ref: 'record:a/1', name: 'a.test.com', ipv4addr: '10.0.1.1' }];

      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockARecords });

      await connector.extractResource('dns_records', {
        record_types: ['A'],
      });

      // Should only call A records endpoint, not CNAME
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/record:a',
        expect.any(Object)
      );
    });
  });

  describe('Extract Resource - DHCP Ranges', () => {
    it('should extract DHCP ranges', async () => {
      const mockRanges = [
        {
          _ref: 'range/ZG5zLmRoY3BfcmFuZ2UkMTAuMC4xLjEwMC0xOTkvMA:10.0.1.100-10.0.1.199/default',
          network: '10.0.1.0/24',
          start_addr: '10.0.1.100',
          end_addr: '10.0.1.199',
          network_view: 'default',
          comment: 'Guest DHCP pool',
          server_association_type: 'MEMBER',
        },
        {
          _ref: 'range/ZG5zLmRoY3BfcmFuZ2UkMTAuMC4yLjUwLTk5LzA:10.0.2.50-10.0.2.99/default',
          network: '10.0.2.0/24',
          start_addr: '10.0.2.50',
          end_addr: '10.0.2.99',
          network_view: 'default',
          comment: 'VoIP DHCP pool',
          server_association_type: 'MEMBER',
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: mockRanges,
      });

      const extractedData = await connector.extractResource('dhcp_ranges');
      expect(extractedData).toHaveLength(2);
      expect(extractedData[0].data.start_addr).toBe('10.0.1.100');
      expect(extractedData[0].data.end_addr).toBe('10.0.1.199');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/range',
        expect.objectContaining({
          params: expect.objectContaining({
            _max_results: 500,
            network_view: 'default',
          }),
        })
      );
    });
  });

  describe('Transform Resource - Networks', () => {
    it('should transform network with all attributes', async () => {
      const networkData = {
        _ref: 'network/ZG5zLm5ldHdvcmskMTAuMC4wLjAvMTYvMA:10.0.0.0/16/default',
        network: '10.0.0.0/16',
        network_view: 'default',
        comment: 'Corporate network',
        utilization: 45,
        extattrs: {
          Environment: { value: 'production' },
          Location: { value: 'US-East' },
        },
      };

      const transformedCI = await connector.transformResource('networks', networkData);

      expect(transformedCI.ci_type).toBe('network');
      expect(transformedCI.name).toBe('10.0.0.0/16');
      expect(transformedCI.environment).toBe('production');
      expect(transformedCI.status).toBe('active');
      expect(transformedCI.attributes.network_cidr).toBe('10.0.0.0/16');
      expect(transformedCI.attributes.utilization).toBe(45);
      expect(transformedCI.attributes.Location).toBe('US-East');
      expect(transformedCI.confidence_score).toBe(95);
    });
  });

  describe('Transform Resource - Hosts', () => {
    it('should transform host record with all attributes', async () => {
      const hostData = {
        _ref: 'record:host/ZG5zLmhvc3Q:web-server-01.test.com/default',
        name: 'web-server-01.test.com',
        ipv4addrs: [
          {
            ipv4addr: '10.0.1.10',
            host: 'web-server-01.test.com',
          },
        ],
        view: 'default',
        comment: 'Production web server',
        disable: false,
        extattrs: {
          Environment: { value: 'production' },
          Owner: { value: 'IT Team' },
        },
      };

      const transformedCI = await connector.transformResource('hosts', hostData);

      expect(transformedCI.ci_type).toBe('server');
      expect(transformedCI.name).toBe('web-server-01.test.com');
      expect(transformedCI.environment).toBe('production');
      expect(transformedCI.status).toBe('active');
      expect(transformedCI.identifiers.hostname).toBe('web-server-01.test.com');
      expect(transformedCI.identifiers.ip_address).toEqual(['10.0.1.10']);
      expect(transformedCI.attributes.Owner).toBe('IT Team');
      expect(transformedCI.confidence_score).toBe(90);
    });

    it('should mark disabled hosts as inactive', async () => {
      const hostData = {
        _ref: 'record:host/disabled',
        name: 'old-server.test.com',
        ipv4addrs: [{ ipv4addr: '10.0.1.99', host: 'old-server.test.com' }],
        disable: true,
      };

      const transformedCI = await connector.transformResource('hosts', hostData);

      expect(transformedCI.status).toBe('inactive');
      expect(transformedCI.attributes.disabled).toBe(true);
    });
  });

  describe('Transform Resource - DNS Records', () => {
    it('should transform A record', async () => {
      const aRecordData = {
        _ref: 'record:a/ZG5zLmE:web.test.com/default',
        name: 'web.test.com',
        ipv4addr: '10.0.1.20',
        view: 'default',
        ttl: 3600,
        zone: 'test.com',
        record_type: 'A',
      };

      const transformedCI = await connector.transformResource('dns_records', aRecordData);

      expect(transformedCI.ci_type).toBe('dns-record');
      expect(transformedCI.attributes.record_type).toBe('A');
      expect(transformedCI.attributes.ipv4addr).toBe('10.0.1.20');
      expect(transformedCI.identifiers.ip_address).toEqual(['10.0.1.20']);
    });

    it('should transform CNAME record', async () => {
      const cnameRecordData = {
        _ref: 'record:cname/ZG5zLmNuYW1l:www.test.com/default',
        name: 'www.test.com',
        canonical: 'web.test.com',
        view: 'default',
        ttl: 3600,
        zone: 'test.com',
        record_type: 'CNAME',
      };

      const transformedCI = await connector.transformResource('dns_records', cnameRecordData);

      expect(transformedCI.ci_type).toBe('dns-record');
      expect(transformedCI.attributes.record_type).toBe('CNAME');
      expect(transformedCI.attributes.canonical).toBe('web.test.com');
      expect(transformedCI.identifiers.ip_address).toBeUndefined();
    });
  });

  describe('Transform Resource - DHCP Ranges', () => {
    it('should transform DHCP range', async () => {
      const rangeData = {
        _ref: 'range/ZG5zLmRoY3BfcmFuZ2U:10.0.1.100-10.0.1.199/default',
        network: '10.0.1.0/24',
        start_addr: '10.0.1.100',
        end_addr: '10.0.1.199',
        network_view: 'default',
        comment: 'Guest DHCP pool',
        server_association_type: 'MEMBER',
        extattrs: {
          Environment: { value: 'production' },
        },
      };

      const transformedCI = await connector.transformResource('dhcp_ranges', rangeData);

      expect(transformedCI.ci_type).toBe('dhcp-range');
      expect(transformedCI.name).toContain('10.0.1.100');
      expect(transformedCI.name).toContain('10.0.1.199');
      expect(transformedCI.attributes.network).toBe('10.0.1.0/24');
      expect(transformedCI.attributes.Environment).toBe('production');
      expect(transformedCI.confidence_score).toBe(90);
    });
  });

  describe('Extract Relationships', () => {
    it('should infer host-to-network relationships', async () => {
      const mockHosts = [
        {
          _ref: 'record:host/host1',
          name: 'server1.test.com',
          ipv4addrs: [{ ipv4addr: '10.0.1.10', host: 'server1.test.com' }],
        },
        {
          _ref: 'record:host/host2',
          name: 'server2.test.com',
          ipv4addrs: [{ ipv4addr: '192.168.1.20', host: 'server2.test.com' }],
        },
      ];

      const mockNetworks = [
        { _ref: 'network/net1', network: '10.0.1.0/24' },
        { _ref: 'network/net2', network: '192.168.1.0/24' },
      ];

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockHosts })
        .mockResolvedValueOnce({ data: mockNetworks });

      const relationships = await connector.extractRelationships();

      expect(relationships).toHaveLength(2);
      expect(relationships[0].source_external_id).toBe('record:host/host1');
      expect(relationships[0].target_external_id).toBe('network/net1');
      expect(relationships[0].relationship_type).toBe('BELONGS_TO');
      expect(relationships[0].properties?.ip_address).toBe('10.0.1.10');

      expect(relationships[1].source_external_id).toBe('record:host/host2');
      expect(relationships[1].target_external_id).toBe('network/net2');
    });

    it('should handle hosts without IP addresses', async () => {
      const mockHosts = [
        {
          _ref: 'record:host/host1',
          name: 'server1.test.com',
          ipv4addrs: [],
        },
      ];

      const mockNetworks = [
        { _ref: 'network/net1', network: '10.0.1.0/24' },
      ];

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockHosts })
        .mockResolvedValueOnce({ data: mockNetworks });

      const relationships = await connector.extractRelationships();

      expect(relationships).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unknown resource', async () => {
      await expect(
        connector.extractResource('invalid_resource')
      ).rejects.toThrow('Unknown resource: invalid_resource');
    });

    it('should throw error for unsupported resource extraction', async () => {
      await expect(
        connector.extractResource('unsupported_resource')
      ).rejects.toThrow();
    });

    it('should handle API errors gracefully', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('API Error'));

      await expect(
        connector.extractResource('networks')
      ).rejects.toThrow('API Error');
    });
  });

  describe('IP Network Matching', () => {
    it('should correctly match IP to network', async () => {
      // This tests the private ipInNetwork method via extractRelationships
      const mockHosts = [
        {
          _ref: 'record:host/host1',
          name: 'server1.test.com',
          ipv4addrs: [{ ipv4addr: '10.0.1.50', host: 'server1.test.com' }],
        },
      ];

      const mockNetworks = [
        { _ref: 'network/net1', network: '10.0.1.0/24' },
        { _ref: 'network/net2', network: '10.0.2.0/24' },
      ];

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockHosts })
        .mockResolvedValueOnce({ data: mockNetworks });

      const relationships = await connector.extractRelationships();

      expect(relationships).toHaveLength(1);
      expect(relationships[0].target_external_id).toBe('network/net1');
      expect(relationships[0].properties?.network_cidr).toBe('10.0.1.0/24');
    });
  });
});
