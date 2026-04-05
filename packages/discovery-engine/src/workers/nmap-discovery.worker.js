// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NmapDiscoveryWorker = void 0;
const tslib_1 = require("tslib");
const nmap = tslib_1.__importStar(require("node-nmap"));
const common_1 = require("@cmdb/common");
class NmapDiscoveryWorker {
    async scanNetwork(_jobId, _range, _scanType = 'quick') {
        return (0, common_1.withRetry)(async () => {
            common_1.logger.info('Starting Nmap scan', { jobId, range, scanType });
            return new Promise((resolve, reject) => {
                let scanner;
                switch (scanType) {
                    case 'quick':
                        scanner = new nmap.QuickScan(range);
                        break;
                    case 'port':
                        scanner = new nmap.NmapScan(range, '-p 1-65535');
                        break;
                    case 'os':
                        scanner = new nmap.OsAndPortScan(range);
                        break;
                    case 'version':
                        scanner = new nmap.NmapScan(range, '-sV');
                        break;
                        _default: scanner = new nmap.QuickScan(range);
                }
                scanner.on('complete', (data) => {
                    const cis = [];
                    for (const host of data) {
                        const ci = this.createCIFromHost(jobId, host, scanType);
                        if (ci) {
                            cis.push(ci);
                        }
                    }
                    common_1.logger.info('Nmap scan completed', {
                        jobId,
                        range,
                        scanType,
                        _discovered: cis.length,
                    });
                    resolve(cis);
                });
                scanner.on('error', (error) => {
                    common_1.logger.error('Nmap scan failed', { jobId, range, scanType, error: error.message });
                    reject(error);
                });
                scanner.startScan();
            });
        }, {
            _maxAttempts: 3,
            _initialDelay: 2000,
            _operationName: `scanNetwork-${range}`,
        });
    }
    async scanNetworks(_jobId, _ranges) {
        common_1.logger.info('Starting Nmap scan for multiple ranges', {
            jobId,
            _rangeCount: ranges.length,
        });
        const results = await Promise.allSettled(ranges.map(({ range, scanType }) => this.scanNetwork(jobId, range, scanType || 'quick')));
        const allCIs = [];
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                allCIs.push(...result.value);
            }
            else {
                const rangeInfo = ranges[index];
                common_1.logger.error(`Nmap scan failed for range ${rangeInfo ? rangeInfo.range : 'unknown'}`, result.reason);
            }
        });
        common_1.logger.info('Nmap scan completed for all ranges', {
            jobId,
            _discovered: allCIs.length,
            _failed: ranges.length - results.filter(r => r.status === 'fulfilled').length,
        });
        return allCIs;
    }
    async scanHost(_jobId, _host, options) {
        return (0, common_1.withRetry)(async () => {
            common_1.logger.info('Starting Nmap host scan', { jobId, host, options });
            const flags = [];
            if (options?.portRange) {
                flags.push(`-p ${options.portRange}`);
            }
            if (options?.detectOS) {
                flags.push('-O');
            }
            if (options?.detectVersion) {
                flags.push('-sV');
            }
            if (options?.scriptScan) {
                flags.push('-sC');
            }
            const nmapFlags = flags.join(' ');
            return new Promise((resolve, reject) => {
                const scanner = new nmap.NmapScan(host, nmapFlags || undefined);
                scanner.on('complete', (data) => {
                    if (data.length > 0) {
                        const ci = this.createCIFromHost(jobId, data[0], 'detailed');
                        common_1.logger.info('Nmap host scan completed', { jobId, host });
                        resolve(ci);
                    }
                    else {
                        common_1.logger.warn('Nmap host scan returned no results', { jobId, host });
                        resolve(null);
                    }
                });
                scanner.on('error', (error) => {
                    common_1.logger.error('Nmap host scan failed', { jobId, host, error: error.message });
                    reject(error);
                });
                scanner.startScan();
            });
        }, {
            _maxAttempts: 3,
            _initialDelay: 2000,
            _operationName: `scanHost-${host}`,
        });
    }
    createCIFromHost(jobId, host, scanType) {
        if (!host) {
            return null;
        }
        const ip = host.ip || host.ipv4;
        const hostname = host.hostname || host.hostnames?.[0]?.name || ip;
        const status = this.mapHostStatus(host.status || host.state);
        const openPorts = this.extractPorts(host.openPorts || host.ports || []);
        const osInfo = this.extractOSInfo(host);
        const deviceType = this.inferDeviceType(openPorts, osInfo);
        const mac = host.mac || host.macAddr;
        const vendor = host.vendor || host.macVendor;
        return {
            _id: `nmap-${ip}`,
            _external_id: ip,
            _name: hostname,
            _type: deviceType,
            _status: status,
            _discovered_at: new Date().toISOString(),
            _discovery_job_id: jobId,
            _discovery_provider: 'nmap',
            _confidence_score: this.calculateConfidence(host, scanType),
            _metadata: {
                _ip_address: ip,
                _hostname: hostname,
                _mac_address: mac,
                _vendor: vendor,
                _scan_type: scanType,
                _ports: {
                    _open: openPorts,
                    _open_count: openPorts.length,
                    _filtered: host.filteredPorts?.length || 0,
                    _closed: host.closedPorts?.length || 0,
                },
                _os: osInfo,
                _services: this.extractServices(openPorts),
                _response_time: host.responseTime || host.rtt,
                _last_boot: host.lastBoot,
                _uptime: host.uptime,
                _distance: host.distance,
                _tcp_sequence: host.tcpSequence,
                _ip_id_sequence: host.ipIdSequence,
            },
        };
    }
    extractPorts(ports) {
        return ports.map(port => {
            const portNumber = port.port || port.portId || port.id;
            const protocol = port.protocol || port.proto || 'tcp';
            const service = port.service || port.serviceName || port.name || 'unknown';
            const version = port.version || port.serviceVersion;
            const product = port.product || port.serviceProduct;
            const extraInfo = port.extraInfo || port.serviceExtraInfo;
            return {
                _port: portNumber,
                _protocol: protocol,
                _state: port.state || 'open',
                _service: service,
                _version: version,
                _product: product,
                _extra_info: extraInfo,
                _confidence: port.confidence || port.conf,
                _method: port.method,
            };
        });
    }
    extractOSInfo(host) {
        const osInfo = {
            _matches: [],
            _fingerprint: undefined,
            _classes: [],
        };
        if (host.osNmap) {
            osInfo.nmap_guess = host.osNmap;
        }
        if (host.osMatches || host.os?.matches) {
            const matches = host.osMatches || host.os.matches;
            osInfo.matches = matches.map((match) => ({
                _name: match.name,
                _accuracy: match.accuracy || match.acc,
                _line: match.line,
                _cpe: match.cpe,
            }));
        }
        if (host.os?.osmatch) {
            osInfo.matches = host.os.osmatch.map((match) => ({
                _name: match.name,
                _accuracy: match.accuracy,
                _line: match.line,
                _osclass: match.osclass,
            }));
        }
        if (host.osFingerprint || host.os?.fingerprint) {
            osInfo.fingerprint = host.osFingerprint || host.os.fingerprint;
        }
        if (host.osClasses || host.os?.osclass) {
            const classes = host.osClasses || host.os.osclass;
            osInfo.classes = Array.isArray(classes)
                ? classes.map((cls) => ({
                    _type: cls.type,
                    _vendor: cls.vendor,
                    _os_family: cls.osfamily,
                    _os_gen: cls.osgen,
                    _accuracy: cls.accuracy,
                    _cpe: cls.cpe,
                }))
                : [];
        }
        return osInfo;
    }
    extractServices(ports) {
        const uniqueServices = new Map();
        for (const port of ports) {
            const serviceName = port.service || 'unknown';
            if (!uniqueServices.has(serviceName)) {
                uniqueServices.set(serviceName, {
                    _name: serviceName,
                    _ports: [],
                    _version: port.version,
                    _product: port.product,
                });
            }
            uniqueServices.get(serviceName).ports.push({
                _port: port.port,
                _protocol: port.protocol,
            });
        }
        return Array.from(uniqueServices.values());
    }
    inferDeviceType(ports, osInfo) {
        const serverPorts = [80, 443, 22, 3306, 5432, 27017, 6379, 8080, 8443, 9000];
        const hasServerPorts = ports.some(p => serverPorts.includes(p.port));
        const networkPorts = [23, 161, 162, 179];
        const hasNetworkPorts = ports.some(p => networkPorts.includes(p.port));
        const osName = osInfo.matches?.[0]?.name?.toLowerCase() || '';
        const isNetworkOS = osName.includes('cisco') ||
            osName.includes('juniper') ||
            osName.includes('mikrotik') ||
            osName.includes('router') ||
            osName.includes('switch');
        if (isNetworkOS || (hasNetworkPorts && !hasServerPorts)) {
            return 'network-device';
        }
        if (hasServerPorts) {
            return 'server';
        }
        return 'network-device';
    }
    calculateConfidence(host, scanType) {
        let confidence = 0.5;
        if (scanType === 'os' || scanType === 'version') {
            confidence += 0.1;
        }
        if (host.hostname && host.hostname !== host.ip) {
            confidence += 0.1;
        }
        if (host.osNmap || host.osMatches?.length > 0) {
            confidence += 0.1;
        }
        if (host.openPorts?.length > 0) {
            confidence += 0.1;
        }
        if (host.mac || host.macAddr) {
            confidence += 0.1;
        }
        return Math.min(confidence, 1.0);
    }
    mapHostStatus(state) {
        switch (state?.toLowerCase()) {
            case 'up':
                return 'active';
            case 'down':
                return 'inactive';
            case 'unknown':
            case 'filtered':
                return 'maintenance';
                _default: return 'inactive';
        }
    }
    inferRelationships(discoveredCIs) {
        const relationships = [];
        const devicesBySubnet = new Map();
        const serversByPort = new Map();
        const networkDevices = [];
        for (const ci of discoveredCIs) {
            const metadata = ci.metadata;
            if (metadata.ip_address) {
                const subnet = metadata.ip_address.split('.').slice(0, 3).join('.');
                if (!devicesBySubnet.has(subnet)) {
                    devicesBySubnet.set(subnet, []);
                }
                devicesBySubnet.get(subnet).push(ci);
            }
            if (metadata.ports?.open) {
                for (const port of metadata.ports.open) {
                    if (!serversByPort.has(port.port)) {
                        serversByPort.set(port.port, []);
                    }
                    serversByPort.get(port.port).push(ci);
                }
            }
            if (ci.type === 'network-device') {
                networkDevices.push(ci);
            }
        }
        for (const ci of discoveredCIs) {
            const metadata = ci.metadata;
            if (metadata.ip_address) {
                const subnet = metadata.ip_address.split('.').slice(0, 3).join('.');
                const devicesInSubnet = devicesBySubnet.get(subnet) || [];
                for (const otherDevice of devicesInSubnet) {
                    if (otherDevice.id !== ci.id) {
                        relationships.push({
                            _from_id: ci.id,
                            _to_id: otherDevice.id,
                            _type: 'LOCATED_IN',
                            _properties: {
                                subnet,
                                _confidence: 0.6,
                                _inferred_from: 'same_subnet',
                            },
                        });
                    }
                }
            }
            if (ci.type === 'server' && metadata.ports?.open) {
                const databasePorts = [3306, 5432, 27017, 6379, 1433];
                for (const port of metadata.ports.open) {
                    if (databasePorts.includes(port.port)) {
                        const subnet = metadata.ip_address?.split('.').slice(0, 3).join('.');
                        const serversInSubnet = devicesBySubnet.get(subnet || '') || [];
                        for (const otherServer of serversInSubnet) {
                            if (otherServer.id !== ci.id && otherServer.type === 'server') {
                                const otherPorts = otherServer.metadata.ports?.open || [];
                                const hasWebServer = otherPorts.some((p) => [80, 443, 8080, 8443].includes(p.port));
                                if (hasWebServer) {
                                    relationships.push({
                                        _from_id: otherServer.id,
                                        _to_id: ci.id,
                                        _type: 'CONNECTS_TO',
                                        _properties: {
                                            _database_port: port.port,
                                            _service: port.service,
                                            _confidence: 0.5,
                                            _inferred_from: 'web_server_to_database',
                                        },
                                    });
                                }
                            }
                        }
                    }
                }
            }
            if (ci.type === 'network-device') {
                const subnet = metadata.ip_address?.split('.').slice(0, 3).join('.');
                const devicesInSubnet = devicesBySubnet.get(subnet || '') || [];
                for (const device of devicesInSubnet) {
                    if (device.id !== ci.id && device.type === 'server') {
                        relationships.push({
                            _from_id: ci.id,
                            _to_id: device.id,
                            _type: 'HOSTS',
                            _properties: {
                                subnet,
                                _confidence: 0.4,
                                _inferred_from: 'network_device_routing',
                            },
                        });
                    }
                }
            }
            if (metadata.ports?.open) {
                const hasSsh = metadata.ports.open.some((p) => p.port === 22);
                if (hasSsh) {
                    const subnet = metadata.ip_address?.split('.').slice(0, 3).join('.');
                    const serversInSubnet = devicesBySubnet.get(subnet || '') || [];
                    for (const otherServer of serversInSubnet) {
                        if (otherServer.id !== ci.id) {
                            const otherPorts = otherServer.metadata.ports?.open || [];
                            const otherHasSsh = otherPorts.some((p) => p.port === 22);
                            if (otherHasSsh) {
                                relationships.push({
                                    _from_id: ci.id,
                                    _to_id: otherServer.id,
                                    _type: 'CONNECTS_TO',
                                    _properties: {
                                        _protocol: 'ssh',
                                        _confidence: 0.3,
                                        _inferred_from: 'ssh_availability',
                                    },
                                });
                            }
                        }
                    }
                }
            }
        }
        common_1.logger.info('Inferred Nmap discovery relationships', {
            _count: relationships.length,
        });
        return relationships;
    }
    analyzeTopology(discoveredCIs) {
        const subnets = new Map();
        const devicesByType = new Map();
        const servicesSummary = new Map();
        let totalOpenPorts = 0;
        for (const ci of discoveredCIs) {
            const metadata = ci.metadata;
            if (metadata.ip_address) {
                const subnet = metadata.ip_address.split('.').slice(0, 3).join('.');
                if (!subnets.has(subnet)) {
                    subnets.set(subnet, []);
                }
                subnets.get(subnet).push(ci);
            }
            devicesByType.set(ci.type, (devicesByType.get(ci.type) || 0) + 1);
            if (metadata.services) {
                for (const service of metadata.services) {
                    servicesSummary.set(service.name, (servicesSummary.get(service.name) || 0) + 1);
                }
            }
            if (metadata.ports?.open_count) {
                totalOpenPorts += metadata.ports.open_count;
            }
        }
        return {
            subnets,
            _devices_by_type: devicesByType,
            _services_summary: servicesSummary,
            _total_devices: discoveredCIs.length,
            _total_open_ports: totalOpenPorts,
        };
    }
}
exports.NmapDiscoveryWorker = NmapDiscoveryWorker;
//# sourceMappingURL=nmap-discovery.worker.js.map