/**
 * AWS Discovery Worker Tests
 *
 * Tests for AWS cloud resource discovery including:
 * - EC2 instances discovery
 * - RDS databases discovery
 * - S3 buckets discovery
 * - ECS resources discovery
 * - Lambda functions discovery
 * - Tag parsing and environment inference
 * - State mapping and confidence scoring
 */

import { AWSDiscoveryWorker } from '../../src/workers/aws-discovery.worker';
import {
  EC2Client,
  DescribeInstancesCommand,
} from '@aws-sdk/client-ec2';
import {
  RDSClient,
  DescribeDBInstancesCommand,
} from '@aws-sdk/client-rds';
import {
  S3Client,
  ListBucketsCommand,
} from '@aws-sdk/client-s3';
import {
  ECSClient,
  ListClustersCommand,
} from '@aws-sdk/client-ecs';
import {
  LambdaClient,
  ListFunctionsCommand,
} from '@aws-sdk/client-lambda';

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-ec2');
jest.mock('@aws-sdk/client-rds');
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/client-ecs');
jest.mock('@aws-sdk/client-lambda');

describe('AWSDiscoveryWorker', () => {
  let worker: AWSDiscoveryWorker;
  let mockEC2Client: jest.Mocked<EC2Client>;
  let mockRDSClient: jest.Mocked<RDSClient>;
  let mockS3Client: jest.Mocked<S3Client>;
  let mockECSClient: jest.Mocked<ECSClient>;
  let mockLambdaClient: jest.Mocked<LambdaClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock clients
    mockEC2Client = new EC2Client({}) as jest.Mocked<EC2Client>;
    mockRDSClient = new RDSClient({}) as jest.Mocked<RDSClient>;
    mockS3Client = new S3Client({}) as jest.Mocked<S3Client>;
    mockECSClient = new ECSClient({}) as jest.Mocked<ECSClient>;
    mockLambdaClient = new LambdaClient({}) as jest.Mocked<LambdaClient>;

    // Mock send method
    mockEC2Client.send = jest.fn();
    mockRDSClient.send = jest.fn();
    mockS3Client.send = jest.fn();
    mockECSClient.send = jest.fn();
    mockLambdaClient.send = jest.fn();

    // Create worker
    worker = new AWSDiscoveryWorker('us-east-1');
  });

  describe('Constructor', () => {
    it('should initialize with region and credentials', () => {
      const credentials = { accessKeyId: 'test', secretAccessKey: 'secret' };
      const customWorker = new AWSDiscoveryWorker('us-west-2', credentials);

      expect(customWorker).toBeDefined();
    });
  });

  describe('discoverEC2Instances', () => {
    it('should discover running EC2 instances', async () => {
      const mockInstances = {
        _Reservations: [
          {
            _Instances: [
              {
                _InstanceId: 'i-1234567890',
                _InstanceType: 't2.micro',
                _State: { Name: 'running' },
                _Placement: { AvailabilityZone: 'us-east-1a' },
                _VpcId: 'vpc-123',
                _SubnetId: 'subnet-123',
                _PrivateIpAddress: '10.0.1.5',
                _PublicIpAddress: '54.1.2.3',
                _LaunchTime: new Date('2025-01-01T00:00:00Z'),
                _Platform: 'Linux',
                _Architecture: 'x86_64',
                _Tags: [
                  { Key: 'Name', Value: 'Web Server 01' },
                  { Key: 'Environment', Value: 'production' },
                ],
              },
            ],
          },
        ],
      };

      mockEC2Client.send.mockResolvedValueOnce(mockInstances);

      const result = await worker.discoverEC2Instances('job-123');

      expect(mockEC2Client.send).toHaveBeenCalledWith(expect.any(DescribeInstancesCommand));
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        _id: 'aws-ec2-i-1234567890',
        _external_id: 'i-1234567890',
        _name: 'Web Server 01',
        _type: 'virtual-machine',
        _status: 'active',
        _environment: 'production',
        _discovery_job_id: 'job-123',
        _discovery_provider: 'aws',
        _confidence_score: 1.0,
      });
      expect(result[0].metadata.instance_type).toBe('t2.micro');
      expect(result[0].metadata.private_ip).toBe('10.0.1.5');
    });

    it('should handle instances without Name tag', async () => {
      const mockInstances = {
        _Reservations: [
          {
            _Instances: [
              {
                _InstanceId: 'i-noname',
                _State: { Name: 'running' },
                _Tags: [],
              },
            ],
          },
        ],
      };

      mockEC2Client.send.mockResolvedValueOnce(mockInstances);

      const result = await worker.discoverEC2Instances('job-123');

      expect(result[0].name).toBe('i-noname');
    });

    it('should map stopped instances to inactive status', async () => {
      const mockInstances = {
        _Reservations: [
          {
            _Instances: [
              {
                _InstanceId: 'i-stopped',
                _State: { Name: 'stopped' },
                _Tags: [],
              },
            ],
          },
        ],
      };

      mockEC2Client.send.mockResolvedValueOnce(mockInstances);

      const result = await worker.discoverEC2Instances('job-123');

      expect(result[0].status).toBe('inactive');
    });

    it('should map terminated instances to decommissioned status', async () => {
      const mockInstances = {
        _Reservations: [
          {
            _Instances: [
              {
                _InstanceId: 'i-terminated',
                _State: { Name: 'terminated' },
                _Tags: [],
              },
            ],
          },
        ],
      };

      mockEC2Client.send.mockResolvedValueOnce(mockInstances);

      const result = await worker.discoverEC2Instances('job-123');

      expect(result[0].status).toBe('decommissioned');
    });

    it('should handle empty reservations', async () => {
      mockEC2Client.send.mockResolvedValueOnce({ Reservations: [] });

      const result = await worker.discoverEC2Instances('job-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('discoverRDSInstances', () => {
    it('should discover available RDS databases', async () => {
      const mockDBInstances = {
        _DBInstances: [
          {
            _DBInstanceIdentifier: 'prod-postgres-01',
            _DbiResourceId: 'db-ABC123',
            _DBInstanceStatus: 'available',
            _Engine: 'postgres',
            _EngineVersion: '14.5',
            _DBInstanceClass: 'db.t3.medium',
            _AllocatedStorage: 100,
            _Endpoint: {
              _Address: 'prod-postgres-01.abc.us-east-1.rds.amazonaws.com',
              _Port: 5432,
            },
            _AvailabilityZone: 'us-east-1a',
            _MultiAZ: true,
            _PubliclyAccessible: false,
            _StorageEncrypted: true,
            _InstanceCreateTime: new Date('2025-01-01T00:00:00Z'),
            _TagList: [
              { Key: 'Environment', Value: 'production' },
            ],
          },
        ],
      };

      mockRDSClient.send.mockResolvedValueOnce(mockDBInstances);

      const result = await worker.discoverRDSInstances('job-123');

      expect(mockRDSClient.send).toHaveBeenCalledWith(expect.any(DescribeDBInstancesCommand));
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        _id: 'aws-rds-prod-postgres-01',
        _name: 'prod-postgres-01',
        _type: 'database',
        _status: 'active',
        _environment: 'production',
      });
      expect(result[0].metadata.engine).toBe('postgres');
      expect(result[0].metadata.multi_az).toBe(true);
    });

    it('should map maintenance status correctly', async () => {
      const mockDBInstances = {
        _DBInstances: [
          {
            _DBInstanceIdentifier: 'maint-db',
            _DBInstanceStatus: 'maintenance',
            _TagList: [],
          },
        ],
      };

      mockRDSClient.send.mockResolvedValueOnce(mockDBInstances);

      const result = await worker.discoverRDSInstances('job-123');

      expect(result[0].status).toBe('maintenance');
    });
  });

  describe('discoverS3Buckets', () => {
    it('should discover S3 buckets', async () => {
      const mockBuckets = {
        _Buckets: [
          {
            _Name: 'my-app-assets',
            _CreationDate: new Date('2024-01-01T00:00:00Z'),
          },
          {
            _Name: 'backup-bucket',
            _CreationDate: new Date('2024-06-01T00:00:00Z'),
          },
        ],
      };

      mockS3Client.send.mockResolvedValueOnce(mockBuckets);

      const result = await worker.discoverS3Buckets('job-123');

      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(ListBucketsCommand));
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        _id: 'aws-s3-my-app-assets',
        _external_id: 'my-app-assets',
        _name: 'my-app-assets',
        _type: 'storage',
        _status: 'active',
        _confidence_score: 1.0,
      });
    });

    it('should handle empty bucket list', async () => {
      mockS3Client.send.mockResolvedValueOnce({ Buckets: [] });

      const result = await worker.discoverS3Buckets('job-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('discoverECSResources', () => {
    it('should discover ECS clusters', async () => {
      const mockClusters = {
        _clusterArns: [
          'arn:aws:ecs:us-east-1:123456789012:cluster/production-cluster',
          'arn:aws:ecs:us-east-1:123456789012:cluster/staging-cluster',
        ],
      };

      mockECSClient.send.mockResolvedValueOnce(mockClusters);

      const result = await worker.discoverECSResources('job-123');

      expect(mockECSClient.send).toHaveBeenCalledWith(expect.any(ListClustersCommand));
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        _id: 'aws-ecs-cluster-production-cluster',
        _name: 'production-cluster',
        _type: 'cloud-resource',
        _status: 'active',
      });
      expect(result[0].metadata.resource_type).toBe('ecs-cluster');
    });
  });

  describe('discoverLambdaFunctions', () => {
    it('should discover Lambda functions', async () => {
      const mockFunctions = {
        _Functions: [
          {
            _FunctionName: 'api-handler',
            _FunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:api-handler',
            _Runtime: 'nodejs18.x',
            _Handler: 'index.handler',
            _CodeSize: 1024000,
            _Timeout: 30,
            _MemorySize: 512,
            _LastModified: '2025-01-15T10:00:00Z',
            _State: 'Active',
            _Tags: {
              _Environment: 'production',
            },
          },
        ],
      };

      mockLambdaClient.send.mockResolvedValueOnce(mockFunctions);

      const result = await worker.discoverLambdaFunctions('job-123');

      expect(mockLambdaClient.send).toHaveBeenCalledWith(expect.any(ListFunctionsCommand));
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        _id: 'aws-lambda-api-handler',
        _name: 'api-handler',
        _type: 'application',
        _status: 'active',
        _environment: 'production',
      });
      expect(result[0].metadata.runtime).toBe('nodejs18.x');
      expect(result[0].metadata.timeout).toBe(30);
    });

    it('should map inactive Lambda state', async () => {
      const mockFunctions = {
        _Functions: [
          {
            _FunctionName: 'inactive-func',
            _State: 'Inactive',
            _Tags: {},
          },
        ],
      };

      mockLambdaClient.send.mockResolvedValueOnce(mockFunctions);

      const result = await worker.discoverLambdaFunctions('job-123');

      expect(result[0].status).toBe('inactive');
    });
  });

  describe('discoverAll', () => {
    it('should discover all AWS resources in parallel', async () => {
      mockEC2Client.send.mockResolvedValueOnce({ Reservations: [] });
      mockRDSClient.send.mockResolvedValueOnce({ DBInstances: [] });
      mockS3Client.send.mockResolvedValueOnce({ Buckets: [] });
      mockECSClient.send.mockResolvedValueOnce({ clusterArns: [] });
      mockLambdaClient.send.mockResolvedValueOnce({ Functions: [] });

      const result = await worker.discoverAll('job-123', {});

      expect(mockEC2Client.send).toHaveBeenCalled();
      expect(mockRDSClient.send).toHaveBeenCalled();
      expect(mockS3Client.send).toHaveBeenCalled();
      expect(mockECSClient.send).toHaveBeenCalled();
      expect(mockLambdaClient.send).toHaveBeenCalled();
      expect(result).toHaveLength(0);
    });

    it('should continue discovery even if one service fails', async () => {
      mockEC2Client.send.mockRejectedValueOnce(new Error('EC2 API error'));
      mockRDSClient.send.mockResolvedValueOnce({
        _DBInstances: [
          {
            _DBInstanceIdentifier: 'test-db',
            _TagList: [],
          },
        ],
      });
      mockS3Client.send.mockResolvedValueOnce({ Buckets: [] });
      mockECSClient.send.mockResolvedValueOnce({ clusterArns: [] });
      mockLambdaClient.send.mockResolvedValueOnce({ Functions: [] });

      const result = await worker.discoverAll('job-123', {});

      // Should still get RDS result even though EC2 failed
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('database');
    });
  });

  describe('inferEnvironment', () => {
    it('should infer production from various tag formats', () => {
      const testCases = [
        { Environment: 'production' },
        { environment: 'prod' },
        { Env: 'prd' },
        { env: 'PRODUCTION' },
      ];

      testCases.forEach(tags => {
        const worker = new AWSDiscoveryWorker('us-east-1');
        const result = (worker as any).inferEnvironment(tags);
        expect(result).toBe('production');
      });
    });

    it('should infer staging environment', () => {
      const testCases = [
        { Environment: 'staging' },
        { Environment: 'stage' },
        { Environment: 'stg' },
      ];

      testCases.forEach(tags => {
        const worker = new AWSDiscoveryWorker('us-east-1');
        const result = (worker as any).inferEnvironment(tags);
        expect(result).toBe('staging');
      });
    });

    it('should infer development environment', () => {
      const testCases = [
        { Environment: 'development' },
        { Environment: 'dev' },
      ];

      testCases.forEach(tags => {
        const worker = new AWSDiscoveryWorker('us-east-1');
        const result = (worker as any).inferEnvironment(tags);
        expect(result).toBe('development');
      });
    });

    it('should return undefined for unknown environments', () => {
      const worker = new AWSDiscoveryWorker('us-east-1');
      const result = (worker as any).inferEnvironment({ Environment: 'unknown' });
      expect(result).toBeUndefined();
    });

    it('should return undefined when no environment tag exists', () => {
      const worker = new AWSDiscoveryWorker('us-east-1');
      const result = (worker as any).inferEnvironment({ Name: 'server' });
      expect(result).toBeUndefined();
    });
  });

  describe('parseTags', () => {
    it('should parse AWS tags to key-value object', () => {
      const worker = new AWSDiscoveryWorker('us-east-1');
      const awsTags = [
        { Key: 'Name', Value: 'Server01' },
        { Key: 'Owner', Value: 'DevOps' },
        { Key: 'CostCenter', Value: 'Engineering' },
      ];

      const result = (worker as any).parseTags(awsTags);

      expect(result).toEqual({
        _Name: 'Server01',
        _Owner: 'DevOps',
        _CostCenter: 'Engineering',
      });
    });

    it('should handle empty tag array', () => {
      const worker = new AWSDiscoveryWorker('us-east-1');
      const result = (worker as any).parseTags([]);

      expect(result).toEqual({});
    });
  });
});
