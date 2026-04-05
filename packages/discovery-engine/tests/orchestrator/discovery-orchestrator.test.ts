// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Discovery Orchestrator Tests
 *
 * Tests for discovery job orchestration including:
 * - Job scheduling and queue management
 * - Worker registration for all providers
 * - CI persistence to Neo4j
 * - Recurring discovery scheduling
 * - Error handling and retries
 */

import { DiscoveryOrchestrator } from '../../src/orchestrator/discovery-orchestrator';
import { queueManager, QUEUE_NAMES } from '@cmdb/database';
import { Neo4jClient } from '@cmdb/database';

// Mock dependencies
jest.mock('@cmdb/database', () => ({
  _queueManager: {
    _getQueue: jest.fn(),
    _registerWorker: jest.fn(),
  },
  _QUEUE_NAMES: {
    _DISCOVERY_AWS: 'discovery:aws',
    _DISCOVERY_AZURE: 'discovery:azure',
    _DISCOVERY_GCP: 'discovery:gcp',
    _DISCOVERY_SSH: 'discovery:ssh',
    _DISCOVERY_NMAP: 'discovery:nmap',
  },
  _getNeo4jClient: jest.fn(),
}));

// Mock worker classes
jest.mock('../../src/workers/aws-discovery.worker');
jest.mock('../../src/workers/azure-discovery.worker');
jest.mock('../../src/workers/gcp-discovery.worker');
jest.mock('../../src/workers/ssh-discovery.worker');
jest.mock('../../src/workers/nmap-discovery.worker');

