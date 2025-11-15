export declare const VALID_TABLE_NAMES: readonly ["fact_ci_relationships", "fact_ci_changes", "fact_ci_discovery", "fact_ci", "dim_ci", "dim_ci_type", "dim_environment", "dim_status", "dim_date", "credentials", "discovery_definitions", "discovery_jobs", "connector_configurations", "connector_run_history", "connector_registry_cache", "installed_connectors", "audit_log", "api_keys", "test_data"];
export declare const VALID_CI_SORT_FIELDS: readonly ["id", "name", "type", "status", "environment", "created_at", "updated_at", "discovered_at"];
export declare const VALID_CONNECTOR_SORT_FIELDS: readonly ["name", "connector_type", "created_at", "updated_at", "installed_at", "category"];
export declare const VALID_CONNECTOR_CONFIG_SORT_FIELDS: readonly ["name", "created_at", "updated_at"];
export declare const VALID_CONNECTOR_RUN_SORT_FIELDS: readonly ["started_at", "completed_at", "duration_ms"];
export declare const VALID_SORT_DIRECTIONS: readonly ["ASC", "DESC"];
export declare function validateTableName(tableName: string): string;
export declare function validateCISortField(columnName: string): string;
export declare function validateConnectorSortField(columnName: string): string;
export declare function validateConnectorConfigSortField(columnName: string): string;
export declare function validateConnectorRunSortField(columnName: string): string;
export declare function validateSortDirection(direction: string): 'ASC' | 'DESC';
export declare function validateTableNames(tableNames: string[]): string[];
export declare function escapePostgresIdentifier(identifier: string): string;
export declare function containsSQLInjectionPatterns(input: string): boolean;
//# sourceMappingURL=sql-validators.d.ts.map