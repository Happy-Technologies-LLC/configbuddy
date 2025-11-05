/**
 * Mock Cloud Provider SDKs
 *
 * TDD London School: Mock external cloud APIs to test discovery worker
 * behavior without making actual API calls.
 */

import { jest } from '@jest/globals';

/**
 * Mock AWS EC2 Client
 */
export const createMockEC2Client = () => {
  const mockSend = jest.fn();

  return {
    send: mockSend,
    config: {
      region: 'us-east-1',
    },
    destroy: jest.fn(),

    // Helper to mock specific command responses
    mockDescribeInstances: (instances: any[]) => {
      mockSend.mockResolvedValueOnce({
        Reservations: [
          {
            Instances: instances,
          },
        ],
      });
    },

    mockDescribeVolumes: (volumes: any[]) => {
      mockSend.mockResolvedValueOnce({
        Volumes: volumes,
      });
    },

    mockDescribeSecurityGroups: (groups: any[]) => {
      mockSend.mockResolvedValueOnce({
        SecurityGroups: groups,
      });
    },

    mockError: (error: Error) => {
      mockSend.mockRejectedValueOnce(error);
    },
  };
};

/**
 * Mock AWS RDS Client
 */
export const createMockRDSClient = () => {
  const mockSend = jest.fn();

  return {
    send: mockSend,
    config: {
      region: 'us-east-1',
    },
    destroy: jest.fn(),

    mockDescribeDBInstances: (instances: any[]) => {
      mockSend.mockResolvedValueOnce({
        DBInstances: instances,
      });
    },

    mockDescribeDBClusters: (clusters: any[]) => {
      mockSend.mockResolvedValueOnce({
        DBClusters: clusters,
      });
    },

    mockError: (error: Error) => {
      mockSend.mockRejectedValueOnce(error);
    },
  };
};

/**
 * Mock AWS S3 Client
 */
export const createMockS3Client = () => {
  const mockSend = jest.fn();

  return {
    send: mockSend,
    config: {
      region: 'us-east-1',
    },
    destroy: jest.fn(),

    mockListBuckets: (buckets: any[]) => {
      mockSend.mockResolvedValueOnce({
        Buckets: buckets,
      });
    },

    mockGetBucketLocation: (location: string) => {
      mockSend.mockResolvedValueOnce({
        LocationConstraint: location,
      });
    },

    mockError: (error: Error) => {
      mockSend.mockRejectedValueOnce(error);
    },
  };
};

/**
 * Mock Azure Compute Client
 */
export const createMockAzureComputeClient = () => ({
  virtualMachines: {
    list: jest.fn(),
    listAll: jest.fn(),
    get: jest.fn(),
    beginCreateOrUpdate: jest.fn(),
    beginDelete: jest.fn(),
  },
  disks: {
    list: jest.fn(),
    listAll: jest.fn(),
    get: jest.fn(),
  },
  availabilitySets: {
    list: jest.fn(),
    listAll: jest.fn(),
    get: jest.fn(),
  },

  // Helper methods for setting up responses
  mockListVirtualMachines: function(vms: any[]) {
    const asyncIterator = {
      [Symbol.asyncIterator]: async function* () {
        for (const vm of vms) {
          yield vm;
        }
      },
    };
    this.virtualMachines.listAll.mockReturnValue(asyncIterator);
  },

  mockError: function(error: Error) {
    this.virtualMachines.listAll.mockRejectedValue(error);
  },
});

/**
 * Mock GCP Compute Engine Client
 */
export const createMockGCPComputeClient = () => ({
  getInstances: jest.fn(),
  listInstances: jest.fn(),
  aggregatedListInstances: jest.fn(),
  close: jest.fn(),

  // Helper methods
  mockListInstances: function(instances: any[]) {
    this.listInstances.mockResolvedValue([instances, null, {}]);
  },

  mockAggregatedList: function(instancesByZone: Record<string, any[]>) {
    this.aggregatedListInstances.mockResolvedValue([instancesByZone, null, {}]);
  },

  mockError: function(error: Error) {
    this.listInstances.mockRejectedValue(error);
  },
});

/**
 * Mock SSH Client
 */
export const createMockSSHClient = () => ({
  connect: jest.fn(),
  exec: jest.fn(),
  execCommand: jest.fn(),
  dispose: jest.fn(),
  isConnected: jest.fn(),

  // Helper methods
  mockExecCommand: function(stdout: string, stderr: string = '', code: number = 0) {
    this.execCommand.mockResolvedValue({
      stdout,
      stderr,
      code,
    });
  },

  mockExecError: function(error: Error) {
    this.execCommand.mockRejectedValue(error);
  },

  mockConnectSuccess: function() {
    this.connect.mockResolvedValue(undefined);
    this.isConnected.mockReturnValue(true);
  },

  mockConnectFailure: function(error: Error) {
    this.connect.mockRejectedValue(error);
    this.isConnected.mockReturnValue(false);
  },
});

/**
 * Mock Nmap Scanner
 */
export const createMockNmapScanner = () => ({
  scan: jest.fn(),

  // Helper methods
  mockScanResults: function(hosts: any[]) {
    this.scan.mockImplementation((callback: Function) => {
      callback(null, hosts);
    });
  },

  mockScanError: function(error: Error) {
    this.scan.mockImplementation((callback: Function) => {
      callback(error, null);
    });
  },
});

/**
 * Combined cloud provider mock context
 */
export const createMockCloudContext = () => ({
  aws: {
    ec2: createMockEC2Client(),
    rds: createMockRDSClient(),
    s3: createMockS3Client(),
  },
  azure: {
    compute: createMockAzureComputeClient(),
  },
  gcp: {
    compute: createMockGCPComputeClient(),
  },
  ssh: createMockSSHClient(),
  nmap: createMockNmapScanner(),
});
