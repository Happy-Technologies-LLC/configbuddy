import { DiscoveredCI, Relationship } from '@cmdb/common';
export declare class SSHDiscoveryWorker {
    discoverHost(jobId: string, host: string, username: string, privateKeyPath?: string, password?: string): Promise<DiscoveredCI>;
    discoverHosts(jobId: string, hosts: Array<{
        host: string;
        username: string;
        privateKeyPath?: string;
        password?: string;
    }>): Promise<DiscoveredCI[]>;
    private getCommandOutput;
    private parseOsRelease;
    private parseCpuInfo;
    private parseMemInfo;
    private parseDiskInfo;
    private parseNetworkInfo;
    private parseServices;
    private parseUsers;
    private parseRoutes;
    private parseDNS;
    private parseCronJobs;
    private parseMounts;
    private parseLoadAvg;
    private parseBlockDevices;
    private detectPackageManager;
    private checkFirewall;
    private determineOSFamily;
    inferRelationships(discoveredCIs: DiscoveredCI[]): Relationship[];
}
//# sourceMappingURL=ssh-discovery.worker.d.ts.map