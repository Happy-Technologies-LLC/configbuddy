// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Scheduler Sync Service
 *
 * Polls PostgreSQL for discovery definition changes and syncs the scheduler
 * accordingly. Ensures that the scheduler stays in sync with database changes
 * made via API or admin UI.
 *
 * Features:
 * - Polls every 60 seconds for definition changes
 * - Tracks last update timestamp to detect changes
 * - Calls discoveryScheduler.syncSchedules() when changes detected
 * - Gracefully handles database connection errors
 * - Singleton pattern
 */

import { logger } from '@cmdb/common';
import { getPostgresClient } from '@cmdb/database';
import { getDiscoveryScheduler } from './discovery-scheduler';

export class SchedulerSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastSyncTimestamp: Date | null = null;
  private pollIntervalMs = 60000; // 60 seconds

  /**
   * Start the sync service
   * Begins polling for definition changes
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Scheduler sync service already running');
      return;
    }

    logger.info('Starting scheduler sync service', {
      pollIntervalMs: this.pollIntervalMs,
    });

    // Do initial sync
    await this.syncIfChanged();

    // Start polling
    this.syncInterval = setInterval(() => {
      this.syncIfChanged().catch((error) => {
        logger.error('Error during scheduled sync', error);
      });
    }, this.pollIntervalMs);

    this.isRunning = true;
    logger.info('Scheduler sync service started');
  }

  /**
   * Stop the sync service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Scheduler sync service not running');
      return;
    }

    logger.info('Stopping scheduler sync service...');

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.isRunning = false;
    logger.info('Scheduler sync service stopped');
  }

  /**
   * Check if definitions have changed and sync if needed
   */
  private async syncIfChanged(): Promise<void> {
    try {
      const hasChanges = await this.checkForChanges();

      if (hasChanges) {
        logger.info('Discovery definition changes detected, syncing schedules...');
        const scheduler = getDiscoveryScheduler();
        await scheduler.syncSchedules();
        logger.info('Schedules synced successfully');
      }
    } catch (error) {
      // Log error but don't throw - we'll retry on next poll
      logger.error('Failed to check for changes or sync schedules', error);
    }
  }

  /**
   * Check if any discovery definitions have changed since last sync
   * Returns true if changes detected
   */
  private async checkForChanges(): Promise<boolean> {
    const postgresClient = getPostgresClient();
    const pool = postgresClient['pool'];

    try {
      // Query for the most recent update timestamp
      const result = await pool.query(
        `SELECT MAX(updated_at) as last_updated
         FROM discovery_definitions
         WHERE schedule IS NOT NULL`
      );

      if (result.rows.length === 0 || !result.rows[0].last_updated) {
        // No definitions exist
        if (this.lastSyncTimestamp !== null) {
          // We had definitions before, but now we don't - this is a change
          this.lastSyncTimestamp = null;
          return true;
        }
        return false;
      }

      const dbLastUpdated = new Date(result.rows[0].last_updated);

      if (this.lastSyncTimestamp === null) {
        // First sync
        this.lastSyncTimestamp = dbLastUpdated;
        return true;
      }

      if (dbLastUpdated > this.lastSyncTimestamp) {
        // Changes detected
        this.lastSyncTimestamp = dbLastUpdated;
        return true;
      }

      // No changes
      return false;
    } catch (error) {
      logger.error('Error checking for definition changes', error);
      throw error;
    }
  }

  /**
   * Set custom poll interval (for testing)
   */
  setPollInterval(intervalMs: number): void {
    if (this.isRunning) {
      throw new Error('Cannot change poll interval while service is running');
    }
    this.pollIntervalMs = intervalMs;
  }

  /**
   * Force an immediate sync (for testing or manual triggering)
   */
  async forceSync(): Promise<void> {
    logger.info('Forcing immediate schedule sync...');
    const scheduler = getDiscoveryScheduler();
    await scheduler.syncSchedules();
    // Update timestamp to prevent duplicate sync on next poll
    this.lastSyncTimestamp = new Date();
  }

  /**
   * Get sync service status
   */
  getStatus(): {
    isRunning: boolean;
    lastSyncTimestamp: Date | null;
    pollIntervalMs: number;
  } {
    return {
      isRunning: this.isRunning,
      lastSyncTimestamp: this.lastSyncTimestamp,
      pollIntervalMs: this.pollIntervalMs,
    };
  }
}

// Singleton instance
let schedulerSyncService: SchedulerSyncService | null = null;

/**
 * Get the singleton scheduler sync service
 */
export function getSchedulerSyncService(): SchedulerSyncService {
  if (!schedulerSyncService) {
    schedulerSyncService = new SchedulerSyncService();
  }
  return schedulerSyncService;
}
