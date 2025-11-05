"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validators = exports.queryFiltersSchema = exports.paginationSchema = exports.discoveredCISchema = exports.discoveryJobSchema = exports.relationshipSchema = exports.ciInputSchema = exports.ciSchema = exports.schemas = void 0;
exports.validate = validate;
const tslib_1 = require("tslib");
const joi_1 = tslib_1.__importDefault(require("joi"));
function validate(schema, data) {
    const result = schema.validate(data, { abortEarly: false, stripUnknown: true });
    if (result.error) {
        return {
            valid: false,
            error: result.error.message,
            details: result.error.details,
        };
    }
    return {
        valid: true,
        value: result.value,
    };
}
exports.schemas = {
    uuid: joi_1.default.string().uuid(),
    timestamp: joi_1.default.string().isoDate(),
    ciType: joi_1.default.string().valid('server', 'virtual-machine', 'container', 'application', 'service', 'database', 'network-device', 'storage', 'load-balancer', 'cloud-resource'),
    ciStatus: joi_1.default.string().valid('active', 'inactive', 'maintenance', 'decommissioned'),
    environment: joi_1.default.string().valid('production', 'staging', 'development', 'test'),
    relationshipType: joi_1.default.string().valid('DEPENDS_ON', 'HOSTS', 'CONNECTS_TO', 'USES', 'OWNED_BY', 'PART_OF', 'DEPLOYED_ON', 'BACKED_UP_BY'),
    discoveryProvider: joi_1.default.string().valid('aws', 'azure', 'gcp', 'ssh', 'nmap', 'kubernetes', 'docker'),
    discoveryMethod: joi_1.default.string().valid('agentless', 'agent'),
    jobStatus: joi_1.default.string().valid('pending', 'running', 'completed', 'failed'),
};
exports.ciSchema = joi_1.default.object({
    id: joi_1.default.string().required(),
    external_id: joi_1.default.string().optional(),
    name: joi_1.default.string().required().min(1).max(500),
    type: exports.schemas.ciType.required(),
    status: exports.schemas.ciStatus.required(),
    environment: exports.schemas.environment.optional(),
    created_at: exports.schemas.timestamp.required(),
    updated_at: exports.schemas.timestamp.required(),
    discovered_at: exports.schemas.timestamp.required(),
    metadata: joi_1.default.object().optional().default({}),
});
exports.ciInputSchema = joi_1.default.object({
    id: joi_1.default.string().required(),
    external_id: joi_1.default.string().optional(),
    name: joi_1.default.string().required().min(1).max(500),
    type: exports.schemas.ciType.required(),
    status: exports.schemas.ciStatus.optional().default('active'),
    environment: exports.schemas.environment.optional(),
    discovered_at: exports.schemas.timestamp.optional(),
    metadata: joi_1.default.object().optional().default({}),
});
exports.relationshipSchema = joi_1.default.object({
    from_id: joi_1.default.string().required(),
    to_id: joi_1.default.string().required(),
    type: exports.schemas.relationshipType.required(),
    properties: joi_1.default.object().optional().default({}),
});
exports.discoveryJobSchema = joi_1.default.object({
    id: joi_1.default.string().required(),
    provider: exports.schemas.discoveryProvider.required(),
    method: exports.schemas.discoveryMethod.required(),
    config: joi_1.default.object({
        credentials: joi_1.default.any().optional(),
        regions: joi_1.default.array().items(joi_1.default.string()).optional(),
        filters: joi_1.default.object().optional(),
        targets: joi_1.default.array().items(joi_1.default.string()).optional(),
    }).required(),
    status: exports.schemas.jobStatus.required(),
    created_at: exports.schemas.timestamp.required(),
    started_at: exports.schemas.timestamp.optional(),
    completed_at: exports.schemas.timestamp.optional(),
    error: joi_1.default.string().optional(),
});
exports.discoveredCISchema = exports.ciInputSchema.keys({
    discovery_job_id: joi_1.default.string().required(),
    discovery_provider: exports.schemas.discoveryProvider.required(),
    confidence_score: joi_1.default.number().min(0).max(1).required(),
});
exports.paginationSchema = joi_1.default.object({
    limit: joi_1.default.number().integer().min(1).max(1000).optional(),
    offset: joi_1.default.number().integer().min(0).optional(),
    page: joi_1.default.number().integer().min(1).optional(),
    pageSize: joi_1.default.number().integer().min(1).max(1000).optional(),
    sort_by: joi_1.default.string().optional(),
    sort_order: joi_1.default.string().valid('asc', 'desc').optional(),
});
exports.queryFiltersSchema = joi_1.default.object({
    type: exports.schemas.ciType.optional(),
    status: exports.schemas.ciStatus.optional(),
    environment: exports.schemas.environment.optional(),
    search: joi_1.default.string().optional(),
}).concat(exports.paginationSchema);
exports.validators = {
    validateCI: (data) => validate(exports.ciSchema, data),
    validateCIInput: (data) => validate(exports.ciInputSchema, data),
    validateRelationship: (data) => validate(exports.relationshipSchema, data),
    validateDiscoveryJob: (data) => validate(exports.discoveryJobSchema, data),
    validateDiscoveredCI: (data) => validate(exports.discoveredCISchema, data),
    validatePagination: (data) => validate(exports.paginationSchema, data),
    validateQueryFilters: (data) => validate(exports.queryFiltersSchema, data),
};
exports.default = exports.validators;
//# sourceMappingURL=validators.js.map