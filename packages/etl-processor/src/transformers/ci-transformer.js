// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CITransformer = void 0;
const common_1 = require("@cmdb/common");
class CITransformer {
    fromNeo4jNode(node) {
        const props = node._properties;
        const ci = {
            _id: props['id'],
            external_id: props['external_id'],
            name: props['name'],
            _type: this.validateCIType(props['type']),
            _status: this.validateCIStatus(props['status']),
            environment: props['environment'],
            _created_at: this.formatDateTime(props['created_at']),
            _updated_at: this.formatDateTime(props['updated_at']),
            _discovered_at: this.formatDateTime(props['discovered_at']),
            _metadata: this.parseMetadata(props['metadata'])
        };
        const qualityCheck = this.checkDataQuality(ci);
        if (!qualityCheck._isValid) {
            common_1.logger.warn('Data quality issues detected for CI', {
                _ciId: ci._id,
                _errors: qualityCheck._errors,
                _warnings: qualityCheck._warnings,
                _score: qualityCheck._score
            });
        }
        return ci;
    }
    checkDataQuality(ci) {
        const errors = [];
        const warnings = [];
        let score = 100;
        if (!ci._id || ci._id.trim() === '') {
            errors.push('CI ID is missing or empty');
            score -= 30;
        }
        if (!ci.name || ci.name.trim() === '') {
            errors.push('CI name is missing or empty');
            score -= 20;
        }
        if (!ci._type) {
            errors.push('CI type is missing');
            score -= 20;
        }
        if (!ci._status) {
            warnings.push('CI status is missing, defaulting to active');
            score -= 10;
        }
        if (!ci._created_at) {
            warnings.push('CI created_at timestamp is missing');
            score -= 5;
        }
        if (!ci._updated_at) {
            warnings.push('CI updated_at timestamp is missing');
            score -= 5;
        }
        if (!ci._discovered_at) {
            warnings.push('CI discovered_at timestamp is missing');
            score -= 5;
        }
        try {
            const created = new Date(ci._created_at);
            const updated = new Date(ci._updated_at);
            const discovered = new Date(ci._discovered_at);
            if (isNaN(created.getTime())) {
                errors.push('Invalid created_at timestamp');
                score -= 10;
            }
            if (isNaN(updated.getTime())) {
                errors.push('Invalid updated_at timestamp');
                score -= 10;
            }
            if (isNaN(discovered.getTime())) {
                errors.push('Invalid discovered_at timestamp');
                score -= 10;
            }
            if (updated.getTime() < created.getTime()) {
                warnings.push('updated_at is before created_at');
                score -= 5;
            }
            const now = Date.now();
            if (created.getTime() > now) {
                warnings.push('created_at is in the future');
                score -= 5;
            }
        }
        catch (error) {
            errors.push('Timestamp validation failed');
            score -= 10;
        }
        if (!ci._metadata || Object.keys(ci._metadata).length === 0) {
            warnings.push('CI has no metadata');
            score -= 5;
        }
        else {
            const nullKeys = Object.entries(ci._metadata)
                .filter(([_, v]) => v === null || v === undefined)
                .map(([k, _]) => k);
            if (nullKeys.length > 0) {
                warnings.push(`Metadata contains null/undefined values: ${nullKeys.join(', ')}`);
                score -= 2;
            }
        }
        if (ci.name && (ci.name.toLowerCase().includes('unknown') || ci.name.toLowerCase().includes('unnamed'))) {
            warnings.push('CI name appears to be a placeholder');
            score -= 5;
        }
        if (ci.environment) {
            const validEnvs = ['production', 'staging', 'development', 'test'];
            if (!validEnvs.includes(ci.environment)) {
                warnings.push(`Invalid environment value: ${ci.environment}`);
                score -= 5;
            }
        }
        return {
            _isValid: errors.length === 0,
            _errors: errors,
            _warnings: warnings,
            _score: Math.max(0, score)
        };
    }
    extractNestedMetadata(metadata) {
        const extracted = {
            cloud: {},
            compute: {},
            network: {},
            tags: {},
            custom: {}
        };
        extracted.cloud = {
            provider: metadata['cloud_provider'] || metadata['provider'] || this.inferProviderFromMetadata(metadata),
            region: metadata['region'] || metadata['aws_region'] || metadata['azure_region'] || metadata['gcp_region'],
            availabilityZone: metadata['availability_zone'] || metadata['az'] || metadata['zone'],
            accountId: metadata['account_id'] || metadata['aws_account_id'] || metadata['azure_subscription_id'] || metadata['gcp_project_id']
        };
        extracted.compute = {
            instanceType: metadata['instance_type'] || metadata['vm_size'] || metadata['machine_type'],
            vcpus: this.parseNumber(metadata['vcpus'] || metadata['cpu_count'] || metadata['cores']),
            memory: metadata['memory'] || metadata['ram'] || metadata['memory_gb'],
            architecture: metadata['architecture'] || metadata['arch'] || metadata['cpu_architecture']
        };
        extracted.network = {
            ipAddresses: this.extractIpAddresses(metadata),
            vpc: metadata['vpc_id'] || metadata['vnet_id'] || metadata['network'],
            subnet: metadata['subnet_id'] || metadata['subnet'],
            securityGroups: this.extractArray(metadata['security_groups'] || metadata['security_group_ids'])
        };
        if (metadata['tags']) {
            if (Array.isArray(metadata['tags'])) {
                extracted.tags = metadata['tags'].reduce((acc, tag) => {
                    if (tag.Key && tag.Value) {
                        acc[tag.Key] = tag.Value;
                    }
                    else if (tag.key && tag.value) {
                        acc[tag.key] = tag.value;
                    }
                    return acc;
                }, {});
            }
            else if (typeof metadata['tags'] === 'object') {
                extracted.tags = metadata['tags'];
            }
        }
        const knownKeys = [
            'cloud_provider', 'provider', 'region', 'aws_region', 'azure_region', 'gcp_region',
            'availability_zone', 'az', 'zone', 'account_id', 'aws_account_id', 'azure_subscription_id',
            'gcp_project_id', 'instance_type', 'vm_size', 'machine_type', 'vcpus', 'cpu_count',
            'cores', 'memory', 'ram', 'memory_gb', 'architecture', 'arch', 'cpu_architecture',
            'ip_address', 'private_ip', 'public_ip', 'ip_addresses', 'vpc_id', 'vnet_id', 'network',
            'subnet_id', 'subnet', 'security_groups', 'security_group_ids', 'tags'
        ];
        Object.entries(metadata).forEach(([key, value]) => {
            if (!knownKeys.includes(key) && value !== null && value !== undefined) {
                extracted.custom[key] = value;
            }
        });
        return extracted;
    }
    inferProviderFromMetadata(metadata) {
        if (metadata['aws_region'] || metadata['aws_account_id'] || metadata['instance_id']?.startsWith('i-')) {
            return 'aws';
        }
        if (metadata['azure_region'] || metadata['azure_subscription_id'] || metadata['resource_group']) {
            return 'azure';
        }
        if (metadata['gcp_project_id'] || metadata['gcp_zone'] || metadata['instance_id']?.match(/^\d+$/)) {
            return 'gcp';
        }
        return undefined;
    }
    extractIpAddresses(metadata) {
        const ips = [];
        if (metadata['ip_address']) {
            ips.push(metadata['ip_address']);
        }
        if (metadata['private_ip']) {
            ips.push(metadata['private_ip']);
        }
        if (metadata['public_ip']) {
            ips.push(metadata['public_ip']);
        }
        if (metadata['ip_addresses']) {
            if (Array.isArray(metadata['ip_addresses'])) {
                ips.push(...metadata['ip_addresses']);
            }
            else if (typeof metadata['ip_addresses'] === 'string') {
                ips.push(metadata['ip_addresses']);
            }
        }
        return [...new Set(ips)].filter(ip => this.isValidIP(ip));
    }
    isValidIP(ip) {
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        return ipv4Regex.test(ip) || ipv6Regex.test(ip);
    }
    extractArray(value) {
        if (!value)
            return undefined;
        if (Array.isArray(value))
            return value.map(String);
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed))
                    return parsed.map(String);
            }
            catch {
                return value.split(',').map(s => s.trim());
            }
        }
        return [String(value)];
    }
    parseNumber(value) {
        if (typeof value === 'number')
            return value;
        if (typeof value === 'string') {
            const parsed = parseInt(value, 10);
            return isNaN(parsed) ? undefined : parsed;
        }
        return undefined;
    }
    toNeo4jProperties(ci) {
        return {
            id: ci._id,
            external_id: ci.external_id || null,
            name: ci.name,
            type: ci._type,
            status: 'status' in ci && ci.status ? ci.status : 'active',
            environment: ci.environment || null,
            discovered_at: 'discovered_at' in ci ? ci.discovered_at : new Date().toISOString(),
            metadata: JSON.stringify('_metadata' in ci ? ci._metadata : ci.metadata || {})
        };
    }
    fromPostgresRow(row) {
        return {
            _id: row._ci_id,
            external_id: row.external_id,
            name: row._ci_name,
            _type: row._ci_type,
            _status: row._status,
            environment: row.environment,
            _created_at: row._created_at.toISOString(),
            _updated_at: row._updated_at.toISOString(),
            _discovered_at: row._discovered_at.toISOString(),
            _metadata: row.metadata || {}
        };
    }
    toPostgresValues(ci) {
        return [
            ci._id,
            ci.name,
            ci._type,
            ci._status,
            ci.environment || null,
            ci.external_id || null,
            new Date(ci._created_at),
            new Date(ci._updated_at),
            new Date(ci._discovered_at),
            ci._metadata
        ];
    }
    fromDTO(dto) {
        return {
            _id: dto._id,
            name: dto._name,
            _type: dto._type,
            status: dto.status || 'active',
            environment: dto.environment,
            external_id: dto.externalId,
            metadata: dto.metadata
        };
    }
    toDTO(ci) {
        return {
            _id: ci._id,
            _name: ci.name,
            _type: ci._type,
            status: ci._status,
            environment: ci.environment,
            externalId: ci.external_id,
            metadata: ci._metadata
        };
    }
    normalize(ci) {
        const now = new Date().toISOString();
        return {
            _id: ci._id || '',
            external_id: ci.external_id,
            name: ci.name || 'Unknown',
            _type: ci._type || 'cloud-resource',
            _status: ci._status || 'active',
            environment: ci.environment,
            _created_at: ci._created_at || now,
            _updated_at: ci._updated_at || now,
            _discovered_at: ci._discovered_at || now,
            _metadata: ci._metadata || {}
        };
    }
    merge(existing, updates) {
        return {
            ...existing,
            name: updates.name ?? existing.name,
            _type: updates._type ?? existing._type,
            _status: updates.status ?? existing._status,
            environment: updates.environment ?? existing.environment,
            external_id: updates.external_id ?? existing.external_id,
            _updated_at: new Date().toISOString(),
            _metadata: {
                ...existing._metadata,
                ...(updates.metadata || {})
            }
        };
    }
    getChangedFields(oldCI, newCI) {
        const changes = {};
        const fieldsToCheck = [
            'name', '_type', '_status', 'environment', 'external_id'
        ];
        for (const field of fieldsToCheck) {
            if (oldCI[field] !== newCI[field]) {
                changes[field] = {
                    old: oldCI[field],
                    new: newCI[field]
                };
            }
        }
        const oldMeta = JSON.stringify(oldCI['_metadata']);
        const newMeta = JSON.stringify(newCI['_metadata']);
        if (oldMeta !== newMeta) {
            changes['metadata'] = {
                old: oldCI['_metadata'],
                new: newCI['_metadata']
            };
        }
        return changes;
    }
    validateCIType(type) {
        const validTypes = [
            'server', 'virtual-machine', 'container', 'application',
            'service', 'database', 'network-device', 'storage',
            'load-balancer', 'cloud-resource'
        ];
        if (validTypes.includes(type)) {
            return type;
        }
        return 'cloud-resource';
    }
    validateCIStatus(status) {
        const validStatuses = ['active', 'inactive', 'maintenance', 'decommissioned'];
        if (validStatuses.includes(status)) {
            return status;
        }
        return 'active';
    }
    formatDateTime(value) {
        if (!value) {
            return new Date().toISOString();
        }
        if (typeof value === 'string') {
            return value;
        }
        if (value instanceof Date) {
            return value.toISOString();
        }
        if (typeof value === 'object' && 'toString' in value) {
            return value.toString();
        }
        return new Date().toISOString();
    }
    parseMetadata(value) {
        if (!value) {
            return {};
        }
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            }
            catch {
                return {};
            }
        }
        if (typeof value === 'object') {
            return value;
        }
        return {};
    }
}
exports.CITransformer = CITransformer;
//# sourceMappingURL=ci-transformer.js.map