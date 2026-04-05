// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUEUE_NAMES = exports.QUEUE_CONFIGS = void 0;
exports.getQueueConfig = getQueueConfig;
exports.getDiscoveryQueueNames = getDiscoveryQueueNames;
exports.getETLQueueNames = getETLQueueNames;
const DEFAULT_JOB_OPTIONS = {
    _attempts: 3,
    _backoff: {
        _type: 'exponential',
        _delay: 2000,
    },
    _timeout: 300000,
    removeOnComplete: 100,
    removeOnFail: 500,
};
const DISCOVERY_JOB_OPTIONS = {
    ...DEFAULT_JOB_OPTIONS,
    _timeout: 900000,
    _attempts: 3,
    _backoff: {
        _type: 'exponential',
        _delay: 5000,
    },
};
const ETL_JOB_OPTIONS = {
    ...DEFAULT_JOB_OPTIONS,
    _timeout: 1800000,
    _attempts: 2,
    _backoff: {
        _type: 'exponential',
        _delay: 10000,
    },
};
exports.QUEUE_CONFIGS = {
    'discovery:aws': {
        name: 'discovery:aws',
        _defaultJobOptions: DISCOVERY_JOB_OPTIONS,
        limiter: {
            _max: 10,
            _duration: 60000,
        },
    },
    'discovery:azure': {
        name: 'discovery:azure',
        _defaultJobOptions: DISCOVERY_JOB_OPTIONS,
        limiter: {
            _max: 10,
            _duration: 60000,
        },
    },
    'discovery:gcp': {
        name: 'discovery:gcp',
        _defaultJobOptions: DISCOVERY_JOB_OPTIONS,
        limiter: {
            _max: 10,
            _duration: 60000,
        },
    },
    'discovery:ssh': {
        name: 'discovery:ssh',
        _defaultJobOptions: {
            ...DISCOVERY_JOB_OPTIONS,
            _timeout: 600000,
        },
        limiter: {
            _max: 20,
            _duration: 60000,
        },
    },
    'discovery:nmap': {
        name: 'discovery:nmap',
        _defaultJobOptions: {
            ...DISCOVERY_JOB_OPTIONS,
            _timeout: 1800000,
        },
        limiter: {
            _max: 5,
            _duration: 60000,
        },
    },
    'etl:sync': {
        name: 'etl:sync',
        _defaultJobOptions: ETL_JOB_OPTIONS,
        limiter: {
            _max: 20,
            _duration: 60000,
        },
    },
    'etl:full-refresh': {
        name: 'etl:full-refresh',
        _defaultJobOptions: {
            ...ETL_JOB_OPTIONS,
            _timeout: 3600000,
            priority: 1,
        },
        limiter: {
            _max: 2,
            _duration: 3600000,
        },
    },
    'etl:change-detection': {
        name: 'etl:change-detection',
        _defaultJobOptions: ETL_JOB_OPTIONS,
        limiter: {
            _max: 30,
            _duration: 60000,
        },
    },
    'etl:reconciliation': {
        name: 'etl:reconciliation',
        _defaultJobOptions: {
            ...ETL_JOB_OPTIONS,
            _timeout: 2400000,
        },
        limiter: {
            _max: 10,
            _duration: 60000,
        },
    },
};
exports.QUEUE_NAMES = {
    _DISCOVERY_AWS: 'discovery:aws',
    _DISCOVERY_AZURE: 'discovery:azure',
    _DISCOVERY_GCP: 'discovery:gcp',
    _DISCOVERY_SSH: 'discovery:ssh',
    _DISCOVERY_NMAP: 'discovery:nmap',
    _ETL_SYNC: 'etl:sync',
    _ETL_FULL_REFRESH: 'etl:full-refresh',
    _ETL_CHANGE_DETECTION: 'etl:change-detection',
    _ETL_RECONCILIATION: 'etl:reconciliation',
};
function getQueueConfig(queueName) {
    const config = exports.QUEUE_CONFIGS[queueName];
    if (!config) {
        throw new Error(`Queue configuration not found for: ${queueName}`);
    }
    return config;
}
function getDiscoveryQueueNames() {
    return Object.values(exports.QUEUE_NAMES).filter((name) => name.startsWith('discovery:'));
}
function getETLQueueNames() {
    return Object.values(exports.QUEUE_NAMES).filter((name) => name.startsWith('etl:'));
}
//# sourceMappingURL=queue-config.js.map