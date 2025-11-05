import { DiscoveryJob } from '@cmdb/common';
export declare class DiscoveryOrchestrator {
    private neo4jClient;
    private workersRegistered;
    start(): Promise<void>;
    stop(): Promise<void>;
    triggerDiscovery(_provider: string, _config: any, _triggeredBy: string): Promise<string>;
    getAllWorkerStatuses(): Promise<any[]>;
    scheduleDiscovery(job: DiscoveryJob): Promise<void>;
    scheduleRecurringDiscovery(_provider: string, _config: any, _cronPattern: string): Promise<void>;
    registerWorkers(): void;
    private persistCIs;
    private getQueueName;
}
//# sourceMappingURL=discovery-orchestrator.d.ts.map