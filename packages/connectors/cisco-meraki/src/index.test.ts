/**
 * Cisco Meraki Connector Tests
 * Comprehensive test suite for Meraki Dashboard API integration
 */

import CiscoMerakiConnector from './index';
import { ConnectorConfiguration } from '@cmdb/integration-framework';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CiscoMerakiConnector', () => {
  let connector: CiscoMerakiConnector;
  let mockAxiosInstance: any;

  const mockConfig: ConnectorConfiguration = {
    name: 'Test Meraki',
    type: 'cisco_meraki',
    enabled: true,
    connection: {
      api_key: 'test-api-key-12345',
      base_url: 'https://api.meraki.com/api/v1',
      organization_ids: [],
    },
    enabled_resources: ['organizations', 'networks', 'devices', 'clients'],
  };

  const mockOrganizations = [
    {
      id: 'org-123',
      name: 'Test Organization',
      url: 'https://dashboard.meraki.com/o/abc123',
      api: { enabled: true },
      licensing: { model: 'co-term' },
      cloud: { region: { name: 'North America' } },
    },
  ];

  const mockNetworks = [
    {
      id: 'net-456',
      organizationId: 'org-123',
      name: 'Test Network',
      productTypes: ['wireless', 'switch'],
      timeZone: 'America/Los_Angeles',
      tags: ['production', 'campus'],
      isBoundToConfigTemplate: false,
    },
  ];

  const mockDevices = [
    {
      serial: 'Q2XX-AAAA-BBBB',
      mac: 'aa:bb:cc:dd:ee:ff',
      name: 'Test Switch',
      model: 'MS250-48',
      productType: 'switch',
      networkId: 'net-456',
      lanIp: '192.168.1.10',
      firmware: 'switch-15.21',
      tags: ['datacenter'],
    },
  ];

  const mockClients = [
    {
      id: 'client-789',
      mac: '11:22:33:44:55:66',
      description: 'Test Client',
      ip: '192.168.1.100',
      user: 'john.doe',
      vlan: 10,
      recentDeviceSerial: 'Q2XX-AAAA-BBBB',
      status: 'Online',
      os: 'Windows 10',
      manufacturer: 'Dell',
    },
  ];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

    // Create connector instance
    connector = new CiscoMerakiConnector(mockConfig);
  });

  describe('Constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(connector).toBeDefined();
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.meraki.com/api/v1',
          headers: expect.objectContaining({
            'X-Cisco-Meraki-API-Key': 'test-api-key-12345',
          }),
        })
      );
    });

    it('should use default base URL if not provided', () => {
      const configWithoutUrl = {
        ...mockConfig,
        connection: { api_key: 'test-key' },
      };
      const conn = new CiscoMerakiConnector(configWithoutUrl);
      expect(conn).toBeDefined();
    });
  });

  describe('initialize()', () => {
    it('should initialize successfully', async () => {
      await connector.initialize();
      expect(connector['isInitialized']).toBe(true);
    });
  });

  describe('testConnection()', () => {
    it('should test connection successfully', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockOrganizations,
      });

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully connected');
      expect(result.details?.organizations_found).toBe(1);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/organizations');
    });

    it('should handle connection failure', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce({
        message: 'Authentication failed',
        response: {
          status: 401,
          data: { errors: ['Invalid API key'] },
        },
      });

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection failed');
      expect(result.details?.status_code).toBe(401);
    });
  });

  describe('extractResource() - organizations', () => {
    it('should extract all organizations', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockOrganizations,
      });

      const result = await connector.extractResource('organizations');

      expect(result).toHaveLength(1);
      expect(result[0].external_id).toBe('org-123');
      expect(result[0].data.name).toBe('Test Organization');
      expect(result[0].source_type).toBe('cisco_meraki');
    });

    it('should filter organizations by configured IDs', async () => {
      const configWithOrgFilter = {
        ...mockConfig,
        connection: {
          ...mockConfig.connection,
          organization_ids: ['org-123'],
        },
      };
      const conn = new CiscoMerakiConnector(configWithOrgFilter);

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: [
          ...mockOrganizations,
          { id: 'org-999', name: 'Other Org' },
        ],
      });

      const result = await conn.extractResource('organizations');

      expect(result).toHaveLength(1);
      expect(result[0].external_id).toBe('org-123');
    });
  });

  describe('extractResource() - networks', () => {
    it('should extract networks for all organizations', async () => {
      // Mock organizations call
      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockOrganizations })
        .mockResolvedValueOnce({ data: mockNetworks });

      const result = await connector.extractResource('networks');

      expect(result).toHaveLength(1);
      expect(result[0].external_id).toBe('net-456');
      expect(result[0].data.name).toBe('Test Network');
    });

    it('should filter out config templates when configured', async () => {
      const networksWithTemplate = [
        ...mockNetworks,
        {
          id: 'net-template',
          organizationId: 'org-123',
          name: 'Template Network',
          productTypes: ['wireless'],
          timeZone: 'UTC',
          isBoundToConfigTemplate: true,
        },
      ];

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockOrganizations })
        .mockResolvedValueOnce({ data: networksWithTemplate });

      const result = await connector.extractResource('networks', {
        include_config_templates: false,
      });

      expect(result).toHaveLength(1);
      expect(result[0].external_id).toBe('net-456');
    });

    it('should handle network extraction failure gracefully', async () => {
      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockOrganizations })
        .mockRejectedValueOnce({ message: 'Network error' });

      const result = await connector.extractResource('networks');

      expect(result).toHaveLength(0);
    });
  });

  describe('extractResource() - devices', () => {
    it('should extract devices for all networks', async () => {
      // Populate network cache first
      connector['networkCache'].set('net-456', mockNetworks[0]);

      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockDevices });

      const result = await connector.extractResource('devices');

      expect(result).toHaveLength(1);
      expect(result[0].external_id).toBe('Q2XX-AAAA-BBBB');
      expect(result[0].data.model).toBe('MS250-48');
    });

    it('should filter devices by type when configured', async () => {
      connector['networkCache'].set('net-456', mockNetworks[0]);

      const devicesWithMultipleTypes = [
        ...mockDevices,
        {
          serial: 'Q2YY-CCCC-DDDD',
          mac: 'ff:ee:dd:cc:bb:aa',
          model: 'MR46',
          productType: 'wireless',
          networkId: 'net-456',
        },
      ];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: devicesWithMultipleTypes,
      });

      const result = await connector.extractResource('devices', {
        device_types: ['switch'],
      });

      expect(result).toHaveLength(1);
      expect(result[0].data.productType).toBe('switch');
    });

    it('should handle 404 errors gracefully (no devices in network)', async () => {
      connector['networkCache'].set('net-456', mockNetworks[0]);

      mockAxiosInstance.get.mockRejectedValueOnce({
        response: { status: 404 },
      });

      const result = await connector.extractResource('devices');

      expect(result).toHaveLength(0);
    });
  });

  describe('extractResource() - clients', () => {
    it('should extract clients for all networks', async () => {
      connector['networkCache'].set('net-456', mockNetworks[0]);

      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockClients });

      const result = await connector.extractResource('clients');

      expect(result).toHaveLength(1);
      expect(result[0].external_id).toBe('client-789');
      expect(result[0].data.mac).toBe('11:22:33:44:55:66');
    });

    it('should use custom timespan parameter', async () => {
      connector['networkCache'].set('net-456', mockNetworks[0]);

      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockClients });

      await connector.extractResource('clients', {
        timespan: 3600,
        per_page: 500,
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/networks/net-456/clients',
        expect.objectContaining({
          params: { timespan: 3600, perPage: 500 },
        })
      );
    });
  });

  describe('extractRelationships()', () => {
    it('should infer relationships from cached data', async () => {
      // Populate caches
      connector['organizationCache'].set('org-123', mockOrganizations[0]);
      connector['networkCache'].set('net-456', mockNetworks[0]);
      connector['deviceCache'].set('Q2XX-AAAA-BBBB', mockDevices[0]);

      const result = await connector.extractRelationships();

      expect(result.length).toBeGreaterThan(0);

      // Check network → organization relationship
      const networkOrgRel = result.find(
        r =>
          r.source_external_id === 'org-123' &&
          r.target_external_id === 'net-456'
      );
      expect(networkOrgRel).toBeDefined();
      expect(networkOrgRel?.relationship_type).toBe('CONTAINS');

      // Check device → network relationship
      const deviceNetRel = result.find(
        r =>
          r.source_external_id === 'net-456' &&
          r.target_external_id === 'Q2XX-AAAA-BBBB'
      );
      expect(deviceNetRel).toBeDefined();
      expect(deviceNetRel?.relationship_type).toBe('CONTAINS');
    });

    it('should return empty array when no data cached', async () => {
      const result = await connector.extractRelationships();
      expect(result).toHaveLength(0);
    });
  });

  describe('transformResource()', () => {
    it('should transform organization data', async () => {
      const result = await connector.transformResource(
        'organizations',
        mockOrganizations[0]
      );

      expect(result.name).toBe('Test Organization');
      expect(result.ci_type).toBe('organization');
      expect(result.source).toBe('cisco_meraki');
      expect(result.source_id).toBe('org-123');
      expect(result.confidence_score).toBe(100);
      expect(result.attributes.licensing_model).toBe('co-term');
    });

    it('should transform network data', async () => {
      const result = await connector.transformResource(
        'networks',
        mockNetworks[0]
      );

      expect(result.name).toBe('Test Network');
      expect(result.ci_type).toBe('network');
      expect(result.attributes.organization_id).toBe('org-123');
      expect(result.attributes.product_types).toEqual(['wireless', 'switch']);
      expect(result.attributes.tags).toEqual(['production', 'campus']);
    });

    it('should transform device data', async () => {
      const result = await connector.transformResource(
        'devices',
        mockDevices[0]
      );

      expect(result.name).toBe('Test Switch');
      expect(result.ci_type).toBe('network-device');
      expect(result.identifiers.serial_number).toBe('Q2XX-AAAA-BBBB');
      expect(result.identifiers.mac_address).toContain('aa:bb:cc:dd:ee:ff');
      expect(result.identifiers.ip_address).toContain('192.168.1.10');
      expect(result.attributes.model).toBe('MS250-48');
      expect(result.attributes.firmware).toBe('switch-15.21');
    });

    it('should transform client data', async () => {
      const result = await connector.transformResource(
        'clients',
        mockClients[0]
      );

      expect(result.name).toBe('Test Client');
      expect(result.ci_type).toBe('endpoint');
      expect(result.status).toBe('active');
      expect(result.identifiers.mac_address).toContain('11:22:33:44:55:66');
      expect(result.identifiers.ip_address).toContain('192.168.1.100');
      expect(result.attributes.user).toBe('john.doe');
      expect(result.attributes.os).toBe('Windows 10');
      expect(result.confidence_score).toBe(95);
    });

    it('should handle offline client status', async () => {
      const offlineClient = { ...mockClients[0], status: 'Offline' };
      const result = await connector.transformResource('clients', offlineClient);
      expect(result.status).toBe('inactive');
    });

    it('should throw error for unknown resource', async () => {
      await expect(
        connector.transformResource('unknown', {})
      ).rejects.toThrow('Unknown resource');
    });
  });

  describe('extractIdentifiers()', () => {
    it('should extract all identifier types', () => {
      const data = {
        external_id: 'test-123',
        serial_number: 'SN12345',
        mac_address: ['aa:bb:cc:dd:ee:ff'],
        ip_address: ['192.168.1.1'],
        hostname: 'test-host',
        type: 'device',
      };

      const result = connector.extractIdentifiers(data);

      expect(result.external_id).toBe('test-123');
      expect(result.serial_number).toBe('SN12345');
      expect(result.mac_address).toEqual(['aa:bb:cc:dd:ee:ff']);
      expect(result.ip_address).toEqual(['192.168.1.1']);
      expect(result.hostname).toBe('test-host');
      expect(result.custom_identifiers?.meraki_type).toBe('device');
    });
  });

  describe('cleanup()', () => {
    it('should clear all caches', async () => {
      // Populate caches
      connector['organizationCache'].set('org-123', mockOrganizations[0]);
      connector['networkCache'].set('net-456', mockNetworks[0]);
      connector['deviceCache'].set('Q2XX-AAAA-BBBB', mockDevices[0]);

      await connector.cleanup();

      expect(connector['organizationCache'].size).toBe(0);
      expect(connector['networkCache'].size).toBe(0);
      expect(connector['deviceCache'].size).toBe(0);
    });
  });

  describe('Rate Limiting', () => {
    it('should throttle requests to respect rate limit', async () => {
      const startTime = Date.now();

      mockAxiosInstance.get.mockResolvedValue({ data: mockOrganizations });

      // Make 3 requests (should take at least 400ms at 5 req/sec)
      await Promise.all([
        connector.testConnection(),
        connector.testConnection(),
        connector.testConnection(),
      ]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should take at least 400ms (2 intervals at 200ms each)
      expect(duration).toBeGreaterThanOrEqual(300);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during extraction', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(
        new Error('Network timeout')
      );

      await expect(
        connector.extractResource('organizations')
      ).rejects.toThrow('Network timeout');
    });

    it('should handle malformed response data', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: null });

      await expect(
        connector.extractResource('organizations')
      ).rejects.toThrow();
    });
  });
});
