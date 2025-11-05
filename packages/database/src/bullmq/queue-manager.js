"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUEUE_NAMES = exports.queueManager = exports.QueueManager = void 0;
const tslib_1 = require("tslib");
const bullmq_1 = require("bullmq");
const ioredis_1 = tslib_1.__importDefault(require("ioredis"));
const common_1 = require("@cmdb/common");
const connection = new ioredis_1.default({
    host: process.env['REDIS_HOST'] || 'localhost',
    port: parseInt(process.env['REDIS_PORT'] || '6379'),
    maxRetriesPerRequest: null,
});
class QueueManager {
    queues = new Map();
    workers = new Map();
    getQueue(name) {
        if (!this.queues.has(name)) {
            this.queues.set(name, new bullmq_1.Queue(name, { connection }));
        }
        return this.queues.get(name);
    }
    registerWorker(queueName, processor, options) {
        if (this.workers.has(queueName)) {
            throw new Error(`Worker for queue ${queueName} already registered`);
        }
        const worker = new bullmq_1.Worker(queueName, processor, {
            connection,
            concurrency: options?.concurrency || 1,
        });
        worker.on('completed', (job) => {
            common_1.logger.info(`Job ${job.id} in queue ${queueName} completed`);
        });
        worker.on('failed', (job, err) => {
            common_1.logger.error(`Job ${job?.id} in queue ${queueName} failed`, err);
        });
        this.workers.set(queueName, worker);
        return worker;
    }
    async closeAll() {
        await Promise.all([
            ...Array.from(this.queues.values()).map((q) => q.close()),
            ...Array.from(this.workers.values()).map((w) => w.close()),
        ]);
    }
}
exports.QueueManager = QueueManager;
exports.queueManager = new QueueManager();
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
//# sourceMappingURL=queue-manager.js.map