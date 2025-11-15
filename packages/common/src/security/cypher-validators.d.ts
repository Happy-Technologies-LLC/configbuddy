export declare const VALID_NODE_LABELS: readonly ["CI", "server", "virtual_machine", "container", "application", "service", "database", "network_device", "storage", "load_balancer", "cloud_resource", "kubernetes_cluster", "kubernetes_node", "kubernetes_pod"];
export declare const VALID_RELATIONSHIP_TYPES: readonly ["DEPENDS_ON", "HOSTS", "CONNECTS_TO", "USES", "OWNED_BY", "MANAGES", "MONITORS", "PART_OF", "RUNS_ON", "CONTAINS", "ROUTES_TO", "BACKED_UP_BY"];
export declare const VALID_CI_PROPERTIES: readonly ["id", "external_id", "name", "type", "status", "environment", "created_at", "updated_at", "discovered_at", "discovery_provider", "metadata"];
export declare function validateNodeLabel(label: string): string;
export declare function validateRelationshipType(relType: string): string;
export declare function validateCIProperty(propertyName: string): string;
export declare function escapeCypherIdentifier(identifier: string): string;
export declare function sanitizeCITypeForLabel(ciType: string): string;
export declare function containsCypherInjectionPatterns(input: string): boolean;
export declare function buildSafeCypherLabel(ciType: string): string;
//# sourceMappingURL=cypher-validators.d.ts.map