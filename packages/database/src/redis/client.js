"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisClient = void 0;
exports.getRedisClient = getRedisClient;
const tslib_1 = require("tslib");
const ioredis_1 = tslib_1.__importDefault(require("ioredis"));
const common_1 = require("@cmdb/common");
class RedisClient {
    client;
    constructor(config) {
        this.client = new ioredis_1.default({
            host: config?.host || process.env['REDIS_HOST'] || 'localhost',
            port: config?.port || parseInt(process.env['REDIS_PORT'] || '6379'),
            password: config?.password || process.env['REDIS_PASSWORD'],
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });
        this.client.on('error', (err) => {
            common_1.logger.error('Redis client error', err);
        });
        this.client.on('connect', () => {
            common_1.logger.info('Redis client connected');
        });
    }
    async get(key) {
        return await this.client.get(key);
    }
    async set(key, value, ttl) {
        if (ttl) {
            await this.client.setex(key, ttl, value);
        }
        else {
            await this.client.set(key, value);
        }
    }
    async getJSON(key) {
        const value = await this.get(key);
        return value ? JSON.parse(value) : null;
    }
    async setJSON(key, value, ttl) {
        await this.set(key, JSON.stringify(value), ttl);
    }
    async del(...keys) {
        if (keys.length > 0) {
            await this.client.del(...keys);
        }
    }
    async setex(key, seconds, value) {
        await this.client.setex(key, seconds, value);
    }
    async keys(pattern) {
        return await this.client.keys(pattern);
    }
    duplicate() {
        return this.client.duplicate();
    }
    async publish(channel, message) {
        return await this.client.publish(channel, message);
    }
    async close() {
        await this.client.quit();
    }
    getConnection() {
        return this.client;
    }
}
exports.RedisClient = RedisClient;
let redisClient = null;
function getRedisClient() {
    if (!redisClient) {
        redisClient = new RedisClient();
    }
    return redisClient;
}
//# sourceMappingURL=client.js.map