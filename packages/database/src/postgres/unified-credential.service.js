"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedCredentialService = void 0;
exports.getUnifiedCredentialService = getUnifiedCredentialService;
const crud_service_1 = require("./credential-services/crud.service");
const affinity_service_1 = require("./credential-services/affinity.service");
const validation_service_1 = require("./credential-services/validation.service");
class UnifiedCredentialService {
    crudService;
    affinityService;
    validationService;
    constructor(pool) {
        this.crudService = new crud_service_1.CredentialCRUDService(pool);
        this.affinityService = new affinity_service_1.CredentialAffinityService(pool);
        this.validationService = new validation_service_1.CredentialValidationService(pool);
    }
    async create(input, createdBy) {
        return this.crudService.create(input, createdBy);
    }
    async getById(id) {
        return this.crudService.getById(id);
    }
    async list(filters) {
        return this.crudService.list(filters);
    }
    async update(id, input) {
        return this.crudService.update(id, input);
    }
    async delete(id) {
        return this.crudService.delete(id);
    }
    async findBestMatch(context) {
        return this.affinityService.findBestMatch(context);
    }
    async rankCredentials(context) {
        return this.affinityService.rankCredentials(context);
    }
    calculateAffinityScore(credential, context) {
        return this.affinityService.calculateAffinityScore(credential, context);
    }
    async validate(id) {
        return this.validationService.validate(id, (id) => this.getById(id));
    }
    async testConnection(id) {
        return this.validationService.testConnection(id, (id) => this.validate(id));
    }
    validateCredentialStructure(credential) {
        return this.validationService.validateCredentialStructure(credential);
    }
}
exports.UnifiedCredentialService = UnifiedCredentialService;
let unifiedCredentialService = null;
function getUnifiedCredentialService(pool) {
    if (!unifiedCredentialService) {
        unifiedCredentialService = new UnifiedCredentialService(pool);
    }
    return unifiedCredentialService;
}
//# sourceMappingURL=unified-credential.service.js.map