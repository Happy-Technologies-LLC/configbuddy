import { ConfigSchema } from './config.schema';
export declare class ConfigurationLoader {
    private config;
    private configPath;
    constructor(configPath?: string);
    load(): ConfigSchema;
    getConfig(): ConfigSchema;
    reload(): ConfigSchema;
    private loadDotEnv;
    private loadConfigFile;
    private mergeWithEnvVars;
    private getDefaultConfigPath;
}
export declare function getConfigLoader(configPath?: string): ConfigurationLoader;
export declare function getConfig(): ConfigSchema;
export declare function loadConfig(configPath?: string): ConfigSchema;
//# sourceMappingURL=config.loader.d.ts.map