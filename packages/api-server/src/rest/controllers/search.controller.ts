import { Request, Response } from 'express';
import { getNeo4jClient } from '@cmdb/database';
import { logger } from '@cmdb/common';

export class SearchController {
  private neo4jClient = getNeo4jClient();

  /**
   * Advanced search with multiple filters
   * POST /search/advanced
   */
  async advancedSearch(req: Request, res: Response): Promise<void> {
    try {
      const {
        query,
        type,
        status,
        environment,
        metadata_filters,
        limit = 50,
        offset = 0,
      } = req.body;

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        res.status(400).json({
          _success: false,
          _error: 'Bad Request',
          _message: 'Search query is required and must be a non-empty string',
        });
        return;
      }

      const session = this.neo4jClient.getSession();
      try {
        // Build dynamic query
        const conditions: string[] = [
          '(ci.name CONTAINS $query OR ci.external_id CONTAINS $query)',
        ];
        const params: any = {
          _query: query.trim(),
          _limit: Math.min(parseInt(String(limit)), 1000),
          _offset: parseInt(String(offset)),
        };

        if (type) {
          conditions.push('ci.type = $type');
          params.type = type;
        }

        if (status) {
          conditions.push('ci.status = $status');
          params.status = status;
        }

        if (environment) {
          conditions.push('ci.environment = $environment');
          params.environment = environment;
        }

        // Handle metadata filters
        if (metadata_filters && typeof metadata_filters === 'object') {
          Object.entries(metadata_filters).forEach(([key, value], index) => {
            const paramName = `metaValue${index}`;
            conditions.push(`ci.metadata CONTAINS $${paramName}`);
            params[paramName] = `"${key}":"${value}"`;
          });
        }

        const whereClause = conditions.join(' AND ');

        // Get total count
        const countQuery = `
          MATCH (ci:CI)
          WHERE ${whereClause}
          RETURN count(ci) as total
        `;
        const countResult = await session.run(countQuery, params);
        const total = countResult.records[0]!.get('total').toNumber();

        // Get paginated results
        const searchQuery = `
          MATCH (ci:CI)
          WHERE ${whereClause}
          RETURN ci
          ORDER BY ci.name
          SKIP $offset
          LIMIT $limit
        `;

        const result = await session.run(searchQuery, params);
        const cis = result.records.map((r) => {
          const props = r.get('ci').properties;
          return {
            _id: props.id,
            _external_id: props.external_id,
            _name: props.name,
            _type: props.type,
            _status: props.status,
            _environment: props.environment,
            _created_at: props.created_at,
            _updated_at: props.updated_at,
            _discovered_at: props.discovered_at,
            _metadata: props.metadata ? JSON.parse(props.metadata) : {},
          };
        });

        res.json({
          _success: true,
          _data: cis,
          _pagination: {
            total,
            _count: cis.length,
            _offset: params.offset,
            _limit: params.limit,
          },
          _query: query.trim(),
          _filters: {
            type,
            status,
            environment,
            metadata_filters,
          },
        });
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error('Error performing advanced search', error);
      res.status(500).json({
        _success: false,
        _error: 'Failed to perform advanced search',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Full-text search using Neo4j full-text index
   * POST /search/fulltext
   */
  async fulltextSearch(req: Request, res: Response): Promise<void> {
    try {
      const { query, limit = 50 } = req.body;

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        res.status(400).json({
          _success: false,
          _error: 'Bad Request',
          _message: 'Search query is required and must be a non-empty string',
        });
        return;
      }

      const limitNum = Math.min(parseInt(String(limit)), 1000);

      const session = this.neo4jClient.getSession();
      try {
        const result = await session.run(
          `
          CALL db.index.fulltext.queryNodes('ci_search', $query)
          YIELD node, score
          RETURN node, score
          ORDER BY score DESC
          LIMIT $limit
          `,
          { query: query.trim(), limit: limitNum }
        );

        const cis = result.records.map((r) => {
          const props = r.get('node').properties;
          return {
            _ci: {
              _id: props.id,
              _external_id: props.external_id,
              _name: props.name,
              _type: props.type,
              _status: props.status,
              _environment: props.environment,
              _created_at: props.created_at,
              _updated_at: props.updated_at,
              _discovered_at: props.discovered_at,
              _metadata: props.metadata ? JSON.parse(props.metadata) : {},
            },
            _score: r.get('score'),
          };
        });

        res.json({
          _success: true,
          _data: cis,
          _count: cis.length,
          _query: query.trim(),
        });
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error('Error performing full-text search', error);

      // Check if full-text index doesn't exist
      if (error instanceof Error && error.message.includes('ci_search')) {
        res.status(500).json({
          _success: false,
          _error: 'Full-text index not configured',
          _message:
            'The full-text search index "ci_search" does not exist. Please run the database initialization script.',
        });
        return;
      }

      res.status(500).json({
        _success: false,
        _error: 'Failed to perform full-text search',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Search by relationship pattern
   * POST /search/relationships
   */
  async searchByRelationship(req: Request, res: Response): Promise<void> {
    try {
      const { ci_type, relationship_type, related_ci_type, limit = 50 } = req.body;

      if (!ci_type || !relationship_type || !related_ci_type) {
        res.status(400).json({
          _success: false,
          _error: 'Bad Request',
          _message: 'Missing required fields: ci_type, relationship_type, related_ci_type',
        });
        return;
      }

      const limitNum = Math.min(parseInt(String(limit)), 1000);

      const session = this.neo4jClient.getSession();
      try {
        const result = await session.run(
          `
          MATCH (ci:CI {type: $ci_type})-[:${relationship_type}]->(related:CI {type: $related_ci_type})
          RETURN DISTINCT ci
          ORDER BY ci.name
          LIMIT $limit
          `,
          {
            ci_type,
            related_ci_type,
            _limit: limitNum,
          }
        );

        const cis = result.records.map((r) => {
          const props = r.get('ci').properties;
          return {
            _id: props.id,
            _external_id: props.external_id,
            _name: props.name,
            _type: props.type,
            _status: props.status,
            _environment: props.environment,
            _created_at: props.created_at,
            _updated_at: props.updated_at,
            _discovered_at: props.discovered_at,
            _metadata: props.metadata ? JSON.parse(props.metadata) : {},
          };
        });

        res.json({
          _success: true,
          _data: cis,
          _count: cis.length,
          _pattern: {
            ci_type,
            relationship_type,
            related_ci_type,
          },
        });
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error('Error searching by relationship pattern', error);
      res.status(500).json({
        _success: false,
        _error: 'Failed to search by relationship pattern',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get CIs without any relationships (orphaned CIs)
   * GET /search/orphaned
   */
  async getOrphanedCIs(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 100, offset = 0 } = req.query;

      const limitNum = Math.min(parseInt(String(limit)), 1000);
      const offsetNum = parseInt(String(offset));

      const session = this.neo4jClient.getSession();
      try {
        // Get total count
        const countQuery = `
          MATCH (ci:CI)
          WHERE NOT (ci)-[]-()
          RETURN count(ci) as total
        `;
        const countResult = await session.run(countQuery);
        const total = countResult.records[0]!.get('total').toNumber();

        // Get paginated results
        const result = await session.run(
          `
          MATCH (ci:CI)
          WHERE NOT (ci)-[]-()
          RETURN ci
          ORDER BY ci.created_at DESC
          SKIP $offset
          LIMIT $limit
          `,
          { offset: offsetNum, limit: limitNum }
        );

        const cis = result.records.map((r) => {
          const props = r.get('ci').properties;
          return {
            _id: props.id,
            _external_id: props.external_id,
            _name: props.name,
            _type: props.type,
            _status: props.status,
            _environment: props.environment,
            _created_at: props.created_at,
            _updated_at: props.updated_at,
            _discovered_at: props.discovered_at,
            _metadata: props.metadata ? JSON.parse(props.metadata) : {},
          };
        });

        res.json({
          _success: true,
          _data: cis,
          _pagination: {
            total,
            _count: cis.length,
            _offset: offsetNum,
            _limit: limitNum,
          },
        });
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error('Error getting orphaned CIs', error);
      res.status(500).json({
        _success: false,
        _error: 'Failed to retrieve orphaned CIs',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
