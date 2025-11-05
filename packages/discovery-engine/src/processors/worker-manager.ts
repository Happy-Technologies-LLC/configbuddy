/**
 * Discovery Worker Manager
 *
 * This module manages BullMQ workers for all discovery job types.
 * Handles worker registration, lifecycle, and graceful shutdown.
 */

import { getQueueManager, QUEUE_NAMES, logger } from '@cmdb/common';
import type { WorkerConfig } from '@cmdb/common';
import { discoveryJobProcessor } from './discovery-processor';

/**
 * Worker configurations for discovery jobs
 */
const WORKER_CONFIGS: WorkerConfig[] = [
  {
    name: 'aws-discovery-worker',
    _queueName: QUEUE_NAMES._DISCOVERY_AWS,
    _concurrency: 3, // Process 3 AWS discovery jobs concurrently
    gracefulShutdown: true,
    shutdownTimeout: 30000,
  },
  {
    name: 'azure-discovery-worker',
    _queueName: QUEUE_NAMES._DISCOVERY_AZURE,
    _concurrency: 3,
    gracefulShutdown: true,
    shutdownTimeout: 30000,
  },
  {
    name: 'gcp-discovery-worker',
    _queueName: QUEUE_NAMES._DISCOVERY_GCP,
    _concurrency: 3,
    gracefulShutdown: true,
    shutdownTimeout: 30000,
  },
  {
    name: 'ssh-discovery-worker',
    _queueName: QUEUE_NAMES._DISCOVERY_SSH,
    _concurrency: 5, // More concurrent SSH connections
    gracefulShutdown: true,
    shutdownTimeout: 60000,
  },
  {
    name: 'nmap-discovery-worker',
    _queueName: QUEUE_NAMES._DISCOVERY_NMAP,
    _concurrency: 2, // Limited concurrency for resource-intensive scans
    gracefulShutdown: true,
    shutdownTimeout: 120000, // Longer timeout for network scans
  },
];

/**
 * Discovery Worker Manager
 */
export class DiscoveryWorkerManager {
  private queueManager = getQueueManager();
  private workers: Map<string, any> = new Map();
  private isStarted = false;

  /**
   * Start all discovery workers
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      logger.warn('Discovery workers already started');
      return;
    }

    logger.info('Starting discovery workers...');

    for (const config of WORKER_CONFIGS) {
      await this.startWorker(config);
    }

    this.isStarted = true;
    logger.info('All discovery workers started successfully');
  }

  /**
   * Start a single worker
   */
  private async startWorker(config: WorkerConfig): Promise<void> {
    try {
      const worker = this.queueManager.registerWorker(
        config,
        async (job) => await discoveryJobProcessor.process(job)
      );

      this.workers.set(config.name, worker);

      logger.info(`Worker ${config.name} started`, {
        _queueName: config._queueName,
        _concurrency: config._concurrency,
      });
    } catch (err) {
      logger.error(`Failed to start worker ${config.name}`, err);
      throw err;
    }
  }

  /**
   * Stop all workers
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      logger.warn('Discovery workers not started');
      return;
    }

    logger.info('Stopping all discovery workers...');

    const stopPromises = Array.from(this.workers.entries()).map(
      async ([name, worker]) => {
        try {
          await worker.close();
          logger.info(`Worker ${name} stopped`);
        } catch (err) {
          logger.error(`Error stopping worker ${name}`, err);
        }
      }
    );

    await Promise.all(stopPromises);

    this.workers.clear();
    this.isStarted = false;
    logger.info('All discovery workers stopped');
  }

  /**
   * Pause a worker
   */
  async pauseWorker(workerName: string): Promise<void> {
    await this.queueManager.pauseWorker(workerName);
  }

  /**
   * Resume a worker
   */
  async resumeWorker(workerName: string): Promise<void> {
    await this.queueManager.resumeWorker(workerName);
  }

  /**
   * Get worker status
   */
  getWorkerStatus(workerName: string) {
    return this.queueManager.getWorkerStatus(workerName);
  }

  /**
   * Get all worker statuses
   */
  getAllWorkerStatuses() {
    return WORKER_CONFIGS.map((config) => ({
      name: config.name,
      ...this.queueManager.getWorkerStatus(config.name),
    }));
  }
}

// Singleton instance
let workerManager: DiscoveryWorkerManager | null = null;

/**
 * Get the singleton worker manager
 */
export function getDiscoveryWorkerManager(): DiscoveryWorkerManager {
  if (!workerManager) {
    workerManager = new DiscoveryWorkerManager();
  }
  return workerManager;
}
