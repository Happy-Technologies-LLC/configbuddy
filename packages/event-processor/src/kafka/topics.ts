/**
 * Kafka Topic Definitions
 */

export const KAFKA_TOPICS = {
  // CI Lifecycle Topics
  CI_EVENTS: 'cmdb.ci.events',
  CI_CHANGES: 'cmdb.ci.changes',

  // Relationship Topics
  RELATIONSHIP_EVENTS: 'cmdb.relationships.events',

  // Identity Resolution Topics
  RECONCILIATION_EVENTS: 'cmdb.reconciliation.events',
  RECONCILIATION_CONFLICTS: 'cmdb.reconciliation.conflicts',

  // Connector Topics
  CONNECTOR_EVENTS: 'cmdb.connectors.events',
  CONNECTOR_METRICS: 'cmdb.connectors.metrics',

  // Transformation Topics
  TRANSFORMATION_EVENTS: 'cmdb.transformations.events',

  // Aggregated Metrics (for dashboards)
  METRICS_AGGREGATED: 'cmdb.metrics.aggregated',

  // Dead Letter Queue
  DLQ: 'cmdb.dlq',
} as const;

export const CONSUMER_GROUPS = {
  CHANGE_PROCESSOR: 'change-processor-group',
  METRICS_AGGREGATOR: 'metrics-aggregator-group',
  ANALYTICS_PROCESSOR: 'analytics-processor-group',
  NOTIFICATION_SERVICE: 'notification-service-group',
  AUDIT_LOGGER: 'audit-logger-group',
} as const;

export interface TopicConfig {
  topic: string;
  numPartitions?: number;
  replicationFactor?: number;
  configEntries?: Array<{ name: string; value: string }>;
}

export const TOPIC_CONFIGS: TopicConfig[] = [
  {
    topic: KAFKA_TOPICS.CI_EVENTS,
    numPartitions: 10,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: '604800000' }, // 7 days
      { name: 'compression.type', value: 'snappy' },
    ],
  },
  {
    topic: KAFKA_TOPICS.CI_CHANGES,
    numPartitions: 10,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: '2592000000' }, // 30 days
      { name: 'compression.type', value: 'snappy' },
    ],
  },
  {
    topic: KAFKA_TOPICS.RELATIONSHIP_EVENTS,
    numPartitions: 5,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: '604800000' }, // 7 days
    ],
  },
  {
    topic: KAFKA_TOPICS.RECONCILIATION_EVENTS,
    numPartitions: 5,
    replicationFactor: 1,
  },
  {
    topic: KAFKA_TOPICS.RECONCILIATION_CONFLICTS,
    numPartitions: 3,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: '2592000000' }, // 30 days (conflicts need longer retention)
    ],
  },
  {
    topic: KAFKA_TOPICS.CONNECTOR_EVENTS,
    numPartitions: 5,
    replicationFactor: 1,
  },
  {
    topic: KAFKA_TOPICS.CONNECTOR_METRICS,
    numPartitions: 3,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: '86400000' }, // 1 day (metrics are aggregated)
    ],
  },
  {
    topic: KAFKA_TOPICS.TRANSFORMATION_EVENTS,
    numPartitions: 5,
    replicationFactor: 1,
  },
  {
    topic: KAFKA_TOPICS.METRICS_AGGREGATED,
    numPartitions: 3,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: '604800000' }, // 7 days
    ],
  },
  {
    topic: KAFKA_TOPICS.DLQ,
    numPartitions: 3,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: '2592000000' }, // 30 days
    ],
  },
];
