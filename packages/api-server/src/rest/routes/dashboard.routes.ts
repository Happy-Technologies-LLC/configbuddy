/**
 * Dashboard Routes
 * REST API routes for Business Insights dashboards
 */

import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';

const router = Router();
const dashboardController = new DashboardController();

/**
 * @route GET /api/v1/dashboards/executive
 * @desc Get Executive Dashboard summary data
 * @query {number} days - Time range in days (default: 30)
 */
router.get('/executive', (req, res) => dashboardController.getExecutiveDashboard(req, res));

/**
 * @route GET /api/v1/dashboards/cio
 * @desc Get CIO Dashboard metrics
 * @query {number} days - Time range in days (default: 30)
 */
router.get('/cio', (req, res) => dashboardController.getCIODashboard(req, res));

/**
 * @route GET /api/v1/dashboards/itsm
 * @desc Get ITSM Dashboard data
 */
router.get('/itsm', (req, res) => dashboardController.getITSMDashboard(req, res));

/**
 * @route GET /api/v1/dashboards/finops
 * @desc Get FinOps Dashboard data
 * @query {number} days - Time range in days (default: 30)
 */
router.get('/finops', (req, res) => dashboardController.getFinOpsDashboard(req, res));

/**
 * @route GET /api/v1/dashboards/business-service/:serviceId?
 * @desc Get Business Service Dashboard data
 * @param {string} serviceId - Optional service ID to filter by
 */
router.get('/business-service/:serviceId?', (req, res) => dashboardController.getBusinessServiceDashboard(req, res));

export { router as dashboardRoutes };
