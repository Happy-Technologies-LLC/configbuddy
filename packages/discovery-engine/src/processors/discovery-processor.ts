/**
 * Discovery Job Processor
 *
 * This module implements the worker processor for discovery jobs.
 * It executes discovery workers and persists results to Neo4j.
 */

import { Job } from 'bullmq';
import { logger, getQueueManager } from '@cmdb/common';
import type {
  DiscoveryJobData,
  JobResult,
  JobProgress,
  DiscoveryProvider,
} from '@cmdb/common';
import { getNeo4jClient } from '@cmdb/database';

// Import discovery workers
// NOTE: Cloud provider workers (AWS, Azure, GCP) removed in v2.0 - now handled by connector framework
import { SSHDiscoveryWorker } from '../workers/ssh-discovery.worker';
import { NmapDiscoveryWorker } from '../workers/nmap-discovery.worker';
import { ActiveDirectoryDiscoveryWorker } from '../workers/active-directory-discovery.worker';

/**
 * Discovery Job Processor
 */
export class DiscoveryJobProcessor {
  private neo4jClient = getNeo4jClient();
  private queueManager = getQueueManager();

  /**
   * Process a discovery job
   */
  async process(job: Job<DiscoveryJobData>): Promise<JobResult> {
    const { _jobId: jobId, _provider: provider, _config: config, triggeredBy } = job.data;
    const startTime = Date.now();

    logger.info(`Processing discovery job ${jobId}`, {
      provider,
      triggeredBy,
    });

    try {
      // Update progress: Starting
      await this.updateProgress(job, {
        _percent: 0,
        _currentStep: 'initializing',
        _totalSteps: 3,
        _itemsProcessed: 0,
        totalItems: undefined,
        _startedAt: new Date().toISOString(),
        _updatedAt: new Date().toISOString(),
      });

      // Get the appropriate discovery worker
      const worker = this.getDiscoveryWorker(provider);

      // Update progress: Discovering
      await this.updateProgress(job, {
        _percent: 10,
        _currentStep: 'discovering',
        _totalSteps: 3,
        _itemsProcessed: 0,
        _startedAt: new Date(startTime).toISOString(),
        _updatedAt: new Date().toISOString(),
      });

      // Execute discovery
      const discoveredCIs = await worker.discover(config);

      logger.info(`Discovered ${discoveredCIs.length} CIs for ${provider}`, {
        jobId,
      });

      // Update progress: Persisting
      await this.updateProgress(job, {
        _percent: 50,
        _currentStep: 'persisting',
        _totalSteps: 3,
        _itemsProcessed: 0,
        totalItems: discoveredCIs.length,
        _startedAt: new Date(startTime).toISOString(),
        _updatedAt: new Date().toISOString(),
      });

      // Persist to Neo4j
      const result = await this.persistDiscoveredCIs(
        discoveredCIs,
        jobId,
        job
      );

      // Update progress: Completed
      await this.updateProgress(job, {
        _percent: 100,
        _currentStep: 'completed',
        _totalSteps: 3,
        _itemsProcessed: result._itemsProcessed,
        totalItems: discoveredCIs.length,
        _startedAt: new Date(startTime).toISOString(),
        _updatedAt: new Date().toISOString(),
      });

      const jobResult: JobResult = {
        _jobId: jobId,
        _status: 'completed',
        _itemsProcessed: result._itemsProcessed,
        _itemsCreated: result._itemsCreated,
        _itemsUpdated: result._itemsUpdated,
        _itemsFailed: result._itemsFailed,
        _startedAt: new Date(startTime).toISOString(),
        _completedAt: new Date().toISOString(),
        _durationMs: Date.now() - startTime,
        metadata: {
          provider,
          triggeredBy,
        },
      };

      logger.info(`Discovery job ${jobId} completed successfully`, jobResult);

      return jobResult;
    } catch (err: any) {
      logger.error(`Discovery job ${jobId} failed`, err);

      // Return failed job result
      return {
        _jobId: jobId,
        _status: 'failed',
        _itemsProcessed: 0,
        _itemsCreated: 0,
        _itemsUpdated: 0,
        _itemsFailed: 0,
        _startedAt: new Date(startTime).toISOString(),
        _completedAt: new Date().toISOString(),
        _durationMs: Date.now() - startTime,
        error: err.message,
        metadata: {
          provider,
          triggeredBy,
        },
      };
    }
  }

