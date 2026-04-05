// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordDatabaseDeadlock = exports.recordDatabaseTransaction = exports.updatePostgresTableSizes = exports.updateNeo4jMetrics = exports.recordDatabaseError = exports.updateConnectionPoolMetrics = exports.recordDatabaseQuery = exports.databaseDeadlocks = exports.databaseTransactionDuration = exports.postgresTableSize = exports.neo4jRelationshipCount = exports.neo4jNodeCount = exports.databaseErrors = exports.databaseConnectionsActive = exports.databaseConnectionPoolSize = exports.databaseQueriesTotal = exports.databaseQueryDuration = void 0;
const prom_client_1 = require("prom-client");
const registry_1 = require("./registry");
const registry = (0, registry_1.getMetricsRegistry)().register;
exports.databaseQueryDuration = new prom_client_1.Histogram({
    name: 'cmdb_database_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['database', 'operation', 'status'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    registers: [registry],
});
exports.databaseQueriesTotal = new prom_client_1.Counter({
    name: 'cmdb_database_queries_total',
    help: 'Total number of database queries',
    labelNames: ['database', 'operation', 'status'],
    registers: [registry],
});
exports.databaseConnectionPoolSize = new prom_client_1.Gauge({
    name: 'cmdb_database_connection_pool_size',
    help: 'Current size of database connection pool',
    labelNames: ['database', 'state'],
    registers: [registry],
});
exports.databaseConnectionsActive = new prom_client_1.Gauge({
    name: 'cmdb_database_connections_active',
    help: 'Number of active database connections',
    labelNames: ['database'],
    registers: [registry],
});
exports.databaseErrors = new prom_client_1.Counter({
    name: 'cmdb_database_errors_total',
    help: 'Total number of database errors',
    labelNames: ['database', 'error_type'],
    registers: [registry],
});
exports.neo4jNodeCount = new prom_client_1.Gauge({
    name: 'cmdb_neo4j_node_count',
    help: 'Total number of nodes in Neo4j',
    labelNames: ['label'],
    registers: [registry],
});
exports.neo4jRelationshipCount = new prom_client_1.Gauge({
    name: 'cmdb_neo4j_relationship_count',
    help: 'Total number of relationships in Neo4j',
    labelNames: ['type'],
    registers: [registry],
});
exports.postgresTableSize = new prom_client_1.Gauge({
    name: 'cmdb_postgres_table_size_bytes',
    help: 'Size of PostgreSQL tables in bytes',
    labelNames: ['table'],
    registers: [registry],
});
exports.databaseTransactionDuration = new prom_client_1.Histogram({
    name: 'cmdb_database_transaction_duration_seconds',
    help: 'Duration of database transactions in seconds',
    labelNames: ['database', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    registers: [registry],
});
exports.databaseDeadlocks = new prom_client_1.Counter({
    name: 'cmdb_database_deadlocks_total',
    help: 'Total number of database deadlocks',
    labelNames: ['database'],
    registers: [registry],
});
const recordDatabaseQuery = (_database, _operation, _status, _duration) => {
    const labels = { database: _database, operation: _operation, status: _status };
    exports.databaseQueryDuration.observe(labels, _duration);
    exports.databaseQueriesTotal.inc(labels);
};
exports.recordDatabaseQuery = recordDatabaseQuery;
const updateConnectionPoolMetrics = (_database, _total, _idle, _active) => {
    exports.databaseConnectionPoolSize.set({ database: _database, state: 'total' }, _total);
    exports.databaseConnectionPoolSize.set({ database: _database, state: 'idle' }, _idle);
    exports.databaseConnectionPoolSize.set({ database: _database, state: 'active' }, _active);
    exports.databaseConnectionsActive.set({ database: _database }, _active);
};
exports.updateConnectionPoolMetrics = updateConnectionPoolMetrics;
const recordDatabaseError = (database, errorType) => {
    exports.databaseErrors.inc({ database, error_type: errorType });
};
exports.recordDatabaseError = recordDatabaseError;
const updateNeo4jMetrics = (_nodeCounts, _relationshipCounts) => {
    Object.entries(_nodeCounts).forEach(([label, count]) => {
        exports.neo4jNodeCount.set({ label }, count);
    });
    Object.entries(_relationshipCounts).forEach(([type, count]) => {
        exports.neo4jRelationshipCount.set({ type }, count);
    });
};
exports.updateNeo4jMetrics = updateNeo4jMetrics;
const updatePostgresTableSizes = (tableSizes) => {
    Object.entries(tableSizes).forEach(([table, size]) => {
        exports.postgresTableSize.set({ table }, size);
    });
};
exports.updatePostgresTableSizes = updatePostgresTableSizes;
const recordDatabaseTransaction = (_database, _status, _duration) => {
    exports.databaseTransactionDuration.observe({ database: _database, status: _status }, _duration);
};
exports.recordDatabaseTransaction = recordDatabaseTransaction;
const recordDatabaseDeadlock = (database) => {
    exports.databaseDeadlocks.inc({ database });
};
exports.recordDatabaseDeadlock = recordDatabaseDeadlock;
//# sourceMappingURL=database-metrics.js.map