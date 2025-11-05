/**
 * JAMF Pro Connector Tests (v1.0)
 * Tests for multi-resource connector functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import JAMFConnector from './index';
import { ConnectorConfiguration } from '@cmdb/integration-framework';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('JAMFConnector - Multi-Resource Tests', () => {
  let connector: JAMFConnector;
  let mockAxiosInstance: any;

  const baseConfig: ConnectorConfiguration = {
    name: 'Test JAMF Connector',
    type: 'jamf',
    enabled: true,
    connection: {
      jamf_url: 'https://test.jamfcloud.com',
      username: 'test_user',
      password: 'test_password',
      use_classic_api: true,
    },
  };

  beforeEach(() => {
    // Create mock axios instance
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      defaults: {
        headers: {
          common: {},
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    connector = new JAMFConnector(baseConfig);
  });

  describe('Initialization', () => {
    it('should initialize with correct metadata', () => {
      expect(connector).toBeDefined();
      const resources = connector.getAvailableResources();
      expect(resources).toHaveLength(4);
      expect(resources.map(r => r.id)).toEqual([
        'computers',
        'mobile_devices',
        'applications',
        'policies'
      ]);
    });

    it('should use default enabled resources', () => {
      const enabledResources = connector.getEnabledResources();
      expect(enabledResources).toEqual([
        'computers',
        'mobile_devices',
        'applications'
      ]);
    });

    it('should respect custom enabled resources', () => {
      const customConfig: ConnectorConfiguration = {
        ...baseConfig,
        enabled_resources: ['computers', 'policies'],
      };
      const customConnector = new JAMFConnector(customConfig);
      expect(customConnector.getEnabledResources()).toEqual(['computers', 'policies']);
    });
  });

  describe('Test Connection', () => {
    it('should successfully test connection with Classic API', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: '<activation_code><organization_name>Test Org</organization_name></activation_code>'
      });

      const result = await connector.testConnection();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully connected');
      expect(result.details?.api_mode).toBe('Classic API (XML)');
    });

    it('should handle connection failure', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Unauthorized'));

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection failed');
    });
  });

  describe('Extract Computers', () => {
    it('should extract computers from JAMF', async () => {
      const mockComputerList = `<?xml version="1.0" encoding="UTF-8"?>
<computers>
  <computer>
    <id>1</id>
    <name>MacBook-Pro-01</name>
  </computer>
  <computer>
    <id>2</id>
    <name>MacBook-Pro-02</name>
  </computer>
</computers>`;

      const mockComputerDetail1 = `<?xml version="1.0" encoding="UTF-8"?>
<computer>
  <general>
    <id>1</id>
    <name>MacBook-Pro-01</name>
    <serial_number>C02ABC123XYZ</serial_number>
    <mac_address>00:11:22:33:44:55</mac_address>
    <udid>12345678-ABCD-1234-ABCD-123456789012</udid>
    <ip_address>10.0.1.10</ip_address>
    <last_contact_time>2025-10-10 10:00:00</last_contact_time>
    <last_contact_time_utc>2025-10-10T10:00:00Z</last_contact_time_utc>
    <platform>Mac</platform>
    <remote_management>
      <managed>true</managed>
    </remote_management>
    <mdm_capable>true</mdm_capable>
  </general>
  <hardware>
    <model>MacBook Pro (16-inch, 2021)</model>
    <model_identifier>MacBookPro18,1</model_identifier>
    <os_name>macOS 14.1</os_name>
    <os_version>14.1</os_version>
    <os_build>23B74</os_build>
    <processor_type>Apple M1 Pro</processor_type>
    <processor_speed_mhz>3200</processor_speed_mhz>
    <number_processors>1</number_processors>
    <number_cores>10</number_cores>
    <total_ram>32768</total_ram>
    <storage>
      <drive>
        <size>1000000</size>
      </drive>
    </storage>
  </hardware>
</computer>`;

      const mockComputerDetail2 = `<?xml version="1.0" encoding="UTF-8"?>
<computer>
  <general>
    <id>2</id>
    <name>MacBook-Pro-02</name>
    <serial_number>C02XYZ987DEF</serial_number>
    <remote_management>
      <managed>true</managed>
    </remote_management>
  </general>
  <hardware>
    <model>MacBook Pro (14-inch, 2021)</model>
    <os_name>macOS 14.0</os_name>
  </hardware>
</computer>`;

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockComputerList })
        .mockResolvedValueOnce({ data: mockComputerDetail1 })
        .mockResolvedValueOnce({ data: mockComputerDetail2 });

      const extractedData = await connector.extractResource('computers');

      expect(extractedData).toHaveLength(2);
      expect(extractedData[0].external_id).toBe('1');
      expect(extractedData[0].source_type).toBe('jamf');
      expect(extractedData[1].external_id).toBe('2');
    });

    it('should filter computers by managed status', async () => {
      const mockComputerList = `<?xml version="1.0" encoding="UTF-8"?>
<computers>
  <computer><id>1</id><name>Managed-Mac</name></computer>
  <computer><id>2</id><name>Unmanaged-Mac</name></computer>
</computers>`;

      const mockManagedComputer = `<?xml version="1.0" encoding="UTF-8"?>
<computer>
  <general>
    <id>1</id>
    <name>Managed-Mac</name>
    <remote_management><managed>true</managed></remote_management>
  </general>
  <hardware><model>MacBook Pro</model></hardware>
</computer>`;

      const mockUnmanagedComputer = `<?xml version="1.0" encoding="UTF-8"?>
<computer>
  <general>
    <id>2</id>
    <name>Unmanaged-Mac</name>
    <remote_management><managed>false</managed></remote_management>
  </general>
  <hardware><model>MacBook Pro</model></hardware>
</computer>`;

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockComputerList })
        .mockResolvedValueOnce({ data: mockManagedComputer })
        .mockResolvedValueOnce({ data: mockUnmanagedComputer });

      const extractedData = await connector.extractResource('computers', {
        managed_only: true,
      });

      // Should only include managed computer
      expect(extractedData).toHaveLength(1);
      expect(extractedData[0].external_id).toBe('1');
    });

    it('should filter computers by last check-in time', async () => {
      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
      const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

      const mockComputerList = `<?xml version="1.0" encoding="UTF-8"?>
<computers>
  <computer><id>1</id><name>Recent-Mac</name></computer>
  <computer><id>2</id><name>Old-Mac</name></computer>
</computers>`;

      const mockRecentComputer = `<?xml version="1.0" encoding="UTF-8"?>
<computer>
  <general>
    <id>1</id>
    <name>Recent-Mac</name>
    <last_contact_time_utc>${recentDate.toISOString()}</last_contact_time_utc>
    <remote_management><managed>true</managed></remote_management>
  </general>
  <hardware><model>MacBook Pro</model></hardware>
</computer>`;

      const mockOldComputer = `<?xml version="1.0" encoding="UTF-8"?>
<computer>
  <general>
    <id>2</id>
    <name>Old-Mac</name>
    <last_contact_time_utc>${oldDate.toISOString()}</last_contact_time_utc>
    <remote_management><managed>true</managed></remote_management>
  </general>
  <hardware><model>MacBook Pro</model></hardware>
</computer>`;

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockComputerList })
        .mockResolvedValueOnce({ data: mockRecentComputer })
        .mockResolvedValueOnce({ data: mockOldComputer });

      const extractedData = await connector.extractResource('computers', {
        last_checkin_days: 30,
      });

      // Should only include computer that checked in within 30 days
      expect(extractedData).toHaveLength(1);
      expect(extractedData[0].external_id).toBe('1');
    });
  });

  describe('Extract Mobile Devices', () => {
    it('should extract mobile devices from JAMF', async () => {
      const mockDeviceList = `<?xml version="1.0" encoding="UTF-8"?>
<mobile_devices>
  <mobile_device>
    <id>100</id>
    <name>iPhone-01</name>
  </mobile_device>
</mobile_devices>`;

      const mockDeviceDetail = `<?xml version="1.0" encoding="UTF-8"?>
<mobile_device>
  <general>
    <id>100</id>
    <name>iPhone-01</name>
    <device_name>John's iPhone</device_name>
    <serial_number>DNPXYZ123ABC</serial_number>
    <udid>abcdef1234567890abcdef1234567890abcdef12</udid>
    <wifi_mac_address>AA:BB:CC:DD:EE:FF</wifi_mac_address>
    <model>iPhone 14 Pro</model>
    <model_identifier>iPhone15,2</model_identifier>
    <os_type>iOS</os_type>
    <os_version>17.1</os_version>
    <os_build>21B74</os_build>
    <managed>true</managed>
    <supervised>true</supervised>
    <phone_number>555-1234</phone_number>
  </general>
  <mobile_device_information>
    <capacity_mb>256000</capacity_mb>
    <available_mb>128000</available_mb>
    <percentage_used>50</percentage_used>
    <battery_level>85</battery_level>
    <carrier>Verizon</carrier>
    <imei>123456789012345</imei>
  </mobile_device_information>
</mobile_device>`;

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockDeviceList })
        .mockResolvedValueOnce({ data: mockDeviceDetail });

      const extractedData = await connector.extractResource('mobile_devices');

      expect(extractedData).toHaveLength(1);
      expect(extractedData[0].external_id).toBe('100');
      expect(extractedData[0].source_type).toBe('jamf');
    });

    it('should filter mobile devices by managed status', async () => {
      const mockDeviceList = `<?xml version="1.0" encoding="UTF-8"?>
<mobile_devices>
  <mobile_device><id>100</id></mobile_device>
</mobile_devices>`;

      const mockUnmanagedDevice = `<?xml version="1.0" encoding="UTF-8"?>
<mobile_device>
  <general>
    <id>100</id>
    <name>Unmanaged-iPhone</name>
    <managed>false</managed>
  </general>
</mobile_device>`;

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockDeviceList })
        .mockResolvedValueOnce({ data: mockUnmanagedDevice });

      const extractedData = await connector.extractResource('mobile_devices', {
        managed_only: true,
      });

      expect(extractedData).toHaveLength(0);
    });

    it('should filter mobile devices by supervised status', async () => {
      const mockDeviceList = `<?xml version="1.0" encoding="UTF-8"?>
<mobile_devices>
  <mobile_device><id>100</id></mobile_device>
  <mobile_device><id>101</id></mobile_device>
</mobile_devices>`;

      const mockSupervisedDevice = `<?xml version="1.0" encoding="UTF-8"?>
<mobile_device>
  <general>
    <id>100</id>
    <name>Supervised-iPhone</name>
    <managed>true</managed>
    <supervised>true</supervised>
  </general>
</mobile_device>`;

      const mockUnsupervisedDevice = `<?xml version="1.0" encoding="UTF-8"?>
<mobile_device>
  <general>
    <id>101</id>
    <name>Unsupervised-iPhone</name>
    <managed>true</managed>
    <supervised>false</supervised>
  </general>
</mobile_device>`;

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockDeviceList })
        .mockResolvedValueOnce({ data: mockSupervisedDevice })
        .mockResolvedValueOnce({ data: mockUnsupervisedDevice });

      const extractedData = await connector.extractResource('mobile_devices', {
        supervised_only: true,
      });

      expect(extractedData).toHaveLength(1);
      expect(extractedData[0].external_id).toBe('100');
    });
  });

  describe('Extract Policies', () => {
    it('should extract policies from JAMF', async () => {
      const mockPolicyList = `<?xml version="1.0" encoding="UTF-8"?>
<policies>
  <policy>
    <id>1</id>
    <name>Software Update</name>
  </policy>
</policies>`;

      const mockPolicyDetail = `<?xml version="1.0" encoding="UTF-8"?>
<policy>
  <general>
    <id>1</id>
    <name>Software Update</name>
    <enabled>true</enabled>
    <frequency>Once per week</frequency>
    <category><name>Maintenance</name></category>
    <trigger>USER_INITIATED</trigger>
    <trigger_checkin>false</trigger_checkin>
    <trigger_enrollment_complete>false</trigger_enrollment_complete>
    <trigger_login>true</trigger_login>
    <trigger_logout>false</trigger_logout>
    <execution_frequency>Ongoing</execution_frequency>
  </general>
  <scope>
    <all_computers>false</all_computers>
    <computers>
      <computer><id>1</id><name>MacBook-01</name></computer>
      <computer><id>2</id><name>MacBook-02</name></computer>
    </computers>
  </scope>
  <self_service>
    <use_for_self_service>true</use_for_self_service>
    <self_service_display_name>Install Updates</self_service_display_name>
    <self_service_description>Install latest software updates</self_service_description>
  </self_service>
</policy>`;

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockPolicyList })
        .mockResolvedValueOnce({ data: mockPolicyDetail });

      const extractedData = await connector.extractResource('policies');

      expect(extractedData).toHaveLength(1);
      expect(extractedData[0].external_id).toBe('1');
      expect(extractedData[0].source_type).toBe('jamf');
    });

    it('should filter policies by enabled status', async () => {
      const mockPolicyList = `<?xml version="1.0" encoding="UTF-8"?>
<policies>
  <policy><id>1</id></policy>
</policies>`;

      const mockDisabledPolicy = `<?xml version="1.0" encoding="UTF-8"?>
<policy>
  <general>
    <id>1</id>
    <name>Disabled Policy</name>
    <enabled>false</enabled>
  </general>
</policy>`;

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockPolicyList })
        .mockResolvedValueOnce({ data: mockDisabledPolicy });

      const extractedData = await connector.extractResource('policies', {
        enabled_only: true,
      });

      expect(extractedData).toHaveLength(0);
    });
  });

  describe('Transform Resources', () => {
    it('should transform computer with all attributes', async () => {
      const computerData = {
        general: [{
          id: ['1'],
          name: ['MacBook-Pro-01'],
          serial_number: ['C02ABC123XYZ'],
          mac_address: ['00:11:22:33:44:55'],
          udid: ['12345678-ABCD-1234-ABCD-123456789012'],
          ip_address: ['10.0.1.10'],
          platform: ['Mac'],
          remote_management: [{ managed: ['true'] }],
          mdm_capable: ['true'],
          jamf_version: ['10.49.0'],
          last_contact_time: ['2025-10-10 10:00:00'],
        }],
        hardware: [{
          model: ['MacBook Pro (16-inch, 2021)'],
          model_identifier: ['MacBookPro18,1'],
          os_name: ['macOS 14.1'],
          os_version: ['14.1'],
          os_build: ['23B74'],
          processor_type: ['Apple M1 Pro'],
          processor_speed_mhz: ['3200'],
          number_processors: ['1'],
          number_cores: ['10'],
          total_ram: ['32768'],
          storage: [{ drive: [{ size: ['1000000'] }] }],
        }],
      };

      const transformedCI = await connector.transformResource('computers', computerData);

      expect(transformedCI.ci_type).toBe('server');
      expect(transformedCI.name).toBe('MacBook-Pro-01');
      expect(transformedCI.status).toBe('active');
      expect(transformedCI.attributes.serial_number).toBe('C02ABC123XYZ');
      expect(transformedCI.attributes.managed).toBe(true);
      expect(transformedCI.attributes.number_cores).toBe('10');
      expect(transformedCI.attributes.total_ram_mb).toBe('32768');
      expect(transformedCI.confidence_score).toBe(95);
    });

    it('should transform mobile device with all attributes', async () => {
      const deviceData = {
        general: [{
          id: ['100'],
          name: ['iPhone-01'],
          device_name: ['John\'s iPhone'],
          serial_number: ['DNPXYZ123ABC'],
          udid: ['abcdef1234567890abcdef1234567890abcdef12'],
          wifi_mac_address: ['AA:BB:CC:DD:EE:FF'],
          model: ['iPhone 14 Pro'],
          model_identifier: ['iPhone15,2'],
          os_type: ['iOS'],
          os_version: ['17.1'],
          managed: ['true'],
          supervised: ['true'],
          phone_number: ['555-1234'],
        }],
        mobile_device_information: [{
          capacity_mb: ['256000'],
          available_mb: ['128000'],
          battery_level: ['85'],
          carrier: ['Verizon'],
          imei: ['123456789012345'],
        }],
      };

      const transformedCI = await connector.transformResource('mobile_devices', deviceData);

      expect(transformedCI.ci_type).toBe('mobile-device');
      expect(transformedCI.name).toBe('iPhone-01');
      expect(transformedCI.attributes.managed).toBe(true);
      expect(transformedCI.attributes.supervised).toBe(true);
      expect(transformedCI.attributes.battery_level).toBe('85');
      expect(transformedCI.attributes.imei).toBe('123456789012345');
    });

    it('should transform application with all attributes', async () => {
      const appData = {
        name: 'Google Chrome',
        version: '118.0.5993.88',
        bundle_id: 'com.google.Chrome',
        path: '/Applications/Google Chrome.app',
        size_mb: '245',
        installed_on: [
          { device_type: 'computer', device_id: '1' },
          { device_type: 'computer', device_id: '2' },
        ],
      };

      const transformedCI = await connector.transformResource('applications', appData);

      expect(transformedCI.ci_type).toBe('application');
      expect(transformedCI.name).toBe('Google Chrome');
      expect(transformedCI.attributes.version).toBe('118.0.5993.88');
      expect(transformedCI.attributes.bundle_id).toBe('com.google.Chrome');
      expect(transformedCI.attributes.install_count).toBe(2);
    });

    it('should transform policy with all attributes', async () => {
      const policyData = {
        general: [{
          id: ['1'],
          name: ['Software Update'],
          enabled: ['true'],
          frequency: ['Once per week'],
          category: [{ name: ['Maintenance'] }],
          trigger: ['USER_INITIATED'],
          trigger_login: ['true'],
        }],
        scope: [{
          all_computers: ['false'],
          computers: [{ computer: [{ id: ['1'] }, { id: ['2'] }] }],
        }],
        self_service: [{
          use_for_self_service: ['true'],
          self_service_display_name: ['Install Updates'],
        }],
      };

      const transformedCI = await connector.transformResource('policies', policyData);

      expect(transformedCI.ci_type).toBe('policy');
      expect(transformedCI.name).toBe('Software Update');
      expect(transformedCI.status).toBe('active');
      expect(transformedCI.attributes.enabled).toBe(true);
      expect(transformedCI.attributes.self_service_enabled).toBe(true);
      expect(transformedCI.attributes.scope_computer_count).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unknown resource', async () => {
      await expect(
        connector.extractResource('invalid_resource')
      ).rejects.toThrow('Unknown resource: invalid_resource');
    });

    it('should handle extraction errors gracefully', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('API Error'));

      await expect(
        connector.extractResource('computers')
      ).rejects.toThrow();
    });

    it('should continue extraction if individual item fails', async () => {
      const mockComputerList = `<?xml version="1.0" encoding="UTF-8"?>
<computers>
  <computer><id>1</id><name>Mac-01</name></computer>
  <computer><id>2</id><name>Mac-02</name></computer>
</computers>`;

      const mockValidComputer = `<?xml version="1.0" encoding="UTF-8"?>
<computer>
  <general>
    <id>1</id>
    <name>Mac-01</name>
    <remote_management><managed>true</managed></remote_management>
  </general>
  <hardware><model>MacBook Pro</model></hardware>
</computer>`;

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockComputerList })
        .mockResolvedValueOnce({ data: mockValidComputer })
        .mockRejectedValueOnce(new Error('Detail fetch failed')); // Second computer fails

      const extractedData = await connector.extractResource('computers');

      // Should still get the first computer
      expect(extractedData).toHaveLength(1);
      expect(extractedData[0].external_id).toBe('1');
    });
  });
});
