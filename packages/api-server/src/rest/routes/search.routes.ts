import { Router } from 'express';
import Joi from 'joi';
import { SearchController } from '../controllers/search.controller';
import { validateRequest, validateOptional } from '../middleware/validation.middleware';
import { schemas } from '@cmdb/common';

export const searchRoutes = Router();
const controller = new SearchController();

// Validation schemas
const advancedSearchSchema = Joi.object({
  _query: Joi.string().required().min(1),
  _type: schemas.ciType.optional(),
  _status: schemas.ciStatus.optional(),
  _environment: schemas.environment.optional(),
  _metadata_filters: Joi.object().optional(),
  _limit: Joi.number().integer().min(1).max(1000).default(50),
  _offset: Joi.number().integer().min(0).default(0),
});

const fulltextSearchSchema = Joi.object({
  _query: Joi.string().required().min(1),
  _limit: Joi.number().integer().min(1).max(1000).default(50),
});

const relationshipSearchSchema = Joi.object({
  _ci_type: schemas.ciType.required(),
  _relationship_type: schemas.relationshipType.required(),
  _related_ci_type: schemas.ciType.required(),
  _limit: Joi.number().integer().min(1).max(1000).default(50),
});

const orphanedQuerySchema = Joi.object({
  _limit: Joi.number().integer().min(1).max(1000).default(100),
  _offset: Joi.number().integer().min(0).default(0),
});

// Advanced search with multiple filters
searchRoutes.post(
  '/advanced',
  validateRequest(advancedSearchSchema, 'body'),
  controller.advancedSearch.bind(controller)
);

// Full-text search using Neo4j full-text index
searchRoutes.post(
  '/fulltext',
  validateRequest(fulltextSearchSchema, 'body'),
  controller.fulltextSearch.bind(controller)
);

// Search by relationship pattern
searchRoutes.post(
  '/relationships',
  validateRequest(relationshipSearchSchema, 'body'),
  controller.searchByRelationship.bind(controller)
);

// Get orphaned CIs (no relationships)
searchRoutes.get(
  '/orphaned',
  validateOptional(orphanedQuerySchema, 'query'),
  controller.getOrphanedCIs.bind(controller)
);
