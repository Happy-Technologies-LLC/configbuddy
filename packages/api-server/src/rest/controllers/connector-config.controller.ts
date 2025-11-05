import { Request, Response } from 'express';
import { getPostgresClient } from '@cmdb/database';
import { ConnectorConfigCRUDController } from './connector-config/crud.controller';
import { ConnectorConfigOperationsController } from './connector-config/operations.controller';
import { ConnectorConfigResourcesController } from './connector-config/resources.controller';
import { ConnectorConfigMetricsController } from './connector-config/metrics.controller';

/**
 * ConnectorConfigController - Manages connector configurations and execution
 *
 * This controller delegates to specialized sub-controllers for different concerns:
 * - CRUD operations (create, read, update, delete)
 * - Operational actions (enable, disable, test, run)
 * - Resource management (available resources, enabled resources)
 * - Metrics and run history
 */
export class ConnectorConfigController {
  private postgresClient = getPostgresClient();
  private crudController: ConnectorConfigCRUDController;
  private operationsController: ConnectorConfigOperationsController;
  private resourcesController: ConnectorConfigResourcesController;
  private metricsController: ConnectorConfigMetricsController;

  constructor() {
    const pool = this.postgresClient['pool'];
    this.crudController = new ConnectorConfigCRUDController(pool);
    this.operationsController = new ConnectorConfigOperationsController(pool);
    this.resourcesController = new ConnectorConfigResourcesController(pool);
    this.metricsController = new ConnectorConfigMetricsController(pool);
  }

  // CRUD Operations
  async listConfigurations(req: Request, res: Response): Promise<void> {
    return this.crudController.listConfigurations(req, res);
  }

  async getConfiguration(req: Request, res: Response): Promise<void> {
    return this.crudController.getConfiguration(req, res);
  }

  async createConfiguration(req: Request, res: Response): Promise<void> {
    return this.crudController.createConfiguration(req, res);
  }

  async updateConfiguration(req: Request, res: Response): Promise<void> {
    return this.crudController.updateConfiguration(req, res);
  }

  async deleteConfiguration(req: Request, res: Response): Promise<void> {
    return this.crudController.deleteConfiguration(req, res);
  }

  // Operational Actions
  async testConnection(req: Request, res: Response): Promise<void> {
    return this.operationsController.testConnection(req, res);
  }

  async runConnector(req: Request, res: Response): Promise<void> {
    return this.operationsController.runConnector(req, res);
  }

  async enableConfiguration(req: Request, res: Response): Promise<void> {
    return this.operationsController.enableConfiguration(req, res);
  }

  async disableConfiguration(req: Request, res: Response): Promise<void> {
    return this.operationsController.disableConfiguration(req, res);
  }

  // Resource Management
  async getAvailableResources(req: Request, res: Response): Promise<void> {
    return this.resourcesController.getAvailableResources(req, res);
  }

  async updateEnabledResources(req: Request, res: Response): Promise<void> {
    return this.resourcesController.updateEnabledResources(req, res);
  }

  async getResourceConfig(req: Request, res: Response): Promise<void> {
    return this.resourcesController.getResourceConfig(req, res);
  }

  // Metrics and Run History
  async getConfigurationRuns(req: Request, res: Response): Promise<void> {
    return this.metricsController.getConfigurationRuns(req, res);
  }

  async getConfigurationMetrics(req: Request, res: Response): Promise<void> {
    return this.metricsController.getConfigurationMetrics(req, res);
  }

  async getResourceMetrics(req: Request, res: Response): Promise<void> {
    return this.metricsController.getResourceMetrics(req, res);
  }

  async getAllRuns(req: Request, res: Response): Promise<void> {
    return this.metricsController.getAllRuns(req, res);
  }

  async getRunDetails(req: Request, res: Response): Promise<void> {
    return this.metricsController.getRunDetails(req, res);
  }

  async cancelRun(req: Request, res: Response): Promise<void> {
    return this.metricsController.cancelRun(req, res);
  }
}
