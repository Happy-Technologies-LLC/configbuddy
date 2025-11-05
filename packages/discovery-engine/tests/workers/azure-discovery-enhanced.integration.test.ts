/**
 * Azure Discovery Worker - Enhanced Integration Tests
 *
 * Comprehensive integration tests covering:
 * - Async iteration over paginated Azure resources
 * - Resource group extraction and relationships
 * - Error handling for missing permissions
 * - Complex resource configurations
 * - Relationship inference across Azure resources
 */

import { AzureDiscoveryWorker } from '../../src/workers/azure-discovery.worker';
import { ComputeManagementClient } from '@azure/arm-compute';
import { SqlManagementClient } from '@azure/arm-sql';
import { StorageManagementClient } from '@azure/arm-storage';
import { DefaultAzureCredential } from '@azure/identity';

// Mock Azure clients
jest.mock('@azure/arm-compute');
jest.mock('@azure/arm-sql');
jest.mock('@azure/arm-storage');
jest.mock('@azure/identity');

describe('AzureDiscoveryWorker - Enhanced Integration Tests', () => {
  let worker: AzureDiscoveryWorker;
  let mockComputeClient: jest.Mocked<ComputeManagementClient>;
  let mockSqlClient: jest.Mocked<SqlManagementClient>;
  let mockStorageClient: jest.Mocked<StorageManagementClient>;

  const subscriptionId = 'test-subscription-id';

  beforeEach(() => {
    jest.clearAllMocks();

    mockComputeClient = new ComputeManagementClient(
      {} as any,
      subscriptionId
    ) as jest.Mocked<ComputeManagementClient>;
    mockSqlClient = new SqlManagementClient(
      {} as any,
      subscriptionId
    ) as jest.Mocked<SqlManagementClient>;
    mockStorageClient = new StorageManagementClient(
      {} as any,
      subscriptionId
    ) as jest.Mocked<StorageManagementClient>;

    worker = new AzureDiscoveryWorker(subscriptionId);
  });

  describe('Virtual Machine Discovery', () => {
    it('should discover VMs with full configuration details', async () => {
      const mockVMs = [
        {
          id: '/subscriptions/test-sub/resourceGroups/prod-rg/providers/Microsoft.Compute/virtualMachines/web-vm-01',
          name: 'web-vm-01',
          location: 'eastus',
          vmId: 'vm-guid-123',
          tags: {
            Environment: 'production',
            Application: 'web',
          },
          hardwareProfile: {
            vmSize: 'Standard_D2s_v3',
          },
          storageProfile: {
            osDisk: {
              name: 'web-vm-01-osdisk',
              osType: 'Linux',
              diskSizeGB: 128,
              caching: 'ReadWrite',
              createOption: 'FromImage',
              managedDisk: {
                id: '/subscriptions/test-sub/resourceGroups/prod-rg/providers/Microsoft.Compute/disks/web-vm-01-osdisk',
              },
            },
            dataDisks: [
              {
                name: 'web-vm-01-data-1',
                lun: 0,
                diskSizeGB: 512,
                caching: 'ReadOnly',
                createOption: 'Attach',
                managedDisk: {
                  id: '/subscriptions/test-sub/resourceGroups/prod-rg/providers/Microsoft.Compute/disks/web-vm-01-data-1',
                },
              },
            ],
            imageReference: {
              publisher: 'Canonical',
              offer: 'UbuntuServer',
              sku: '20.04-LTS',
              version: 'latest',
            },
          },
          networkProfile: {
            networkInterfaces: [
              {
                id: '/subscriptions/test-sub/resourceGroups/prod-rg/providers/Microsoft.Network/networkInterfaces/web-vm-01-nic',
                primary: true,
              },
            ],
          },
          provisioningState: 'Succeeded',
        },
      ];

      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          for (const vm of mockVMs) {
            yield vm;
          }
        },
      };

      mockComputeClient.virtualMachines = {
        listAll: jest.fn().mockReturnValue(mockIterator),
        instanceView: jest.fn().mockResolvedValue({
          statuses: [
            { code: 'PowerState/running' },
            { code: 'ProvisioningState/succeeded' },
          ],
        }),
      } as any;

      const result = await worker.discoverVirtualMachines('job-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'azure-vm-web-vm-01',
        external_id: 'vm-guid-123',
        name: 'web-vm-01',
        type: 'virtual-machine',
        status: 'active',
        environment: 'production',
      });
      expect(result[0].metadata.vm_size).toBe('Standard_D2s_v3');
      expect(result[0].metadata.os_type).toBe('Linux');
      expect(result[0].metadata.data_disks).toHaveLength(1);
    });

    it('should handle VMs without instance view (permissions issue)', async () => {
      const mockVMs = [
        {
          id: '/subscriptions/test-sub/resourceGroups/dev-rg/providers/Microsoft.Compute/virtualMachines/dev-vm',
          name: 'dev-vm',
          vmId: 'vm-dev-guid',
          tags: {},
        },
      ];

      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          for (const vm of mockVMs) {
            yield vm;
          }
        },
      };

      mockComputeClient.virtualMachines = {
        listAll: jest.fn().mockReturnValue(mockIterator),
        instanceView: jest
          .fn()
          .mockRejectedValue(new Error('Insufficient permissions')),
      } as any;

      const result = await worker.discoverVirtualMachines('job-123');

      expect(result).toHaveLength(1);
      expect(result[0].metadata.power_state).toBeUndefined();
    });

    it('should discover VMs in availability zones', async () => {
      const mockVMs = [
        {
          id: '/subscriptions/test-sub/resourceGroups/prod-rg/providers/Microsoft.Compute/virtualMachines/ha-vm-01',
          name: 'ha-vm-01',
          vmId: 'vm-ha-guid',
          zones: ['1'],
          tags: {},
        },
      ];

      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          for (const vm of mockVMs) {
            yield vm;
          }
        },
      };

      mockComputeClient.virtualMachines = {
        listAll: jest.fn().mockReturnValue(mockIterator),
        instanceView: jest.fn().mockResolvedValue({
          statuses: [{ code: 'PowerState/running' }],
        }),
      } as any;

      const result = await worker.discoverVirtualMachines('job-123');

      expect(result[0].metadata.availability_zone).toBe('1');
    });
  });

  describe('SQL Database Discovery', () => {
    it('should discover SQL databases with server and database details', async () => {
      const mockServers = [
        {
          id: '/subscriptions/test-sub/resourceGroups/data-rg/providers/Microsoft.Sql/servers/prod-sql-server',
          name: 'prod-sql-server',
          location: 'eastus',
          fullyQualifiedDomainName: 'prod-sql-server.database.windows.net',
          version: '12.0',
          administratorLogin: 'sqladmin',
          tags: {
            Environment: 'production',
          },
        },
      ];

      const mockDatabases = [
        {
          id: '/subscriptions/test-sub/resourceGroups/data-rg/providers/Microsoft.Sql/servers/prod-sql-server/databases/app-db',
          name: 'app-db',
          location: 'eastus',
          sku: {
            name: 'S2',
            tier: 'Standard',
            capacity: 50,
            family: null,
          },
          maxSizeBytes: 268435456000,
          collation: 'SQL_Latin1_General_CP1_CI_AS',
          creationDate: new Date('2024-01-01'),
          status: 'Online',
          databaseId: 'db-guid-123',
          zoneRedundant: false,
          tags: {
            Application: 'WebApp',
          },
        },
      ];

      const serversIterator = {
        [Symbol.asyncIterator]: async function* () {
          for (const server of mockServers) {
            yield server;
          }
        },
      };

      const databasesIterator = {
        [Symbol.asyncIterator]: async function* () {
          for (const db of mockDatabases) {
            yield db;
          }
        },
      };

      mockSqlClient.servers = {
        list: jest.fn().mockReturnValue(serversIterator),
      } as any;

      mockSqlClient.databases = {
        listByServer: jest.fn().mockReturnValue(databasesIterator),
      } as any;

      const result = await worker.discoverSqlDatabases('job-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'azure-sqldb-app-db',
        name: 'app-db',
        type: 'database',
        status: 'active',
        environment: 'production', // Inherited from server tags
      });
      expect(result[0].metadata.server_name).toBe('prod-sql-server');
      expect(result[0].metadata.server_fqdn).toBe(
        'prod-sql-server.database.windows.net'
      );
      expect(result[0].metadata.sku.tier).toBe('Standard');
    });

    it('should skip master database', async () => {
      const mockServers = [
        {
          id: '/subscriptions/test-sub/resourceGroups/data-rg/providers/Microsoft.Sql/servers/test-server',
          name: 'test-server',
          tags: {},
        },
      ];

      const mockDatabases = [
        { name: 'master', id: 'master-db-id' },
        {
          name: 'user-db',
          id: 'user-db-id',
          status: 'Online',
          tags: {},
        },
      ];

      const serversIterator = {
        [Symbol.asyncIterator]: async function* () {
          for (const server of mockServers) {
            yield server;
          }
        },
      };

      const databasesIterator = {
        [Symbol.asyncIterator]: async function* () {
          for (const db of mockDatabases) {
            yield db;
          }
        },
      };

      mockSqlClient.servers = {
        list: jest.fn().mockReturnValue(serversIterator),
      } as any;

      mockSqlClient.databases = {
        listByServer: jest.fn().mockReturnValue(databasesIterator),
      } as any;

      const result = await worker.discoverSqlDatabases('job-123');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('user-db');
    });
  });

  describe('Storage Account Discovery', () => {
    it('should discover storage accounts with network rules and encryption', async () => {
      const mockAccounts = [
        {
          id: '/subscriptions/test-sub/resourceGroups/storage-rg/providers/Microsoft.Storage/storageAccounts/prodstorage',
          name: 'prodstorage',
          location: 'eastus',
          kind: 'StorageV2',
          sku: {
            name: 'Standard_GRS',
            tier: 'Standard',
          },
          tags: {
            Environment: 'production',
          },
          provisioningState: 'Succeeded',
          primaryLocation: 'eastus',
          secondaryLocation: 'westus',
          statusOfPrimary: 'available',
          statusOfSecondary: 'available',
          enableHttpsTrafficOnly: true,
          minimumTlsVersion: 'TLS1_2',
          allowBlobPublicAccess: false,
          networkRuleSet: {
            defaultAction: 'Deny',
            bypass: 'AzureServices',
            ipRules: [
              {
                value: '203.0.113.0/24',
                action: 'Allow',
              },
            ],
            virtualNetworkRules: [
              {
                id: '/subscriptions/test-sub/resourceGroups/network-rg/providers/Microsoft.Network/virtualNetworks/prod-vnet/subnets/storage-subnet',
                action: 'Allow',
                state: 'Succeeded',
              },
            ],
          },
          encryption: {
            keySource: 'Microsoft.Storage',
            requireInfrastructureEncryption: true,
          },
          primaryEndpoints: {
            blob: 'https://prodstorage.blob.core.windows.net/',
            queue: 'https://prodstorage.queue.core.windows.net/',
            table: 'https://prodstorage.table.core.windows.net/',
            file: 'https://prodstorage.file.core.windows.net/',
          },
          creationTime: new Date('2024-01-01'),
        },
      ];

      const accountsIterator = {
        [Symbol.asyncIterator]: async function* () {
          for (const account of mockAccounts) {
            yield account;
          }
        },
      };

      mockStorageClient.storageAccounts = {
        list: jest.fn().mockReturnValue(accountsIterator),
        listKeys: jest.fn().mockResolvedValue({
          keys: [{ keyName: 'key1' }, { keyName: 'key2' }],
        }),
      } as any;

      const result = await worker.discoverStorageAccounts('job-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'azure-storage-prodstorage',
        name: 'prodstorage',
        type: 'storage',
        status: 'active',
        environment: 'production',
      });
      expect(result[0].metadata.https_only).toBe(true);
      expect(result[0].metadata.minimum_tls_version).toBe('TLS1_2');
      expect(result[0].metadata.network_rules.default_action).toBe('Deny');
      expect(result[0].metadata.keys_count).toBe(2);
    });

    it('should handle storage account key list failures gracefully', async () => {
      const mockAccounts = [
        {
          id: '/subscriptions/test-sub/resourceGroups/storage-rg/providers/Microsoft.Storage/storageAccounts/readstorage',
          name: 'readstorage',
          tags: {},
          provisioningState: 'Succeeded',
        },
      ];

      const accountsIterator = {
        [Symbol.asyncIterator]: async function* () {
          for (const account of mockAccounts) {
            yield account;
          }
        },
      };

      mockStorageClient.storageAccounts = {
        list: jest.fn().mockReturnValue(accountsIterator),
        listKeys: jest.fn().mockRejectedValue(new Error('Access denied')),
      } as any;

      const result = await worker.discoverStorageAccounts('job-123');

      expect(result).toHaveLength(1);
      expect(result[0].metadata.keys_count).toBe(0);
    });
  });

  describe('Relationship Inference', () => {
    it('should infer App Service to SQL Database relationship in same resource group', async () => {
      const appServiceCIs = [
        {
          id: 'azure-appservice-web-app',
          name: 'web-app',
          type: 'application',
          status: 'active',
          environment: 'production',
          metadata: {
            resource_group: 'prod-rg',
            connection_strings_count: 2,
          },
        },
      ];

      const sqlCIs = [
        {
          id: 'azure-sqldb-app-db',
          name: 'app-db',
          type: 'database',
          status: 'active',
          environment: 'production',
          metadata: {
            resource_group: 'prod-rg',
            server_name: 'prod-sql-server',
          },
        },
      ];

      const allCIs = [...appServiceCIs, ...sqlCIs];
      const relationships = worker.inferRelationships(allCIs);

      const appToDb = relationships.find(
        rel =>
          rel.from_id === 'azure-appservice-web-app' &&
          rel.to_id === 'azure-sqldb-app-db' &&
          rel.type === 'CONNECTS_TO'
      );

      expect(appToDb).toBeDefined();
      expect(appToDb?.properties.resource_group).toBe('prod-rg');
      expect(appToDb?.properties.confidence).toBe(0.7);
      expect(appToDb?.properties.inferred_from).toBe(
        'connection_strings_presence'
      );
    });

    it('should infer App Service to Storage relationship in same resource group', async () => {
      const appServiceCIs = [
        {
          id: 'azure-appservice-file-processor',
          name: 'file-processor',
          type: 'application',
          status: 'active',
          metadata: {
            resource_group: 'app-rg',
          },
        },
      ];

      const storageCIs = [
        {
          id: 'azure-storage-appstorage',
          name: 'appstorage',
          type: 'storage',
          status: 'active',
          metadata: {
            resource_group: 'app-rg',
          },
        },
      ];

      const allCIs = [...appServiceCIs, ...storageCIs];
      const relationships = worker.inferRelationships(allCIs);

      const appToStorage = relationships.find(
        rel =>
          rel.from_id === 'azure-appservice-file-processor' &&
          rel.to_id === 'azure-storage-appstorage' &&
          rel.type === 'USES'
      );

      expect(appToStorage).toBeDefined();
      expect(appToStorage?.properties.confidence).toBe(0.6);
    });

    it('should infer VM to Storage relationship for OS disk', async () => {
      const vmCIs = [
        {
          id: 'azure-vm-web-vm',
          name: 'web-vm',
          type: 'virtual-machine',
          status: 'active',
          metadata: {
            resource_group: 'compute-rg',
            os_disk: {
              managed_disk_id:
                '/subscriptions/test/resourceGroups/compute-rg/providers/Microsoft.Compute/disks/web-vm-osdisk',
            },
          },
        },
      ];

      const storageCIs = [
        {
          id: 'azure-storage-vmstorage',
          name: 'vmstorage',
          type: 'storage',
          status: 'active',
          metadata: {
            resource_group: 'compute-rg',
          },
        },
      ];

      const allCIs = [...vmCIs, ...storageCIs];
      const relationships = worker.inferRelationships(allCIs);

      const vmToStorage = relationships.find(
        rel =>
          rel.from_id === 'azure-vm-web-vm' &&
          rel.to_id === 'azure-storage-vmstorage' &&
          rel.type === 'USES'
      );

      expect(vmToStorage).toBeDefined();
      expect(vmToStorage?.properties.usage_type).toBe('os_disk');
      expect(vmToStorage?.properties.confidence).toBe(0.8);
    });
  });

  describe('Error Handling', () => {
    it('should handle discovery failures for individual resource types', async () => {
      const vmIterator = {
        [Symbol.asyncIterator]: async function* () {
          throw new Error('VM discovery failed');
        },
      };

      const sqlServersIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            id: '/subscriptions/test/resourceGroups/rg/providers/Microsoft.Sql/servers/server',
            name: 'test-server',
            tags: {},
          };
        },
      };

      const sqlDbIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            name: 'test-db',
            id: 'db-id',
            status: 'Online',
            tags: {},
          };
        },
      };

      mockComputeClient.virtualMachines = {
        listAll: jest.fn().mockReturnValue(vmIterator),
      } as any;

      mockSqlClient.servers = {
        list: jest.fn().mockReturnValue(sqlServersIterator),
      } as any;

      mockSqlClient.databases = {
        listByServer: jest.fn().mockReturnValue(sqlDbIterator),
      } as any;

      const storageIterator = {
        [Symbol.asyncIterator]: async function* () {},
      };

      mockStorageClient.storageAccounts = {
        list: jest.fn().mockReturnValue(storageIterator),
      } as any;

      const result = await worker.discoverAll('job-123', {});

      // Should get SQL results even though VM discovery failed
      expect(result.length).toBeGreaterThan(0);
      const dbCI = result.find(ci => ci.type === 'database');
      expect(dbCI).toBeDefined();
    });
  });

  describe('Resource Group Extraction', () => {
    it('should correctly extract resource group from Azure resource IDs', async () => {
      const testCases = [
        {
          resourceId:
            '/subscriptions/12345/resourceGroups/my-rg/providers/Microsoft.Compute/virtualMachines/vm1',
          expected: 'my-rg',
        },
        {
          resourceId:
            '/subscriptions/67890/resourceGroups/PROD-RG/providers/Microsoft.Storage/storageAccounts/storage1',
          expected: 'PROD-RG',
        },
        {
          resourceId:
            '/subscriptions/abc/resourcegroups/test-rg/providers/Microsoft.Sql/servers/server1',
          expected: 'test-rg',
        },
      ];

      for (const testCase of testCases) {
        const result = (worker as any).extractResourceGroup(
          testCase.resourceId
        );
        expect(result).toBe(testCase.expected);
      }
    });

    it('should return "unknown" for malformed resource IDs', async () => {
      const malformedIds = [
        '/invalid/resource/path',
        '',
        'not-a-resource-id',
      ];

      for (const id of malformedIds) {
        const result = (worker as any).extractResourceGroup(id);
        expect(result).toBe('unknown');
      }
    });
  });

  describe('Complete Discovery Flow', () => {
    it('should discover complete Azure infrastructure', async () => {
      const vmIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            id: '/subscriptions/test/resourceGroups/prod-rg/providers/Microsoft.Compute/virtualMachines/vm1',
            name: 'vm1',
            vmId: 'vm-guid',
            tags: { Environment: 'production' },
          };
        },
      };

      const sqlServersIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            id: '/subscriptions/test/resourceGroups/data-rg/providers/Microsoft.Sql/servers/sqlserver',
            name: 'sqlserver',
            tags: {},
          };
        },
      };

      const sqlDbIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            name: 'appdb',
            id: 'db-id',
            status: 'Online',
            tags: {},
          };
        },
      };

      const storageIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            id: '/subscriptions/test/resourceGroups/storage-rg/providers/Microsoft.Storage/storageAccounts/storage1',
            name: 'storage1',
            tags: {},
            provisioningState: 'Succeeded',
          };
        },
      };

      mockComputeClient.virtualMachines = {
        listAll: jest.fn().mockReturnValue(vmIterator),
        instanceView: jest.fn().mockResolvedValue({
          statuses: [{ code: 'PowerState/running' }],
        }),
      } as any;

      mockSqlClient.servers = {
        list: jest.fn().mockReturnValue(sqlServersIterator),
      } as any;

      mockSqlClient.databases = {
        listByServer: jest.fn().mockReturnValue(sqlDbIterator),
      } as any;

      mockStorageClient.storageAccounts = {
        list: jest.fn().mockReturnValue(storageIterator),
        listKeys: jest.fn().mockResolvedValue({ keys: [] }),
      } as any;

      const result = await worker.discoverAll('job-123', {});

      expect(result.length).toBeGreaterThanOrEqual(3);

      const types = new Set(result.map(ci => ci.type));
      expect(types.has('virtual-machine')).toBe(true);
      expect(types.has('database')).toBe(true);
      expect(types.has('storage')).toBe(true);

      // All should have discovery metadata
      result.forEach(ci => {
        expect(ci.discovery_job_id).toBe('job-123');
        expect(ci.discovery_provider).toBe('azure');
        expect(ci.confidence_score).toBe(1.0);
        expect(ci.discovered_at).toBeDefined();
      });
    });
  });
});
