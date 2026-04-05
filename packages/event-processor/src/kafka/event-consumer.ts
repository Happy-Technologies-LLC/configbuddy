// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Kafka Event Consumer
 */

import {
  Kafka,
  Consumer,
  EachMessagePayload,
} from 'kafkajs';
import { logger } from '@cmdb/common';
import { CMDBEvent, EventType } from '../types/events';

export type EventHandler = (event: CMDBEvent) => Promise<void>;

export class EventConsumer {
  private kafka: Kafka;
  private consumer: Consumer;
  private isConnected: boolean = false;
  private handlers: Map<EventType | string, EventHandler[]> = new Map();

  constructor(
    groupId: string,
    brokers: string[] = ['localhost:9092'],
    clientId: string = 'cmdb-event-consumer'
  ) {
    this.kafka = new Kafka({
      clientId,
      brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.consumer = this.kafka.consumer({
      groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await this.consumer.connect();
      this.isConnected = true;
      logger.info('Kafka consumer connected');
    } catch (error) {
      logger.error('Failed to connect Kafka consumer', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.consumer.disconnect();
      this.isConnected = false;
      logger.info('Kafka consumer disconnected');
    } catch (error) {
      logger.error('Failed to disconnect Kafka consumer', { error });
      throw error;
    }
  }

  /**
   * Subscribe to one or more topics
   */
  async subscribe(topics: string | string[], fromBeginning: boolean = false): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    const topicList = Array.isArray(topics) ? topics : [topics];

    try {
      await this.consumer.subscribe({
        topics: topicList,
        fromBeginning,
      });

      logger.info('Subscribed to topics', { topics: topicList });
    } catch (error) {
      logger.error('Failed to subscribe to topics', { topics: topicList, error });
      throw error;
    }
  }

  /**
   * Register handler for specific event type
   */
  on(eventType: EventType | string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);

    logger.debug('Event handler registered', { event_type: eventType });
  }

  /**
   * Register handler for all event types (wildcard)
   */
  onAny(handler: EventHandler): void {
    this.on('*', handler);
  }

  /**
   * Start consuming messages
   */
  async run(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload);
        },
      });

      logger.info('Consumer started');
    } catch (error) {
      logger.error('Consumer run failed', { error });
      throw error;
    }
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;

    try {
      // Parse event
      const eventJson = message.value?.toString();
      if (!eventJson) {
        logger.warn('Received empty message', { topic, partition });
        return;
      }

      const event: CMDBEvent = JSON.parse(eventJson);

      // Get handlers for this event type
      const specificHandlers = this.handlers.get(event.event_type) || [];
      const wildcardHandlers = this.handlers.get('*') || [];
      const allHandlers = [...specificHandlers, ...wildcardHandlers];

      if (allHandlers.length === 0) {
        logger.debug('No handlers for event type', {
          event_type: event.event_type,
          event_id: event.event_id,
        });
        return;
      }

      // Execute all handlers
      await Promise.all(
        allHandlers.map(async handler => {
          try {
            await handler(event);
          } catch (handlerError) {
            logger.error('Event handler failed', {
              event_id: event.event_id,
              event_type: event.event_type,
              error: handlerError,
            });
            // Don't throw - allow other handlers to execute
          }
        })
      );

      logger.debug('Event processed', {
        event_id: event.event_id,
        event_type: event.event_type,
        handlers_executed: allHandlers.length,
      });
    } catch (error) {
      logger.error('Failed to process message', {
        topic,
        partition,
        offset: message.offset,
        error,
      });
      // Message will be reprocessed on next consumer restart if not committed
      throw error;
    }
  }

  /**
   * Pause consumption
   */
  async pause(topics?: string[]): Promise<void> {
    if (topics) {
      this.consumer.pause(topics.map(topic => ({ topic })));
    } else {
      this.consumer.pause([]);
    }

    logger.info('Consumer paused', { topics });
  }

  /**
   * Resume consumption
   */
  async resume(topics?: string[]): Promise<void> {
    if (topics) {
      this.consumer.resume(topics.map(topic => ({ topic })));
    } else {
      this.consumer.resume([]);
    }

    logger.info('Consumer resumed', { topics });
  }

  /**
   * Seek to specific offset
   */
  async seek(topic: string, partition: number, offset: string): Promise<void> {
    this.consumer.seek({ topic, partition, offset });
    logger.info('Consumer seek', { topic, partition, offset });
  }
}

/**
 * Create a new consumer instance
 */
export function createEventConsumer(groupId: string): EventConsumer {
  const brokers = process.env['KAFKA_BROKERS']?.split(',') || ['localhost:9092'];
  return new EventConsumer(groupId, brokers);
}
