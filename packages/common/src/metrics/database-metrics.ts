// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Database Query Metrics
 * Tracks database operations, connection pools, and query performance
 */

import { Counter, Histogram, Gauge } from 'prom-client';
import { getMetricsRegistry } from './registry';

const registry = getMetricsRegistry().register;

// Database query duration
export const databaseQueryDuration = new Histogram({
  name: 'cmdb_database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['database', 'operation', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [registry],
});

// Database queries total
export const databaseQueriesTotal = new Counter({
  name: 'cmdb_database_queries_total',
  help: 'Total number of database queries',
  labelNames: ['database', 'operation', 'status'],
  registers: [registry],
});

// Database connection pool size
export const databaseConnectionPoolSize = new Gauge({
  name: 'cmdb_database_connection_pool_size',
  help: 'Current size of database connection pool',
  labelNames: ['database', 'state'],
  registers: [registry],
});

// Database connections active
export const databaseConnectionsActive = new Gauge({
  name: 'cmdb_database_connections_active',
  help: 'Number of active database connections',
  labelNames: ['database'],
  registers: [registry],
});

// Database errors
export const databaseErrors = new Counter({
  name: 'cmdb_database_errors_total',
  help: 'Total number of database errors',
  labelNames: ['database', 'error_type'],
  registers: [registry],
});

// Neo4j node count
export const neo4jNodeCount = new Gauge({
  name: 'cmdb_neo4j_node_count',
  help: 'Total number of nodes in Neo4j',
  labelNames: ['label'],
  registers: [registry],
});

// Neo4j relationship count
export const neo4jRelationshipCount = new Gauge({
  name: 'cmdb_neo4j_relationship_count',
  help: 'Total number of relationships in Neo4j',
  labelNames: ['type'],
  registers: [registry],
});

// PostgreSQL table size
export const postgresTableSize = new Gauge({
  name: 'cmdb_postgres_table_size_bytes',
  help: 'Size of PostgreSQL tables in bytes',
  labelNames: ['table'],
  registers: [registry],
});

// Database transaction duration
export const databaseTransactionDuration = new Histogram({
  name: 'cmdb_database_transaction_duration_seconds',
  help: 'Duration of database transactions in seconds',
  labelNames: ['database', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [registry],
});

// Database deadlocks
export const databaseDeadlocks = new Counter({
  name: 'cmdb_database_deadlocks_total',
  help: 'Total number of database deadlocks',
  labelNames: ['database'],
  registers: [registry],
});

/**
 * Record database query metrics
 */
export const recordDatabaseQuery = (
  _database: 'neo4j' | 'postgres' | 'redis',
  _operation: string,
  _status: 'success' | 'error',
  _duration: number
): void => {
  const labels = { database: _database, operation: _operation, status: _status };
  databaseQueryDuration.observe(labels, _duration);
  databaseQueriesTotal.inc(labels);
};

/**
 * Update connection pool metrics
 */
export const updateConnectionPoolMetrics = (
  _database: string,
  _total: number,
  _idle: number,
  _active: number
): void => {
  databaseConnectionPoolSize.set({ database: _database, state: 'total' }, _total);
  databaseConnectionPoolSize.set({ database: _database, state: 'idle' }, _idle);
  databaseConnectionPoolSize.set({ database: _database, state: 'active' }, _active);
  databaseConnectionsActive.set({ database: _database }, _active);
};

/**
 * Record database error
 */
export const recordDatabaseError = (database: string, errorType: string): void => {
  databaseErrors.inc({ database, error_type: errorType });
};

/**
 * Update Neo4j metrics
 */
export const updateNeo4jMetrics = (
  _nodeCounts: Record<string, number>,
  _relationshipCounts: Record<string, number>
): void => {
  Object.entries(_nodeCounts).forEach(([label, count]) => {
    neo4jNodeCount.set({ label }, count);
  });

  Object.entries(_relationshipCounts).forEach(([type, count]) => {
    neo4jRelationshipCount.set({ type }, count);
  });
};

/**
 * Update PostgreSQL table sizes
 */
export const updatePostgresTableSizes = (tableSizes: Record<string, number>): void => {
  Object.entries(tableSizes).forEach(([table, size]) => {
    postgresTableSize.set({ table }, size);
  });
};

/**
 * Record database transaction
 */
export const recordDatabaseTransaction = (
  _database: string,
  _status: 'commit' | 'rollback',
  _duration: number
): void => {
  databaseTransactionDuration.observe({ database: _database, status: _status }, _duration);
};

/**
 * Record database deadlock
 */
export const recordDatabaseDeadlock = (database: string): void => {
  databaseDeadlocks.inc({ database });
};
