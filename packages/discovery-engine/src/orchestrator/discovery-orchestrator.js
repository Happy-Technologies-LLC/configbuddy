"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscoveryOrchestrator = void 0;
const database_1 = require("@cmdb/database");
const database_2 = require("@cmdb/database");
const common_1 = require("@cmdb/common");
const aws_discovery_worker_1 = require("../workers/aws-discovery.worker");
const azure_discovery_worker_1 = require("../workers/azure-discovery.worker");
const gcp_discovery_worker_1 = require("../workers/gcp-discovery.worker");
const ssh_discovery_worker_1 = require("../workers/ssh-discovery.worker");
const nmap_discovery_worker_1 = require("../workers/nmap-discovery.worker");
class DiscoveryOrchestrator {
    neo4jClient = (0, database_2.getNeo4jClient)();
    workersRegistered = false;
    async start() {
        if (!this.workersRegistered) {
            this.registerWorkers();
            this.workersRegistered = true;
            common_1.logger.info('Discovery orchestrator started');
        }
    }
    async stop() {
        this.workersRegistered = false;
        common_1.logger.info('Discovery orchestrator stopped');
    }
    async triggerDiscovery(_provider, _config, _triggeredBy) {
        const jobId = `discovery-${provider}-${Date.now()}`;
        await this.scheduleDiscovery({
            _id: jobId,
            _provider: provider,
            _method: 'agentless',
            _status: 'pending',
            config,
            triggeredBy,
            _createdAt: new Date(),
            _updatedAt: new Date(),
        });
        return jobId;
    }
    async getAllWorkerStatuses() {
        return [
            { name: database_1.QUEUE_NAMES.DISCOVERY_AWS, running: this.workersRegistered, concurrency: 2 },
            { name: database_1.QUEUE_NAMES.DISCOVERY_AZURE, running: this.workersRegistered, concurrency: 2 },
            { name: database_1.QUEUE_NAMES.DISCOVERY_GCP, running: this.workersRegistered, concurrency: 2 },
            { name: database_1.QUEUE_NAMES.DISCOVERY_SSH, running: this.workersRegistered, concurrency: 5 },
            { name: database_1.QUEUE_NAMES.DISCOVERY_NMAP, running: this.workersRegistered, concurrency: 3 },
        ];
    }
    async scheduleDiscovery(job) {
        const queueName = this.getQueueName(job.provider);
        const queue = database_1.queueManager.getQueue(queueName);
        await queue.add('discovery', {
            _jobId: job.id,
            _provider: job.provider,
            _config: job.config,
        }, {
            _attempts: 3,
            _backoff: {
                _type: 'exponential',
                _delay: 2000,
            },
        });
        common_1.logger.info('Discovery job scheduled', { job });
    }
    async scheduleRecurringDiscovery(_provider, _config, _cronPattern) {
        const queueName = this.getQueueName(provider);
        const queue = database_1.queueManager.getQueue(queueName);
        await queue.add('recurring-discovery', { provider, config }, {
            _repeat: {
                _pattern: cronPattern,
            },
        });
        common_1.logger.info('Recurring discovery scheduled', {
            provider,
            cronPattern,
        });
    }
    registerWorkers() {
        database_1.queueManager.registerWorker(database_1.QUEUE_NAMES.DISCOVERY_AWS, async (job) => {
            const { jobId, config } = job.data;
            const worker = new aws_discovery_worker_1.AWSDiscoveryWorker(config.region || 'us-east-1', config.credentials);
            const cis = await worker.discoverAll(jobId, config);
            await this.persistCIs(cis);
            return { discovered: cis.length };
        }, { concurrency: 2 });
        database_1.queueManager.registerWorker(database_1.QUEUE_NAMES.DISCOVERY_AZURE, async (job) => {
            const { jobId, config } = job.data;
            const worker = new azure_discovery_worker_1.AzureDiscoveryWorker(config.subscriptionId, config.credentials);
            const cis = await worker.discoverAll(jobId, config);
            await this.persistCIs(cis);
            return { discovered: cis.length };
        }, { concurrency: 2 });
        database_1.queueManager.registerWorker(database_1.QUEUE_NAMES.DISCOVERY_GCP, async (job) => {
            const { jobId, config } = job.data;
            const worker = new gcp_discovery_worker_1.GCPDiscoveryWorker(config.projectId, config.keyFilename);
            const cis = await worker.discoverAll(jobId, config);
            await this.persistCIs(cis);
            return { discovered: cis.length };
        }, { concurrency: 2 });
        database_1.queueManager.registerWorker(database_1.QUEUE_NAMES.DISCOVERY_SSH, async (job) => {
            const { jobId, config } = job.data;
            const worker = new ssh_discovery_worker_1.SSHDiscoveryWorker();
            const cis = [];
            for (const target of config.targets || []) {
                try {
                    const ci = await worker.discoverHost(jobId, target.host, target.username, target.privateKeyPath);
                    cis.push(ci);
                }
                catch (error) {
                    common_1.logger.error('SSH discovery failed for target', { target, error });
                }
            }
            await this.persistCIs(cis);
            return { discovered: cis.length };
        }, { concurrency: 5 });
        database_1.queueManager.registerWorker(database_1.QUEUE_NAMES.DISCOVERY_NMAP, async (job) => {
            const { jobId, config } = job.data;
            const worker = new nmap_discovery_worker_1.NmapDiscoveryWorker();
            const cis = await worker.scanNetwork(jobId, config.range);
            await this.persistCIs(cis);
            return { discovered: cis.length };
        }, { concurrency: 3 });
        common_1.logger.info('All discovery workers registered');
    }
    async persistCIs(cis) {
        for (const ci of cis) {
            try {
                const existing = await this.neo4jClient.getCI(ci.id);
                if (existing) {
                    await this.neo4jClient.updateCI(ci.id, {
                        _name: ci.name,
                        _status: ci.status,
                        _metadata: ci.metadata,
                    });
                    common_1.logger.debug('CI updated', { id: ci.id });
                }
                else {
                    await this.neo4jClient.createCI(ci);
                    common_1.logger.debug('CI created', { id: ci.id });
                }
            }
            catch (error) {
                common_1.logger.error('Failed to persist CI', { ci, error });
            }
        }
    }
    getQueueName(provider) {
        switch (provider) {
            case 'aws':
                return database_1.QUEUE_NAMES.DISCOVERY_AWS;
            case 'azure':
                return database_1.QUEUE_NAMES.DISCOVERY_AZURE;
            case 'gcp':
                return database_1.QUEUE_NAMES.DISCOVERY_GCP;
            case 'ssh':
                return database_1.QUEUE_NAMES.DISCOVERY_SSH;
            case 'nmap':
                return database_1.QUEUE_NAMES.DISCOVERY_NMAP;
                _default: throw new Error(`Unknown provider: ${provider}`);
        }
    }
}
exports.DiscoveryOrchestrator = DiscoveryOrchestrator;
//# sourceMappingURL=discovery-orchestrator.js.map