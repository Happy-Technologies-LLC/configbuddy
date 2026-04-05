// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALID_CI_PROPERTIES = exports.VALID_RELATIONSHIP_TYPES = exports.VALID_NODE_LABELS = void 0;
exports.validateNodeLabel = validateNodeLabel;
exports.validateRelationshipType = validateRelationshipType;
exports.validateCIProperty = validateCIProperty;
exports.escapeCypherIdentifier = escapeCypherIdentifier;
exports.sanitizeCITypeForLabel = sanitizeCITypeForLabel;
exports.containsCypherInjectionPatterns = containsCypherInjectionPatterns;
exports.buildSafeCypherLabel = buildSafeCypherLabel;
exports.VALID_NODE_LABELS = [
    'CI',
    'server',
    'virtual_machine',
    'container',
    'application',
    'service',
    'database',
    'network_device',
    'storage',
    'load_balancer',
    'cloud_resource',
    'kubernetes_cluster',
    'kubernetes_node',
    'kubernetes_pod',
];
exports.VALID_RELATIONSHIP_TYPES = [
    'DEPENDS_ON',
    'HOSTS',
    'CONNECTS_TO',
    'USES',
    'OWNED_BY',
    'MANAGES',
    'MONITORS',
    'PART_OF',
    'RUNS_ON',
    'CONTAINS',
    'ROUTES_TO',
    'BACKED_UP_BY',
];
exports.VALID_CI_PROPERTIES = [
    'id',
    'external_id',
    'name',
    'type',
    'status',
    'environment',
    'created_at',
    'updated_at',
    'discovered_at',
    'discovery_provider',
    'metadata',
];
function validateNodeLabel(label) {
    const normalizedLabel = label.replace(/-/g, '_');
    if (!exports.VALID_NODE_LABELS.includes(normalizedLabel)) {
        throw new Error(`Invalid node label: ${label}. Must be one of: ${exports.VALID_NODE_LABELS.join(', ')}`);
    }
    return normalizedLabel;
}
function validateRelationshipType(relType) {
    const upperRelType = relType.toUpperCase().replace(/-/g, '_');
    if (!exports.VALID_RELATIONSHIP_TYPES.includes(upperRelType)) {
        throw new Error(`Invalid relationship type: ${relType}. Must be one of: ${exports.VALID_RELATIONSHIP_TYPES.join(', ')}`);
    }
    return upperRelType;
}
function validateCIProperty(propertyName) {
    if (!exports.VALID_CI_PROPERTIES.includes(propertyName)) {
        throw new Error(`Invalid property name: ${propertyName}. Must be one of: ${exports.VALID_CI_PROPERTIES.join(', ')}`);
    }
    return propertyName;
}
function escapeCypherIdentifier(identifier) {
    const escaped = identifier.replace(/`/g, '``');
    return `\`${escaped}\``;
}
function sanitizeCITypeForLabel(ciType) {
    const sanitized = ciType.replace(/-/g, '_').toLowerCase();
    return validateNodeLabel(sanitized);
}
function containsCypherInjectionPatterns(input) {
    const patterns = [
        /;/,
        /\/\//,
        /\/\*/,
        /\*\//,
        /\bDROP\b/i,
        /\bDELETE\b/i,
        /\bDETACH\b/i,
        /\bREMOVE\b/i,
        /\bCALL\b.*\bdb\./i,
        /\bCALL\b.*\bapoc\./i,
        /\bLOAD\b.*\bCSV\b/i,
    ];
    return patterns.some(pattern => pattern.test(input));
}
function buildSafeCypherLabel(ciType) {
    const validatedType = sanitizeCITypeForLabel(ciType);
    return `:CI:${validatedType}`;
}
//# sourceMappingURL=cypher-validators.js.map