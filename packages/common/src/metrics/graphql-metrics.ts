/**
 * GraphQL Query Metrics
 * Tracks GraphQL operation duration and count
 */

import { Counter, Histogram } from 'prom-client';
import { getMetricsRegistry } from './registry';

const registry = getMetricsRegistry().register;

// GraphQL operation duration
export const graphqlOperationDuration = new Histogram({
  name: 'cmdb_graphql_operation_duration_seconds',
  help: 'Duration of GraphQL operations in seconds',
  labelNames: ['operation_name', 'operation_type', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

// GraphQL operation counter
export const graphqlOperationTotal = new Counter({
  name: 'cmdb_graphql_operations_total',
  help: 'Total number of GraphQL operations',
  labelNames: ['operation_name', 'operation_type', 'status'],
  registers: [registry],
});

// GraphQL resolver duration
export const graphqlResolverDuration = new Histogram({
  name: 'cmdb_graphql_resolver_duration_seconds',
  help: 'Duration of GraphQL resolvers in seconds',
  labelNames: ['field_name', 'parent_type'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [registry],
});

// GraphQL errors
export const graphqlErrors = new Counter({
  name: 'cmdb_graphql_errors_total',
  help: 'Total number of GraphQL errors',
  labelNames: ['operation_name', 'error_type'],
  registers: [registry],
});

// GraphQL query complexity
export const graphqlComplexity = new Histogram({
  name: 'cmdb_graphql_query_complexity',
  help: 'Complexity score of GraphQL queries',
  labelNames: ['operation_name'],
  buckets: [10, 50, 100, 250, 500, 1000],
  registers: [registry],
});

/**
 * Record GraphQL operation metrics
 */
export const recordGraphQLOperation = (
  _operationName: string,
  _operationType: 'query' | 'mutation' | 'subscription',
  _status: 'success' | 'error',
  _duration: number,
  complexity?: number
): void => {
  const labels = {
    operation_name: _operationName,
    operation_type: _operationType,
    status: _status,
  };

  graphqlOperationDuration.observe(labels, _duration);
  graphqlOperationTotal.inc(labels);

  if (complexity !== undefined) {
    graphqlComplexity.observe({ operation_name: _operationName }, complexity);
  }
};

/**
 * Record GraphQL resolver metrics
 */
export const recordGraphQLResolver = (
  _fieldName: string,
  _parentType: string,
  _duration: number
): void => {
  graphqlResolverDuration.observe(
    { field_name: _fieldName, parent_type: _parentType },
    _duration
  );
};

/**
 * Record GraphQL error
 */
export const recordGraphQLError = (
  _operationName: string,
  _errorType: string
): void => {
  graphqlErrors.inc({ operation_name: _operationName, error_type: _errorType });
};
