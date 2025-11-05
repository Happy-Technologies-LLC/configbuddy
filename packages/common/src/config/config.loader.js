"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationLoader = void 0;
exports.getConfigLoader = getConfigLoader;
exports.getConfig = getConfig;
exports.loadConfig = loadConfig;
const tslib_1 = require("tslib");
const fs_1 = require("fs");
const path_1 = require("path");
const config_schema_1 = require("./config.schema");
const dotenv = tslib_1.__importStar(require("dotenv"));
const logger_1 = require("../logging/logger");
const logger = (0, logger_1.getLogger)();
class ConfigurationLoader {
    config = null;
    configPath;
    constructor(configPath) {
        this.configPath = configPath || this.getDefaultConfigPath();
    }
    load() {
        if (this.config) {
            return this.config;
        }
        this.loadDotEnv();
        const fileConfig = this.loadConfigFile();
        const mergedConfig = this.mergeWithEnvVars(fileConfig);
        const { error, value } = config_schema_1.configSchema.validate(mergedConfig, {
            abortEarly: false,
            stripUnknown: true,
        });
        if (error) {
            const errors = error.details.map((d) => `${d.path.join('.')}: ${d.message}`).join('\n');
            throw new Error(`Configuration validation failed:\n${errors}`);
        }
        this.config = value;
        return this.config;
    }
    getConfig() {
        if (!this.config) {
            throw new Error('Configuration not loaded. Call load() first.');
        }
        return this.config;
    }
    reload() {
        this.config = null;
        return this.load();
    }
    loadDotEnv() {
        const env = process.env.NODE_ENV || 'development';
        const envFiles = [
            (0, path_1.resolve)(process.cwd(), `.env.${env}.local`),
            (0, path_1.resolve)(process.cwd(), `.env.${env}`),
            (0, path_1.resolve)(process.cwd(), '.env.local'),
            (0, path_1.resolve)(process.cwd(), '.env'),
        ];
        for (const envFile of envFiles) {
            if ((0, fs_1.existsSync)(envFile)) {
                dotenv.config({ path: envFile });
                break;
            }
        }
    }
    loadConfigFile() {
        if (!(0, fs_1.existsSync)(this.configPath)) {
            logger.warn(`Configuration file not found: ${this.configPath}`);
            return {};
        }
        try {
            const content = (0, fs_1.readFileSync)(this.configPath, 'utf-8');
            return JSON.parse(content);
        }
        catch (error) {
            throw new Error(`Failed to parse configuration file: ${error}`);
        }
    }
    mergeWithEnvVars(fileConfig) {
        const env = process.env;
        return {
            env: env['NODE_ENV'] || fileConfig.env,
            server: {
                port: env['SERVER_PORT'] ? parseInt(env['SERVER_PORT'], 10) : fileConfig.server?.port,
                host: env['SERVER_HOST'] || fileConfig.server?.host,
                trustProxy: env['TRUST_PROXY'] === 'true' ? true : fileConfig.server?.trustProxy,
            },
            databases: {
                neo4j: {
                    uri: env['NEO4J_URI'] || fileConfig.databases?.neo4j?.uri || '',
                    username: env['NEO4J_USERNAME'] || fileConfig.databases?.neo4j?.username || '',
                    password: env['NEO4J_PASSWORD'] || fileConfig.databases?.neo4j?.password || '',
                    database: env['NEO4J_DATABASE'] || fileConfig.databases?.neo4j?.database,
                    maxConnectionPoolSize: env['NEO4J_MAX_POOL_SIZE']
                        ? parseInt(env['NEO4J_MAX_POOL_SIZE'], 10)
                        : fileConfig.databases?.neo4j?.maxConnectionPoolSize,
                    connectionTimeout: env['NEO4J_CONNECTION_TIMEOUT']
                        ? parseInt(env['NEO4J_CONNECTION_TIMEOUT'], 10)
                        : fileConfig.databases?.neo4j?.connectionTimeout,
                },
                postgres: {
                    host: env['POSTGRES_HOST'] || fileConfig.databases?.postgres?.host || '',
                    port: env['POSTGRES_PORT']
                        ? parseInt(env['POSTGRES_PORT'], 10)
                        : fileConfig.databases?.postgres?.port,
                    database: env['POSTGRES_DB'] || fileConfig.databases?.postgres?.database || '',
                    username: env['POSTGRES_USER'] || fileConfig.databases?.postgres?.username || '',
                    password: env['POSTGRES_PASSWORD'] || fileConfig.databases?.postgres?.password || '',
                    maxConnections: env['POSTGRES_MAX_CONNECTIONS']
                        ? parseInt(env['POSTGRES_MAX_CONNECTIONS'], 10)
                        : fileConfig.databases?.postgres?.maxConnections,
                    ssl: {
                        enabled: env['POSTGRES_SSL'] === 'true' || fileConfig.databases?.postgres?.ssl?.enabled,
                        rejectUnauthorized: env['POSTGRES_SSL_REJECT_UNAUTHORIZED'] === 'true' ||
                            fileConfig.databases?.postgres?.ssl?.rejectUnauthorized,
                        ca: env['POSTGRES_SSL_CA'] || fileConfig.databases?.postgres?.ssl?.ca,
                        cert: env['POSTGRES_SSL_CERT'] || fileConfig.databases?.postgres?.ssl?.cert,
                        key: env['POSTGRES_SSL_KEY'] || fileConfig.databases?.postgres?.ssl?.key,
                    },
                },
                redis: {
                    host: env['REDIS_HOST'] || fileConfig.databases?.redis?.host || '',
                    port: env['REDIS_PORT'] ? parseInt(env['REDIS_PORT'], 10) : fileConfig.databases?.redis?.port,
                    password: env['REDIS_PASSWORD'] || fileConfig.databases?.redis?.password,
                    db: env['REDIS_DB'] ? parseInt(env['REDIS_DB'], 10) : fileConfig.databases?.redis?.db,
                    maxRetriesPerRequest: env['REDIS_MAX_RETRIES']
                        ? parseInt(env['REDIS_MAX_RETRIES'], 10)
                        : fileConfig.databases?.redis?.maxRetriesPerRequest,
                    enableReadyCheck: env['REDIS_ENABLE_READY_CHECK'] === 'true' ||
                        fileConfig.databases?.redis?.enableReadyCheck,
                    tls: env['REDIS_TLS'] === 'true'
                        ? {
                            enabled: true,
                            rejectUnauthorized: env['REDIS_TLS_REJECT_UNAUTHORIZED'] !== 'false',
                        }
                        : fileConfig.databases?.redis?.tls,
                },
                kafka: {
                    brokers: env['KAFKA_BROKERS']
                        ? env['KAFKA_BROKERS'].split(',')
                        : fileConfig.databases?.kafka?.brokers || [],
                    clientId: env['KAFKA_CLIENT_ID'] || fileConfig.databases?.kafka?.clientId || '',
                    groupId: env['KAFKA_GROUP_ID'] || fileConfig.databases?.kafka?.groupId || '',
                    ssl: env['KAFKA_SSL'] === 'true' || fileConfig.databases?.kafka?.ssl || false,
                    sasl: env['KAFKA_SASL_MECHANISM']
                        ? {
                            mechanism: env['KAFKA_SASL_MECHANISM'],
                            username: env['KAFKA_SASL_USERNAME'] || '',
                            password: env['KAFKA_SASL_PASSWORD'] || '',
                        }
                        : fileConfig.databases?.kafka?.sasl,
                },
            },
            cloudProviders: {
                aws: {
                    enabled: env['AWS_ENABLED'] === 'true' || fileConfig.cloudProviders?.aws?.enabled || false,
                    region: env['AWS_REGION'] || fileConfig.cloudProviders?.aws?.region,
                    accessKeyId: env['AWS_ACCESS_KEY_ID'] || fileConfig.cloudProviders?.aws?.accessKeyId,
                    secretAccessKey: env['AWS_SECRET_ACCESS_KEY'] || fileConfig.cloudProviders?.aws?.secretAccessKey,
                    assumeRoleArn: env['AWS_ASSUME_ROLE_ARN'] || fileConfig.cloudProviders?.aws?.assumeRoleArn,
                },
                azure: {
                    enabled: env['AZURE_ENABLED'] === 'true' || fileConfig.cloudProviders?.azure?.enabled || false,
                    subscriptionId: env['AZURE_SUBSCRIPTION_ID'] || fileConfig.cloudProviders?.azure?.subscriptionId,
                    tenantId: env['AZURE_TENANT_ID'] || fileConfig.cloudProviders?.azure?.tenantId,
                    clientId: env['AZURE_CLIENT_ID'] || fileConfig.cloudProviders?.azure?.clientId,
                    clientSecret: env['AZURE_CLIENT_SECRET'] || fileConfig.cloudProviders?.azure?.clientSecret,
                },
                gcp: {
                    enabled: env['GCP_ENABLED'] === 'true' || fileConfig.cloudProviders?.gcp?.enabled || false,
                    projectId: env['GCP_PROJECT_ID'] || fileConfig.cloudProviders?.gcp?.projectId,
                    keyFilePath: env['GCP_KEY_FILE_PATH'] || fileConfig.cloudProviders?.gcp?.keyFilePath,
                },
            },
            auth: {
                jwt: {
                    secret: env['JWT_SECRET'] || fileConfig.auth?.jwt?.secret || '',
                    accessTokenExpiresIn: env['JWT_ACCESS_TOKEN_EXPIRES_IN'] || fileConfig.auth?.jwt?.accessTokenExpiresIn || '15m',
                    refreshTokenExpiresIn: env['JWT_REFRESH_TOKEN_EXPIRES_IN'] ||
                        fileConfig.auth?.jwt?.refreshTokenExpiresIn ||
                        '7d',
                    issuer: env['JWT_ISSUER'] || fileConfig.auth?.jwt?.issuer,
                    audience: env['JWT_AUDIENCE'] || fileConfig.auth?.jwt?.audience,
                },
                bcrypt: {
                    rounds: env['BCRYPT_ROUNDS']
                        ? parseInt(env['BCRYPT_ROUNDS'], 10)
                        : fileConfig.auth?.bcrypt?.rounds,
                },
                apiKeys: {
                    enabled: env['API_KEYS_ENABLED'] === 'true' || fileConfig.auth?.apiKeys?.enabled !== false,
                    headerName: env['API_KEY_HEADER_NAME'] || fileConfig.auth?.apiKeys?.headerName || 'X-API-Key',
                },
            },
            rateLimit: {
                enabled: env['RATE_LIMIT_ENABLED'] !== 'false' && fileConfig.rateLimit?.enabled !== false,
                windowMs: env['RATE_LIMIT_WINDOW_MS']
                    ? parseInt(env['RATE_LIMIT_WINDOW_MS'], 10)
                    : fileConfig.rateLimit?.windowMs,
                endpoints: fileConfig.rateLimit?.endpoints,
            },
            cors: {
                enabled: env['CORS_ENABLED'] !== 'false' && fileConfig.cors?.enabled !== false,
                origins: env['CORS_ORIGINS'] ? env['CORS_ORIGINS'].split(',') : fileConfig.cors?.origins,
                credentials: env['CORS_CREDENTIALS'] === 'true' || fileConfig.cors?.credentials,
                maxAge: env['CORS_MAX_AGE']
                    ? parseInt(env['CORS_MAX_AGE'], 10)
                    : fileConfig.cors?.maxAge,
            },
            ssl: {
                enabled: env['SSL_ENABLED'] === 'true' || fileConfig.ssl?.enabled || false,
                keyPath: env['SSL_KEY_PATH'] || fileConfig.ssl?.keyPath,
                certPath: env['SSL_CERT_PATH'] || fileConfig.ssl?.certPath,
                caPath: env['SSL_CA_PATH'] || fileConfig.ssl?.caPath,
                redirectHttp: env['SSL_REDIRECT_HTTP'] !== 'false' && fileConfig.ssl?.redirectHttp !== false,
            },
            secrets: {
                provider: env['SECRETS_PROVIDER'] || fileConfig.secrets?.provider,
                awsSecretsManager: {
                    region: env['AWS_SECRETS_REGION'] || fileConfig.secrets?.awsSecretsManager?.region,
                    secretName: env['AWS_SECRET_NAME'] || fileConfig.secrets?.awsSecretsManager?.secretName,
                },
                vault: {
                    address: env['VAULT_ADDR'] || fileConfig.secrets?.vault?.address,
                    token: env['VAULT_TOKEN'] || fileConfig.secrets?.vault?.token,
                    namespace: env['VAULT_NAMESPACE'] || fileConfig.secrets?.vault?.namespace,
                    path: env['VAULT_PATH'] || fileConfig.secrets?.vault?.path,
                },
                cacheTtl: env['SECRETS_CACHE_TTL']
                    ? parseInt(env['SECRETS_CACHE_TTL'], 10)
                    : fileConfig.secrets?.cacheTtl,
            },
            logging: {
                level: env['LOG_LEVEL'] || fileConfig.logging?.level,
                format: env['LOG_FORMAT'] || fileConfig.logging?.format,
                colorize: env['LOG_COLORIZE'] === 'true' || fileConfig.logging?.colorize,
                auditEnabled: env['AUDIT_ENABLED'] !== 'false' && fileConfig.logging?.auditEnabled !== false,
                auditLevel: env['AUDIT_LEVEL'] || fileConfig.logging?.auditLevel,
            },
            security: fileConfig.security,
            validation: fileConfig.validation,
            discovery: fileConfig.discovery,
            monitoring: fileConfig.monitoring,
        };
    }
    getDefaultConfigPath() {
        const env = process.env['NODE_ENV'] || 'development';
        const configDir = (0, path_1.resolve)(process.cwd(), 'config');
        return (0, path_1.resolve)(configDir, `${env}.json`);
    }
}
exports.ConfigurationLoader = ConfigurationLoader;
let configLoader = null;
function getConfigLoader(configPath) {
    if (!configLoader) {
        configLoader = new ConfigurationLoader(configPath);
    }
    return configLoader;
}
function getConfig() {
    return getConfigLoader().getConfig();
}
function loadConfig(configPath) {
    return getConfigLoader(configPath).load();
}
//# sourceMappingURL=config.loader.js.map