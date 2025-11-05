/**
 * Integration Tests - Discovery Engine
 *
 * Tests the complete discovery flow from scheduling to persistence in Neo4j.
 * Uses AWS SDK mocks and testcontainers for realistic end-to-end testing.
 */

import { mockClient } from 'aws-sdk-client-mock';
import {
  EC2Client,
  DescribeInstancesCommand,
  DescribeVolumesCommand,
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
import { v4 as uuidv4 } from 'uuid';
import { AWSDiscoveryWorker } from '../../src/workers/aws-discovery.worker';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import neo4j, { Driver, Session } from 'neo4j-driver';
import { DiscoveryConfig } from '@cmdb/common/types';

describe('Discovery Engine Integration Tests', () => {
  let neo4jContainer: StartedTestContainer;
  let neo4jDriver: Driver;
  let neo4jUri: string;

  // AWS SDK mocks
  const ec2Mock = mockClient(EC2Client);
  const rdsMock = mockClient(RDSClient);
  const s3Mock = mockClient(S3Client);
  const ecsMock = mockClient(ECSClient);
  const lambdaMock = mockClient(LambdaClient);

  beforeAll(async () => {
    // Start Neo4j container
    neo4jContainer = await new GenericContainer('neo4j:5.13.0')
      .withEnvironment({
        _NEO4J_AUTH: 'neo4j/testpassword',
        _NEO4J_PLUGINS: '["apoc"]',
      })
      .withExposedPorts(7687, 7474)
      .withWaitStrategy(Wait.forLogMessage(/Started/))
      .withStartupTimeout(120000)
      .start();

    const neo4jHost = neo4jContainer.getHost();
    const neo4jPort = neo4jContainer.getMappedPort(7687);
    neo4jUri = `bolt://${neo4jHost}:${neo4jPort}`;

    neo4jDriver = neo4j.driver(neo4jUri, neo4j.auth.basic('neo4j', 'testpassword'));

    // Wait for Neo4j to be ready
    await waitForNeo4j(neo4jDriver);

    // Initialize schema
    await initializeNeo4jSchema(neo4jDriver);
  }, 120000);

  beforeEach(() => {
    // Reset all mocks before each test
    ec2Mock.reset();
    rdsMock.reset();
    s3Mock.reset();
    ecsMock.reset();
    lambdaMock.reset();
  });

  afterEach(async () => {
    // Clean database
    const session = neo4jDriver.session();
    try {
      await session.run('MATCH (n) DETACH DELETE n');
    } finally {
      await session.close();
    }
  });

  afterAll(async () => {
    await neo4jDriver.close();
    await neo4jContainer.stop();
  }, 30000);

  describe('AWS EC2 Discovery', () => {
    it('should discover EC2 instances and persist to Neo4j', async () => {
      const jobId = uuidv4();

      // Mock EC2 API response
      ec2Mock.on(DescribeInstancesCommand).resolves({
        _Reservations: [
          {
            _Instances: [
              {
                _InstanceId: 'i-1234567890abcdef0',
                _InstanceType: 't3.medium',
                _State: { Name: 'running' },
                _Placement: { AvailabilityZone: 'us-east-1a' },
                _VpcId: 'vpc-12345678',
                _SubnetId: 'subnet-12345678',
                _PrivateIpAddress: '10.0.1.100',
                _PublicIpAddress: '54.123.45.67',
                _LaunchTime: new Date('2025-01-01T00:00:00Z'),
                _Architecture: 'x86_64',
                _Tags: [
                  { Key: 'Name', Value: 'web-server-01' },
                  { Key: 'Environment', Value: 'production' },
                  { Key: 'Application', Value: 'web-app' },
                ],
              },
              {
                _InstanceId: 'i-abcdef1234567890',
                _InstanceType: 't3.small',
                _State: { Name: 'running' },
                _Placement: { AvailabilityZone: 'us-east-1b' },
                _VpcId: 'vpc-12345678',
                _SubnetId: 'subnet-87654321',
                _PrivateIpAddress: '10.0.2.50',
                _LaunchTime: new Date('2025-01-15T00:00:00Z'),
                _Architecture: 'x86_64',
                _Tags: [
                  { Key: 'Name', Value: 'api-server-01' },
                  { Key: 'Environment', Value: 'staging' },
                ],
              },
            ],
          },
        ],
      });

      // Mock other AWS services to return empty results
      rdsMock.on(DescribeDBInstancesCommand).resolves({ DBInstances: [] });
      s3Mock.on(ListBucketsCommand).resolves({ Buckets: [] });
      ecsMock.on(ListClustersCommand).resolves({ clusterArns: [] });
      lambdaMock.on(ListFunctionsCommand).resolves({ Functions: [] });

      // Run discovery
      const worker = new AWSDiscoveryWorker('us-east-1', {
        _accessKeyId: 'test-key',
        _secretAccessKey: 'test-secret',
      });

      const discoveredCIs = await worker.discoverAll(jobId, {
        _provider: 'aws',
        _enabled: true,
        _schedule: '0 * * * *',
      });

      expect(discoveredCIs).toHaveLength(2);
      expect(discoveredCIs[0]).toMatchObject({
        _external_id: 'i-1234567890abcdef0',
        _name: 'web-server-01',
        _type: 'virtual-machine',
        _status: 'active',
        _environment: 'production',
        _discovery_provider: 'aws',
        _confidence_score: 1.0,
      });

      // Persist to Neo4j
      await persistCIsToNeo4j(neo4jDriver, discoveredCIs);

      // Verify persistence
      const session = neo4jDriver.session();
      try {
        const result = await session.run('MATCH (ci:CI) RETURN ci ORDER BY ci.name');
        expect(result.records).toHaveLength(2);

        const firstCI = result.records[0].get('ci').properties;
        expect(firstCI.name).toBe('api-server-01');
        expect(firstCI.type).toBe('virtual-machine');
        expect(firstCI.environment).toBe('staging');
      } finally {
        await session.close();
      }
    });

    it('should handle stopped EC2 instances with correct status', async () => {
      const jobId = uuidv4();

      ec2Mock.on(DescribeInstancesCommand).resolves({
        _Reservations: [
          {
            _Instances: [
              {
                _InstanceId: 'i-stopped123',
                _InstanceType: 't3.micro',
                _State: { Name: 'stopped' },
                _Tags: [{ Key: 'Name', Value: 'stopped-server' }],
              },
            ],
          },
        ],
      });

      rdsMock.on(DescribeDBInstancesCommand).resolves({ DBInstances: [] });
      s3Mock.on(ListBucketsCommand).resolves({ Buckets: [] });
      ecsMock.on(ListClustersCommand).resolves({ clusterArns: [] });
      lambdaMock.on(ListFunctionsCommand).resolves({ Functions: [] });

      const worker = new AWSDiscoveryWorker('us-east-1');
      const discoveredCIs = await worker.discoverAll(jobId, {
        _provider: 'aws',
        _enabled: true,
      });

      expect(discoveredCIs[0].status).toBe('inactive');
    });
  });

  describe('AWS RDS Discovery', () => {
    it('should discover RDS database instances', async () => {
      const jobId = uuidv4();

      ec2Mock.on(DescribeInstancesCommand).resolves({ Reservations: [] });
      s3Mock.on(ListBucketsCommand).resolves({ Buckets: [] });
      ecsMock.on(ListClustersCommand).resolves({ clusterArns: [] });
      lambdaMock.on(ListFunctionsCommand).resolves({ Functions: [] });

      rdsMock.on(DescribeDBInstancesCommand).resolves({
        _DBInstances: [
          {
            _DBInstanceIdentifier: 'prod-postgres-db',
            _DbiResourceId: 'db-ABCDEFGHIJKLMNOP',
            _Engine: 'postgres',
            _EngineVersion: '15.3',
            _DBInstanceClass: 'db.t3.medium',
            _DBInstanceStatus: 'available',
            _AllocatedStorage: 100,
            _Endpoint: {
              _Address: 'prod-postgres-db.abcdef123456.us-east-1.rds.amazonaws.com',
              _Port: 5432,
            },
            _AvailabilityZone: 'us-east-1a',
            _MultiAZ: true,
            _PubliclyAccessible: false,
            _StorageEncrypted: true,
            _InstanceCreateTime: new Date('2024-12-01T00:00:00Z'),
            _TagList: [
              { Key: 'Name', Value: 'Production Database' },
              { Key: 'Environment', Value: 'production' },
            ],
          },
        ],
      });

      const worker = new AWSDiscoveryWorker('us-east-1');
      const discoveredCIs = await worker.discoverAll(jobId, {
        _provider: 'aws',
        _enabled: true,
      });

      expect(discoveredCIs).toHaveLength(1);
      expect(discoveredCIs[0]).toMatchObject({
        _name: 'prod-postgres-db',
        _type: 'database',
        _status: 'active',
        _environment: 'production',
      });

      expect(discoveredCIs[0].metadata).toMatchObject({
        _engine: 'postgres',
        _engine_version: '15.3',
        _instance_class: 'db.t3.medium',
        _endpoint: 'prod-postgres-db.abcdef123456.us-east-1.rds.amazonaws.com',
        _port: 5432,
        _multi_az: true,
        _storage_encrypted: true,
      });

      // Persist and verify
      await persistCIsToNeo4j(neo4jDriver, discoveredCIs);

      const session = neo4jDriver.session();
      try {
        const result = await session.run('MATCH (ci:CI {type: "database"}) RETURN ci');
        expect(result.records).toHaveLength(1);
      } finally {
        await session.close();
      }
    });

    it('should map RDS maintenance status correctly', async () => {
      const jobId = uuidv4();

      ec2Mock.on(DescribeInstancesCommand).resolves({ Reservations: [] });
      s3Mock.on(ListBucketsCommand).resolves({ Buckets: [] });
      ecsMock.on(ListClustersCommand).resolves({ clusterArns: [] });
      lambdaMock.on(ListFunctionsCommand).resolves({ Functions: [] });

      rdsMock.on(DescribeDBInstancesCommand).resolves({
        _DBInstances: [
          {
            _DBInstanceIdentifier: 'maintenance-db',
            _DBInstanceStatus: 'backing-up',
            _Engine: 'mysql',
          },
        ],
      });

      const worker = new AWSDiscoveryWorker('us-east-1');
      const discoveredCIs = await worker.discoverAll(jobId, {
        _provider: 'aws',
        _enabled: true,
      });

      expect(discoveredCIs[0].status).toBe('maintenance');
    });
  });

  describe('AWS S3 Discovery', () => {
    it('should discover S3 buckets', async () => {
      const jobId = uuidv4();

      ec2Mock.on(DescribeInstancesCommand).resolves({ Reservations: [] });
      rdsMock.on(DescribeDBInstancesCommand).resolves({ DBInstances: [] });
      ecsMock.on(ListClustersCommand).resolves({ clusterArns: [] });
      lambdaMock.on(ListFunctionsCommand).resolves({ Functions: [] });

      s3Mock.on(ListBucketsCommand).resolves({
        _Buckets: [
          {
            _Name: 'my-app-assets',
            _CreationDate: new Date('2024-01-01T00:00:00Z'),
          },
          {
            _Name: 'my-app-backups',
            _CreationDate: new Date('2024-06-01T00:00:00Z'),
          },
        ],
      });

      const worker = new AWSDiscoveryWorker('us-east-1');
      const discoveredCIs = await worker.discoverAll(jobId, {
        _provider: 'aws',
        _enabled: true,
      });

      expect(discoveredCIs).toHaveLength(2);
      expect(discoveredCIs[0]).toMatchObject({
        _name: 'my-app-assets',
        _type: 'storage',
        _status: 'active',
      });
    });
  });

  describe('AWS Lambda Discovery', () => {
    it('should discover Lambda functions', async () => {
      const jobId = uuidv4();

      ec2Mock.on(DescribeInstancesCommand).resolves({ Reservations: [] });
      rdsMock.on(DescribeDBInstancesCommand).resolves({ DBInstances: [] });
      s3Mock.on(ListBucketsCommand).resolves({ Buckets: [] });
      ecsMock.on(ListClustersCommand).resolves({ clusterArns: [] });

      lambdaMock.on(ListFunctionsCommand).resolves({
        _Functions: [
          {
            _FunctionName: 'process-orders',
            _FunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:process-orders',
            _Runtime: 'nodejs20.x',
            _Handler: 'index.handler',
            _CodeSize: 1024000,
            _Timeout: 30,
            _MemorySize: 512,
            _State: 'Active',
            _LastModified: '2025-01-01T00:00:00Z',
            _Tags: {
              _Environment: 'production',
              _Team: 'backend',
            },
          },
        ],
      });

      const worker = new AWSDiscoveryWorker('us-east-1');
      const discoveredCIs = await worker.discoverAll(jobId, {
        _provider: 'aws',
        _enabled: true,
      });

      expect(discoveredCIs).toHaveLength(1);
      expect(discoveredCIs[0]).toMatchObject({
        _name: 'process-orders',
        _type: 'application',
        _status: 'active',
        _environment: 'production',
      });

      expect(discoveredCIs[0].metadata).toMatchObject({
        _runtime: 'nodejs20.x',
        _handler: 'index.handler',
        _timeout: 30,
        _memory_size: 512,
      });
    });
  });

  describe('Complete Discovery Flow', () => {
    it('should discover multiple resource types and persist all', async () => {
      const jobId = uuidv4();

      // Mock comprehensive AWS environment
      ec2Mock.on(DescribeInstancesCommand).resolves({
        _Reservations: [
          {
            _Instances: [
              {
                _InstanceId: 'i-web01',
                _InstanceType: 't3.medium',
                _State: { Name: 'running' },
                _Tags: [
                  { Key: 'Name', Value: 'web-server' },
                  { Key: 'Environment', Value: 'production' },
                ],
              },
            ],
          },
        ],
      });

      rdsMock.on(DescribeDBInstancesCommand).resolves({
        _DBInstances: [
          {
            _DBInstanceIdentifier: 'main-db',
            _Engine: 'postgres',
            _DBInstanceStatus: 'available',
            _TagList: [{ Key: 'Environment', Value: 'production' }],
          },
        ],
      });

      s3Mock.on(ListBucketsCommand).resolves({
        _Buckets: [{ Name: 'app-storage', CreationDate: new Date() }],
      });

      lambdaMock.on(ListFunctionsCommand).resolves({
        _Functions: [
          {
            _FunctionName: 'api-handler',
            _Runtime: 'nodejs20.x',
            _State: 'Active',
            _Tags: { Environment: 'production' },
          },
        ],
      });

      ecsMock.on(ListClustersCommand).resolves({
        _clusterArns: ['arn:aws:ecs:us-east-1:123456789012:cluster/production'],
      });

      // Run discovery
      const worker = new AWSDiscoveryWorker('us-east-1');
      const discoveredCIs = await worker.discoverAll(jobId, {
        _provider: 'aws',
        _enabled: true,
      });

      // Should discover: 1 EC2, 1 RDS, 1 S3, 1 Lambda, 1 ECS cluster = 5 total
      expect(discoveredCIs.length).toBeGreaterThanOrEqual(5);

      // Verify each type is present
      const types = new Set(discoveredCIs.map((ci) => ci.type));
      expect(types).toContain('virtual-machine');
      expect(types).toContain('database');
      expect(types).toContain('storage');
      expect(types).toContain('application');
      expect(types).toContain('cloud-resource');

      // Persist all CIs
      await persistCIsToNeo4j(neo4jDriver, discoveredCIs);

      // Verify all persisted with correct discovery metadata
      const session = neo4jDriver.session();
      try {
        const result = await session.run(`
          MATCH (ci:CI)
          WHERE ci.discovery_provider = 'aws' AND ci.discovery_job_id = $jobId
          RETURN ci
          ORDER BY ci.type, ci.name
        `, { jobId });

        expect(result.records.length).toBeGreaterThanOrEqual(5);

        // All should have discovery metadata
        result.records.forEach((record) => {
          const ci = record.get('ci').properties;
          expect(ci.discovery_provider).toBe('aws');
          expect(ci.discovery_job_id).toBe(jobId);
          expect(ci.confidence_score).toBe(1.0);
          expect(ci.discovered_at).toBeDefined();
        });
      } finally {
        await session.close();
      }
    });

    it('should handle partial failures gracefully', async () => {
      const jobId = uuidv4();

      // EC2 succeeds
      ec2Mock.on(DescribeInstancesCommand).resolves({
        _Reservations: [
          {
            _Instances: [
              {
                _InstanceId: 'i-success',
                _Tags: [{ Key: 'Name', Value: 'success-instance' }],
                _State: { Name: 'running' },
              },
            ],
          },
        ],
      });

      // RDS fails
      rdsMock.on(DescribeDBInstancesCommand).rejects(new Error('RDS API error'));

      // S3 succeeds
      s3Mock.on(ListBucketsCommand).resolves({
        _Buckets: [{ Name: 'success-bucket', CreationDate: new Date() }],
      });

      // Lambda fails
      lambdaMock.on(ListFunctionsCommand).rejects(new Error('Lambda API error'));

      // ECS succeeds
      ecsMock.on(ListClustersCommand).resolves({ clusterArns: [] });

      const worker = new AWSDiscoveryWorker('us-east-1');
      const discoveredCIs = await worker.discoverAll(jobId, {
        _provider: 'aws',
        _enabled: true,
      });

      // Should have EC2 and S3 results despite RDS and Lambda failures
      expect(discoveredCIs.length).toBeGreaterThanOrEqual(2);

      const types = discoveredCIs.map((ci) => ci.type);
      expect(types).toContain('virtual-machine');
      expect(types).toContain('storage');
    });
  });

  describe('Idempotent Discovery', () => {
    it('should update existing CIs on subsequent discovery runs', async () => {
      const jobId1 = uuidv4();
      const jobId2 = uuidv4();

      // First discovery
      ec2Mock.on(DescribeInstancesCommand).resolves({
        _Reservations: [
          {
            _Instances: [
              {
                _InstanceId: 'i-constant',
                _InstanceType: 't3.small',
                _State: { Name: 'running' },
                _Tags: [{ Key: 'Name', Value: 'my-server' }],
              },
            ],
          },
        ],
      });

      rdsMock.on(DescribeDBInstancesCommand).resolves({ DBInstances: [] });
      s3Mock.on(ListBucketsCommand).resolves({ Buckets: [] });
      ecsMock.on(ListClustersCommand).resolves({ clusterArns: [] });
      lambdaMock.on(ListFunctionsCommand).resolves({ Functions: [] });

      const worker = new AWSDiscoveryWorker('us-east-1');
      const firstRun = await worker.discoverAll(jobId1, { provider: 'aws', enabled: true });
      await persistCIsToNeo4j(neo4jDriver, firstRun);

      // Second discovery with updated instance type
      ec2Mock.reset();
      ec2Mock.on(DescribeInstancesCommand).resolves({
        _Reservations: [
          {
            _Instances: [
              {
                _InstanceId: 'i-constant',
                _InstanceType: 't3.medium', // Changed
                _State: { Name: 'running' },
                _Tags: [{ Key: 'Name', Value: 'my-server' }],
              },
            ],
          },
        ],
      });

      const secondRun = await worker.discoverAll(jobId2, { provider: 'aws', enabled: true });
      await persistCIsToNeo4j(neo4jDriver, secondRun);

      // Verify only one CI exists (updated, not duplicated)
      const session = neo4jDriver.session();
      try {
        const result = await session.run('MATCH (ci:CI {external_id: "i-constant"}) RETURN ci');
        expect(result.records).toHaveLength(1);

        const ci = result.records[0].get('ci').properties;
        expect(ci.metadata).toContain('t3.medium');
        expect(ci.discovery_job_id).toBe(jobId2); // Updated to latest job
      } finally {
        await session.close();
      }
    });
  });
});

// Helper Functions

async function waitForNeo4j(driver: Driver, maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const session = driver.session();
      await session.run('RETURN 1');
      await session.close();
      return;
    } catch (error) {
      if (i === maxAttempts - 1) {
        throw new Error('Neo4j did not become ready in time');
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function initializeNeo4jSchema(driver: Driver): Promise<void> {
  const session = driver.session();
  try {
    await session.run('CREATE CONSTRAINT ci_id_unique IF NOT EXISTS FOR (ci:CI) REQUIRE ci.id IS UNIQUE');
    await session.run('CREATE INDEX ci_type_idx IF NOT EXISTS FOR (ci:CI) ON (ci.type)');
    await session.run('CREATE INDEX ci_external_id_idx IF NOT EXISTS FOR (ci:CI) ON (ci.external_id)');
    await session.run('CREATE INDEX ci_discovery_job_idx IF NOT EXISTS FOR (ci:CI) ON (ci.discovery_job_id)');
  } finally {
    await session.close();
  }
}

async function persistCIsToNeo4j(driver: Driver, cis: any[]): Promise<void> {
  const session = driver.session();
  try {
    for (const ci of cis) {
      await session.run(
        `
        MERGE (ci:CI {id: $id})
        SET ci.external_id = $external_id,
            ci.name = $name,
            ci.type = $type,
            ci.status = $status,
            ci.environment = $environment,
            ci.discovered_at = $discovered_at,
            ci.discovery_job_id = $discovery_job_id,
            ci.discovery_provider = $discovery_provider,
            ci.confidence_score = $confidence_score,
            ci.metadata = $metadata,
            ci.created_at = coalesce(ci.created_at, datetime()),
            ci.updated_at = datetime()
        `,
        {
          _id: ci.id,
          _external_id: ci.external_id,
          _name: ci.name,
          _type: ci.type,
          _status: ci.status,
          _environment: ci.environment || null,
          _discovered_at: ci.discovered_at,
          _discovery_job_id: ci.discovery_job_id,
          _discovery_provider: ci.discovery_provider,
          _confidence_score: ci.confidence_score,
          _metadata: JSON.stringify(ci.metadata || {}),
        }
      );
    }
  } finally {
    await session.close();
  }
}
