import Joi from 'joi';
export interface ValidationResult<T = any> {
    valid: boolean;
    value?: T;
    error?: string;
    details?: any;
}
export declare function validate<T>(schema: Joi.Schema, data: any): ValidationResult<T>;
export declare const schemas: {
    uuid: Joi.StringSchema<string>;
    timestamp: Joi.StringSchema<string>;
    ciType: Joi.StringSchema<string>;
    ciStatus: Joi.StringSchema<string>;
    environment: Joi.StringSchema<string>;
    relationshipType: Joi.StringSchema<string>;
    discoveryProvider: Joi.StringSchema<string>;
    discoveryMethod: Joi.StringSchema<string>;
    jobStatus: Joi.StringSchema<string>;
};
export declare const ciSchema: Joi.ObjectSchema<any>;
export declare const ciInputSchema: Joi.ObjectSchema<any>;
export declare const relationshipSchema: Joi.ObjectSchema<any>;
export declare const discoveryJobSchema: Joi.ObjectSchema<any>;
export declare const discoveredCISchema: Joi.ObjectSchema<any>;
export declare const paginationSchema: Joi.ObjectSchema<any>;
export declare const queryFiltersSchema: Joi.ObjectSchema<any>;
export declare const validators: {
    validateCI: (data: any) => ValidationResult<unknown>;
    validateCIInput: (data: any) => ValidationResult<unknown>;
    validateRelationship: (data: any) => ValidationResult<unknown>;
    validateDiscoveryJob: (data: any) => ValidationResult<unknown>;
    validateDiscoveredCI: (data: any) => ValidationResult<unknown>;
    validatePagination: (data: any) => ValidationResult<unknown>;
    validateQueryFilters: (data: any) => ValidationResult<unknown>;
};
export default validators;
//# sourceMappingURL=validators.d.ts.map