  /**
   * Get discovery worker for provider
   * NOTE: Cloud providers (AWS, Azure, GCP, Kubernetes) are NOT part of Discovery system.
   * They are for Connector use only.
   */
  private getDiscoveryWorker(provider: DiscoveryProvider): any {
    switch (provider) {
      case 'ssh':
        return new SSHDiscoveryWorker();
      case 'nmap':
        return new NmapDiscoveryWorker();
      case 'active-directory':
      case 'snmp':
        throw new Error(`Discovery provider ${provider} not yet implemented`);
      default:
        throw new Error(`Unknown discovery provider: ${provider}`);
    }
  }

  /**
   * Persist discovered CIs to Neo4j
   */
  private async persistDiscoveredCIs(
    discoveredCIs: any[],
    _jobId: string,
    job: Job
  ): Promise<{
    _itemsProcessed: number;
    _itemsCreated: number;
    _itemsUpdated: number;
    _itemsFailed: number;
  }> {
    let itemsCreated = 0;
    let itemsUpdated = 0;
    let itemsFailed = 0;

    const session = this.neo4jClient.getSession();

    try {
      for (let i = 0; i < discoveredCIs.length; i++) {
        const ci = discoveredCIs[i];

        try {
          // Check if CI exists
          const existingCI = await session.run(
            `
            MATCH (c:CI {id: $id})
            RETURN c
            `,
            { id: ci.id }
          );

          if (existingCI.records.length > 0) {
            // Update existing CI
            await session.run(
              `
              MATCH (c:CI {id: $id})
              SET c.name = $name,
                  c.status = $status,
                  c.updated_at = $updated_at,
                  c.discovered_at = $discovered_at,
                  c.metadata = $metadata
              `,
              {
                _id: ci.id,
                _name: ci.name,
                _status: ci.status || 'active',
                _updated_at: new Date().toISOString(),
                _discovered_at: ci.discovered_at,
                _metadata: JSON.stringify(ci.metadata || {}),
              }
            );
            itemsUpdated++;
          } else {
            // Create new CI
            await session.run(
              `
              CREATE (c:CI:${ci.type.replace(/-/g, '_')} {
                _id: $id,
                _external_id: $external_id,
                _name: $name,
                _type: $type,
                _status: $status,
                _environment: $environment,
                _created_at: $created_at,
                _updated_at: $updated_at,
                _discovered_at: $discovered_at,
                _metadata: $metadata
              })
              `,
              {
                _id: ci.id,
                _external_id: ci.external_id,
                _name: ci.name,
                _type: ci.type,
                _status: ci.status || 'active',
                _environment: ci.environment,
                _created_at: new Date().toISOString(),
                _updated_at: new Date().toISOString(),
                _discovered_at: ci.discovered_at,
                _metadata: JSON.stringify(ci.metadata || {}),
              }
            );
            itemsCreated++;
          }

          // Update progress every 10 items
          if ((i + 1) % 10 === 0) {
            const progress = Math.floor(50 + ((i + 1) / discoveredCIs.length) * 50);
            await this.updateProgress(job, {
              _percent: progress,
              _currentStep: 'persisting',
              _totalSteps: 3,
              _itemsProcessed: i + 1,
              totalItems: discoveredCIs.length,
              _startedAt: job.processedOn ? new Date(job.processedOn).toISOString() : new Date().toISOString(),
              _updatedAt: new Date().toISOString(),
            });
          }
        } catch (err: any) {
          logger.error(`Failed to persist CI ${ci.id}`, err);
          itemsFailed++;
        }
      }
    } finally {
      await session.close();
    }

    return {
      _itemsProcessed: discoveredCIs.length,
      _itemsCreated: itemsCreated,
      _itemsUpdated: itemsUpdated,
      _itemsFailed: itemsFailed,
    };
  }

  /**
   * Update job progress
   */
  private async updateProgress(
    job: Job,
    progress: JobProgress
  ): Promise<void> {
    await this.queueManager.updateJobProgress(job, progress);
  }
}

// Export singleton instance
export const discoveryJobProcessor = new DiscoveryJobProcessor();
