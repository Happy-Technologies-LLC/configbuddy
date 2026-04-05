// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMetricsRegistry = exports.MetricsRegistry = void 0;
const prom_client_1 = require("prom-client");
class MetricsRegistry {
    static instance;
    register;
    constructor() {
        this.register = new prom_client_1.Registry();
        (0, prom_client_1.collectDefaultMetrics)({
            register: this.register,
            prefix: 'cmdb_',
            gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
        });
    }
    static getInstance() {
        if (!MetricsRegistry.instance) {
            MetricsRegistry.instance = new MetricsRegistry();
        }
        return MetricsRegistry.instance;
    }
    getMetrics() {
        return this.register.metrics();
    }
    getContentType() {
        return this.register.contentType;
    }
    clear() {
        this.register.clear();
    }
}
exports.MetricsRegistry = MetricsRegistry;
const getMetricsRegistry = () => MetricsRegistry.getInstance();
exports.getMetricsRegistry = getMetricsRegistry;
//# sourceMappingURL=registry.js.map