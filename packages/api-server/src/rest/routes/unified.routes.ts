/**
 * Unified Framework Routes
 * REST API endpoints for unified ITIL + TBM + BSM interface
 */

import { Router } from 'express';
import Joi from 'joi';
import { UnifiedController } from '../controllers/unified.controller';
import { validateRequest, validateOptional } from '../middleware/validation.middleware';
import { auditMiddleware } from '../../middleware/audit.middleware';

export const unifiedRoutes = Router();
const controller = new UnifiedController();

// Apply audit middleware to all routes
unifiedRoutes.use(auditMiddleware);

// Validation schemas
const createEnrichedIncidentSchema = Joi.object({
  affectedCIId: Joi.string().required(),
  title: Joi.string().required().min(5),
  description: Joi.string().required().min(10),
  reportedBy: Joi.string().required(),
  category: Joi.string().optional(),
  subcategory: Joi.string().optional(),
  symptoms: Joi.array().items(Joi.string()).optional()
});

const assessUnifiedChangeRiskSchema = Joi.object({
  affectedCIIds: Joi.array().items(Joi.string()).min(1).required(),
  title: Joi.string().required().min(5),
  description: Joi.string().required().min(10),
  changeType: Joi.string().valid('standard', 'normal', 'emergency', 'major').required(),
  category: Joi.string().optional(),
  plannedStart: Joi.date().iso().required(),
  plannedEnd: Joi.date().iso().required(),
  implementationPlan: Joi.string().required().min(50),
  backoutPlan: Joi.string().required().min(20),
  testPlan: Joi.string().optional(),
  requestedBy: Joi.string().required()
});

const queryFiltersSchema = Joi.object({
  serviceIds: Joi.array().items(Joi.string()).optional(),
  criticality: Joi.array().items(
    Joi.string().valid('tier_0', 'tier_1', 'tier_2', 'tier_3', 'tier_4')
  ).optional(),
  operationalStatus: Joi.array().items(
    Joi.string().valid('operational', 'degraded', 'outage', 'maintenance')
  ).optional(),
  costRange: Joi.object({
    min: Joi.number().min(0).optional(),
    max: Joi.number().min(0).optional()
  }).optional(),
  healthScoreRange: Joi.object({
    min: Joi.number().min(0).max(100).optional(),
    max: Joi.number().min(0).max(100).optional()
  }).optional(),
  riskLevel: Joi.array().items(
    Joi.string().valid('critical', 'high', 'medium', 'low')
  ).optional(),
  complianceFrameworks: Joi.array().items(Joi.string()).optional(),
  technicalOwner: Joi.string().optional(),
  businessOwner: Joi.string().optional(),
  search: Joi.string().optional(),
  sortBy: Joi.string().valid('name', 'cost', 'health', 'risk', 'revenue', 'criticality').optional(),
  sortDirection: Joi.string().valid('asc', 'desc').optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  offset: Joi.number().integer().min(0).optional()
});

/**
 * @route   GET /api/v1/unified/services/:serviceId/complete
 * @desc    Get complete service view with ITIL + TBM + BSM data
 * @access  Private
 * @param   {string} serviceId - Business service ID
 * @query   {boolean} useCache - Whether to use cached data (default: true)
 */
unifiedRoutes.get(
  '/services/:serviceId/complete',
  controller.getCompleteServiceView.bind(controller)
);

/**
 * @route   GET /api/v1/unified/services/:serviceId/kpis
 * @desc    Get unified KPIs for a service
 * @access  Private
 * @param   {string} serviceId - Business service ID
 */
unifiedRoutes.get(
  '/services/:serviceId/kpis',
  controller.getUnifiedKPIs.bind(controller)
);

/**
 * @route   GET /api/v1/unified/services/:serviceId/dashboard
 * @desc    Get complete dashboard data for a service
 * @access  Private
 * @param   {string} serviceId - Business service ID
 */
unifiedRoutes.get(
  '/services/:serviceId/dashboard',
  controller.getServiceDashboard.bind(controller)
);

/**
 * @route   POST /api/v1/unified/incidents/enriched
 * @desc    Create enriched incident with ITIL + TBM + BSM analysis
 * @access  Private
 * @body    {IncidentInput} incident - Incident data
 */
unifiedRoutes.post(
  '/incidents/enriched',
  validateRequest(createEnrichedIncidentSchema),
  controller.createEnrichedIncident.bind(controller)
);

/**
 * @route   POST /api/v1/unified/changes/assess-unified
 * @desc    Assess unified change risk across all frameworks
 * @access  Private
 * @body    {ChangeRequest} change - Change request data
 */
unifiedRoutes.post(
  '/changes/assess-unified',
  validateRequest(assessUnifiedChangeRiskSchema),
  controller.assessUnifiedChangeRisk.bind(controller)
);

/**
 * @route   POST /api/v1/unified/services/query
 * @desc    Query services with unified filters
 * @access  Private
 * @body    {UnifiedQueryFilters} filters - Query filters
 */
unifiedRoutes.post(
  '/services/query',
  validateOptional(queryFiltersSchema),
  controller.queryServices.bind(controller)
);

/**
 * @route   GET /api/v1/unified/services/:serviceId/health-details
 * @desc    Get detailed service health breakdown
 * @access  Private
 * @param   {string} serviceId - Business service ID
 */
unifiedRoutes.get(
  '/services/:serviceId/health-details',
  controller.getServiceHealthDetails.bind(controller)
);

/**
 * @route   GET /api/v1/unified/services/:serviceId/risk-details
 * @desc    Get detailed risk score breakdown
 * @access  Private
 * @param   {string} serviceId - Business service ID
 */
unifiedRoutes.get(
  '/services/:serviceId/risk-details',
  controller.getRiskScoreDetails.bind(controller)
);

/**
 * @route   GET /api/v1/unified/services/:serviceId/value-details
 * @desc    Get detailed value score breakdown
 * @access  Private
 * @param   {string} serviceId - Business service ID
 */
unifiedRoutes.get(
  '/services/:serviceId/value-details',
  controller.getValueScoreDetails.bind(controller)
);

/**
 * @route   GET /api/v1/unified/services/top-by-cost
 * @desc    Get top services by cost
 * @access  Private
 * @query   {number} limit - Number of services to return (default: 10)
 */
unifiedRoutes.get(
  '/services/top-by-cost',
  controller.getTopServicesByCost.bind(controller)
);

/**
 * @route   GET /api/v1/unified/services/top-by-risk
 * @desc    Get top services by risk score
 * @access  Private
 * @query   {number} limit - Number of services to return (default: 10)
 */
unifiedRoutes.get(
  '/services/top-by-risk',
  controller.getTopServicesByRisk.bind(controller)
);

/**
 * @route   GET /api/v1/unified/services/top-by-value
 * @desc    Get top services by value score
 * @access  Private
 * @query   {number} limit - Number of services to return (default: 10)
 */
unifiedRoutes.get(
  '/services/top-by-value',
  controller.getTopServicesByValue.bind(controller)
);
