// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Event Processor - Main Entry Point
 */

export * from './types/events';
export * from './kafka/topics';
export * from './kafka/event-producer';
export * from './kafka/event-consumer';
export * from './processors/change-event-processor';
export * from './processors/metrics-aggregator';

import { logger } from '@cmdb/common';
import { ChangeEventProcessor } from './processors/change-event-processor';
import { MetricsAggregator } from './processors/metrics-aggregator';

/**
 * Start all event processors
 */
export async function startEventProcessors(): Promise<void> {
  logger.info('Starting event processors...');

  const changeProcessor = new ChangeEventProcessor();
  const metricsAggregator = new MetricsAggregator();

  await Promise.all([changeProcessor.start(), metricsAggregator.start()]);

  logger.info('All event processors started');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down event processors...');
    await Promise.all([changeProcessor.stop(), metricsAggregator.stop()]);
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down event processors...');
    await Promise.all([changeProcessor.stop(), metricsAggregator.stop()]);
    process.exit(0);
  });
}

// Start processors if executed directly
if (require.main === module) {
  startEventProcessors().catch(error => {
    logger.error('Failed to start event processors', { error });
    process.exit(1);
  });
}
