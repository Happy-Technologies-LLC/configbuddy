import { DiscoveredCI, Relationship } from '@cmdb/common';
export declare class NmapDiscoveryWorker {
    scanNetwork(_jobId: string, _range: string, _scanType?: 'quick' | 'port' | 'os' | 'version'): Promise<DiscoveredCI[]>;
    scanNetworks(_jobId: string, _ranges: Array<{
        range: string;
        scanType?: 'quick' | 'port' | 'os' | 'version';
    }>): Promise<DiscoveredCI[]>;
    scanHost(_jobId: string, _host: string, options?: {
        portRange?: string;
        detectOS?: boolean;
        detectVersion?: boolean;
        scriptScan?: boolean;
    }): Promise<DiscoveredCI | null>;
    private createCIFromHost;
    private extractPorts;
    private extractOSInfo;
    private extractServices;
    private inferDeviceType;
    private calculateConfidence;
    private mapHostStatus;
    inferRelationships(discoveredCIs: DiscoveredCI[]): Relationship[];
    analyzeTopology(discoveredCIs: DiscoveredCI[]): {
        _subnets: Map<string, DiscoveredCI[]>;
        _devices_by_type: Map<string, number>;
        _services_summary: Map<string, number>;
        _total_devices: number;
        _total_open_ports: number;
    };
}
//# sourceMappingURL=nmap-discovery.worker.d.ts.map