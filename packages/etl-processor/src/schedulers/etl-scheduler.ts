// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * ETL Job Scheduler
 *
 * This module implements scheduled ETL jobs using BullMQ repeatable jobs.
 * Supports different ETL job types: sync, change detection, reconciliation, full refresh.
 */

import { getQueueManager, QUEUE_NAMES, logger } from '@cmdb/common';
import type { ETLJobData, ETLJobType } from '@cmdb/common';
import { v4 as uuidv4 } from 'uuid';

/**
 * ETL Schedule configuration
 */
interface ETLSchedule {
  _type: ETLJobType;
  _queueName: string;
  _cronPattern: string;
  _enabled: boolean;
  _config: any;
}

/**
 * Default ETL schedules
 */
const DEFAULT_SCHEDULES: ETLSchedule[] = [
  {
    _type: 'sync',
    _queueName: QUEUE_NAMES._ETL_SYNC,
    _cronPattern: '*/5 * * * *', // Every 5 minutes (incremental sync)
    _enabled: true,
    _config: {
      _source: 'neo4j',
      _target: 'postgres',
      _batchSize: 1000,
    },
  },
  {
    _type: 'change-detection',
    _queueName: QUEUE_NAMES._ETL_CHANGE_DETECTION,
    _cronPattern: '*/10 * * * *', // Every 10 minutes
    _enabled: true,
    _config: {
      _source: 'neo4j',
      _batchSize: 500,
    },
  },
  {
    _type: 'reconciliation',
    _queueName: QUEUE_NAMES._ETL_RECONCILIATION,
    _cronPattern: '0 * * * *', // Every hour
    _enabled: true,
    _config: {
      _source: 'neo4j',
      _target: 'postgres',
      _batchSize: 2000,
    },
  },
  {
    _type: 'full-refresh',
    _queueName: QUEUE_NAMES._ETL_FULL_REFRESH,
    _cronPattern: '0 2 * * *', // Daily at 2 AM
    _enabled: true,
    _config: {
      _source: 'neo4j',
      _target: 'postgres',
      _batchSize: 5000,
      _tables: ['dim_ci', 'dim_location', 'dim_owner', 'fact_discovery', 'fact_changes'],
    },
  },
];

/**
 * ETL Scheduler
 */
export class ETLScheduler {
  private queueManager = getQueueManager();
  private schedules: Map<ETLJobType, ETLSchedule> = new Map();
  private isStarted = false;

  constructor(customSchedules?: ETLSchedule[]) {
    // Load default schedules
    const schedules = customSchedules || DEFAULT_SCHEDULES;
    schedules.forEach((schedule) => {
      this.schedules.set(schedule._type, schedule);
    });

    logger.info('ETL scheduler initialized', {
      _scheduleCount: this.schedules.size,
    });
  }

  /**
   * Start all scheduled ETL jobs
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      logger.warn('ETL scheduler already started');
      return;
    }

    logger.info('Starting ETL scheduler...');

    for (const [type, schedule] of this.schedules.entries()) {
      if (!schedule._enabled) {
        logger.info(`Skipping disabled schedule for ${type}`);
        continue;
      }

      await this.scheduleETLJob(schedule);
    }

    this.isStarted = true;
    logger.info('ETL scheduler started successfully');
  }

  /**
   * Schedule an ETL job
   */
  private async scheduleETLJob(schedule: ETLSchedule): Promise<void> {
    const { _type: type, _queueName: queueName, _cronPattern: cronPattern, _config: config } = schedule;

    try {
      const jobData: ETLJobData = {
        _jobId: uuidv4(),
        _type: type,
        _config: config,
        _createdAt: new Date().toISOString(),
        triggeredBy: 'scheduler',
      };

      await this.queueManager.addRepeatableJob(
        queueName,
        `etl-${type}`,
        jobData,
        {
          pattern: cronPattern,
          immediately: false,
        }
      );

      logger.info(`Scheduled ETL job for ${type}`, {
        cronPattern,
        queueName,
      });
    } catch (err) {
      logger.error(`Failed to schedule ETL job for ${type}`, err);
      throw err;
    }
  }

