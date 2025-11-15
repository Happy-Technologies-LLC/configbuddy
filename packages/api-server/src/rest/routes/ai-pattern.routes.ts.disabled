import { Router } from 'express';
import Joi from 'joi';
import { AIPatternController } from '../controllers/ai-pattern.controller';
import { validateOptional } from '../middleware/validation.middleware';

export const aiPatternRoutes = Router();
const controller = new AIPatternController();

// Validation schemas
const listPatternsSchema = Joi.object({
  status: Joi.string().optional(),
  category: Joi.string().optional(),
  isActive: Joi.string().valid('true', 'false').optional(),
  minConfidence: Joi.number().min(0).max(1).optional(),
  minUsage: Joi.number().integer().min(0).optional(),
  search: Joi.string().optional(),
});

const createPatternSchema = Joi.object({
  patternId: Joi.string().required(),
  name: Joi.string().required(),
  category: Joi.string().required(),
  description: Joi.string().optional(),
  detectionCode: Joi.string().required(),
  discoveryCode: Joi.string().required(),
  confidenceScore: Joi.number().min(0).max(1).required(),
  status: Joi.string().valid('draft', 'review', 'approved', 'active', 'deprecated').default('draft'),
  isActive: Joi.boolean().default(false),
  testCases: Joi.array().items(Joi.object()).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
});

const updatePatternSchema = Joi.object({
  name: Joi.string().optional(),
  category: Joi.string().optional(),
  description: Joi.string().optional(),
  detectionCode: Joi.string().optional(),
  discoveryCode: Joi.string().optional(),
  confidenceScore: Joi.number().min(0).max(1).optional(),
  testCases: Joi.array().items(Joi.object()).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
});

const workflowActionSchema = Joi.object({
  submittedBy: Joi.string().optional(),
  approvedBy: Joi.string().optional(),
  rejectedBy: Joi.string().optional(),
  activatedBy: Joi.string().optional(),
  deactivatedBy: Joi.string().optional(),
  notes: Joi.string().optional(),
  reason: Joi.string().optional(),
});

const listSessionsSchema = Joi.object({
  status: Joi.string().optional(),
  provider: Joi.string().optional(),
  dateFrom: Joi.string().isoDate().optional(),
  dateTo: Joi.string().isoDate().optional(),
  minCost: Joi.number().min(0).optional(),
  maxCost: Joi.number().min(0).optional(),
  search: Joi.string().optional(),
});

const costAnalyticsSchema = Joi.object({
  dateFrom: Joi.string().isoDate().optional(),
  dateTo: Joi.string().isoDate().optional(),
});

const patternUsageSchema = Joi.object({
  days: Joi.number().integer().min(1).max(365).default(30),
});

// Pattern Management Routes
// GET /api/v1/ai/patterns
aiPatternRoutes.get(
  '/patterns',
  validateOptional(listPatternsSchema, 'query'),
  controller.listPatterns.bind(controller)
);

// GET /api/v1/ai/patterns/categories
aiPatternRoutes.get(
  '/patterns/categories',
  controller.getCategories.bind(controller)
);

// GET /api/v1/ai/patterns/:patternId
aiPatternRoutes.get(
  '/patterns/:patternId',
  controller.getPattern.bind(controller)
);

// POST /api/v1/ai/patterns
aiPatternRoutes.post(
  '/patterns',
  validateOptional(createPatternSchema, 'body'),
  controller.createPattern.bind(controller)
);

// PUT /api/v1/ai/patterns/:patternId
aiPatternRoutes.put(
  '/patterns/:patternId',
  validateOptional(updatePatternSchema, 'body'),
  controller.updatePattern.bind(controller)
);

// DELETE /api/v1/ai/patterns/:patternId
aiPatternRoutes.delete(
  '/patterns/:patternId',
  controller.deletePattern.bind(controller)
);

// Pattern Workflow Routes
// POST /api/v1/ai/patterns/:patternId/submit
aiPatternRoutes.post(
  '/patterns/:patternId/submit',
  validateOptional(workflowActionSchema, 'body'),
  controller.submitForReview.bind(controller)
);

// POST /api/v1/ai/patterns/:patternId/approve
aiPatternRoutes.post(
  '/patterns/:patternId/approve',
  validateOptional(workflowActionSchema, 'body'),
  controller.approvePattern.bind(controller)
);

// POST /api/v1/ai/patterns/:patternId/reject
aiPatternRoutes.post(
  '/patterns/:patternId/reject',
  validateOptional(workflowActionSchema, 'body'),
  controller.rejectPattern.bind(controller)
);

// POST /api/v1/ai/patterns/:patternId/activate
aiPatternRoutes.post(
  '/patterns/:patternId/activate',
  validateOptional(workflowActionSchema, 'body'),
  controller.activatePattern.bind(controller)
);

// POST /api/v1/ai/patterns/:patternId/deactivate
aiPatternRoutes.post(
  '/patterns/:patternId/deactivate',
  validateOptional(workflowActionSchema, 'body'),
  controller.deactivatePattern.bind(controller)
);

// POST /api/v1/ai/patterns/:patternId/validate
aiPatternRoutes.post(
  '/patterns/:patternId/validate',
  controller.validatePattern.bind(controller)
);

// GET /api/v1/ai/patterns/:patternId/usage
aiPatternRoutes.get(
  '/patterns/:patternId/usage',
  validateOptional(patternUsageSchema, 'query'),
  controller.getPatternUsage.bind(controller)
);

// GET /api/v1/ai/patterns/:patternId/history
aiPatternRoutes.get(
  '/patterns/:patternId/history',
  controller.getPatternHistory.bind(controller)
);

// POST /api/v1/ai/patterns/compile
aiPatternRoutes.post(
  '/patterns/compile',
  controller.compileAndSubmitPatterns.bind(controller)
);

// Discovery Session Routes
// GET /api/v1/ai/sessions
aiPatternRoutes.get(
  '/sessions',
  validateOptional(listSessionsSchema, 'query'),
  controller.listSessions.bind(controller)
);

// GET /api/v1/ai/sessions/:sessionId
aiPatternRoutes.get(
  '/sessions/:sessionId',
  controller.getSession.bind(controller)
);

// POST /api/v1/ai/sessions/:sessionId/analyze
aiPatternRoutes.post(
  '/sessions/:sessionId/analyze',
  controller.analyzeSession.bind(controller)
);

// Analytics Routes
// GET /api/v1/ai/analytics/cost
aiPatternRoutes.get(
  '/analytics/cost',
  validateOptional(costAnalyticsSchema, 'query'),
  controller.getCostAnalytics.bind(controller)
);

// GET /api/v1/ai/analytics/learning
aiPatternRoutes.get(
  '/analytics/learning',
  controller.getLearningStats.bind(controller)
);
