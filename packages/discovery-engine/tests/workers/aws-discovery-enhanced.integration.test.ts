/**
 * AWS Discovery Worker - Enhanced Integration Tests
 *
 * Comprehensive integration tests covering:
 * - Pagination handling with large datasets
 * - Error handling and retry logic
 * - Network failures and timeouts
 * - Relationship inference
 * - Edge cases (empty results, malformed data)
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
  GetBucketVersioningCommand,
  GetBucketEncryptionCommand,
  GetBucketLifecycleConfigurationCommand,
  GetBucketTaggingCommand,
} from '@aws-sdk/client-s3';
import {
  ECSClient,
  ListClustersCommand,
  DescribeClustersCommand,
  ListServicesCommand,
  DescribeServicesCommand,
} from '@aws-sdk/client-ecs';
import {
  LambdaClient,
  ListFunctionsCommand,
  GetFunctionCommand,
} from '@aws-sdk/client-lambda';

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-ec2');
jest.mock('@aws-sdk/client-rds');
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/client-ecs');
jest.mock('@aws-sdk/client-lambda');

describe('AWSDiscoveryWorker - Enhanced Integration Tests', () => {
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

    worker = new AWSDiscoveryWorker('us-east-1');
  });

  describe('Pagination Handling', () => {
    it('should handle paginated EC2 results across multiple pages', async () => {
      const page1 = {
        Reservations: [
          {
            Instances: [
              {
                InstanceId: 'i-page1-1',
                State: { Name: 'running' },
                Tags: [{ Key: 'Name', Value: 'Server 1' }],
              },
              {
                InstanceId: 'i-page1-2',
                State: { Name: 'running' },
                Tags: [{ Key: 'Name', Value: 'Server 2' }],
              },
            ],
          },
        ],
        NextToken: 'token-page2',
      };

      const page2 = {
        Reservations: [
          {
            Instances: [
              {
                InstanceId: 'i-page2-1',
                State: { Name: 'running' },
                Tags: [{ Key: 'Name', Value: 'Server 3' }],
              },
            ],
          },
        ],
        NextToken: 'token-page3',
      };

      const page3 = {
        Reservations: [
          {
            Instances: [
              {
                InstanceId: 'i-page3-1',
                State: { Name: 'running' },
                Tags: [{ Key: 'Name', Value: 'Server 4' }],
              },
            ],
          },
        ],
        // No NextToken = last page
      };

      mockEC2Client.send
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2)
        .mockResolvedValueOnce(page3);

      const result = await worker.discoverEC2Instances('job-123');

      expect(result).toHaveLength(4);
      expect(mockEC2Client.send).toHaveBeenCalledTimes(3);
      expect(result.map(ci => ci.external_id)).toEqual([
        'i-page1-1',
        'i-page1-2',
        'i-page2-1',
        'i-page3-1',
      ]);
    });

    it('should handle paginated RDS results', async () => {
      const page1 = {
        DBInstances: [
          {
            DBInstanceIdentifier: 'db-1',
            DBInstanceStatus: 'available',
            TagList: [],
          },
          {
            DBInstanceIdentifier: 'db-2',
            DBInstanceStatus: 'available',
            TagList: [],
          },
        ],
        Marker: 'marker-page2',
      };

      const page2 = {
        DBInstances: [
          {
            DBInstanceIdentifier: 'db-3',
            DBInstanceStatus: 'available',
            TagList: [],
          },
        ],
        // No Marker = last page
      };

      mockRDSClient.send
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);

      const result = await worker.discoverRDSInstances('job-123');

      expect(result).toHaveLength(3);
      expect(mockRDSClient.send).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling and Retries', () => {
    it('should retry on transient EC2 API failures', async () => {
      // First attempt fails with throttling
      const throttlingError = Object.assign(new Error('RequestLimitExceeded'), {
        name: 'RequestLimitExceeded',
        $metadata: { httpStatusCode: 429 },
      });

      // Second attempt fails with network timeout
      const networkError = Object.assign(new Error('Network timeout'), {
        name: 'NetworkingError',
      });

      // Third attempt succeeds
      const successResponse = {
        Reservations: [
          {
            Instances: [
              {
                InstanceId: 'i-success',
                State: { Name: 'running' },
                Tags: [],
              },
            ],
          },
        ],
      };

      mockEC2Client.send
        .mockRejectedValueOnce(throttlingError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(successResponse);

      const result = await worker.discoverEC2Instances('job-123');

      expect(result).toHaveLength(1);
      expect(mockEC2Client.send).toHaveBeenCalledTimes(3);
      expect(result[0].external_id).toBe('i-success');
    });

    it('should fail after max retry attempts', async () => {
      const persistentError = new Error('Persistent API failure');

      mockEC2Client.send
        .mockRejectedValueOnce(persistentError)
        .mockRejectedValueOnce(persistentError)
        .mockRejectedValueOnce(persistentError);

      await expect(worker.discoverEC2Instances('job-123')).rejects.toThrow(
        'Persistent API failure'
      );

      expect(mockEC2Client.send).toHaveBeenCalledTimes(3);
    });

    it('should handle S3 access denied gracefully for bucket details', async () => {
      const mockBuckets = {
        Buckets: [
          {
            Name: 'accessible-bucket',
            CreationDate: new Date('2024-01-01'),
          },
          {
            Name: 'restricted-bucket',
            CreationDate: new Date('2024-01-01'),
          },
        ],
      };

      const accessDeniedError = Object.assign(new Error('Access Denied'), {
        name: 'AccessDenied',
        $metadata: { httpStatusCode: 403 },
      });

      mockS3Client.send
        .mockResolvedValueOnce(mockBuckets) // ListBuckets
        .mockResolvedValueOnce({ Status: 'Enabled' }) // GetBucketVersioning for bucket 1
        .mockResolvedValueOnce({}) // GetBucketEncryption for bucket 1
        .mockResolvedValueOnce({}) // GetBucketLifecycle for bucket 1
        .mockResolvedValueOnce({}) // GetBucketTagging for bucket 1
        .mockRejectedValueOnce(accessDeniedError) // GetBucketVersioning for bucket 2
        .mockRejectedValueOnce(accessDeniedError) // GetBucketEncryption for bucket 2
        .mockRejectedValueOnce(accessDeniedError) // GetBucketLifecycle for bucket 2
        .mockRejectedValueOnce(accessDeniedError); // GetBucketTagging for bucket 2

      const result = await worker.discoverS3Buckets('job-123');

      // Both buckets should be discovered, even if one has access denied for details
      expect(result).toHaveLength(2);
      expect(result.map(ci => ci.name)).toContain('accessible-bucket');
      expect(result.map(ci => ci.name)).toContain('restricted-bucket');
    });
  });

  describe('Relationship Inference', () => {
    it('should infer EC2 to RDS relationships via shared security groups', async () => {
      const ec2WithSG = {
        Reservations: [
          {
            Instances: [
              {
                InstanceId: 'i-web-server',
                State: { Name: 'running' },
                Tags: [{ Key: 'Name', Value: 'Web Server' }],
                SecurityGroups: [
                  { GroupId: 'sg-shared-123', GroupName: 'web-sg' },
                ],
              },
            ],
          },
        ],
      };

      const rdsWithSG = {
        DBInstances: [
          {
            DBInstanceIdentifier: 'prod-postgres',
            DBInstanceStatus: 'available',
            VpcSecurityGroups: [
              { VpcSecurityGroupId: 'sg-shared-123', Status: 'active' },
            ],
            TagList: [],
          },
        ],
      };

      mockEC2Client.send.mockResolvedValueOnce(ec2WithSG);
      mockRDSClient.send.mockResolvedValueOnce(rdsWithSG);

      const ec2Results = await worker.discoverEC2Instances('job-123');
      const rdsResults = await worker.discoverRDSInstances('job-123');

      const allCIs = [...ec2Results, ...rdsResults];
      const relationships = worker.inferRelationships(allCIs);

      expect(relationships.length).toBeGreaterThan(0);
      const ec2ToRds = relationships.find(
        rel =>
          rel.from_id === 'aws-ec2-i-web-server' &&
          rel.to_id === 'aws-rds-prod-postgres' &&
          rel.type === 'CONNECTS_TO'
      );

      expect(ec2ToRds).toBeDefined();
      expect(ec2ToRds?.properties.security_group).toBe('sg-shared-123');
      expect(ec2ToRds?.properties.confidence).toBe(0.8);
    });

    it('should infer Lambda to S3 relationships based on environment variables', async () => {
      const lambdaWithBucket = {
        Functions: [
          {
            FunctionName: 'process-uploads',
            FunctionArn: 'arn:aws:lambda:us-east-1:123:function:process-uploads',
            State: 'Active',
            Tags: {},
          },
        ],
      };

      const lambdaDetails = {
        Configuration: {
          FunctionName: 'process-uploads',
          FunctionArn: 'arn:aws:lambda:us-east-1:123:function:process-uploads',
          State: 'Active',
          Environment: {
            Variables: {
              UPLOAD_BUCKET: 'my-uploads-bucket',
              STORAGE_BUCKET: 'my-storage',
            },
          },
        },
        Tags: {},
      };

      const s3Buckets = {
        Buckets: [
          { Name: 'my-uploads-bucket', CreationDate: new Date() },
          { Name: 'my-storage', CreationDate: new Date() },
        ],
      };

      mockLambdaClient.send
        .mockResolvedValueOnce(lambdaWithBucket)
        .mockResolvedValueOnce(lambdaDetails);

      mockS3Client.send.mockResolvedValueOnce(s3Buckets);

      const lambdaResults = await worker.discoverLambdaFunctions('job-123');
      const s3Results = await worker.discoverS3Buckets('job-123');

      const allCIs = [...lambdaResults, ...s3Results];
      const relationships = worker.inferRelationships(allCIs);

      const lambdaToS3 = relationships.filter(
        rel =>
          rel.from_id === 'aws-lambda-process-uploads' && rel.type === 'USES'
      );

      expect(lambdaToS3.length).toBeGreaterThanOrEqual(2);
    });

    it('should infer ECS service to cluster PART_OF relationship', async () => {
      const clusters = {
        clusterArns: ['arn:aws:ecs:us-east-1:123:cluster/production'],
      };

      const clusterDetails = {
        clusters: [
          {
            clusterName: 'production',
            clusterArn: 'arn:aws:ecs:us-east-1:123:cluster/production',
            status: 'ACTIVE',
            tags: [],
          },
        ],
      };

      const services = {
        serviceArns: ['arn:aws:ecs:us-east-1:123:service/production/web-app'],
      };

      const serviceDetails = {
        services: [
          {
            serviceName: 'web-app',
            serviceArn: 'arn:aws:ecs:us-east-1:123:service/production/web-app',
            clusterArn: 'arn:aws:ecs:us-east-1:123:cluster/production',
            status: 'ACTIVE',
            tags: [],
          },
        ],
      };

      mockECSClient.send
        .mockResolvedValueOnce(clusters)
        .mockResolvedValueOnce(clusterDetails)
        .mockResolvedValueOnce(services)
        .mockResolvedValueOnce(serviceDetails);

      const ecsResults = await worker.discoverECSResources('job-123');
      const relationships = worker.inferRelationships(ecsResults);

      const serviceToCluster = relationships.find(
        rel =>
          rel.from_id === 'aws-ecs-service-web-app' &&
          rel.to_id === 'aws-ecs-cluster-production' &&
          rel.type === 'PART_OF'
      );

      expect(serviceToCluster).toBeDefined();
      expect(serviceToCluster?.properties.confidence).toBe(1.0);
    });

    it('should infer RDS read replica dependencies', async () => {
      const rdsWithReplicas = {
        DBInstances: [
          {
            DBInstanceIdentifier: 'primary-db',
            DbiResourceId: 'db-primary-123',
            DBInstanceStatus: 'available',
            ReadReplicaDBInstanceIdentifiers: ['db-replica-456'],
            TagList: [],
          },
          {
            DBInstanceIdentifier: 'replica-db',
            DbiResourceId: 'db-replica-456',
            DBInstanceStatus: 'available',
            ReadReplicaSourceDBInstanceIdentifier: 'db-primary-123',
            TagList: [],
          },
        ],
      };

      mockRDSClient.send.mockResolvedValueOnce(rdsWithReplicas);

      const rdsResults = await worker.discoverRDSInstances('job-123');
      const relationships = worker.inferRelationships(rdsResults);

      const replicaDependency = relationships.find(
        rel =>
          rel.from_id === 'aws-rds-replica-db' &&
          rel.to_id === 'aws-rds-primary-db' &&
          rel.type === 'DEPENDS_ON'
      );

      expect(replicaDependency).toBeDefined();
      expect(replicaDependency?.properties.relationship_type).toBe(
        'read_replica'
      );
      expect(replicaDependency?.properties.confidence).toBe(1.0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle instances with complex network configurations', async () => {
      const complexInstance = {
        Reservations: [
          {
            Instances: [
              {
                InstanceId: 'i-complex',
                State: { Name: 'running' },
                Tags: [],
                NetworkInterfaces: [
                  {
                    NetworkInterfaceId: 'eni-1',
                    PrivateIpAddress: '10.0.1.10',
                    Association: { PublicIp: '54.1.2.3' },
                    SubnetId: 'subnet-1',
                    VpcId: 'vpc-1',
                    Groups: [
                      { GroupId: 'sg-1' },
                      { GroupId: 'sg-2' },
                      { GroupId: 'sg-3' },
                    ],
                  },
                  {
                    NetworkInterfaceId: 'eni-2',
                    PrivateIpAddress: '10.0.2.10',
                    SubnetId: 'subnet-2',
                    VpcId: 'vpc-1',
                    Groups: [{ GroupId: 'sg-4' }],
                  },
                ],
              },
            ],
          },
        ],
      };

      mockEC2Client.send.mockResolvedValueOnce(complexInstance);

      const result = await worker.discoverEC2Instances('job-123');

      expect(result).toHaveLength(1);
      expect(result[0].metadata.network_interfaces).toHaveLength(2);
      expect(result[0].metadata.network_interfaces[0].security_groups).toEqual([
        'sg-1',
        'sg-2',
        'sg-3',
      ]);
    });

    it('should handle Lambda with VPC configuration', async () => {
      const lambdaList = {
        Functions: [
          {
            FunctionName: 'vpc-lambda',
            FunctionArn: 'arn:aws:lambda:us-east-1:123:function:vpc-lambda',
            State: 'Active',
            Tags: {},
          },
        ],
      };

      const lambdaDetails = {
        Configuration: {
          FunctionName: 'vpc-lambda',
          FunctionArn: 'arn:aws:lambda:us-east-1:123:function:vpc-lambda',
          State: 'Active',
          VpcConfig: {
            SubnetIds: ['subnet-1', 'subnet-2', 'subnet-3'],
            SecurityGroupIds: ['sg-lambda'],
            VpcId: 'vpc-main',
          },
          Environment: { Variables: {} },
        },
        Tags: {},
      };

      mockLambdaClient.send
        .mockResolvedValueOnce(lambdaList)
        .mockResolvedValueOnce(lambdaDetails);

      const result = await worker.discoverLambdaFunctions('job-123');

      expect(result).toHaveLength(1);
      expect(result[0].metadata.vpc_config).toBeDefined();
      expect(result[0].metadata.vpc_config.subnet_ids).toHaveLength(3);
      expect(result[0].metadata.vpc_config.vpc_id).toBe('vpc-main');
    });

    it('should handle empty discovery results gracefully', async () => {
      mockEC2Client.send.mockResolvedValueOnce({ Reservations: [] });
      mockRDSClient.send.mockResolvedValueOnce({ DBInstances: [] });
      mockS3Client.send.mockResolvedValueOnce({ Buckets: [] });
      mockECSClient.send.mockResolvedValueOnce({ clusterArns: [] });
      mockLambdaClient.send.mockResolvedValueOnce({ Functions: [] });

      const result = await worker.discoverAll('job-123', {});

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should handle instances with missing optional fields', async () => {
      const minimalInstance = {
        Reservations: [
          {
            Instances: [
              {
                InstanceId: 'i-minimal',
                State: { Name: 'running' },
                // No Tags, no NetworkInterfaces, minimal fields
              },
            ],
          },
        ],
      };

      mockEC2Client.send.mockResolvedValueOnce(minimalInstance);

      const result = await worker.discoverEC2Instances('job-123');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('i-minimal'); // Falls back to instance ID
      expect(result[0].environment).toBeUndefined();
    });
  });

  describe('Comprehensive Discovery Flow', () => {
    it('should discover complete AWS infrastructure with relationships', async () => {
      // Setup mock data for full infrastructure
      const ec2Response = {
        Reservations: [
          {
            Instances: [
              {
                InstanceId: 'i-web-1',
                State: { Name: 'running' },
                Tags: [
                  { Key: 'Name', Value: 'Web Server' },
                  { Key: 'Environment', Value: 'production' },
                ],
                SecurityGroups: [{ GroupId: 'sg-web', GroupName: 'web-sg' }],
                VpcId: 'vpc-main',
              },
            ],
          },
        ],
      };

      const rdsResponse = {
        DBInstances: [
          {
            DBInstanceIdentifier: 'prod-db',
            DbiResourceId: 'db-123',
            DBInstanceStatus: 'available',
            Engine: 'postgres',
            VpcSecurityGroups: [
              { VpcSecurityGroupId: 'sg-web', Status: 'active' },
            ],
            TagList: [{ Key: 'Environment', Value: 'production' }],
          },
        ],
      };

      const s3Response = {
        Buckets: [{ Name: 'app-assets', CreationDate: new Date() }],
      };

      const lambdaList = {
        Functions: [
          {
            FunctionName: 'process-data',
            FunctionArn:
              'arn:aws:lambda:us-east-1:123:function:process-data',
            State: 'Active',
            Tags: { Environment: 'production' },
          },
        ],
      };

      const lambdaDetails = {
        Configuration: {
          FunctionName: 'process-data',
          FunctionArn: 'arn:aws:lambda:us-east-1:123:function:process-data',
          State: 'Active',
          Environment: {
            Variables: { ASSETS_BUCKET: 'app-assets' },
          },
        },
        Tags: { Environment: 'production' },
      };

      const ecsCluster = {
        clusterArns: ['arn:aws:ecs:us-east-1:123:cluster/prod-cluster'],
      };

      const ecsClusterDetails = {
        clusters: [
          {
            clusterName: 'prod-cluster',
            clusterArn: 'arn:aws:ecs:us-east-1:123:cluster/prod-cluster',
            status: 'ACTIVE',
            tags: [],
          },
        ],
      };

      mockEC2Client.send.mockResolvedValueOnce(ec2Response);
      mockRDSClient.send.mockResolvedValueOnce(rdsResponse);
      mockS3Client.send.mockResolvedValueOnce(s3Response);
      mockLambdaClient.send
        .mockResolvedValueOnce(lambdaList)
        .mockResolvedValueOnce(lambdaDetails);
      mockECSClient.send
        .mockResolvedValueOnce(ecsCluster)
        .mockResolvedValueOnce(ecsClusterDetails)
        .mockResolvedValueOnce({ serviceArns: [] });

      const allCIs = await worker.discoverAll('job-123', {});

      expect(allCIs.length).toBeGreaterThanOrEqual(5);

      // Verify all resource types discovered
      const types = new Set(allCIs.map(ci => ci.type));
      expect(types.has('virtual-machine')).toBe(true);
      expect(types.has('database')).toBe(true);
      expect(types.has('storage')).toBe(true);
      expect(types.has('application')).toBe(true);
      expect(types.has('cloud-resource')).toBe(true);

      // Infer relationships
      const relationships = worker.inferRelationships(allCIs);
      expect(relationships.length).toBeGreaterThan(0);
    });
  });
});
