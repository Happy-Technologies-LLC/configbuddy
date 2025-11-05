/**
 * Integration Hub - Main Entry Point
 */

import express from 'express';
import cors from 'cors';
import { logger } from '@cmdb/common';
import { connectorsRouter } from './api/connectors.routes';
import { transformationRulesRouter } from './api/transformation-rules.routes';
import { getIntegrationManager, getConnectorRegistry } from '@cmdb/integration-framework';

export class IntegrationHubServer {
  private app: express.Application;
  private port: number;

  constructor(port: number = 3001) {
    this.app = express();
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, _res, next) => {
      logger.info('Integration Hub API request', {
        method: req.method,
        path: req.path,
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok', service: 'integration-hub' });
    });

    // API routes
    this.app.use('/api/v1/connectors', connectorsRouter);
    this.app.use('/api/v1/transformation-rules', transformationRulesRouter);

    // 404 handler
    this.app.use((_req, res) => {
      res.status(404).json({ error: 'Not found' });
    });

    // Error handler
    this.app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error('Integration Hub API error', { error: err });
      res.status(500).json({ error: err.message });
    });
  }

  async start(): Promise<void> {
    // Initialize connector registry and integration manager
    const connectorRegistry = getConnectorRegistry();
    const integrationManager = getIntegrationManager();

    // Discover connectors from /packages/connectors directory
    const connectorsPath = process.env['CONNECTORS_PATH'] || '/app/packages/connectors';
    await connectorRegistry.discoverConnectors(connectorsPath);

    // Load connector configurations from database
    await integrationManager.loadConnectors();

    // Start HTTP server
    this.app.listen(this.port, () => {
      logger.info('Integration Hub started', { port: this.port });
    });
  }
}

// Export for use as library
export * from './api/connectors.routes';
export * from './api/transformation-rules.routes';

// Start server when executed directly
if (require.main === module) {
  const port = parseInt(process.env['INTEGRATION_HUB_PORT'] || '3001', 10);
  const server = new IntegrationHubServer(port);
  server.start().catch(error => {
    logger.error('Failed to start Integration Hub', { error });
    process.exit(1);
  });
}