  /**
   * Trigger immediate ETL job
   */
  async triggerETL(
    type: ETLJobType,
    config?: any,
    triggeredBy?: string
  ): Promise<string> {
    const schedule = this.schedules.get(type);
    if (!schedule) {
      throw new Error(`No schedule found for ETL type: ${type}`);
    }

    const jobData: ETLJobData = {
      _jobId: uuidv4(),
      _type: type,
      _config: config || schedule._config,
      _createdAt: new Date().toISOString(),
      triggeredBy: triggeredBy || 'manual',
    };

    const job = await this.queueManager.addJob(
      schedule._queueName,
      `etl-${type}-manual`,
      jobData,
      {
        _priority: type === 'full-refresh' ? 1 : 10, // Lower priority for full refresh
      }
    );

    logger.info(`Triggered immediate ETL job for ${type}`, {
      _jobId: job.id,
      triggeredBy,
    });

    return job.id!;
  }

  /**
   * Update schedule for an ETL type
   */
  async updateSchedule(type: ETLJobType, cronPattern: string): Promise<void> {
    const schedule = this.schedules.get(type);
    if (!schedule) {
      throw new Error(`No schedule found for ETL type: ${type}`);
    }

    // Remove old schedule
    await this.removeSchedule(type);

    // Update and add new schedule
    schedule._cronPattern = cronPattern;
    await this.scheduleETLJob(schedule);

    logger.info(`Updated schedule for ${type}`, { cronPattern });
  }

  /**
   * Enable schedule for an ETL type
   */
  async enableSchedule(type: ETLJobType): Promise<void> {
    const schedule = this.schedules.get(type);
    if (!schedule) {
      throw new Error(`No schedule found for ETL type: ${type}`);
    }

    if (schedule._enabled) {
      logger.warn(`Schedule for ${type} already enabled`);
      return;
    }

    schedule._enabled = true;
    await this.scheduleETLJob(schedule);

    logger.info(`Enabled schedule for ${type}`);
  }

  /**
   * Disable schedule for an ETL type
   */
  async disableSchedule(type: ETLJobType): Promise<void> {
    const schedule = this.schedules.get(type);
    if (!schedule) {
      throw new Error(`No schedule found for ETL type: ${type}`);
    }

    if (!schedule._enabled) {
      logger.warn(`Schedule for ${type} already disabled`);
      return;
    }

    schedule._enabled = false;
    await this.removeSchedule(type);

    logger.info(`Disabled schedule for ${type}`);
  }

  /**
   * Remove schedule for an ETL type
   */
  private async removeSchedule(type: ETLJobType): Promise<void> {
    const schedule = this.schedules.get(type);
    if (!schedule) {
      return;
    }

    const queue = this.queueManager.getQueue(schedule._queueName);
    const repeatableJobs = await queue.getRepeatableJobs();

    for (const job of repeatableJobs) {
      if (job.name === `etl-${type}`) {
        await queue.removeRepeatableByKey(job.key);
        logger.info(`Removed repeatable job for ${type}`, { key: job.key });
      }
    }
  }

  /**
   * Get all schedules
   */
  getSchedules(): ETLSchedule[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Get schedule for an ETL type
   */
  getSchedule(type: ETLJobType): ETLSchedule | undefined {
    return this.schedules.get(type);
  }

  /**
   * Stop scheduler (remove all repeatable jobs)
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      logger.warn('ETL scheduler not started');
      return;
    }

    logger.info('Stopping ETL scheduler...');

    for (const type of this.schedules.keys()) {
      await this.removeSchedule(type);
    }

    this.isStarted = false;
    logger.info('ETL scheduler stopped');
  }
}

// Singleton instance
let etlScheduler: ETLScheduler | null = null;

/**
 * Get the singleton ETL scheduler
 */
export function getETLScheduler(customSchedules?: ETLSchedule[]): ETLScheduler {
  if (!etlScheduler) {
    etlScheduler = new ETLScheduler(customSchedules);
  }
  return etlScheduler;
}
