import Joi from 'joi';
export declare const configSchema: Joi.ObjectSchema<any>;
export type ConfigSchema = {
    env: 'development' | 'staging' | 'production' | 'test';
    server: {
        port: number;
        host: string;
        trustProxy: boolean;
    };
    databases: {
        neo4j: {
            uri: string;
            username: string;
            password: string;
            database: string;
            maxConnectionPoolSize: number;
            connectionTimeout: number;
        };
        postgres: {
            host: string;
            port: number;
            database: string;
            username: string;
            password: string;
            maxConnections: number;
            ssl?: {
                enabled: boolean;
                rejectUnauthorized: boolean;
                ca?: string;
                cert?: string;
                key?: string;
            };
        };
        redis: {
            host: string;
            port: number;
            password?: string;
            db: number;
            maxRetriesPerRequest: number;
            enableReadyCheck: boolean;
            tls?: {
                enabled: boolean;
                rejectUnauthorized: boolean;
            };
        };
        kafka: {
            brokers: string[];
            clientId: string;
            groupId: string;
            ssl: boolean;
            sasl?: {
                mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
                username: string;
                password: string;
            };
        };
    };
    cloudProviders: {
        aws: {
            enabled: boolean;
            region: string;
            accessKeyId?: string;
            secretAccessKey?: string;
            assumeRoleArn?: string;
        };
        azure: {
            enabled: boolean;
            subscriptionId?: string;
            tenantId?: string;
            clientId?: string;
            clientSecret?: string;
        };
        gcp: {
            enabled: boolean;
            projectId?: string;
            keyFilePath?: string;
        };
    };
    auth: {
        jwt: {
            secret: string;
            accessTokenExpiresIn: string;
            refreshTokenExpiresIn: string;
            issuer: string;
            audience: string;
        };
        bcrypt: {
            rounds: number;
        };
        apiKeys: {
            enabled: boolean;
            headerName: string;
        };
    };
    rateLimit: {
        enabled: boolean;
        windowMs: number;
        endpoints: {
            discovery: {
                max: number;
                windowMs: number;
            };
            query: {
                max: number;
                windowMs: number;
            };
            graphql: {
                max: number;
                windowMs: number;
            };
            admin: {
                max: number;
                windowMs: number;
            };
            auth: {
                max: number;
                windowMs: number;
            };
        };
    };
    cors: {
        enabled: boolean;
        origins: string[];
        credentials: boolean;
        maxAge: number;
    };
    ssl: {
        enabled: boolean;
        keyPath?: string;
        certPath?: string;
        caPath?: string;
        redirectHttp: boolean;
    };
    secrets: {
        provider: 'env' | 'aws-secrets-manager' | 'vault';
        awsSecretsManager?: {
            region: string;
            secretName?: string;
        };
        vault?: {
            address?: string;
            token?: string;
            namespace?: string;
            path: string;
        };
        cacheTtl: number;
    };
    logging: {
        level: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
        format: 'json' | 'simple';
        colorize: boolean;
        auditEnabled: boolean;
        auditLevel: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
    };
    security: {
        helmet: {
            enabled: boolean;
            contentSecurityPolicy: {
                enabled: boolean;
                directives?: Record<string, any>;
            };
            hsts: {
                enabled: boolean;
                maxAge: number;
                includeSubDomains: boolean;
                preload: boolean;
            };
        };
        csrf: {
            enabled: boolean;
            ignoredRoutes: string[];
        };
    };
    validation: {
        stripUnknown: boolean;
        abortEarly: boolean;
        sanitizeInput: boolean;
    };
    discovery: {
        enabled: boolean;
        interval: number;
        batchSize: number;
        maxRetries: number;
        retryDelay: number;
    };
    monitoring: {
        enabled: boolean;
        metricsPort: number;
        healthCheckPath: string;
    };
};
//# sourceMappingURL=config.schema.d.ts.map