// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DimensionTransformer = void 0;
const date_fns_1 = require("date-fns");
class DimensionTransformer {
    toDimension(ci) {
        return {
            _ci_id: ci._id,
            _ci_name: ci.name,
            _ci_type: ci._type,
            environment: ci.environment,
            _status: ci._status,
            external_id: ci.external_id,
            _effective_date: new Date(),
            end_date: undefined,
            _is_current: true,
            created_at: new Date(ci._created_at),
            updated_at: new Date(ci._updated_at)
        };
    }
    toDiscoveryFact(ci, ciKey) {
        const discoveredAt = new Date(ci._discovered_at);
        return {
            _ci_key: ciKey,
            _date_key: this.generateDateKey(discoveredAt),
            _discovered_at: discoveredAt,
            _discovery_method: this.inferDiscoveryMethod(ci),
            _discovery_source: this.inferDiscoverySource(ci)
        };
    }
    toLocationDimension(ci) {
        const metadata = ci._metadata || {};
        const region = metadata['region'] || metadata['aws_region'] || metadata['azure_region'];
        const az = metadata['availability_zone'] || metadata['az'];
        const provider = metadata['cloud_provider'] || this.inferProvider(metadata);
        if (!region && !provider) {
            return null;
        }
        return {
            _region: region || 'unknown',
            availability_zone: az,
            data_center: metadata['datacenter'] || metadata['data_center'],
            cloud_provider: provider,
            country: metadata['country']
        };
    }
    toDateDimension(date) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const dayOfWeek = date.getDay();
        const quarter = Math.ceil(month / 3);
        const weekNumber = this.getWeekNumber(date);
        return {
            _date_key: parseInt((0, date_fns_1.format)(date, 'yyyyMMdd')),
            _full_date: date,
            _year: year,
            _quarter: quarter,
            _month: month,
            _month_name: monthNames[month - 1],
            _week: weekNumber,
            _day_of_month: day,
            _day_of_week: dayOfWeek,
            _day_name: dayNames[dayOfWeek],
            _is_weekend: dayOfWeek === 0 || dayOfWeek === 6
        };
    }
    toRelationshipFact(_fromCiKey, _toCiKey, _relationshipType) {
        return {
            _from_ci_key: _fromCiKey,
            _to_ci_key: _toCiKey,
            _relationship_type: _relationshipType,
            _effective_date: new Date(),
            end_date: undefined,
            _is_current: true
        };
    }
    toChangeFact(_ciKey, _changeType, _fieldName, _oldValue, _newValue, _changedBy = 'system') {
        const changedAt = new Date();
        return {
            _ci_key: _ciKey,
            _date_key: this.generateDateKey(changedAt),
            _change_type: _changeType,
            _field_name: _fieldName,
            old_value: this.serializeValue(_oldValue),
            new_value: this.serializeValue(_newValue),
            _changed_at: changedAt,
            _changed_by: _changedBy
        };
    }
    generateSurrogateKey(naturalKey) {
        let hash = 0;
        for (let i = 0; i < naturalKey.length; i++) {
            const char = naturalKey.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }
    generateDateKey(date) {
        return parseInt((0, date_fns_1.format)(date, 'yyyyMMdd'));
    }
    parseDateKey(dateKey) {
        const str = dateKey.toString();
        const year = parseInt(str.substring(0, 4));
        const month = parseInt(str.substring(4, 6)) - 1;
        const day = parseInt(str.substring(6, 8));
        return new Date(year, month, day);
    }
    createSCDUpdate(_currentDimension, _updates) {
        const now = new Date();
        const close = {
            ci_key: _currentDimension.ci_key,
            end_date: now,
            _is_current: false
        };
        const insert = {
            ..._currentDimension,
            ..._updates,
            ci_key: undefined,
            _effective_date: now,
            end_date: undefined,
            _is_current: true,
            updated_at: now
        };
        return { close, insert };
    }
    inferDiscoveryMethod(ci) {
        const metadata = ci._metadata || {};
        if (metadata['discovery_method']) {
            return metadata['discovery_method'];
        }
        if (metadata['aws_instance_id'])
            return 'aws-discovery';
        if (metadata['azure_vm_id'])
            return 'azure-discovery';
        if (metadata['gcp_instance_id'])
            return 'gcp-discovery';
        return 'manual';
    }
    inferDiscoverySource(ci) {
        const metadata = ci._metadata || {};
        if (metadata['discovery_source']) {
            return metadata['discovery_source'];
        }
        if (metadata['aws_account_id'])
            return `aws:${metadata['aws_account_id']}`;
        if (metadata['azure_subscription_id'])
            return `azure:${metadata['azure_subscription_id']}`;
        if (metadata['gcp_project_id'])
            return `gcp:${metadata['gcp_project_id']}`;
        return 'unknown';
    }
    inferProvider(metadata) {
        if (metadata['aws_account_id'] || metadata['aws_region'])
            return 'aws';
        if (metadata['azure_subscription_id'] || metadata['azure_region'])
            return 'azure';
        if (metadata['gcp_project_id'] || metadata['gcp_zone'])
            return 'gcp';
        return undefined;
    }
    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }
    serializeValue(value) {
        if (value === null || value === undefined) {
            return '';
        }
        if (typeof value === 'string') {
            return value;
        }
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        return String(value);
    }
}
exports.DimensionTransformer = DimensionTransformer;
//# sourceMappingURL=dimension-transformer.js.map