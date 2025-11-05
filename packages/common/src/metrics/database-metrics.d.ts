import { Counter, Histogram, Gauge } from 'prom-client';
export declare const databaseQueryDuration: Histogram<"database" | "status" | "operation">;
export declare const databaseQueriesTotal: Counter<"database" | "status" | "operation">;
export declare const databaseConnectionPoolSize: Gauge<"database" | "state">;
export declare const databaseConnectionsActive: Gauge<"database">;
export declare const databaseErrors: Counter<"database" | "error_type">;
export declare const neo4jNodeCount: Gauge<"label">;
export declare const neo4jRelationshipCount: Gauge<"type">;
export declare const postgresTableSize: Gauge<"table">;
export declare const databaseTransactionDuration: Histogram<"database" | "status">;
export declare const databaseDeadlocks: Counter<"database">;
export declare const recordDatabaseQuery: (_database: "neo4j" | "postgres" | "redis", _operation: string, _status: "success" | "error", _duration: number) => void;
export declare const updateConnectionPoolMetrics: (_database: string, _total: number, _idle: number, _active: number) => void;
export declare const recordDatabaseError: (database: string, errorType: string) => void;
export declare const updateNeo4jMetrics: (_nodeCounts: Record<string, number>, _relationshipCounts: Record<string, number>) => void;
export declare const updatePostgresTableSizes: (tableSizes: Record<string, number>) => void;
export declare const recordDatabaseTransaction: (_database: string, _status: "commit" | "rollback", _duration: number) => void;
export declare const recordDatabaseDeadlock: (database: string) => void;
//# sourceMappingURL=database-metrics.d.ts.map