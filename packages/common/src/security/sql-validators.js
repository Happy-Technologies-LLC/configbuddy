// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALID_SORT_DIRECTIONS = exports.VALID_CONNECTOR_RUN_SORT_FIELDS = exports.VALID_CONNECTOR_CONFIG_SORT_FIELDS = exports.VALID_CONNECTOR_SORT_FIELDS = exports.VALID_CI_SORT_FIELDS = exports.VALID_TABLE_NAMES = void 0;
exports.validateTableName = validateTableName;
exports.validateCISortField = validateCISortField;
exports.validateConnectorSortField = validateConnectorSortField;
exports.validateConnectorConfigSortField = validateConnectorConfigSortField;
exports.validateConnectorRunSortField = validateConnectorRunSortField;
exports.validateSortDirection = validateSortDirection;
exports.validateTableNames = validateTableNames;
exports.escapePostgresIdentifier = escapePostgresIdentifier;
exports.containsSQLInjectionPatterns = containsSQLInjectionPatterns;
exports.VALID_TABLE_NAMES = [
    'fact_ci_relationships',
    'fact_ci_changes',
    'fact_ci_discovery',
    'fact_ci',
    'dim_ci',
    'dim_ci_type',
    'dim_environment',
    'dim_status',
    'dim_date',
    'credentials',
    'discovery_definitions',
    'discovery_jobs',
    'connector_configurations',
    'connector_run_history',
    'connector_registry_cache',
    'installed_connectors',
    'audit_log',
    'api_keys',
    'test_data',
];
exports.VALID_CI_SORT_FIELDS = [
    'id',
    'name',
    'type',
    'status',
    'environment',
    'created_at',
    'updated_at',
    'discovered_at',
];
exports.VALID_CONNECTOR_SORT_FIELDS = [
    'name',
    'connector_type',
    'created_at',
    'updated_at',
    'installed_at',
    'category',
];
exports.VALID_CONNECTOR_CONFIG_SORT_FIELDS = [
    'name',
    'created_at',
    'updated_at',
];
exports.VALID_CONNECTOR_RUN_SORT_FIELDS = [
    'started_at',
    'completed_at',
    'duration_ms',
];
exports.VALID_SORT_DIRECTIONS = ['ASC', 'DESC'];
function validateTableName(tableName) {
    if (!exports.VALID_TABLE_NAMES.includes(tableName)) {
        throw new Error(`Invalid table name: ${tableName}. Must be one of: ${exports.VALID_TABLE_NAMES.join(', ')}`);
    }
    return tableName;
}
function validateCISortField(columnName) {
    if (!exports.VALID_CI_SORT_FIELDS.includes(columnName)) {
        throw new Error(`Invalid sort field: ${columnName}. Must be one of: ${exports.VALID_CI_SORT_FIELDS.join(', ')}`);
    }
    return columnName;
}
function validateConnectorSortField(columnName) {
    if (!exports.VALID_CONNECTOR_SORT_FIELDS.includes(columnName)) {
        throw new Error(`Invalid sort field: ${columnName}. Must be one of: ${exports.VALID_CONNECTOR_SORT_FIELDS.join(', ')}`);
    }
    return columnName;
}
function validateConnectorConfigSortField(columnName) {
    if (!exports.VALID_CONNECTOR_CONFIG_SORT_FIELDS.includes(columnName)) {
        throw new Error(`Invalid sort field: ${columnName}. Must be one of: ${exports.VALID_CONNECTOR_CONFIG_SORT_FIELDS.join(', ')}`);
    }
    return columnName;
}
function validateConnectorRunSortField(columnName) {
    if (!exports.VALID_CONNECTOR_RUN_SORT_FIELDS.includes(columnName)) {
        throw new Error(`Invalid sort field: ${columnName}. Must be one of: ${exports.VALID_CONNECTOR_RUN_SORT_FIELDS.join(', ')}`);
    }
    return columnName;
}
function validateSortDirection(direction) {
    const upperDirection = direction.toUpperCase();
    if (!exports.VALID_SORT_DIRECTIONS.includes(upperDirection)) {
        throw new Error(`Invalid sort direction: ${direction}. Must be 'ASC' or 'DESC'`);
    }
    return upperDirection;
}
function validateTableNames(tableNames) {
    return tableNames.map(validateTableName);
}
function escapePostgresIdentifier(identifier) {
    const escaped = identifier.replace(/"/g, '""');
    return `"${escaped}"`;
}
function containsSQLInjectionPatterns(input) {
    const patterns = [
        /;/,
        /--/,
        /\/\*/,
        /\*\//,
        /\bDROP\b/i,
        /\bDELETE\b/i,
        /\bTRUNCATE\b/i,
        /\bEXEC\b/i,
        /\bEXECUTE\b/i,
        /\bUNION\b/i,
        /\bINSERT\b/i,
        /\bUPDATE\b/i,
        /xp_cmdshell/i,
        /pg_sleep/i,
    ];
    return patterns.some(pattern => pattern.test(input));
}
//# sourceMappingURL=sql-validators.js.map