/**
 * Worker CLI Commands
 *
 * This module provides CLI commands for managing BullMQ workers:
 * - Start/stop workers
 * - Check worker status
 * - Pause/resume workers
 */

import { Command } from 'commander';
import { logger } from '@cmdb/common';
import {
  getDiscoveryWorkerManager,
  getDiscoveryScheduler,
} from '@cmdb/discovery-engine';
import {
  getETLWorkerManager,
  getETLScheduler,
} from '@cmdb/etl-processor';

/**
 * Create worker command
 */
export function createWorkerCommand(): Command {
  const workerCmd = new Command('worker');
  workerCmd.description('Manage BullMQ workers');

  // Start worker command
  workerCmd
    .command('start <type>')
    .description('Start worker process (discovery, etl, or all)')
    .option('-s, --schedulers', 'Also start schedulers', false)
    .action(async (type: string, options) => {
      try {
        logger.info(`Starting ${type} workers...`);

        if (type === 'discovery' || type === 'all') {
          const discoveryWorkerManager = getDiscoveryWorkerManager();
          await discoveryWorkerManager.start();
          logger.info('Discovery workers started');

          if (options.schedulers) {
            const discoveryScheduler = getDiscoveryScheduler();
            await discoveryScheduler.start();
            logger.info('Discovery schedulers started');
          }
        }

        if (type === 'etl' || type === 'all') {
          const etlWorkerManager = getETLWorkerManager();
          await etlWorkerManager.start();
          logger.info('ETL workers started');

          if (options.schedulers) {
            const etlScheduler = getETLScheduler();
            await etlScheduler.start();
            logger.info('ETL schedulers started');
          }
        }

        if (type !== 'discovery' && type !== 'etl' && type !== 'all') {
          logger.error(`Unknown worker type: ${type}`);
          logger.info('Valid types: discovery, etl, all');
          process.exit(1);
        }

        logger.info(`${type} workers started successfully`);

        // Keep process running
        process.on('SIGINT', async () => {
          logger.info('Shutting down workers...');
          process.exit(0);
        });

        process.on('SIGTERM', async () => {
          logger.info('Shutting down workers...');
          process.exit(0);
        });
      } catch (err: any) {
        logger.error('Error starting workers', err);
        process.exit(1);
      }
    });

  // Stop worker command
  workerCmd
    .command('stop <type>')
    .description('Stop worker process (discovery, etl, or all)')
    .action(async (type: string) => {
      try {
        logger.info(`Stopping ${type} workers...`);

        if (type === 'discovery' || type === 'all') {
          const discoveryWorkerManager = getDiscoveryWorkerManager();
          await discoveryWorkerManager.stop();
          const discoveryScheduler = getDiscoveryScheduler();
          await discoveryScheduler.stop();
          logger.info('Discovery workers and schedulers stopped');
        }

        if (type === 'etl' || type === 'all') {
          const etlWorkerManager = getETLWorkerManager();
          await etlWorkerManager.stop();
          const etlScheduler = getETLScheduler();
          await etlScheduler.stop();
          logger.info('ETL workers and schedulers stopped');
        }

        logger.info(`${type} workers stopped successfully`);
        process.exit(0);
      } catch (err: any) {
        logger.error('Error stopping workers', err);
        process.exit(1);
      }
    });

  // Worker status command
  workerCmd
    .command('status')
    .description('Show worker status')
    .action(async () => {
      try {
        const discoveryWorkerManager = getDiscoveryWorkerManager();
        const etlWorkerManager = getETLWorkerManager();

        const discoveryWorkersStatus = await discoveryWorkerManager.getAllWorkerStatuses();
        const etlWorkersStatus = await etlWorkerManager.getAllWorkerStatuses();

        console.log('\n=== Discovery Workers ===');
        if (Array.isArray(discoveryWorkersStatus)) {
          discoveryWorkersStatus.forEach((worker: any) => {
            console.log(`${worker._name || worker.name}:`);
            console.log(`  Running: ${worker._isRunning || worker.running ? 'Yes' : 'No'}`);
            console.log(`  Concurrency: ${worker._concurrency || worker.concurrency}`);
          });
        }

        console.log('\n=== ETL Workers ===');
        if (typeof etlWorkersStatus === 'object' && etlWorkersStatus !== null) {
          console.log(`  Healthy: ${(etlWorkersStatus as any).healthy ? 'Yes' : 'No'}`);
          console.log(`  Running: ${(etlWorkersStatus as any).running ? 'Yes' : 'No'}`);
        }

        console.log('');
        process.exit(0);
      } catch (err: any) {
        logger.error('Error getting worker status', err);
        process.exit(1);
      }
    });

  // Pause worker command
  workerCmd
    .command('pause <workerName>')
    .description('Pause a worker')
    .action(async (workerName: string) => {
      try {
        // TODO: Implement pauseWorker method in DiscoveryOrchestrator
        logger.info('Pause worker functionality not yet implemented');
        console.log(`Worker pause feature coming soon. Worker: ${workerName}`);
        process.exit(0);
      } catch (err: any) {
        logger.error('Error pausing worker', err);
        process.exit(1);
      }
    });

  // Resume worker command
  workerCmd
    .command('resume <workerName>')
    .description('Resume a paused worker')
    .action(async (workerName: string) => {
      try {
        // TODO: Implement resumeWorker method in DiscoveryOrchestrator
        logger.info('Resume worker functionality not yet implemented');
        console.log(`Worker resume feature coming soon. Worker: ${workerName}`);
        process.exit(0);
      } catch (err: any) {
        logger.error('Error resuming worker', err);
        process.exit(1);
      }
    });

  return workerCmd;
}