describe('DiscoveryOrchestrator', () => {
  let orchestrator: DiscoveryOrchestrator;
  let mockQueue: any;
  let mockNeo4jClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock queue
    mockQueue = {
      _add: jest.fn().mockResolvedValue({ id: 'job-id' }),
    };

    (queueManager.getQueue as jest.Mock).mockReturnValue(mockQueue);

    // Setup mock Neo4j client
    mockNeo4jClient = {
      _getCI: jest.fn(),
      _createCI: jest.fn(),
      _updateCI: jest.fn(),
    };

    const { getNeo4jClient } = require('@cmdb/database');
    (getNeo4jClient as jest.Mock).mockReturnValue(mockNeo4jClient);

    // Create orchestrator
    orchestrator = new DiscoveryOrchestrator();
  });

  describe('scheduleDiscovery', () => {
    it('should schedule AWS discovery job', async () => {
      const job = {
        _id: 'job-123',
        _provider: 'aws',
        _method: 'agentless',
        _config: {
          _region: 'us-east-1',
          _credentials: {},
        },
        _status: 'pending',
        _created_at: new Date().toISOString(),
      };

      await orchestrator.scheduleDiscovery(job as any);

      expect(queueManager.getQueue).toHaveBeenCalledWith('discovery:aws');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'discovery',
        {
          _jobId: job.id,
          _provider: job.provider,
          _config: job.config,
        },
        {
          _attempts: 3,
          _backoff: {
            _type: 'exponential',
            _delay: 2000,
          },
        }
      );
    });

    it('should schedule Azure discovery job', async () => {
      const job = {
        _id: 'job-456',
        _provider: 'azure',
        _method: 'agentless',
        _config: { subscriptionId: 'sub-123' },
        _status: 'pending',
        _created_at: new Date().toISOString(),
      };

      await orchestrator.scheduleDiscovery(job as any);

      expect(queueManager.getQueue).toHaveBeenCalledWith('discovery:azure');
    });

    it('should schedule GCP discovery job', async () => {
      const job = {
        _id: 'job-789',
        _provider: 'gcp',
        _method: 'agentless',
        _config: { projectId: 'project-123' },
        _status: 'pending',
        _created_at: new Date().toISOString(),
      };

      await orchestrator.scheduleDiscovery(job as any);

      expect(queueManager.getQueue).toHaveBeenCalledWith('discovery:gcp');
    });

    it('should throw error for unknown provider', async () => {
      const job = {
        _id: 'job-999',
        _provider: 'unknown',
        _method: 'agentless',
        _config: {},
        _status: 'pending',
        _created_at: new Date().toISOString(),
      };

      await expect(orchestrator.scheduleDiscovery(job as any))
        .rejects.toThrow('Unknown provider: unknown');
    });
  });

  describe('scheduleRecurringDiscovery', () => {
    it('should schedule recurring discovery with cron pattern', async () => {
      const provider = 'aws';
      const config = { region: 'us-east-1' };
      const cronPattern = '0 */6 * * *'; // Every 6 hours

      await orchestrator.scheduleRecurringDiscovery(provider, config, cronPattern);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'recurring-discovery',
        { provider, config },
        {
          _repeat: {
            _pattern: cronPattern,
          },
        }
      );
    });

    it('should handle daily recurring discovery', async () => {
      const cronPattern = '0 2 * * *'; // 2 AM daily

      await orchestrator.scheduleRecurringDiscovery('azure', {}, cronPattern);

      expect(mockQueue.add).toHaveBeenCalled();
      const call = mockQueue.add.mock.calls[0];
      expect(call[2].repeat.pattern).toBe(cronPattern);
    });
  });

  describe('registerWorkers', () => {
    it('should register all discovery workers', () => {
      orchestrator.registerWorkers();

      expect(queueManager.registerWorker).toHaveBeenCalledTimes(5);

      // Verify AWS worker registration
      expect(queueManager.registerWorker).toHaveBeenCalledWith(
        'discovery:aws',
        expect.any(Function),
        { concurrency: 2 }
      );

      // Verify Azure worker registration
      expect(queueManager.registerWorker).toHaveBeenCalledWith(
        'discovery:azure',
        expect.any(Function),
        { concurrency: 2 }
      );

      // Verify GCP worker registration
      expect(queueManager.registerWorker).toHaveBeenCalledWith(
        'discovery:gcp',
        expect.any(Function),
        { concurrency: 2 }
      );

      // Verify SSH worker registration
      expect(queueManager.registerWorker).toHaveBeenCalledWith(
        'discovery:ssh',
        expect.any(Function),
        { concurrency: 5 }
      );

      // Verify Nmap worker registration
      expect(queueManager.registerWorker).toHaveBeenCalledWith(
        'discovery:nmap',
        expect.any(Function),
        { concurrency: 3 }
      );
    });

    it('should configure correct concurrency for each worker type', () => {
      orchestrator.registerWorkers();

      const calls = (queueManager.registerWorker as jest.Mock).mock.calls;

      // Find AWS worker call
      const awsCall = calls.find(call => call[0] === 'discovery:aws');
      expect(awsCall[2].concurrency).toBe(2);

      // Find SSH worker call (higher concurrency)
      const sshCall = calls.find(call => call[0] === 'discovery:ssh');
      expect(sshCall[2].concurrency).toBe(5);
    });
  });

  describe('persistCIs', () => {
    it('should create new CIs that do not exist', async () => {
      const discoveredCIs = [
        {
          _id: 'ci-new-1',
          _name: 'New Server',
          _type: 'server',
          _status: 'active',
          _discovered_at: new Date().toISOString(),
          _discovery_job_id: 'job-123',
          _discovery_provider: 'aws',
          _confidence_score: 1.0,
          _metadata: {},
        },
      ];

      mockNeo4jClient.getCI.mockResolvedValue(null); // CI doesn't exist
      mockNeo4jClient.createCI.mockResolvedValue({ id: 'ci-new-1' });

      await (orchestrator as any).persistCIs(discoveredCIs);

      expect(mockNeo4jClient.getCI).toHaveBeenCalledWith('ci-new-1');
      expect(mockNeo4jClient.createCI).toHaveBeenCalledWith(discoveredCIs[0]);
      expect(mockNeo4jClient.updateCI).not.toHaveBeenCalled();
    });

    it('should update existing CIs', async () => {
      const discoveredCIs = [
        {
          _id: 'ci-existing-1',
          _name: 'Updated Server',
          _type: 'server',
          _status: 'maintenance',
          _discovered_at: new Date().toISOString(),
          _discovery_job_id: 'job-123',
          _discovery_provider: 'aws',
          _confidence_score: 1.0,
          _metadata: { updated: true },
        },
      ];

      mockNeo4jClient.getCI.mockResolvedValue({
        _id: 'ci-existing-1',
        _name: 'Old Server',
        _status: 'active',
      });
      mockNeo4jClient.updateCI.mockResolvedValue({ id: 'ci-existing-1' });

      await (orchestrator as any).persistCIs(discoveredCIs);

      expect(mockNeo4jClient.getCI).toHaveBeenCalledWith('ci-existing-1');
      expect(mockNeo4jClient.updateCI).toHaveBeenCalledWith('ci-existing-1', {
        _name: 'Updated Server',
        _status: 'maintenance',
        _metadata: { updated: true },
      });
      expect(mockNeo4jClient.createCI).not.toHaveBeenCalled();
    });

    it('should handle multiple CIs in batch', async () => {
      const discoveredCIs = [
        {
          _id: 'ci-1',
          _name: 'CI 1',
          _type: 'server',
          _status: 'active',
          _discovered_at: new Date().toISOString(),
          _discovery_job_id: 'job-123',
          _discovery_provider: 'aws',
          _confidence_score: 1.0,
          _metadata: {},
        },
        {
          _id: 'ci-2',
          _name: 'CI 2',
          _type: 'database',
          _status: 'active',
          _discovered_at: new Date().toISOString(),
          _discovery_job_id: 'job-123',
          _discovery_provider: 'aws',
          _confidence_score: 1.0,
          _metadata: {},
        },
      ];

      mockNeo4jClient.getCI.mockResolvedValue(null);
      mockNeo4jClient.createCI.mockResolvedValue({});

      await (orchestrator as any).persistCIs(discoveredCIs);

      expect(mockNeo4jClient.getCI).toHaveBeenCalledTimes(2);
      expect(mockNeo4jClient.createCI).toHaveBeenCalledTimes(2);
    });

    it('should continue processing on individual CI errors', async () => {
      const discoveredCIs = [
        {
          _id: 'ci-error',
          _name: 'Error CI',
          _type: 'server',
          _status: 'active',
          _discovered_at: new Date().toISOString(),
          _discovery_job_id: 'job-123',
          _discovery_provider: 'aws',
          _confidence_score: 1.0,
          _metadata: {},
        },
        {
          _id: 'ci-success',
          _name: 'Success CI',
          _type: 'server',
          _status: 'active',
          _discovered_at: new Date().toISOString(),
          _discovery_job_id: 'job-123',
          _discovery_provider: 'aws',
          _confidence_score: 1.0,
          _metadata: {},
        },
      ];

      mockNeo4jClient.getCI
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce(null);
      mockNeo4jClient.createCI.mockResolvedValue({});

      // Should not throw, should continue processing
      await (orchestrator as any).persistCIs(discoveredCIs);

      expect(mockNeo4jClient.createCI).toHaveBeenCalledTimes(1);
      expect(mockNeo4jClient.createCI).toHaveBeenCalledWith(discoveredCIs[1]);
    });

    it('should handle empty CI array', async () => {
      await (orchestrator as any).persistCIs([]);

      expect(mockNeo4jClient.getCI).not.toHaveBeenCalled();
      expect(mockNeo4jClient.createCI).not.toHaveBeenCalled();
    });
  });

  describe('getQueueName', () => {
    it('should return correct queue names for all providers', () => {
      const testCases = [
        { provider: 'aws', expected: 'discovery:aws' },
        { provider: 'azure', expected: 'discovery:azure' },
        { provider: 'gcp', expected: 'discovery:gcp' },
        { provider: 'ssh', expected: 'discovery:ssh' },
        { provider: 'nmap', expected: 'discovery:nmap' },
      ];

      testCases.forEach(({ provider, expected }) => {
        const queueName = (orchestrator as any).getQueueName(provider);
        expect(queueName).toBe(expected);
      });
    });

    it('should throw error for unknown provider', () => {
      expect(() => {
        (orchestrator as any).getQueueName('invalid-provider');
      }).toThrow('Unknown provider: invalid-provider');
    });
  });

  describe('Worker Execution', () => {
    it('should execute AWS worker and persist results', async () => {
      const { AWSDiscoveryWorker } = require('../../src/workers/aws-discovery.worker');
      const mockWorker = {
        _discoverAll: jest.fn().mockResolvedValue([
          {
            _id: 'ci-aws-1',
            _name: 'AWS Resource',
            _type: 'server',
            _status: 'active',
            _discovered_at: new Date().toISOString(),
            _discovery_job_id: 'job-123',
            _discovery_provider: 'aws',
            _confidence_score: 1.0,
            _metadata: {},
          },
        ]),
      };

      AWSDiscoveryWorker.mockImplementation(() => mockWorker);

      orchestrator.registerWorkers();

      // Get the AWS worker function
      const awsWorkerCall = (queueManager.registerWorker as jest.Mock).mock.calls.find(
        call => call[0] === 'discovery:aws'
      );
      const workerFunction = awsWorkerCall[1];

      mockNeo4jClient.getCI.mockResolvedValue(null);
      mockNeo4jClient.createCI.mockResolvedValue({});

      // Execute worker
      const result = await workerFunction({
        _data: {
          _jobId: 'job-123',
          _config: { region: 'us-east-1' },
        },
      });

      expect(mockWorker.discoverAll).toHaveBeenCalled();
      expect(mockNeo4jClient.createCI).toHaveBeenCalled();
      expect(result).toEqual({ discovered: 1 });
    });

    it('should handle SSH worker with multiple targets', async () => {
      const { SSHDiscoveryWorker } = require('../../src/workers/ssh-discovery.worker');
      const mockWorker = {
        _discoverHost: jest.fn().mockResolvedValue({
          _id: 'ci-ssh-1',
          _name: 'SSH Host',
          _type: 'server',
          _status: 'active',
          _discovered_at: new Date().toISOString(),
          _discovery_job_id: 'job-123',
          _discovery_provider: 'ssh',
          _confidence_score: 0.9,
          _metadata: {},
        }),
      };

      SSHDiscoveryWorker.mockImplementation(() => mockWorker);

      orchestrator.registerWorkers();

      // Get the SSH worker function
      const sshWorkerCall = (queueManager.registerWorker as jest.Mock).mock.calls.find(
        call => call[0] === 'discovery:ssh'
      );
      const workerFunction = sshWorkerCall[1];

      mockNeo4jClient.getCI.mockResolvedValue(null);
      mockNeo4jClient.createCI.mockResolvedValue({});

      // Execute worker with multiple targets
      const result = await workerFunction({
        _data: {
          _jobId: 'job-123',
          _config: {
            _targets: [
              { host: '192.168.1.10', username: 'admin', privateKeyPath: '/path/key1' },
              { host: '192.168.1.11', username: 'admin', privateKeyPath: '/path/key2' },
            ],
          },
        },
      });

      expect(mockWorker.discoverHost).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ discovered: 2 });
    });

    it('should continue SSH discovery even if one target fails', async () => {
      const { SSHDiscoveryWorker } = require('../../src/workers/ssh-discovery.worker');
      const mockWorker = {
        _discoverHost: jest.fn()
          .mockRejectedValueOnce(new Error('Connection refused'))
          .mockResolvedValueOnce({
            _id: 'ci-ssh-2',
            _name: 'SSH Host 2',
            _type: 'server',
            _status: 'active',
            _discovered_at: new Date().toISOString(),
            _discovery_job_id: 'job-123',
            _discovery_provider: 'ssh',
            _confidence_score: 0.9,
            _metadata: {},
          }),
      };

      SSHDiscoveryWorker.mockImplementation(() => mockWorker);

      orchestrator.registerWorkers();

      const sshWorkerCall = (queueManager.registerWorker as jest.Mock).mock.calls.find(
        call => call[0] === 'discovery:ssh'
      );
      const workerFunction = sshWorkerCall[1];

      mockNeo4jClient.getCI.mockResolvedValue(null);
      mockNeo4jClient.createCI.mockResolvedValue({});

      const result = await workerFunction({
        _data: {
          _jobId: 'job-123',
          _config: {
            _targets: [
              { host: '192.168.1.10', username: 'admin', privateKeyPath: '/path/key1' },
              { host: '192.168.1.11', username: 'admin', privateKeyPath: '/path/key2' },
            ],
          },
        },
      });

      // Should have 1 successful discovery despite 1 failure
      expect(result).toEqual({ discovered: 1 });
    });
  });
});
