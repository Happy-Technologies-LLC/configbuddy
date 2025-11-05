import Redis from 'ioredis';
export declare class RedisClient {
    private client;
    constructor(config?: {
        host?: string;
        port?: number;
        password?: string;
    });
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttl?: number): Promise<void>;
    getJSON<T>(key: string): Promise<T | null>;
    setJSON<T>(key: string, value: T, ttl?: number): Promise<void>;
    del(key: string): Promise<void>;
    close(): Promise<void>;
    getConnection(): Redis;
}
export declare function getRedisClient(): RedisClient;
//# sourceMappingURL=client.d.ts.map