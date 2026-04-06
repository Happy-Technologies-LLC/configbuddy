// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Unit tests for EventConsumer
 */

import { EventConsumer, createEventConsumer } from '../../src/kafka/event-consumer';
import { EventType, CMDBEvent } from '../../src/types/events';

// Mock kafkajs
jest.mock('kafkajs');

// Mock logger
jest.mock('@cmdb/common', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { Kafka } from 'kafkajs';
import { logger } from '@cmdb/common';

describe('EventConsumer', () => {
  let consumer: EventConsumer;
  let mockKafkaConsumer: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockKafkaConsumer = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(undefined),
      run: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn(),
      resume: jest.fn(),
      seek: jest.fn(),
    };

    (Kafka as jest.MockedClass<typeof Kafka>).mockImplementation(() => ({
      consumer: jest.fn(() => mockKafkaConsumer),
      producer: jest.fn(),
      admin: jest.fn(),
      logger: jest.fn(),
    } as any));

    consumer = new EventConsumer('test-group', ['localhost:9092'], 'test-client');
  });

  describe('connect', () => {
    it('should connect to Kafka successfully', async () => {
      await consumer.connect();

      expect(mockKafkaConsumer.connect).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Kafka consumer connected');
    });

    it('should not reconnect if already connected', async () => {
      await consumer.connect();
      jest.clearAllMocks();

      await consumer.connect();

      expect(mockKafkaConsumer.connect).not.toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      mockKafkaConsumer.connect.mockRejectedValue(error);

      await expect(consumer.connect()).rejects.toThrow('Connection failed');
      expect(logger.error).toHaveBeenCalledWith('Failed to connect Kafka consumer', { error });
    });
  });

  describe('disconnect', () => {
    it('should disconnect from Kafka successfully', async () => {
      await consumer.connect();
      await consumer.disconnect();

      expect(mockKafkaConsumer.disconnect).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Kafka consumer disconnected');
    });

    it('should not disconnect if not connected', async () => {
      await consumer.disconnect();

      expect(mockKafkaConsumer.disconnect).not.toHaveBeenCalled();
    });

    it('should handle disconnection errors', async () => {
      await consumer.connect();

      const error = new Error('Disconnection failed');
      mockKafkaConsumer.disconnect.mockRejectedValue(error);

      await expect(consumer.disconnect()).rejects.toThrow('Disconnection failed');
      expect(logger.error).toHaveBeenCalledWith('Failed to disconnect Kafka consumer', { error });
    });
  });

  describe('subscribe', () => {
    it('should subscribe to a single topic', async () => {
      await consumer.subscribe('cmdb.ci.events');

      expect(mockKafkaConsumer.subscribe).toHaveBeenCalledWith({
        topics: ['cmdb.ci.events'],
        fromBeginning: false,
      });
      expect(logger.info).toHaveBeenCalledWith('Subscribed to topics', { topics: ['cmdb.ci.events'] });
    });

    it('should subscribe to multiple topics', async () => {
      await consumer.subscribe(['cmdb.ci.events', 'cmdb.ci.changes']);

      expect(mockKafkaConsumer.subscribe).toHaveBeenCalledWith({
        topics: ['cmdb.ci.events', 'cmdb.ci.changes'],
        fromBeginning: false,
      });
    });

    it('should support fromBeginning option', async () => {
      await consumer.subscribe('cmdb.ci.events', true);

      expect(mockKafkaConsumer.subscribe).toHaveBeenCalledWith({
        topics: ['cmdb.ci.events'],
        fromBeginning: true,
      });
    });

    it('should auto-connect if not connected', async () => {
      await consumer.subscribe('cmdb.ci.events');

      expect(mockKafkaConsumer.connect).toHaveBeenCalled();
    });

    it('should handle subscription errors', async () => {
      const error = new Error('Subscription failed');
      mockKafkaConsumer.subscribe.mockRejectedValue(error);

      await expect(consumer.subscribe('invalid-topic')).rejects.toThrow('Subscription failed');
      expect(logger.error).toHaveBeenCalledWith('Failed to subscribe to topics', expect.any(Object));
    });
  });

  describe('on (handler registration)', () => {
    it('should register event handler for specific type', () => {
      const handler = jest.fn();

      consumer.on(EventType.CI_DISCOVERED, handler);

      expect(logger.debug).toHaveBeenCalledWith('Event handler registered', {
        event_type: EventType.CI_DISCOVERED,
      });
    });

    it('should register multiple handlers for same event type', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      consumer.on(EventType.CI_DISCOVERED, handler1);
      consumer.on(EventType.CI_DISCOVERED, handler2);

      // Both handlers should be registered
      const handlers = (consumer as any).handlers.get(EventType.CI_DISCOVERED);
      expect(handlers).toHaveLength(2);
    });

    it('should register wildcard handler', () => {
      const handler = jest.fn();

      consumer.onAny(handler);

      const handlers = (consumer as any).handlers.get('*');
      expect(handlers).toContain(handler);
    });
  });

  describe('run', () => {
    it('should start consuming messages', async () => {
      await consumer.run();

      expect(mockKafkaConsumer.run).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Consumer started');
    });

    it('should auto-connect if not connected', async () => {
      await consumer.run();

      expect(mockKafkaConsumer.connect).toHaveBeenCalled();
    });

    it('should handle run errors', async () => {
      const error = new Error('Run failed');
      mockKafkaConsumer.run.mockRejectedValue(error);

      await expect(consumer.run()).rejects.toThrow('Run failed');
      expect(logger.error).toHaveBeenCalledWith('Consumer run failed', { error });
    });
  });

  describe('handleMessage', () => {
    it('should parse and handle valid message', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      consumer.on(EventType.CI_DISCOVERED, handler);

      const event: CMDBEvent = {
        event_id: 'evt-1',
        event_type: EventType.CI_DISCOVERED,
        timestamp: new Date(),
      };

      const message = {
        value: Buffer.from(JSON.stringify(event)),
        offset: '0',
      };

      const payload = {
        topic: 'cmdb.ci.events',
        partition: 0,
        message,
      };

      await (consumer as any).handleMessage(payload);

      // After JSON serialization/deserialization, the Date becomes an ISO string
      expect(handler).toHaveBeenCalledWith({
        ...event,
        timestamp: event.timestamp.toISOString(),
      });
      expect(logger.debug).toHaveBeenCalledWith('Event processed', expect.any(Object));
    });

    it('should execute wildcard handlers', async () => {
      const specificHandler = jest.fn().mockResolvedValue(undefined);
      const wildcardHandler = jest.fn().mockResolvedValue(undefined);

      consumer.on(EventType.CI_DISCOVERED, specificHandler);
      consumer.onAny(wildcardHandler);

      const event: CMDBEvent = {
        event_id: 'evt-1',
        event_type: EventType.CI_DISCOVERED,
        timestamp: new Date(),
      };

      const message = {
        value: Buffer.from(JSON.stringify(event)),
        offset: '0',
      };

      const payload = {
        topic: 'cmdb.ci.events',
        partition: 0,
        message,
      };

      await (consumer as any).handleMessage(payload);

      expect(specificHandler).toHaveBeenCalled();
      expect(wildcardHandler).toHaveBeenCalled();
    });

    it('should handle empty message gracefully', async () => {
      const payload = {
        topic: 'cmdb.ci.events',
        partition: 0,
        message: { value: null, offset: '0' },
      };

      await (consumer as any).handleMessage(payload);

      expect(logger.warn).toHaveBeenCalledWith('Received empty message', expect.any(Object));
    });

    it('should handle invalid JSON gracefully', async () => {
      const payload = {
        topic: 'cmdb.ci.events',
        partition: 0,
        message: {
          value: Buffer.from('invalid json'),
          offset: '0',
        },
      };

      await expect((consumer as any).handleMessage(payload)).rejects.toThrow();
      expect(logger.error).toHaveBeenCalledWith('Failed to process message', expect.any(Object));
    });

    it('should log when no handlers registered', async () => {
      const event: CMDBEvent = {
        event_id: 'evt-1',
        event_type: EventType.CI_DISCOVERED,
        timestamp: new Date(),
      };

      const payload = {
        topic: 'cmdb.ci.events',
        partition: 0,
        message: {
          value: Buffer.from(JSON.stringify(event)),
          offset: '0',
        },
      };

      await (consumer as any).handleMessage(payload);

      expect(logger.debug).toHaveBeenCalledWith('No handlers for event type', expect.any(Object));
    });

    it('should continue executing other handlers when one fails', async () => {
      const failingHandler = jest.fn().mockRejectedValue(new Error('Handler error'));
      const successHandler = jest.fn().mockResolvedValue(undefined);

      consumer.on(EventType.CI_DISCOVERED, failingHandler);
      consumer.on(EventType.CI_DISCOVERED, successHandler);

      const event: CMDBEvent = {
        event_id: 'evt-1',
        event_type: EventType.CI_DISCOVERED,
        timestamp: new Date(),
      };

      const payload = {
        topic: 'cmdb.ci.events',
        partition: 0,
        message: {
          value: Buffer.from(JSON.stringify(event)),
          offset: '0',
        },
      };

      await (consumer as any).handleMessage(payload);

      expect(failingHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith('Event handler failed', expect.any(Object));
    });
  });

  describe('pause and resume', () => {
    it('should pause consumption', async () => {
      await consumer.pause(['cmdb.ci.events']);

      expect(mockKafkaConsumer.pause).toHaveBeenCalledWith([{ topic: 'cmdb.ci.events' }]);
      expect(logger.info).toHaveBeenCalledWith('Consumer paused', { topics: ['cmdb.ci.events'] });
    });

    it('should pause all topics when no topics specified', async () => {
      await consumer.pause();

      expect(mockKafkaConsumer.pause).toHaveBeenCalledWith([]);
    });

    it('should resume consumption', async () => {
      await consumer.resume(['cmdb.ci.events']);

      expect(mockKafkaConsumer.resume).toHaveBeenCalledWith([{ topic: 'cmdb.ci.events' }]);
      expect(logger.info).toHaveBeenCalledWith('Consumer resumed', { topics: ['cmdb.ci.events'] });
    });

    it('should resume all topics when no topics specified', async () => {
      await consumer.resume();

      expect(mockKafkaConsumer.resume).toHaveBeenCalledWith([]);
    });
  });

  describe('seek', () => {
    it('should seek to specific offset', async () => {
      await consumer.seek('cmdb.ci.events', 0, '12345');

      expect(mockKafkaConsumer.seek).toHaveBeenCalledWith({
        topic: 'cmdb.ci.events',
        partition: 0,
        offset: '12345',
      });
      expect(logger.info).toHaveBeenCalledWith('Consumer seek', {
        topic: 'cmdb.ci.events',
        partition: 0,
        offset: '12345',
      });
    });
  });

  describe('createEventConsumer', () => {
    it('should create consumer with default brokers', () => {
      delete process.env['KAFKA_BROKERS'];

      const newConsumer = createEventConsumer('test-group');

      expect(newConsumer).toBeInstanceOf(EventConsumer);
    });

    it('should create consumer with environment variable brokers', () => {
      process.env['KAFKA_BROKERS'] = 'broker1:9092,broker2:9092';

      const newConsumer = createEventConsumer('test-group');

      expect(newConsumer).toBeInstanceOf(EventConsumer);

      delete process.env['KAFKA_BROKERS'];
    });
  });
});
