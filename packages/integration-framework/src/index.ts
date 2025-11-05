/**
 * Integration Framework - Main Exports (v3.0)
 * Multi-resource connector management system
 */

// Core classes
export { BaseIntegrationConnector } from './core/base-connector';
export { IntegrationManager, getIntegrationManager } from './core/integration-manager';

// Registry
export { ConnectorRegistry, getConnectorRegistry } from './registry/connector-registry';

// Installer
export { ConnectorInstaller, getConnectorInstaller } from './installer/connector-installer';
export type { DownloadOptions } from './installer/connector-installer';

// Executor
export { ConnectorExecutor, getConnectorExecutor } from './executor/connector-executor';
export type { ExecutionOptions } from './executor/connector-executor';

// Types
export * from './types/connector.types';
