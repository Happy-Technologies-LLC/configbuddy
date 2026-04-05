// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isIpInCidr = isIpInCidr;
exports.matchGlob = matchGlob;
const common_1 = require("@cmdb/common");
function isIpInCidr(ip, cidr) {
    try {
        const [cidrIp, prefixLength] = cidr.split('/');
        if (!cidrIp || !prefixLength) {
            return false;
        }
        const prefix = parseInt(prefixLength, 10);
        if (isNaN(prefix) || prefix < 0 || prefix > 32) {
            return false;
        }
        const ipInt = ipToInt(ip);
        const cidrIpInt = ipToInt(cidrIp);
        const mask = prefix === 0 ? 0 : -1 << (32 - prefix);
        return (ipInt & mask) === (cidrIpInt & mask);
    }
    catch (error) {
        common_1.logger.error('Failed to match CIDR', { ip, cidr, error });
        return false;
    }
}
function ipToInt(ip) {
    const parts = ip.split('.').map((part) => parseInt(part, 10));
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
        throw new Error(`Invalid IP address: ${ip}`);
    }
    const p0 = parts[0] ?? 0;
    const p1 = parts[1] ?? 0;
    const p2 = parts[2] ?? 0;
    const p3 = parts[3] ?? 0;
    return ((p0 << 24) | (p1 << 16) | (p2 << 8) | p3) >>> 0;
}
function matchGlob(hostname, pattern) {
    try {
        const regexPattern = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        const regex = new RegExp(`^${regexPattern}$`, 'i');
        return regex.test(hostname);
    }
    catch (error) {
        common_1.logger.error('Failed to match glob pattern', { hostname, pattern, error });
        return false;
    }
}
//# sourceMappingURL=utils.js.map