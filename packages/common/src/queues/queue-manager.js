// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedQueueManager = void 0;
exports.getQueueManager = getQueueManager;
const tslib_1 = require("tslib");
const bullmq_1 = require("bullmq");
const ioredis_1 = tslib_1.__importDefault(require("ioredis"));
const logger_1 = require("../utils/logger");
const queue_config_1 = require("./queue-config");
const getRedisConnection = () => {
    return new ioredis_1.default({
        host: process.env['REDIS_HOST'] || 'localhost',
        port: parseInt(process.env['REDIS_PORT'] || '6379'),
        password: process.env['REDIS_PASSWORD'],
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
    });
};
class EnhancedQueueManager {
    queues = new Map();
    workers = new Map();
    queueEvents = new Map();
    connection;
    isShuttingDown = false;
    constructor() {
        this.connection = getRedisConnection();
        this.connection.on('error', (err) => {
            logger_1.logger.error('Redis connection error', err);
        });
        this.connection.on('connect', () => {
            logger_1.logger.info('Redis connected for queue manager');
        });
    }
    getQueue(queueName) {
        if (!this.queues.has(queueName)) {
            const config = (0, queue_config_1.getQueueConfig)(queueName);
            const queue = new bullmq_1.Queue(queueName, {
                connection: this.connection,
                defaultJobOptions: config._defaultJobOptions,
            });
            this.queues.set(queueName, queue);
            logger_1.logger.info(`Queue created: ${queueName}`);
        }
        return this.queues.get(queueName);
    }
    registerWorker(_config, _processor) {
        const { name, _queueName, _concurrency, gracefulShutdown, shutdownTimeout } = _config;
        if (this.workers.has(name)) {
            throw new Error(`Worker ${name} already registered`);
        }
        const worker = new bullmq_1.Worker(_queueName, _processor, {
            connection: this.connection,
            concurrency: _concurrency || 1,
        });
        worker.on('ready', () => {
            logger_1.logger.info(`Worker ${name} ready for queue ${_queueName}`);
        });
        worker.on('active', (job) => {
            logger_1.logger.info(`Worker ${name} processing job ${job.id}`);
        });
        worker.on('completed', (job, result) => {
            logger_1.logger.info(`Worker ${name} completed job ${job.id}`, { result });
        });
        worker.on('failed', (job, err) => {
            logger_1.logger.error(`Worker ${name} failed job ${job?.id}`, err);
        });
        worker.on('error', (err) => {
            logger_1.logger.error(`Worker ${name} error`, err);
        });
        worker.on('stalled', (jobId) => {
            logger_1.logger.warn(`Worker ${name} job ${jobId} stalled`);
        });
        if (gracefulShutdown) {
            this.setupGracefulShutdown(worker, name, shutdownTimeout);
        }
        this.workers.set(name, worker);
        logger_1.logger.info(`Worker ${name} registered for queue ${_queueName} with concurrency ${_concurrency}`);
        return worker;
    }
    setupQueueEvents(queueName) {
        if (!this.queueEvents.has(queueName)) {
            const queueEvents = new bullmq_1.QueueEvents(queueName, {
                connection: this.connection,
            });
            queueEvents.on('waiting', ({ jobId }) => {
                logger_1.logger.debug(`Job ${jobId} is waiting in queue ${queueName}`);
            });
            queueEvents.on('active', ({ jobId }) => {
                logger_1.logger.debug(`Job ${jobId} is active in queue ${queueName}`);
            });
            queueEvents.on('completed', ({ jobId, returnvalue }) => {
                logger_1.logger.info(`Job ${jobId} completed in queue ${queueName}`, { returnvalue });
            });
            queueEvents.on('failed', ({ jobId, failedReason }) => {
                logger_1.logger.error(`Job ${jobId} failed in queue ${queueName}`, { failedReason });
            });
            queueEvents.on('progress', ({ jobId, data }) => {
                logger_1.logger.debug(`Job ${jobId} progress in queue ${queueName}`, data);
            });
            this.queueEvents.set(queueName, queueEvents);
        }
        return this.queueEvents.get(queueName);
    }
    async addJob(_queueName, _jobName, _data, options) {
        const queue = this.getQueue(_queueName);
        const job = await queue.add(_jobName, _data, options);
        logger_1.logger.info(`Job ${job.id} added to queue ${_queueName}`, { _jobName, _data });
        return job;
    }
    async addRepeatableJob(_queueName, _jobName, _data, _repeatOptions) {
        const queue = this.getQueue(_queueName);
        const job = await queue.add(_jobName, _data, {
            repeat: _repeatOptions,
        });
        logger_1.logger.info(`Repeatable job ${job.id} added to queue ${_queueName}`, {
            _jobName,
            _repeatOptions,
        });
        return job;
    }
    async updateJobProgress(job, progress) {
        await job.updateProgress(progress);
        logger_1.logger.debug(`Job ${job.id} progress updated: ${progress._percent}%`);
    }
    async getJob(queueName, jobId) {
        const queue = this.getQueue(queueName);
        return await queue.getJob(jobId);
    }
    async removeJob(queueName, jobId) {
        const job = await this.getJob(queueName, jobId);
        if (job) {
            await job.remove();
            logger_1.logger.info(`Job ${jobId} removed from queue ${queueName}`);
        }
    }
    async getQueueStats(queueName) {
        const queue = this.getQueue(queueName);
        const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused');
        return {
            queueName,
            waiting: counts['waiting'] ?? 0,
            active: counts['active'] ?? 0,
            completed: counts['completed'] ?? 0,
            failed: counts['failed'] ?? 0,
            delayed: counts['delayed'] ?? 0,
            paused: counts['paused'] ?? 0,
        };
    }
    async getFailedJobs(queueName, start = 0, end = 99) {
        const queue = this.getQueue(queueName);
        return await queue.getFailed(start, end);
    }
    async retryJob(queueName, jobId) {
        const job = await this.getJob(queueName, jobId);
        if (job) {
            await job.retry();
            logger_1.logger.info(`Job ${jobId} retried in queue ${queueName}`);
        }
    }
    getWorkerStatus(workerName) {
        const worker = this.workers.get(workerName);
        if (!worker) {
            return null;
        }
        return {
            workerName,
            _isRunning: worker.isRunning(),
            _isPaused: worker.isPaused(),
        };
    }
    async pauseWorker(workerName) {
        const worker = this.workers.get(workerName);
        if (worker) {
            await worker.pause();
            logger_1.logger.info(`Worker ${workerName} paused`);
        }
    }
    async resumeWorker(workerName) {
        const worker = this.workers.get(workerName);
        if (worker) {
            await worker.resume();
            logger_1.logger.info(`Worker ${workerName} resumed`);
        }
    }
    setupGracefulShutdown(_worker, _name, __timeout = 30000) {
        const shutdown = async (signal) => {
            if (this.isShuttingDown)
                return;
            this.isShuttingDown = true;
            logger_1.logger.info(`${signal} received, shutting down worker ${_name} gracefully...`);
            try {
                await _worker.close();
                logger_1.logger.info(`Worker ${_name} shut down successfully`);
                process.exit(0);
            }
            catch (err) {
                logger_1.logger.error(`Error shutting down worker ${_name}`, err);
                process.exit(1);
            }
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    async closeAll() {
        logger_1.logger.info('Closing all queues, workers, and events...');
        const promises = [];
        for (const [name, worker] of this.workers.entries()) {
            promises.push(worker.close().then(() => {
                logger_1.logger.info(`Worker ${name} closed`);
            }));
        }
        for (const [name, queue] of this.queues.entries()) {
            promises.push(queue.close().then(() => {
                logger_1.logger.info(`Queue ${name} closed`);
            }));
        }
        for (const [name, queueEvents] of this.queueEvents.entries()) {
            promises.push(queueEvents.close().then(() => {
                logger_1.logger.info(`Queue events ${name} closed`);
            }));
        }
        await Promise.all(promises);
        await this.connection.quit();
        logger_1.logger.info('All queues, workers, and events closed');
    }
    async cleanQueue(_queueName, _grace = 3600000, _limit = 1000, _type = 'completed') {
        const queue = this.getQueue(_queueName);
        await queue.clean(_grace, _limit, _type);
        logger_1.logger.info(`Cleaned ${_type} jobs from queue ${_queueName}`, { _grace, _limit });
    }
}
exports.EnhancedQueueManager = EnhancedQueueManager;
let queueManager = null;
function getQueueManager() {
    if (!queueManager) {
        queueManager = new EnhancedQueueManager();
    }
    return queueManager;
}
//# sourceMappingURL=queue-manager.js.map