// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Microsoft Defender for Endpoint Connector Tests (v1.0)
 * Tests for multi-resource Defender connector functionality
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import axios from 'axios';
import { ClientSecretCredential } from '@azure/identity';
import DefenderConnector from '../src/index';
import { ConnectorConfiguration } from '@cmdb/integration-framework';

// Mock dependencies
vi.mock('axios');
vi.mock('@azure/identity');

const mockedAxios = axios as any;
const MockedCredential = ClientSecretCredential as any;

describe('DefenderConnector - Multi-Resource Tests', () => {
  let connector: DefenderConnector;
  let mockAxiosInstance: any;
  let mockCredential: any;

  const baseConfig: ConnectorConfiguration = {
    name: 'Test Defender Connector',
    type: 'defender',
    enabled: true,
    connection: {
      tenant_id: 'test-tenant-id',
      client_id: 'test-client-id',
      client_secret: 'test-client-secret',
      machines: {
        health_status: ['Active', 'Inactive'],
        risk_score: ['Low', 'Medium', 'High'],
      },
      alerts: {
        severity: ['Medium', 'High'],
        status: ['New', 'InProgress'],
      },
      vulnerabilities: {
        severity: ['High', 'Critical'],
        exploit_verified: false,
      },
    },
  };

  beforeEach(() => {
    // Mock Azure AD credential
    mockCredential = {
      getToken: vi.fn().mockResolvedValue({
        token: 'mock-access-token',
        expiresOnTimestamp: Date.now() + 3600000, // 1 hour from now
      }),
    };
    MockedCredential.mockImplementation(() => mockCredential);

    // Create mock axios instance
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      interceptors: {
        request: {
          use: vi.fn((fn) => {
            // Store the interceptor function for testing
            mockAxiosInstance._requestInterceptor = fn;
          }),
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    connector = new DefenderConnector(baseConfig);
  });

  describe('Initialization', () => {
    it('should initialize with correct metadata', () => {
      expect(connector).toBeDefined();
      const resources = connector.getAvailableResources();
      expect(resources).toHaveLength(5);
      expect(resources.map((r) => r.id)).toEqual([
        'machines',
        'alerts',
        'vulnerabilities',
        'software',
        'relationships',
      ]);
    });

    it('should use default enabled resources', () => {
      const enabledResources = connector.getEnabledResources();
      expect(enabledResources).toEqual([
        'machines',
        'alerts',
        'vulnerabilities',
        'relationships',
      ]);
    });

    it('should initialize Azure AD credential', () => {
      expect(MockedCredential).toHaveBeenCalledWith(
        'test-tenant-id',
        'test-client-id',
        'test-client-secret'
      );
    });

    it('should set up axios interceptor for authentication', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
    });
  });

  describe('Authentication', () => {
    it('should obtain access token on initialization', async () => {
      await connector.initialize();
      expect(mockCredential.getToken).toHaveBeenCalledWith(
        'https://api.securitycenter.microsoft.com/.default'
      );
    });

    it('should cache access token', async () => {
      await connector.initialize();
      const firstCallCount = mockCredential.getToken.mock.calls.length;

      // Call initialize again - should use cached token
      await connector.initialize();
      expect(mockCredential.getToken.mock.calls.length).toBe(firstCallCount);
    });
  });

  describe('Test Connection', () => {
    it('should successfully test connection', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { value: [{ id: 'test-machine' }] },
      });

      const result = await connector.testConnection();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully connected');
      expect(result.details?.machines_available).toBe(true);
    });

    it('should handle connection failure', async () => {
      mockAxiosInstance.get.mockRejectedValue({
        message: 'Unauthorized',
        response: { status: 401, data: { error: 'Invalid credentials' } },
      });

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection failed');
    });
  });

  describe('Extract Machines', () => {
    it('should extract machines with health status filter', async () => {
      const mockMachines = [
        {
          id: 'machine-1',
          computerDnsName: 'DESKTOP-001',
          osPlatform: 'Windows10',
          osVersion: '10.0.19045',
          lastIpAddress: '192.168.1.100',
          lastExternalIpAddress: '203.0.113.1',
          healthStatus: 'Active',
          riskScore: 'Medium',
          exposureLevel: 'Medium',
          onboardingStatus: 'Onboarded',
          agentVersion: '10.8070.19041.1151',
          firstSeen: '2024-01-01T00:00:00Z',
          lastSeen: '2024-10-10T12:00:00Z',
        },
        {
          id: 'machine-2',
          computerDnsName: 'LAPTOP-002',
          osPlatform: 'Windows11',
          osVersion: '10.0.22621',
          lastIpAddress: '192.168.1.101',
          lastExternalIpAddress: '203.0.113.2',
          healthStatus: 'Active',
          riskScore: 'Low',
          exposureLevel: 'Low',
          onboardingStatus: 'Onboarded',
          agentVersion: '10.8070.22621.1234',
          firstSeen: '2024-02-01T00:00:00Z',
          lastSeen: '2024-10-10T12:00:00Z',
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: { value: mockMachines },
      });

      const extractedData = await connector.extractResource('machines');
      expect(extractedData).toHaveLength(2);
      expect(extractedData[0].external_id).toBe('machine-1');
      expect(extractedData[0].source_type).toBe('defender');
      expect(extractedData[0].data.computerDnsName).toBe('DESKTOP-001');

      // Verify OData filter was applied
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/machines',
        expect.objectContaining({
          params: expect.objectContaining({
            $top: 100,
            $filter: expect.stringContaining('healthStatus'),
          }),
        })
      );
    });

    it('should handle pagination for machines', async () => {
      const batch1 = Array.from({ length: 100 }, (_, i) => ({
        id: `machine-${i}`,
        computerDnsName: `DESKTOP-${i}`,
        osPlatform: 'Windows10',
        osVersion: '10.0.19045',
        lastIpAddress: `192.168.1.${i}`,
        lastExternalIpAddress: `203.0.113.${i}`,
        healthStatus: 'Active',
        riskScore: 'Low',
        exposureLevel: 'Low',
        onboardingStatus: 'Onboarded',
        agentVersion: '10.8070.19041.1151',
        firstSeen: '2024-01-01T00:00:00Z',
        lastSeen: '2024-10-10T12:00:00Z',
      }));

      const batch2 = Array.from({ length: 50 }, (_, i) => ({
        id: `machine-${i + 100}`,
        computerDnsName: `DESKTOP-${i + 100}`,
        osPlatform: 'Windows10',
        osVersion: '10.0.19045',
        lastIpAddress: `192.168.2.${i}`,
        lastExternalIpAddress: `203.0.114.${i}`,
        healthStatus: 'Active',
        riskScore: 'Low',
        exposureLevel: 'Low',
        onboardingStatus: 'Onboarded',
        agentVersion: '10.8070.19041.1151',
        firstSeen: '2024-01-01T00:00:00Z',
        lastSeen: '2024-10-10T12:00:00Z',
      }));

      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: {
            value: batch1,
            '@odata.nextLink': 'https://api.securitycenter.microsoft.com/api/machines?$skiptoken=token123',
          },
        })
        .mockResolvedValueOnce({
          data: { value: batch2 },
        });

      const extractedData = await connector.extractResource('machines');
      expect(extractedData).toHaveLength(150);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Extract Alerts', () => {
    it('should extract alerts with severity and status filters', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          title: 'Suspicious PowerShell Activity',
          severity: 'High',
          status: 'New',
          category: 'Execution',
          detectionSource: 'EDR',
          machineId: 'machine-1',
          investigationState: 'PendingApproval',
          createdTime: '2024-10-10T10:00:00Z',
        },
        {
          id: 'alert-2',
          title: 'Ransomware Detection',
          severity: 'High',
          status: 'InProgress',
          category: 'Malware',
          detectionSource: 'AntiVirus',
          machineId: 'machine-2',
          investigationState: 'Running',
          createdTime: '2024-10-10T11:00:00Z',
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: { value: mockAlerts },
      });

      const extractedData = await connector.extractResource('alerts');
      expect(extractedData).toHaveLength(2);
      expect(extractedData[0].external_id).toBe('alert-1');
      expect(extractedData[0].data.severity).toBe('High');

      // Verify time range filter and severity/status filters
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/alerts',
        expect.objectContaining({
          params: expect.objectContaining({
            $top: 100,
            $filter: expect.stringContaining('alertCreationTime'),
          }),
        })
      );
    });

    it('should use custom time range for alerts', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { value: [] },
      });

      await connector.extractResource('alerts', {
        time_range_hours: 48,
      });

      // Time range should be 48 hours
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/alerts',
        expect.objectContaining({
          params: expect.objectContaining({
            $filter: expect.any(String),
          }),
        })
      );
    });
  });

  describe('Extract Vulnerabilities', () => {
    it('should extract vulnerabilities with severity filter', async () => {
      const mockVulnerabilities = [
        {
          id: 'vuln-1',
          cveId: 'CVE-2024-1234',
          severity: 'Critical',
          cvssV3: 9.8,
          exploitVerified: true,
          exposedMachines: 15,
          publishedOn: '2024-09-01T00:00:00Z',
          updatedOn: '2024-10-01T00:00:00Z',
          description: 'Remote code execution vulnerability',
          weaknesses: 2,
        },
        {
          id: 'vuln-2',
          cveId: 'CVE-2024-5678',
          severity: 'High',
          cvssV3: 7.5,
          exploitVerified: false,
          exposedMachines: 8,
          publishedOn: '2024-08-15T00:00:00Z',
          updatedOn: '2024-09-15T00:00:00Z',
          description: 'Privilege escalation vulnerability',
          weaknesses: 1,
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: { value: mockVulnerabilities },
      });

      const extractedData = await connector.extractResource('vulnerabilities');
      expect(extractedData).toHaveLength(2);
      expect(extractedData[0].external_id).toBe('vuln-1');
      expect(extractedData[0].data.cveId).toBe('CVE-2024-1234');
      expect(extractedData[0].data.exploitVerified).toBe(true);
    });

    it('should filter vulnerabilities by exploit verified', async () => {
      const configWithExploitFilter: ConnectorConfiguration = {
        ...baseConfig,
        connection: {
          ...baseConfig.connection,
          vulnerabilities: {
            severity: ['High', 'Critical'],
            exploit_verified: true,
          },
        },
      };

      const exploitConnector = new DefenderConnector(configWithExploitFilter);
      mockAxiosInstance.get.mockResolvedValue({
        data: { value: [] },
      });

      await exploitConnector.extractResource('vulnerabilities');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/vulnerabilities',
        expect.objectContaining({
          params: expect.objectContaining({
            $filter: expect.stringContaining('exploitVerified eq true'),
          }),
        })
      );
    });
  });

  describe('Extract Software', () => {
    it('should extract software inventory', async () => {
      const mockSoftware = [
        {
          id: 'software-1',
          name: 'Google Chrome',
          vendor: 'Google LLC',
          version: '118.0.5993.88',
          installedMachines: 245,
          weaknesses: 3,
          activeAlerts: 0,
          endOfSupportStatus: 'Supported',
        },
        {
          id: 'software-2',
          name: 'Adobe Acrobat Reader',
          vendor: 'Adobe Inc.',
          version: '23.006.20320',
          installedMachines: 189,
          weaknesses: 12,
          activeAlerts: 2,
          endOfSupportStatus: 'Supported',
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: { value: mockSoftware },
      });

      const extractedData = await connector.extractResource('software');
      expect(extractedData).toHaveLength(2);
      expect(extractedData[0].external_id).toBe('software-1');
      expect(extractedData[0].data.name).toBe('Google Chrome');
      expect(extractedData[0].data.installedMachines).toBe(245);
    });
  });

  describe('Transform Resources', () => {
    it('should transform machine to CMDB format', async () => {
      const machineData = {
        id: 'machine-1',
        computerDnsName: 'DESKTOP-001.corp.local',
        osPlatform: 'Windows10',
        osVersion: '10.0.19045',
        lastIpAddress: '192.168.1.100',
        lastExternalIpAddress: '203.0.113.1',
        healthStatus: 'Active',
        riskScore: 'Medium',
        exposureLevel: 'Medium',
        onboardingStatus: 'Onboarded',
        agentVersion: '10.8070.19041.1151',
        firstSeen: '2024-01-01T00:00:00Z',
        lastSeen: '2024-10-10T12:00:00Z',
        machineTags: ['Production', 'Finance'],
      };

      const transformedCI = await connector.transformResource('machines', machineData);

      expect(transformedCI.ci_type).toBe('server');
      expect(transformedCI.name).toBe('DESKTOP-001.corp.local');
      expect(transformedCI.status).toBe('active');
      expect(transformedCI.attributes.os_platform).toBe('Windows10');
      expect(transformedCI.attributes.risk_score).toBe('Medium');
      expect(transformedCI.attributes.machine_tags).toEqual(['Production', 'Finance']);
      expect(transformedCI.confidence_score).toBe(95);
      expect(transformedCI.source).toBe('defender');
    });

    it('should transform alert to CMDB format', async () => {
      const alertData = {
        id: 'alert-1',
        title: 'Suspicious PowerShell Activity',
        severity: 'High',
        status: 'New',
        category: 'Execution',
        detectionSource: 'EDR',
        machineId: 'machine-1',
        investigationState: 'PendingApproval',
        createdTime: '2024-10-10T10:00:00Z',
        classification: 'TruePositive',
        determination: 'Malware',
        description: 'Suspicious PowerShell commands detected',
      };

      const transformedCI = await connector.transformResource('alerts', alertData);

      expect(transformedCI.ci_type).toBe('alert');
      expect(transformedCI.name).toBe('Suspicious PowerShell Activity');
      expect(transformedCI.status).toBe('active'); // 'New' maps to 'active'
      expect(transformedCI.attributes.severity).toBe('High');
      expect(transformedCI.attributes.machine_id).toBe('machine-1');
      expect(transformedCI.attributes.investigation_state).toBe('PendingApproval');
      expect(transformedCI.confidence_score).toBe(100);
    });

    it('should transform vulnerability to CMDB format', async () => {
      const vulnData = {
        id: 'vuln-1',
        cveId: 'CVE-2024-1234',
        severity: 'Critical',
        cvssV3: 9.8,
        exploitVerified: true,
        exposedMachines: 15,
        publishedOn: '2024-09-01T00:00:00Z',
        updatedOn: '2024-10-01T00:00:00Z',
        description: 'Remote code execution vulnerability',
        weaknesses: 2,
      };

      const transformedCI = await connector.transformResource('vulnerabilities', vulnData);

      expect(transformedCI.ci_type).toBe('vulnerability');
      expect(transformedCI.name).toBe('CVE-2024-1234');
      expect(transformedCI.status).toBe('active'); // exploit verified = active
      expect(transformedCI.attributes.severity).toBe('Critical');
      expect(transformedCI.attributes.cvss_v3).toBe(9.8);
      expect(transformedCI.attributes.exploit_verified).toBe(true);
      expect(transformedCI.attributes.exposed_machines).toBe(15);
    });

    it('should transform software to CMDB format', async () => {
      const softwareData = {
        id: 'software-1',
        name: 'Google Chrome',
        vendor: 'Google LLC',
        version: '118.0.5993.88',
        installedMachines: 245,
        weaknesses: 3,
        activeAlerts: 0,
        endOfSupportStatus: 'Supported',
      };

      const transformedCI = await connector.transformResource('software', softwareData);

      expect(transformedCI.ci_type).toBe('software');
      expect(transformedCI.name).toBe('Google LLC Google Chrome 118.0.5993.88');
      expect(transformedCI.status).toBe('active'); // 'Supported' maps to 'active'
      expect(transformedCI.attributes.vendor).toBe('Google LLC');
      expect(transformedCI.attributes.software_name).toBe('Google Chrome');
      expect(transformedCI.attributes.installed_machines).toBe(245);
    });
  });

  describe('Extract Relationships', () => {
    it('should extract alert-to-machine relationships', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          title: 'Test Alert 1',
          severity: 'High',
          status: 'New',
          category: 'Execution',
          detectionSource: 'EDR',
          machineId: 'machine-1',
          investigationState: 'PendingApproval',
          createdTime: '2024-10-10T10:00:00Z',
        },
        {
          id: 'alert-2',
          title: 'Test Alert 2',
          severity: 'Medium',
          status: 'InProgress',
          category: 'Malware',
          detectionSource: 'AntiVirus',
          machineId: 'machine-2',
          investigationState: 'Running',
          createdTime: '2024-10-10T11:00:00Z',
        },
      ];

      // Mock alert extraction
      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: { value: mockAlerts } }) // alerts
        .mockResolvedValueOnce({ data: { value: [] } }) // vulnerabilities
        .mockResolvedValueOnce({ data: { value: [] } }); // software

      const relationships = await connector.extractRelationships();

      const alertRelationships = relationships.filter(
        (r) => r.relationship_type === 'DETECTED_ON'
      );
      expect(alertRelationships).toHaveLength(2);
      expect(alertRelationships[0].source_external_id).toBe('alert-1');
      expect(alertRelationships[0].target_external_id).toBe('machine-1');
      expect(alertRelationships[0].properties?.severity).toBe('High');
    });

    it('should extract vulnerability-to-machine relationships', async () => {
      const mockVulnerabilities = [
        {
          id: 'vuln-1',
          cveId: 'CVE-2024-1234',
          severity: 'Critical',
          cvssV3: 9.8,
          exploitVerified: true,
          exposedMachines: 2,
          publishedOn: '2024-09-01T00:00:00Z',
          updatedOn: '2024-10-01T00:00:00Z',
        },
      ];

      const mockMachineRefs = [
        { id: 'machine-1' },
        { id: 'machine-2' },
      ];

      // Mock vulnerability extraction and machine references
      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: { value: [] } }) // alerts
        .mockResolvedValueOnce({ data: { value: mockVulnerabilities } }) // vulnerabilities
        .mockResolvedValueOnce({ data: { value: mockMachineRefs } }) // machine refs for vuln-1
        .mockResolvedValueOnce({ data: { value: [] } }); // software

      const relationships = await connector.extractRelationships();

      const vulnRelationships = relationships.filter(
        (r) => r.relationship_type === 'AFFECTS'
      );
      expect(vulnRelationships).toHaveLength(2);
      expect(vulnRelationships[0].source_external_id).toBe('vuln-1');
      expect(vulnRelationships[0].properties?.severity).toBe('Critical');
      expect(vulnRelationships[0].properties?.cvss_score).toBe(9.8);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unknown resource', async () => {
      await expect(
        connector.extractResource('invalid_resource')
      ).rejects.toThrow('Unknown resource: invalid_resource');
    });

    it('should handle authentication errors gracefully', async () => {
      mockCredential.getToken.mockRejectedValue(new Error('Invalid client secret'));

      await expect(connector.initialize()).rejects.toThrow(
        'Azure AD authentication failed'
      );
    });

    it('should handle API rate limiting', async () => {
      mockAxiosInstance.get.mockRejectedValue({
        message: 'Rate limit exceeded',
        response: { status: 429, data: { error: 'Too many requests' } },
      });

      await expect(connector.extractResource('machines')).rejects.toThrow();
    });
  });

  describe('Resource Configuration', () => {
    it('should support custom resource configurations', async () => {
      const configWithResources: ConnectorConfiguration = {
        ...baseConfig,
        enabled_resources: ['machines', 'alerts'],
        resource_configs: {
          machines: {
            health_status_filter: "healthStatus eq 'Active'",
          },
          alerts: {
            time_range_hours: 48,
          },
        },
      };

      const customConnector = new DefenderConnector(configWithResources);
      expect(customConnector.getEnabledResources()).toEqual(['machines', 'alerts']);
    });
  });

  describe('Status Mapping', () => {
    it('should map machine health statuses correctly', async () => {
      const testCases = [
        { healthStatus: 'Active', expected: 'active' },
        { healthStatus: 'Inactive', expected: 'inactive' },
        { healthStatus: 'ImpairedCommunication', expected: 'maintenance' },
        { healthStatus: 'NoSensorData', expected: 'inactive' },
      ];

      for (const testCase of testCases) {
        const machineData = {
          id: 'test-machine',
          computerDnsName: 'TEST',
          osPlatform: 'Windows10',
          osVersion: '10.0',
          lastIpAddress: '192.168.1.1',
          lastExternalIpAddress: '203.0.113.1',
          healthStatus: testCase.healthStatus,
          riskScore: 'Low',
          exposureLevel: 'Low',
          onboardingStatus: 'Onboarded',
          agentVersion: '10.0',
          firstSeen: '2024-01-01T00:00:00Z',
          lastSeen: '2024-10-10T12:00:00Z',
        };

        const transformed = await connector.transformResource('machines', machineData);
        expect(transformed.status).toBe(testCase.expected);
      }
    });

    it('should map alert statuses correctly', async () => {
      const testCases = [
        { status: 'New', expected: 'active' },
        { status: 'InProgress', expected: 'active' },
        { status: 'Resolved', expected: 'inactive' },
      ];

      for (const testCase of testCases) {
        const alertData = {
          id: 'test-alert',
          title: 'Test Alert',
          severity: 'High',
          status: testCase.status,
          category: 'Test',
          detectionSource: 'EDR',
          machineId: 'machine-1',
          investigationState: 'Test',
          createdTime: '2024-10-10T10:00:00Z',
        };

        const transformed = await connector.transformResource('alerts', alertData);
        expect(transformed.status).toBe(testCase.expected);
      }
    });
  });
});
