import { Counter, Histogram } from 'prom-client';
export declare const graphqlOperationDuration: Histogram<"status" | "operation_name" | "operation_type">;
export declare const graphqlOperationTotal: Counter<"status" | "operation_name" | "operation_type">;
export declare const graphqlResolverDuration: Histogram<"field_name" | "parent_type">;
export declare const graphqlErrors: Counter<"operation_name" | "error_type">;
export declare const graphqlComplexity: Histogram<"operation_name">;
export declare const recordGraphQLOperation: (_operationName: string, _operationType: "query" | "mutation" | "subscription", _status: "success" | "error", _duration: number, complexity?: number) => void;
export declare const recordGraphQLResolver: (_fieldName: string, _parentType: string, _duration: number) => void;
export declare const recordGraphQLError: (_operationName: string, _errorType: string) => void;
//# sourceMappingURL=graphql-metrics.d.ts.map