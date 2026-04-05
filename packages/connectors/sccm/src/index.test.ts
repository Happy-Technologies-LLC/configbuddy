// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Microsoft SCCM Connector Tests (v1.0)
 * Tests for multi-resource SCCM connector functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import sql from 'mssql';
import SCCMConnector from './index';
import { ConnectorConfiguration } from '@cmdb/integration-framework';

// Mock mssql
vi.mock('mssql');
const mockedSql = sql as any;

describe('SCCMConnector - Multi-Resource Tests', () => {
  let connector: SCCMConnector;
  let mockConnectionPool: any;

  const baseConfig: ConnectorConfiguration = {
    name: 'Test SCCM Connector',
    type: 'sccm',
    enabled: true,
    connection: {
      server: 'sccm-sql.example.com',
      database: 'CM_PS1',
      username: 'sccm_user',
      password: 'sccm_password',
      use_windows_auth: false,
      site_code: 'PS1',
      devices: {
        active_only: true,
        last_scan_days: 30,
      },
    },
  };

  beforeEach(() => {
    // Create mock connection pool
    mockConnectionPool = {
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      request: vi.fn(() => ({
        query: vi.fn().mockResolvedValue({ recordset: [] }),
      })),
    };

    mockedSql.ConnectionPool = vi.fn(() => mockConnectionPool);

    connector = new SCCMConnector(baseConfig);
  });

  afterEach(async () => {
    await connector.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize with correct metadata', () => {
      expect(connector).toBeDefined();
      const resources = connector.getAvailableResources();
      expect(resources).toHaveLength(4);
      expect(resources.map(r => r.id)).toEqual([
        'devices',
        'software_inventory',
        'collections',
        'updates'
      ]);
    });

    it('should use default enabled resources', () => {
      const enabledResources = connector.getEnabledResources();
      expect(enabledResources).toEqual([
        'devices',
        'software_inventory',
        'updates'
      ]);
    });

    it('should respect custom enabled resources', () => {
      const customConfig: ConnectorConfiguration = {
        ...baseConfig,
        enabled_resources: ['devices', 'collections'],
      };
      const customConnector = new SCCMConnector(customConfig);
      expect(customConnector.getEnabledResources()).toEqual(['devices', 'collections']);
    });

    it('should create SQL Server connection pool', async () => {
      await connector.initialize();
      expect(mockedSql.ConnectionPool).toHaveBeenCalled();
      expect(mockConnectionPool.connect).toHaveBeenCalled();
    });

    it('should configure Windows authentication when use_windows_auth is true', () => {
      const winAuthConfig: ConnectorConfiguration = {
        ...baseConfig,
        connection: {
          ...baseConfig.connection,
          use_windows_auth: true,
          username: 'DOMAIN\\user',
          password: 'password',
        },
      };

      const winAuthConnector = new SCCMConnector(winAuthConfig);
      expect(winAuthConnector).toBeDefined();
    });
  });

  describe('Test Connection', () => {
    it('should successfully test connection', async () => {
      mockConnectionPool.request.mockReturnValue({
        query: vi.fn().mockResolvedValue({
          recordset: [{ Version: 'Microsoft SQL Server 2019' }]
        })
      });

      const result = await connector.testConnection();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully connected');
      expect(result.details?.sql_version).toContain('Microsoft SQL Server');
    });

    it('should handle connection failure', async () => {
      mockConnectionPool.request.mockReturnValue({
        query: vi.fn().mockRejectedValue(new Error('Connection refused'))
      });

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection failed');
    });
  });

  describe('Extract Devices', () => {
    it('should extract devices from v_R_System view', async () => {
      const mockDevices = [
        {
          ResourceID: 16777220,
          Name: 'WS-001',
          DistinguishedName: 'CN=WS-001,OU=Workstations,DC=example,DC=com',
          ClientVersion: '5.00.9068.1000',
          OperatingSystem: 'Microsoft Windows 10 Enterprise',
          Domain: 'EXAMPLE',
          ADSite: 'HQ-Site',
          IsClient: 1,
          IsActive: 1,
          IsObsolete: 0,
          Manufacturer: 'Dell Inc.',
          Model: 'OptiPlex 7090',
          SystemType: 'X64-based PC',
          TotalMemoryKB: 16777216,
          ProcessorName: 'Intel(R) Core(TM) i7-10700 @ 2.90GHz',
          CPUCores: 8,
          CPULogicalProcessors: 16,
          IPAddress: '192.168.1.100',
          MACAddress: '00:50:56:C0:00:08',
          SerialNumber: 'ABC123456',
          LastHardwareScan: new Date('2025-10-01'),
        },
        {
          ResourceID: 16777221,
          Name: 'SRV-001',
          DistinguishedName: 'CN=SRV-001,OU=Servers,DC=example,DC=com',
          ClientVersion: '5.00.9068.1000',
          OperatingSystem: 'Microsoft Windows Server 2019 Standard',
          Domain: 'EXAMPLE',
          ADSite: 'HQ-Site',
          IsClient: 1,
          IsActive: 1,
          IsObsolete: 0,
          Manufacturer: 'Dell Inc.',
          Model: 'PowerEdge R740',
          SystemType: 'X64-based PC',
          TotalMemoryKB: 33554432,
          ProcessorName: 'Intel(R) Xeon(R) Gold 6248R @ 3.00GHz',
          CPUCores: 24,
          CPULogicalProcessors: 48,
          IPAddress: '192.168.1.10',
          MACAddress: '00:50:56:C0:00:01',
          SerialNumber: 'SRV123456',
          LastHardwareScan: new Date('2025-10-01'),
        },
      ];

      mockConnectionPool.request.mockReturnValue({
        query: vi.fn().mockResolvedValue({ recordset: mockDevices })
      });

      await connector.initialize();
      const extractedData = await connector.extractResource('devices');

      expect(extractedData).toHaveLength(2);
      expect(extractedData[0].external_id).toBe('SCCM-16777220');
      expect(extractedData[0].source_type).toBe('sccm');
      expect(extractedData[0].data.name).toBe('WS-001');
      expect(extractedData[0].data.operating_system).toBe('Microsoft Windows 10 Enterprise');
      expect(extractedData[1].external_id).toBe('SCCM-16777221');
      expect(extractedData[1].data.name).toBe('SRV-001');
    });

    it('should apply active_only filter', async () => {
      mockConnectionPool.request.mockReturnValue({
        query: vi.fn().mockResolvedValue({ recordset: [] })
      });

      await connector.initialize();
      await connector.extractResource('devices', { active_only: true });

      const queryCall = mockConnectionPool.request().query;
      expect(queryCall).toHaveBeenCalled();
      const sqlQuery = queryCall.mock.calls[0][0];
      expect(sqlQuery).toContain('sys.Active0 = 1');
      expect(sqlQuery).toContain('sys.Obsolete0 = 0');
    });

    it('should apply last_scan_days filter', async () => {
      mockConnectionPool.request.mockReturnValue({
        query: vi.fn().mockResolvedValue({ recordset: [] })
      });

      await connector.initialize();
      await connector.extractResource('devices', { last_scan_days: 7 });

      const queryCall = mockConnectionPool.request().query;
      const sqlQuery = queryCall.mock.calls[0][0];
      expect(sqlQuery).toContain('DATEADD(day, -7, GETDATE())');
    });

    it('should handle pagination for large datasets', async () => {
      const batch1 = Array.from({ length: 1000 }, (_, i) => ({
        ResourceID: 16777220 + i,
        Name: `DEVICE-${i}`,
        IsActive: 1,
        IsObsolete: 0,
      }));

      const batch2 = Array.from({ length: 500 }, (_, i) => ({
        ResourceID: 16778220 + i,
        Name: `DEVICE-${1000 + i}`,
        IsActive: 1,
        IsObsolete: 0,
      }));

      mockConnectionPool.request
        .mockReturnValueOnce({
          query: vi.fn().mockResolvedValue({ recordset: batch1 })
        })
        .mockReturnValueOnce({
          query: vi.fn().mockResolvedValue({ recordset: batch2 })
        });

      await connector.initialize();
      const extractedData = await connector.extractResource('devices');

      expect(extractedData).toHaveLength(1500);
    });
  });

  describe('Extract Software Inventory', () => {
    it('should extract software from v_GS_ADD_REMOVE_PROGRAMS', async () => {
      const mockSoftware = [
        {
          DisplayName: 'Microsoft Office Professional Plus 2019',
          Version: '16.0.10396.20017',
          Publisher: 'Microsoft Corporation',
          InstallDate: '20240115',
          ResourceID: 16777220,
          DeviceName: 'WS-001',
          ProductID: '{90160000-0011-0000-0000-0000000FF1CE}',
          InstallCount: 150,
        },
        {
          DisplayName: 'Google Chrome',
          Version: '118.0.5993.118',
          Publisher: 'Google LLC',
          InstallDate: '20240920',
          ResourceID: 16777220,
          DeviceName: 'WS-001',
          ProductID: null,
          InstallCount: 320,
        },
      ];

      mockConnectionPool.request.mockReturnValue({
        query: vi.fn().mockResolvedValue({ recordset: mockSoftware })
      });

      await connector.initialize();
      const extractedData = await connector.extractResource('software_inventory');

      expect(extractedData).toHaveLength(2);
      expect(extractedData[0].data.product_name).toBe('Microsoft Office Professional Plus 2019');
      expect(extractedData[0].data.product_version).toBe('16.0.10396.20017');
      expect(extractedData[0].data.install_count).toBe(150);
      expect(extractedData[1].data.product_name).toBe('Google Chrome');
    });

    it('should exclude Microsoft software when include_system_software is false', async () => {
      mockConnectionPool.request.mockReturnValue({
        query: vi.fn().mockResolvedValue({ recordset: [] })
      });

      await connector.initialize();
      await connector.extractResource('software_inventory', {
        include_system_software: false
      });

      const queryCall = mockConnectionPool.request().query;
      const sqlQuery = queryCall.mock.calls[0][0];
      expect(sqlQuery).toContain("arp.Publisher0 NOT LIKE 'Microsoft%'");
    });

    it('should apply min_install_count filter', async () => {
      const mockSoftware = [
        {
          DisplayName: 'Software A',
          Version: '1.0',
          Publisher: 'Vendor A',
          ResourceID: 1,
          DeviceName: 'Device1',
          InstallCount: 100,
        },
        {
          DisplayName: 'Software B',
          Version: '2.0',
          Publisher: 'Vendor B',
          ResourceID: 2,
          DeviceName: 'Device2',
          InstallCount: 5,
        },
      ];

      mockConnectionPool.request.mockReturnValue({
        query: vi.fn().mockResolvedValue({ recordset: mockSoftware })
      });

      await connector.initialize();
      const extractedData = await connector.extractResource('software_inventory', {
        min_install_count: 10
      });

      // Only Software A should pass the filter (100 >= 10)
      expect(extractedData).toHaveLength(1);
      expect(extractedData[0].data.product_name).toBe('Software A');
    });
  });

  describe('Extract Collections', () => {
    it('should extract device collections from v_Collection', async () => {
      const mockCollections = [
        {
          CollectionID: 'SMS00001',
          Name: 'All Systems',
          Comment: 'All Systems collection',
          MemberCount: 500,
          CollectionType: 2,
          LastMemberChangeTime: new Date('2025-10-01'),
          LastRefreshTime: new Date('2025-10-01'),
          LimitToCollectionID: null,
          LimitToCollectionName: null,
          IsBuiltIn: 1,
          IsReferenceCollection: 0,
          RuleCount: 0,
        },
        {
          CollectionID: 'PS100001',
          Name: 'Windows 10 Workstations',
          Comment: 'All Windows 10 workstations',
          MemberCount: 250,
          CollectionType: 2,
          LastMemberChangeTime: new Date('2025-10-01'),
          LastRefreshTime: new Date('2025-10-01'),
          LimitToCollectionID: 'SMS00001',
          LimitToCollectionName: 'All Systems',
          IsBuiltIn: 0,
          IsReferenceCollection: 0,
          RuleCount: 5,
        },
      ];

      mockConnectionPool.request.mockReturnValue({
        query: vi.fn().mockResolvedValue({ recordset: mockCollections })
      });

      await connector.initialize();
      const extractedData = await connector.extractResource('collections');

      expect(extractedData).toHaveLength(2);
      expect(extractedData[0].external_id).toBe('SCCM-COLL-SMS00001');
      expect(extractedData[0].data.name).toBe('All Systems');
      expect(extractedData[0].data.member_count).toBe(500);
      expect(extractedData[1].external_id).toBe('SCCM-COLL-PS100001');
    });

    it('should exclude system collections when exclude_system_collections is true', async () => {
      mockConnectionPool.request.mockReturnValue({
        query: vi.fn().mockResolvedValue({ recordset: [] })
      });

      await connector.initialize();
      await connector.extractResource('collections', {
        exclude_system_collections: true
      });

      const queryCall = mockConnectionPool.request().query;
      const sqlQuery = queryCall.mock.calls[0][0];
      expect(sqlQuery).toContain('coll.IsBuiltIn = 0');
    });

    it('should apply min_member_count filter', async () => {
      mockConnectionPool.request.mockReturnValue({
        query: vi.fn().mockResolvedValue({ recordset: [] })
      });

      await connector.initialize();
      await connector.extractResource('collections', {
        min_member_count: 10
      });

      const queryCall = mockConnectionPool.request().query;
      const sqlQuery = queryCall.mock.calls[0][0];
      expect(sqlQuery).toContain('coll.MemberCount >= 10');
    });
  });

  describe('Extract Updates', () => {
    it('should extract software updates from v_UpdateInfo', async () => {
      const mockUpdates = [
        {
          CI_ID: 16777217,
          ArticleID: 'KB5034441',
          BulletinID: 'MS24-001',
          Title: '2024-01 Cumulative Update for Windows 10',
          Description: 'Security and quality improvements',
          Severity: 'Critical',
          IsDeployed: 1,
          IsSuperseded: 0,
          IsExpired: 0,
          DatePosted: new Date('2024-01-09'),
          DateRevised: new Date('2024-01-09'),
          InstalledCount: 400,
          RequiredCount: 100,
          NotApplicableCount: 50,
          TotalDevices: 550,
        },
        {
          CI_ID: 16777218,
          ArticleID: 'KB5034123',
          BulletinID: 'MS24-002',
          Title: '2024-02 Security Update for .NET Framework',
          Description: '.NET Framework security update',
          Severity: 'Important',
          IsDeployed: 1,
          IsSuperseded: 0,
          IsExpired: 0,
          DatePosted: new Date('2024-02-13'),
          DateRevised: new Date('2024-02-13'),
          InstalledCount: 300,
          RequiredCount: 50,
          NotApplicableCount: 200,
          TotalDevices: 550,
        },
      ];

      mockConnectionPool.request.mockReturnValue({
        query: vi.fn().mockResolvedValue({ recordset: mockUpdates })
      });

      await connector.initialize();
      const extractedData = await connector.extractResource('updates');

      expect(extractedData).toHaveLength(2);
      expect(extractedData[0].external_id).toBe('SCCM-UPD-16777217');
      expect(extractedData[0].data.article_id).toBe('KB5034441');
      expect(extractedData[0].data.severity).toBe('Critical');
      expect(extractedData[0].data.required_count).toBe(100);
      expect(extractedData[1].external_id).toBe('SCCM-UPD-16777218');
    });

    it('should filter by severity levels', async () => {
      mockConnectionPool.request.mockReturnValue({
        query: vi.fn().mockResolvedValue({ recordset: [] })
      });

      await connector.initialize();
      await connector.extractResource('updates', {
        severity_levels: ['Critical']
      });

      const queryCall = mockConnectionPool.request().query;
      const sqlQuery = queryCall.mock.calls[0][0];
      expect(sqlQuery).toContain("upd.SeverityName IN ('Critical')");
    });

    it('should filter deployed updates only', async () => {
      mockConnectionPool.request.mockReturnValue({
        query: vi.fn().mockResolvedValue({ recordset: [] })
      });

      await connector.initialize();
      await connector.extractResource('updates', {
        deployed_only: true
      });

      const queryCall = mockConnectionPool.request().query;
      const sqlQuery = queryCall.mock.calls[0][0];
      expect(sqlQuery).toContain('upd.IsDeployed = 1');
    });

    it('should filter required updates only', async () => {
      mockConnectionPool.request.mockReturnValue({
        query: vi.fn().mockResolvedValue({ recordset: [] })
      });

      await connector.initialize();
      await connector.extractResource('updates', {
        required_only: true
      });

      const queryCall = mockConnectionPool.request().query;
      const sqlQuery = queryCall.mock.calls[0][0];
      expect(sqlQuery).toContain('comp.NumMissing > 0');
    });
  });

  describe('Transform Resource', () => {
    it('should transform device with device-specific attributes', async () => {
      const deviceData = {
        resource_id: 16777220,
        name: 'WS-001',
        operating_system: 'Microsoft Windows 10 Enterprise',
        manufacturer: 'Dell Inc.',
        model: 'OptiPlex 7090',
        system_type: 'X64-based PC',
        total_memory_gb: 16,
        cpu_cores: 8,
        serial_number: 'ABC123456',
        ip_address: '192.168.1.100',
        mac_address: '00:50:56:C0:00:08',
        is_active: 1,
        is_obsolete: 0,
        domain: 'EXAMPLE',
      };

      const transformedCI = await connector.transformResource('devices', deviceData);

      expect(transformedCI.ci_type).toBe('server');
      expect(transformedCI.name).toBe('WS-001');
      expect(transformedCI.status).toBe('active');
      expect(transformedCI.attributes.operating_system).toBe('Microsoft Windows 10 Enterprise');
      expect(transformedCI.attributes.manufacturer).toBe('Dell Inc.');
      expect(transformedCI.attributes.cpu_cores).toBe(8);
      expect(transformedCI.confidence_score).toBe(95);
    });

    it('should detect virtual machines based on system_type', async () => {
      const vmData = {
        resource_id: 16777221,
        name: 'VM-001',
        system_type: 'Virtual Machine',
        is_active: 1,
        is_obsolete: 0,
      };

      const transformedCI = await connector.transformResource('devices', vmData);
      expect(transformedCI.ci_type).toBe('virtual-machine');
    });

    it('should transform software with software-specific attributes', async () => {
      const softwareData = {
        product_name: 'Google Chrome',
        product_version: '118.0.5993.118',
        publisher: 'Google LLC',
        install_count: 320,
        device_resource_id: 16777220,
        device_name: 'WS-001',
      };

      const transformedCI = await connector.transformResource('software_inventory', softwareData);

      expect(transformedCI.ci_type).toBe('software');
      expect(transformedCI.name).toBe('Google Chrome 118.0.5993.118');
      expect(transformedCI.attributes.product_name).toBe('Google Chrome');
      expect(transformedCI.attributes.install_count).toBe(320);
      expect(transformedCI.confidence_score).toBe(90);
    });

    it('should transform collection with collection-specific attributes', async () => {
      const collectionData = {
        collection_id: 'PS100001',
        name: 'Windows 10 Workstations',
        member_count: 250,
        collection_type: 2,
        is_built_in: 0,
        rule_count: 5,
      };

      const transformedCI = await connector.transformResource('collections', collectionData);

      expect(transformedCI.ci_type).toBe('collection');
      expect(transformedCI.name).toBe('Windows 10 Workstations');
      expect(transformedCI.attributes.member_count).toBe(250);
      expect(transformedCI.attributes.rule_count).toBe(5);
      expect(transformedCI.confidence_score).toBe(100);
    });

    it('should transform update with update-specific attributes and compliance', async () => {
      const updateData = {
        ci_id: 16777217,
        article_id: 'KB5034441',
        bulletin_id: 'MS24-001',
        title: '2024-01 Cumulative Update for Windows 10',
        severity: 'Critical',
        is_deployed: 1,
        is_superseded: 0,
        is_expired: 0,
        installed_count: 400,
        required_count: 100,
        total_devices: 500,
      };

      const transformedCI = await connector.transformResource('updates', updateData);

      expect(transformedCI.ci_type).toBe('update');
      expect(transformedCI.name).toBe('2024-01 Cumulative Update for Windows 10');
      expect(transformedCI.status).toBe('active');
      expect(transformedCI.attributes.severity).toBe('Critical');
      expect(transformedCI.attributes.compliance_percentage).toBe(80); // 400/500 = 80%
      expect(transformedCI.confidence_score).toBe(100);
    });

    it('should map update status correctly', async () => {
      const expiredUpdate = {
        ci_id: 1,
        title: 'Expired Update',
        is_expired: 1,
        is_superseded: 0,
        is_deployed: 0,
        total_devices: 0,
      };

      const transformedCI = await connector.transformResource('updates', expiredUpdate);
      expect(transformedCI.status).toBe('decommissioned');

      const supersededUpdate = {
        ci_id: 2,
        title: 'Superseded Update',
        is_expired: 0,
        is_superseded: 1,
        is_deployed: 0,
        total_devices: 0,
      };

      const transformedCI2 = await connector.transformResource('updates', supersededUpdate);
      expect(transformedCI2.status).toBe('inactive');
    });
  });

  describe('Extract Relationships', () => {
    it('should extract software-device relationships (INSTALLED_ON)', async () => {
      const mockSoftwareRel = [
        {
          ProductName: 'Google Chrome',
          ProductVersion: '118.0',
          ResourceID: 16777220,
        },
        {
          ProductName: 'Microsoft Office',
          ProductVersion: '16.0',
          ResourceID: 16777221,
        },
      ];

      mockConnectionPool.request.mockReturnValue({
        query: vi.fn().mockResolvedValue({ recordset: mockSoftwareRel })
      });

      await connector.initialize();
      const relationships = await connector.extractRelationships();

      const softwareRels = relationships.filter(r => r.relationship_type === 'INSTALLED_ON');
      expect(softwareRels.length).toBeGreaterThan(0);
      expect(softwareRels[0].relationship_type).toBe('INSTALLED_ON');
      expect(softwareRels[0].properties?.type).toBe('software_installation');
    });

    it('should extract collection-device relationships (MEMBER_OF)', async () => {
      const mockCollectionRel = [
        {
          CollectionID: 'PS100001',
          ResourceID: 16777220,
        },
        {
          CollectionID: 'PS100001',
          ResourceID: 16777221,
        },
      ];

      mockConnectionPool.request
        .mockReturnValueOnce({
          query: vi.fn().mockResolvedValue({ recordset: [] })
        })
        .mockReturnValueOnce({
          query: vi.fn().mockResolvedValue({ recordset: mockCollectionRel })
        });

      await connector.initialize();
      const relationships = await connector.extractRelationships();

      const collectionRels = relationships.filter(r => r.relationship_type === 'MEMBER_OF');
      expect(collectionRels.length).toBeGreaterThan(0);
      expect(collectionRels[0].relationship_type).toBe('MEMBER_OF');
      expect(collectionRels[0].target_external_id).toContain('SCCM-COLL-');
    });

    it('should extract update-device relationships (REQUIRED_BY and INSTALLED_ON)', async () => {
      const mockUpdateRel = [
        {
          CI_ID: 16777217,
          ResourceID: 16777220,
          Status: 2, // Missing (required)
        },
        {
          CI_ID: 16777217,
          ResourceID: 16777221,
          Status: 3, // Present (installed)
        },
      ];

      mockConnectionPool.request
        .mockReturnValueOnce({
          query: vi.fn().mockResolvedValue({ recordset: [] })
        })
        .mockReturnValueOnce({
          query: vi.fn().mockResolvedValue({ recordset: [] })
        })
        .mockReturnValueOnce({
          query: vi.fn().mockResolvedValue({ recordset: mockUpdateRel })
        });

      await connector.initialize();
      const relationships = await connector.extractRelationships();

      const requiredRels = relationships.filter(r => r.relationship_type === 'REQUIRED_BY');
      const installedRels = relationships.filter(r => r.relationship_type === 'INSTALLED_ON');

      expect(requiredRels.length).toBeGreaterThan(0);
      expect(installedRels.length).toBeGreaterThan(0);
      expect(requiredRels[0].properties?.status).toBe('required');
      expect(installedRels[0].properties?.status).toBe('installed');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unknown resource', async () => {
      await connector.initialize();
      await expect(
        connector.extractResource('invalid_resource')
      ).rejects.toThrow('Unknown resource: invalid_resource');
    });

    it('should handle SQL query errors gracefully', async () => {
      mockConnectionPool.request.mockReturnValue({
        query: vi.fn().mockRejectedValue(new Error('SQL error'))
      });

      await connector.initialize();
      await expect(
        connector.extractResource('devices')
      ).rejects.toThrow('SQL error');
    });

    it('should not throw on relationship extraction failure', async () => {
      mockConnectionPool.request.mockReturnValue({
        query: vi.fn().mockRejectedValue(new Error('SQL error'))
      });

      await connector.initialize();
      const relationships = await connector.extractRelationships();

      // Should return empty array instead of throwing
      expect(relationships).toEqual([]);
    });
  });

  describe('Cleanup', () => {
    it('should close connection pool on cleanup', async () => {
      await connector.initialize();
      await connector.cleanup();

      expect(mockConnectionPool.close).toHaveBeenCalled();
    });
  });

  describe('Environment Detection', () => {
    it('should detect production environment from AD site', async () => {
      const deviceData = {
        resource_id: 1,
        name: 'SERVER-001',
        ad_site: 'PROD-Site',
        is_active: 1,
        is_obsolete: 0,
      };

      const transformedCI = await connector.transformResource('devices', deviceData);
      expect(transformedCI.environment).toBe('production');
    });

    it('should detect development environment from device name', async () => {
      const deviceData = {
        resource_id: 1,
        name: 'DEV-SERVER-001',
        is_active: 1,
        is_obsolete: 0,
      };

      const transformedCI = await connector.transformResource('devices', deviceData);
      expect(transformedCI.environment).toBe('development');
    });

    it('should default to production for unknown environments', async () => {
      const deviceData = {
        resource_id: 1,
        name: 'SERVER-001',
        is_active: 1,
        is_obsolete: 0,
      };

      const transformedCI = await connector.transformResource('devices', deviceData);
      expect(transformedCI.environment).toBe('production');
    });
  });
});
