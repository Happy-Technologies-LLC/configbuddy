/**
 * Query builders for connector configuration operations
 */

import { validateConnectorConfigSortField, validateConnectorRunSortField, validateSortDirection } from '@cmdb/common';

interface ListQueryParams {
  connector_type?: string;
  enabled?: string;
  schedule_enabled?: string;
  search?: string;
  sort_by: string;
  sort_order: string;
  limit: number;
  offset: number;
}

interface RunsQueryParams {
  config_id?: string;
  connector_type?: string;
  resource_id?: string;
  status?: string;
  limit: number;
  offset: number;
  sort_by: string;
  sort_order: string;
}

export function buildListQuery(params: ListQueryParams) {
  let query = 'SELECT * FROM connector_configurations WHERE 1=1';
  const queryParams: any[] = [];
  let paramIndex = 1;

  if (params.connector_type) {
    query += ` AND connector_type = $${paramIndex++}`;
    queryParams.push(params.connector_type);
  }

  if (params.enabled !== undefined) {
    query += ` AND enabled = $${paramIndex++}`;
    queryParams.push(String(params.enabled) === 'true');
  }

  if (params.schedule_enabled !== undefined) {
    query += ` AND schedule_enabled = $${paramIndex++}`;
    queryParams.push(String(params.schedule_enabled) === 'true');
  }

  if (params.search) {
    query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
    queryParams.push(`%${params.search}%`);
    paramIndex++;
  }

  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
  const countParams = [...queryParams];

  // Validate sort parameters to prevent SQL injection
  const sortField = validateConnectorConfigSortField(params.sort_by || 'name');
  const sortDirection = validateSortDirection(params.sort_order || 'asc');

  // Safe to use template literals here because sortField and sortDirection are validated
  query += ` ORDER BY ${sortField} ${sortDirection} LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  queryParams.push(params.limit, params.offset);

  return {
    query,
    params: queryParams,
    countQuery,
    countParams,
  };
}

export function buildRunsQuery(params: RunsQueryParams) {
  let query = 'SELECT * FROM connector_run_history WHERE 1=1';
  const queryParams: any[] = [];
  let paramIndex = 1;

  if (params.config_id) {
    query += ` AND config_id = $${paramIndex++}`;
    queryParams.push(params.config_id);
  }

  if (params.connector_type) {
    query += ` AND connector_type = $${paramIndex++}`;
    queryParams.push(params.connector_type);
  }

  if (params.resource_id) {
    query += ` AND resource_id = $${paramIndex++}`;
    queryParams.push(params.resource_id);
  }

  if (params.status) {
    query += ` AND status = $${paramIndex++}`;
    queryParams.push(params.status);
  }

  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
  const countParams = [...queryParams];

  // Validate sort parameters to prevent SQL injection
  const sortField = validateConnectorRunSortField(params.sort_by || 'started_at');
  const sortDirection = validateSortDirection(params.sort_order || 'desc');

  // Safe to use template literals here because sortField and sortDirection are validated
  query += ` ORDER BY ${sortField} ${sortDirection} LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  queryParams.push(params.limit, params.offset);

  return {
    query,
    params: queryParams,
    countQuery,
    countParams,
  };
}
