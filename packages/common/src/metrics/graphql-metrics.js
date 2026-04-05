// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordGraphQLError = exports.recordGraphQLResolver = exports.recordGraphQLOperation = exports.graphqlComplexity = exports.graphqlErrors = exports.graphqlResolverDuration = exports.graphqlOperationTotal = exports.graphqlOperationDuration = void 0;
const prom_client_1 = require("prom-client");
const registry_1 = require("./registry");
const registry = (0, registry_1.getMetricsRegistry)().register;
exports.graphqlOperationDuration = new prom_client_1.Histogram({
    name: 'cmdb_graphql_operation_duration_seconds',
    help: 'Duration of GraphQL operations in seconds',
    labelNames: ['operation_name', 'operation_type', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [registry],
});
exports.graphqlOperationTotal = new prom_client_1.Counter({
    name: 'cmdb_graphql_operations_total',
    help: 'Total number of GraphQL operations',
    labelNames: ['operation_name', 'operation_type', 'status'],
    registers: [registry],
});
exports.graphqlResolverDuration = new prom_client_1.Histogram({
    name: 'cmdb_graphql_resolver_duration_seconds',
    help: 'Duration of GraphQL resolvers in seconds',
    labelNames: ['field_name', 'parent_type'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    registers: [registry],
});
exports.graphqlErrors = new prom_client_1.Counter({
    name: 'cmdb_graphql_errors_total',
    help: 'Total number of GraphQL errors',
    labelNames: ['operation_name', 'error_type'],
    registers: [registry],
});
exports.graphqlComplexity = new prom_client_1.Histogram({
    name: 'cmdb_graphql_query_complexity',
    help: 'Complexity score of GraphQL queries',
    labelNames: ['operation_name'],
    buckets: [10, 50, 100, 250, 500, 1000],
    registers: [registry],
});
const recordGraphQLOperation = (_operationName, _operationType, _status, _duration, complexity) => {
    const labels = {
        operation_name: _operationName,
        operation_type: _operationType,
        status: _status,
    };
    exports.graphqlOperationDuration.observe(labels, _duration);
    exports.graphqlOperationTotal.inc(labels);
    if (complexity !== undefined) {
        exports.graphqlComplexity.observe({ operation_name: _operationName }, complexity);
    }
};
exports.recordGraphQLOperation = recordGraphQLOperation;
const recordGraphQLResolver = (_fieldName, _parentType, _duration) => {
    exports.graphqlResolverDuration.observe({ field_name: _fieldName, parent_type: _parentType }, _duration);
};
exports.recordGraphQLResolver = recordGraphQLResolver;
const recordGraphQLError = (_operationName, _errorType) => {
    exports.graphqlErrors.inc({ operation_name: _operationName, error_type: _errorType });
};
exports.recordGraphQLError = recordGraphQLError;
//# sourceMappingURL=graphql-metrics.js.map