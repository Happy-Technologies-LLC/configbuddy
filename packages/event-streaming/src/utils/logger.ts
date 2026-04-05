// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Logger for Event Streaming package
 *
 * Provides structured logging for Kafka operations
 */

import winston from 'winston';

/**
 * Create logger instance
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'event-streaming' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      ),
    }),
  ],
});

/**
 * Log event production
 */
export function logEventProduced(topic: string, eventId: string, eventType: string): void {
  logger.info('Event produced', {
    topic,
    eventId,
    eventType,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log event consumption
 */
export function logEventConsumed(topic: string, eventId: string, eventType: string, partition: number, offset: string): void {
  logger.info('Event consumed', {
    topic,
    eventId,
    eventType,
    partition,
    offset,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log event processing error
 */
export function logEventError(topic: string, eventId: string, error: Error): void {
  logger.error('Event processing error', {
    topic,
    eventId,
    error: {
      message: error.message,
      stack: error.stack,
    },
    timestamp: new Date().toISOString(),
  });
}
