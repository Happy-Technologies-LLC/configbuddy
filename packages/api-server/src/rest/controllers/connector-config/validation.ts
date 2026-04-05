// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Validation logic for connector configuration operations
 */

export function validateConfiguration(config: any): string | null {
  if (!config.name) {
    return 'Configuration name is required';
  }

  if (!config.connector_type) {
    return 'Connector type is required';
  }

  if (!config.connection) {
    return 'Connection configuration is required';
  }

  return null;
}

export function buildUpdateQuery(id: string, updates: any): { query: string | null; values: any[] } {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  const allowedFields = [
    'name', 'description', 'enabled', 'schedule', 'schedule_enabled',
    'connection', 'options', 'enabled_resources', 'resource_configs',
    'max_retries', 'retry_delay_seconds', 'continue_on_error',
    'notification_channels', 'notification_on_success', 'notification_on_failure'
  ];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      fields.push(`${field} = $${paramIndex++}`);

      // JSON fields need stringification
      if (['connection', 'options', 'resource_configs'].includes(field)) {
        values.push(JSON.stringify(updates[field]));
      } else {
        values.push(updates[field]);
      }
    }
  }

  if (fields.length === 0) {
    return { query: null, values: [] };
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const query = `UPDATE connector_configurations SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

  return { query, values };
}
