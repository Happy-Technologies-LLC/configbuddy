/**
 * Discovery Definition Routes
 *
 * REST API routes for managing discovery definitions - reusable discovery configurations.
 */

import { Router } from 'express';
import Joi from 'joi';
import { DiscoveryDefinitionController } from '../controllers/discovery-definition.controller';
import { validateRequest, validateOptional } from '../middleware/validation.middleware';
import { schemas } from '@cmdb/common';

export const discoveryDefinitionRoutes = Router();
const controller = new DiscoveryDefinitionController();

// Validation schemas
const createDefinitionSchema = Joi.object({
  name: Joi.string().required().min(1).max(255),
  description: Joi.string().optional().max(1000),
  provider: schemas.discoveryProvider.required(),
  method: schemas.discoveryMethod.required(),
  credential_id: Joi.string().uuid().when('provider', {
    is: 'nmap',
    then: Joi.optional(),
    otherwise: Joi.required()
  }),
  agent_id: Joi.string().max(255).when('method', {
    is: 'agent',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  config: Joi.object().unknown(true).optional().default({}),
  schedule: Joi.string().optional(), // Cron expression
  is_active: Joi.boolean().optional().default(true),
  tags: Joi.array().items(Joi.string()).optional(),
});

const updateDefinitionSchema = Joi.object({
  name: Joi.string().optional().min(1).max(255),
  description: Joi.string().optional().max(1000),
  provider: schemas.discoveryProvider.optional(),
  method: schemas.discoveryMethod.optional(),
  credential_id: Joi.string().uuid().optional(),
  agent_id: Joi.string().max(255).optional(),
  config: Joi.object().unknown(true).optional(),
  schedule: Joi.string().optional(),
  is_active: Joi.boolean().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
});

const listDefinitionsQuerySchema = Joi.object({
  provider: schemas.discoveryProvider.optional(),
  is_active: Joi.string().valid('true', 'false').optional(),
  created_by: Joi.string().optional(),
});

// POST /api/v1/discovery/definitions - Create new definition
discoveryDefinitionRoutes.post(
  '/',
  validateRequest(createDefinitionSchema, 'body'),
  controller.createDefinition.bind(controller)
);

// GET /api/v1/discovery/definitions - List all definitions
discoveryDefinitionRoutes.get(
  '/',
  validateOptional(listDefinitionsQuerySchema, 'query'),
  controller.listDefinitions.bind(controller)
);

// GET /api/v1/discovery/definitions/:id - Get definition by ID
discoveryDefinitionRoutes.get(
  '/:id',
  controller.getDefinition.bind(controller)
);

// PUT /api/v1/discovery/definitions/:id - Update definition
discoveryDefinitionRoutes.put(
  '/:id',
  validateRequest(updateDefinitionSchema, 'body'),
  controller.updateDefinition.bind(controller)
);

// DELETE /api/v1/discovery/definitions/:id - Delete definition
discoveryDefinitionRoutes.delete(
  '/:id',
  controller.deleteDefinition.bind(controller)
);

// POST /api/v1/discovery/definitions/:id/run - Run definition (trigger discovery job)
discoveryDefinitionRoutes.post(
  '/:id/run',
  controller.runDefinition.bind(controller)
);

// POST /api/v1/discovery/definitions/:id/schedule/enable - Enable scheduled runs
discoveryDefinitionRoutes.post(
  '/:id/schedule/enable',
  controller.enableSchedule.bind(controller)
);

// POST /api/v1/discovery/definitions/:id/schedule/disable - Disable scheduled runs
discoveryDefinitionRoutes.post(
  '/:id/schedule/disable',
  controller.disableSchedule.bind(controller)
);
