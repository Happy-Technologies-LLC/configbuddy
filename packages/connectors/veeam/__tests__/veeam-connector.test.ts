/**
 * Veeam Connector Unit Tests
 */

import VeeamConnector from '../src/index';
import { ConnectorConfiguration } from '@cmdb/integration-framework';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('VeeamConnector', () => {
  let connector: VeeamConnector;
  let config: ConnectorConfiguration;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup configuration
    config = {
      name: 'Test Veeam Connector',
      type: 'veeam',
      enabled: true,
      connection: {
        enterprise_manager_url: 'https://veeam-em.test.com:9398',
        username: 'testuser',
        password: 'testpass',
        verify_ssl: false,
      },
      enabled_resources: ['backup_servers', 'protected_vms', 'backup_jobs', 'repositories'],
    };

    // Mock axios.create to return a mocked instance
    const mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

    // Mock axios.post for session token acquisition
    mockedAxios.post.mockResolvedValue({
      data: { SessionId: 'test-session-token' },
      headers: { 'x-restsvcsessionid': 'test-session-token' },
    });

    connector = new VeeamConnector(config);
  });

  describe('Constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(connector).toBeInstanceOf(VeeamConnector);
      expect(connector.getConfig().name).toBe('Test Veeam Connector');
      expect(connector.getConfig().type).toBe('veeam');
    });

    it('should have correct enabled resources', () => {
      const enabledResources = connector.getEnabledResources();
      expect(enabledResources).toContain('backup_servers');
      expect(enabledResources).toContain('protected_vms');
      expect(enabledResources).toContain('backup_jobs');
      expect(enabledResources).toContain('repositories');
    });
  });

  describe('initialize()', () => {
    it('should successfully initialize and acquire session token', async () => {
      await connector.initialize();

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/sessionMngr'),
        null,
        expect.objectContaining({
          auth: {
            username: 'testuser',
            password: 'testpass',
          },
        })
      );
    });

    it('should throw error if authentication fails', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Authentication failed'));

      await expect(connector.initialize()).rejects.toThrow('Veeam authentication failed');
    });
  });

  describe('testConnection()', () => {
    it('should return success when connection is valid', async () => {
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.get as jest.Mock).mockResolvedValueOnce({
        data: { Refs: [] },
      });

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully connected');
    });

    it('should return failure when connection fails', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection failed');
    });
  });

  describe('extractResource() - backup_servers', () => {
    it('should extract backup servers successfully', async () => {
      const mockServers = {
        Refs: [
          {
            UID: 'server-1',
            Name: 'VeeamServer01',
            Description: 'Primary Backup Server',
            Port: 9392,
            Version: '12.0.0.1420',
          },
          {
            UID: 'server-2',
            Name: 'VeeamServer02',
            Description: 'Secondary Backup Server',
            Port: 9392,
            Version: '12.0.0.1420',
          },
        ],
      };

      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.get as jest.Mock).mockResolvedValueOnce({ data: mockServers });

      await connector.initialize();
      const extractedData = await connector.extractResource('backup_servers');

      expect(extractedData).toHaveLength(2);
      expect(extractedData[0].external_id).toBe('server-1');
      expect(extractedData[0].data.Name).toBe('VeeamServer01');
      expect(extractedData[0].source_type).toBe('veeam');
      expect(extractedData[1].external_id).toBe('server-2');
    });

    it('should handle empty backup servers response', async () => {
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.get as jest.Mock).mockResolvedValueOnce({ data: { Refs: [] } });

      await connector.initialize();
      const extractedData = await connector.extractResource('backup_servers');

      expect(extractedData).toHaveLength(0);
    });
  });

  describe('extractResource() - protected_vms', () => {
    it('should extract protected VMs successfully', async () => {
      const mockVMs = {
        Refs: [
          {
            UID: 'vm-1',
            Name: 'web-server-01',
            Path: '/Production/WebServers/web-server-01',
            Type: 'VM',
            Platform: 'VMware',
            VmHostName: 'esxi-host-01',
          },
          {
            UID: 'vm-2',
            Name: 'db-server-01',
            Path: '/Production/Databases/db-server-01',
            Type: 'VM',
            Platform: 'VMware',
            VmHostName: 'esxi-host-02',
          },
        ],
      };

      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.get as jest.Mock).mockResolvedValueOnce({ data: mockVMs });

      await connector.initialize();
      const extractedData = await connector.extractResource('protected_vms');

      expect(extractedData).toHaveLength(2);
      expect(extractedData[0].external_id).toBe('vm-1');
      expect(extractedData[0].data.Name).toBe('web-server-01');
      expect(extractedData[1].external_id).toBe('vm-2');
    });

    it('should pass custom filter to query', async () => {
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.get as jest.Mock).mockResolvedValueOnce({ data: { Refs: [] } });

      await connector.initialize();
      await connector.extractResource('protected_vms', {
        filter: 'Platform==VMware',
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            filter: 'Platform==VMware',
          }),
        })
      );
    });
  });

  describe('extractResource() - backup_jobs', () => {
    it('should extract backup jobs successfully', async () => {
      const mockJobs = {
        Refs: [
          {
            UID: 'job-1',
            Name: 'Daily VM Backup',
            JobType: 'Backup',
            Description: 'Daily backup of production VMs',
            ScheduleEnabled: true,
            ScheduleConfigured: true,
            BackupServerUid: 'server-1',
          },
          {
            UID: 'job-2',
            Name: 'Weekly Full Backup',
            JobType: 'Backup',
            Description: 'Weekly full backup',
            ScheduleEnabled: true,
            ScheduleConfigured: true,
            BackupServerUid: 'server-1',
          },
        ],
      };

      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.get as jest.Mock).mockResolvedValueOnce({ data: mockJobs });

      await connector.initialize();
      const extractedData = await connector.extractResource('backup_jobs');

      expect(extractedData).toHaveLength(2);
      expect(extractedData[0].external_id).toBe('job-1');
      expect(extractedData[0].data.JobType).toBe('Backup');
      expect(extractedData[1].external_id).toBe('job-2');
    });
  });

  describe('extractResource() - repositories', () => {
    it('should extract repositories successfully', async () => {
      const mockRepos = {
        Refs: [
          {
            UID: 'repo-1',
            Name: 'Repository-NAS',
            Description: 'Primary backup repository on NAS',
            Type: 'nfs',
            Path: '/mnt/veeam-backup',
            Capacity: 10995116277760,
            FreeSpace: 5497558138880,
            BackupServerUid: 'server-1',
          },
          {
            UID: 'repo-2',
            Name: 'Repository-SAN',
            Description: 'Secondary backup repository on SAN',
            Type: 'san',
            Capacity: 21990232555520,
            FreeSpace: 10995116277760,
            BackupServerUid: 'server-1',
          },
        ],
      };

      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.get as jest.Mock).mockResolvedValueOnce({ data: mockRepos });

      await connector.initialize();
      const extractedData = await connector.extractResource('repositories');

      expect(extractedData).toHaveLength(2);
      expect(extractedData[0].external_id).toBe('repo-1');
      expect(extractedData[0].data.Type).toBe('nfs');
      expect(extractedData[1].external_id).toBe('repo-2');
    });
  });

  describe('extractRelationships()', () => {
    it('should extract relationships between resources', async () => {
      const mockJobs = {
        Refs: [
          {
            UID: 'job-1',
            Name: 'Daily VM Backup',
            JobType: 'Backup',
            BackupServerUid: 'server-1',
          },
        ],
      };

      const mockRepos = {
        Refs: [
          {
            UID: 'repo-1',
            Name: 'Repository-NAS',
            Type: 'nfs',
            BackupServerUid: 'server-1',
          },
        ],
      };

      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.get as jest.Mock)
        .mockResolvedValueOnce({ data: mockJobs })
        .mockResolvedValueOnce({ data: mockRepos });

      await connector.initialize();
      const relationships = await connector.extractRelationships();

      expect(relationships.length).toBeGreaterThan(0);

      const jobToServerRel = relationships.find(
        r => r.source_external_id === 'job-1' && r.target_external_id === 'server-1'
      );
      expect(jobToServerRel).toBeDefined();
      expect(jobToServerRel?.relationship_type).toBe('RUNS_ON');

      const repoToServerRel = relationships.find(
        r => r.source_external_id === 'repo-1' && r.target_external_id === 'server-1'
      );
      expect(repoToServerRel).toBeDefined();
      expect(repoToServerRel?.relationship_type).toBe('MANAGED_BY');
    });
  });

  describe('transformResource() - backup_servers', () => {
    it('should transform backup server to CI format', async () => {
      const sourceData = {
        UID: 'server-1',
        Name: 'VeeamServer01',
        Description: 'Primary Backup Server',
        Port: 9392,
        Version: '12.0.0.1420',
      };

      await connector.initialize();
      const transformedCI = await connector.transformResource('backup_servers', sourceData);

      expect(transformedCI.name).toBe('VeeamServer01');
      expect(transformedCI.ci_type).toBe('server');
      expect(transformedCI.status).toBe('active');
      expect(transformedCI.environment).toBe('production');
      expect(transformedCI.source).toBe('veeam');
      expect(transformedCI.source_id).toBe('server-1');
      expect(transformedCI.confidence_score).toBe(95);
      expect(transformedCI.attributes.version).toBe('12.0.0.1420');
      expect(transformedCI.attributes.port).toBe(9392);
      expect(transformedCI.attributes.role).toBe('backup-server');
    });
  });

  describe('transformResource() - protected_vms', () => {
    it('should transform protected VM to CI format', async () => {
      const sourceData = {
        UID: 'vm-1',
        Name: 'web-prod-01',
        Path: '/Production/WebServers/web-prod-01',
        Type: 'VM',
        Platform: 'VMware',
        VmHostName: 'esxi-host-01',
      };

      await connector.initialize();
      const transformedCI = await connector.transformResource('protected_vms', sourceData);

      expect(transformedCI.name).toBe('web-prod-01');
      expect(transformedCI.ci_type).toBe('virtual-machine');
      expect(transformedCI.status).toBe('active');
      expect(transformedCI.environment).toBe('production'); // Inferred from name
      expect(transformedCI.source).toBe('veeam');
      expect(transformedCI.source_id).toBe('vm-1');
      expect(transformedCI.confidence_score).toBe(90);
      expect(transformedCI.attributes.platform).toBe('VMware');
      expect(transformedCI.attributes.backup_protected).toBe(true);
    });

    it('should infer environment from VM name', async () => {
      const testCases = [
        { name: 'server-prod-01', expected: 'production' },
        { name: 'app-staging-01', expected: 'staging' },
        { name: 'db-dev-01', expected: 'development' },
        { name: 'web-test-01', expected: 'test' },
        { name: 'generic-server', expected: 'production' },
      ];

      await connector.initialize();

      for (const testCase of testCases) {
        const sourceData = {
          UID: 'vm-test',
          Name: testCase.name,
          Type: 'VM',
        };

        const transformedCI = await connector.transformResource('protected_vms', sourceData);
        expect(transformedCI.environment).toBe(testCase.expected);
      }
    });
  });

  describe('transformResource() - backup_jobs', () => {
    it('should transform backup job to CI format', async () => {
      const sourceData = {
        UID: 'job-1',
        Name: 'Daily VM Backup',
        JobType: 'Backup',
        Description: 'Daily backup of production VMs',
        ScheduleEnabled: true,
        ScheduleConfigured: true,
        BackupServerUid: 'server-1',
      };

      await connector.initialize();
      const transformedCI = await connector.transformResource('backup_jobs', sourceData);

      expect(transformedCI.name).toBe('Daily VM Backup');
      expect(transformedCI.ci_type).toBe('application');
      expect(transformedCI.status).toBe('active'); // Because ScheduleEnabled is true
      expect(transformedCI.environment).toBe('production');
      expect(transformedCI.source).toBe('veeam');
      expect(transformedCI.confidence_score).toBe(100);
      expect(transformedCI.attributes.job_type).toBe('Backup');
      expect(transformedCI.attributes.application_type).toBe('backup-job');
    });

    it('should mark job as inactive when schedule is disabled', async () => {
      const sourceData = {
        UID: 'job-2',
        Name: 'Disabled Job',
        JobType: 'Backup',
        ScheduleEnabled: false,
        ScheduleConfigured: true,
      };

      await connector.initialize();
      const transformedCI = await connector.transformResource('backup_jobs', sourceData);

      expect(transformedCI.status).toBe('inactive');
    });
  });

  describe('transformResource() - repositories', () => {
    it('should transform repository to CI format', async () => {
      const sourceData = {
        UID: 'repo-1',
        Name: 'Repository-NAS',
        Description: 'Primary backup repository on NAS',
        Type: 'nfs',
        Path: '/mnt/veeam-backup',
        Capacity: 10995116277760,
        FreeSpace: 5497558138880,
        BackupServerUid: 'server-1',
      };

      await connector.initialize();
      const transformedCI = await connector.transformResource('repositories', sourceData);

      expect(transformedCI.name).toBe('Repository-NAS');
      expect(transformedCI.ci_type).toBe('storage');
      expect(transformedCI.status).toBe('active');
      expect(transformedCI.environment).toBe('production');
      expect(transformedCI.source).toBe('veeam');
      expect(transformedCI.confidence_score).toBe(100);
      expect(transformedCI.attributes.type).toBe('nfs');
      expect(transformedCI.attributes.capacity_bytes).toBe(10995116277760);
      expect(transformedCI.attributes.free_space_bytes).toBe(5497558138880);
      expect(transformedCI.attributes.used_space_bytes).toBe(5497558138880);
      expect(transformedCI.attributes.storage_type).toBe('backup-repository');
    });
  });

  describe('extractIdentifiers()', () => {
    it('should extract identification attributes correctly', () => {
      const data = {
        UID: 'test-uid-123',
        Name: 'TestServer01',
        Type: 'server',
      };

      const identifiers = connector.extractIdentifiers(data);

      expect(identifiers.external_id).toBe('test-uid-123');
      expect(identifiers.hostname).toBe('TestServer01');
      expect(identifiers.custom_identifiers?.veeam_uid).toBe('test-uid-123');
      expect(identifiers.custom_identifiers?.veeam_type).toBe('server');
    });
  });

  describe('cleanup()', () => {
    it('should close session on cleanup', async () => {
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.delete as jest.Mock).mockResolvedValueOnce({});

      await connector.initialize();
      await connector.cleanup();

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/api/sessionMngr');
    });

    it('should handle cleanup errors gracefully', async () => {
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.delete as jest.Mock).mockRejectedValueOnce(new Error('Session already expired'));

      await connector.initialize();
      await expect(connector.cleanup()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unknown resource', async () => {
      await connector.initialize();
      await expect(connector.extractResource('unknown_resource')).rejects.toThrow('Unknown resource');
    });

    it('should handle API errors during extraction', async () => {
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.get as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      await connector.initialize();
      await expect(connector.extractResource('backup_servers')).rejects.toThrow('API Error');
    });
  });
});
