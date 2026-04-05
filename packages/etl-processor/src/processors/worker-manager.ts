// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * ETL Worker Manager
 *
 * This module manages BullMQ workers for all ETL job types.
 */

import { getQueueManager, QUEUE_NAMES, logger } from '@cmdb/common';
import type { WorkerConfig } from '@cmdb/common';
import { etlJobProcessor } from './etl-processor';

/**
 * Worker configurations for ETL jobs
 */
const WORKER_CONFIGS: WorkerConfig[] = [
  {
    name: 'etl-sync-worker',
    _queueName: QUEUE_NAMES._ETL_SYNC,
    _concurrency: 5, // Process 5 sync jobs concurrently
    gracefulShutdown: true,
    shutdownTimeout: 60000,
  },
  {
    name: 'etl-change-detection-worker',
    _queueName: QUEUE_NAMES._ETL_CHANGE_DETECTION,
    _concurrency: 3,
    gracefulShutdown: true,
    shutdownTimeout: 60000,
  },
  {
    name: 'etl-reconciliation-worker',
    _queueName: QUEUE_NAMES._ETL_RECONCILIATION,
    _concurrency: 2,
    gracefulShutdown: true,
    shutdownTimeout: 120000,
  },
  {
    name: 'etl-full-refresh-worker',
    _queueName: QUEUE_NAMES._ETL_FULL_REFRESH,
    _concurrency: 1, // Single concurrent full refresh
    gracefulShutdown: true,
    shutdownTimeout: 300000, // 5 minutes for full refresh
  },
];

/**
 * ETL Worker Manager
 */
export class ETLWorkerManager {
  private queueManager = getQueueManager();
  private workers: Map<string, any> = new Map();
  private isStarted = false;

  /**
   * Start all ETL workers
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      logger.warn('ETL workers already started');
      return;
    }

    logger.info('Starting ETL workers...');

    for (const config of WORKER_CONFIGS) {
      await this.startWorker(config);
    }

    this.isStarted = true;
    logger.info('All ETL workers started successfully');
  }

  /**
   * Start a single worker
   */
  private async startWorker(config: WorkerConfig): Promise<void> {
    try {
      const worker = this.queueManager.registerWorker(
        config,
        async (job) => await etlJobProcessor.process(job)
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
      logger.warn('ETL workers not started');
      return;
    }

    logger.info('Stopping all ETL workers...');

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
    logger.info('All ETL workers stopped');
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
let workerManager: ETLWorkerManager | null = null;

/**
 * Get the singleton worker manager
 */
export function getETLWorkerManager(): ETLWorkerManager {
  if (!workerManager) {
    workerManager = new ETLWorkerManager();
  }
  return workerManager;
}
