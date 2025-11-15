import express, { Express, Request, Response, NextFunction } from 'express';
import { Server as HTTPServer } from 'http';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { json, urlencoded } from 'body-parser';
import { logger } from '@cmdb/common';
import { ciRoutes } from './routes/ci.routes';
import { discoveryRoutes } from './routes/discovery.routes';
import { discoveryDefinitionRoutes } from './routes/discovery-definition.routes';
import { discoveryAgentRoutes } from './routes/discovery-agent.routes';
import { relationshipRoutes } from './routes/relationship.routes';
import healthRoutes from '../health/health.routes';
import { searchRoutes } from './routes/search.routes';
import { analyticsRoutes } from './routes/analytics.routes';
import { authRoutes } from './routes/auth.routes';
import { anomalyRoutes } from './routes/anomaly.routes';
import jobsRoutes from './routes/jobs.routes';
import { connectorRoutes } from './routes/connector.routes';
import { connectorConfigRoutes } from './routes/connector-config.routes';
import { unifiedCredentialRoutes } from './routes/unified-credential.routes';
import { reconciliationRoutes } from './routes/reconciliation.routes';
import { dashboardRoutes } from './routes/dashboard.routes';
// TEMPORARILY DISABLED - V3.0 routes need repository implementations
// import { aiPatternRoutes } from './routes/ai-pattern.routes';
import { swaggerRoutes } from './routes/swagger.routes';
// import { itilRoutes } from './routes/itil.routes';

export class RestAPIServer {
  private app: Express;
  private port: number;
  private httpServer: HTTPServer | null = null;

  constructor(port: number = 3000) {
    this.app = express();
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // CSP configuration to allow Swagger UI
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
          },
        },
      })
    );
    this.app.use(cors());
    this.app.use(compression());
    this.app.use(json({ limit: '10mb' }));
    this.app.use(urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req: Request, _res: Response, next: NextFunction) => {
      logger.info('API Request', {
        _method: req.method,
        _path: req.path,
        _ip: req.ip,
      });
      next();
    });
  }

  private setupRoutes(): void {
    // API Documentation (no authentication required)
    this.app.use('/api-docs', swaggerRoutes);

    // API endpoints
    this.app.use('/api/v1/cmdb-health', healthRoutes);
    this.app.use('/api/v1/auth', authRoutes);
    this.app.use('/api/v1/cis', ciRoutes);
    this.app.use('/api/v1/discovery/definitions', discoveryDefinitionRoutes);
    this.app.use('/api/v1/discovery', discoveryRoutes);
    this.app.use('/api/v1/agents', discoveryAgentRoutes);
    this.app.use('/api/v1', unifiedCredentialRoutes);
    this.app.use('/api/v1/connectors', connectorRoutes);
    this.app.use('/api/v1/connector-configs', connectorConfigRoutes);
    this.app.use('/api/v1/relationships', relationshipRoutes);
    this.app.use('/api/v1/search', searchRoutes);
    this.app.use('/api/v1/analytics', analyticsRoutes);
    this.app.use('/api/v1/anomalies', anomalyRoutes);
    this.app.use('/api/v1/reconciliation', reconciliationRoutes);
    this.app.use('/api/v1/dashboards', dashboardRoutes);
    // TEMPORARILY DISABLED - V3.0 routes need repository implementations
    // this.app.use('/api/v1/itil', itilRoutes);
    // this.app.use('/api/v1/ai', aiPatternRoutes);
    this.app.use('/api/v1', jobsRoutes);
  }

  private setupErrorHandling(): void {
    this.app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      logger.error('API Error', { error: err.message, stack: err.stack });
      res.status(500).json({
        _error: 'Internal Server Error',
        _message: err.message,
      });
    });
  }

  start(): HTTPServer {
    this.httpServer = this.app.listen(this.port, () => {
      logger.info(`REST API Server listening on port ${this.port}`);
    });
    return this.httpServer;
  }

  getHttpServer(): HTTPServer | null {
    return this.httpServer;
  }
}
