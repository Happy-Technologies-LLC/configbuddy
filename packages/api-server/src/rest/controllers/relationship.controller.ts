import { Request, Response } from 'express';
import { getNeo4jClient } from '@cmdb/database';
import { logger, RelationshipType } from '@cmdb/common';

export class RelationshipController {
  private neo4jClient = getNeo4jClient();

  /**
   * List relationships with filtering
   * GET /relationships
   */
  async listRelationships(req: Request, res: Response): Promise<void> {
    try {
      const {
        type,
        from_id,
        to_id,
        ci_id,
        limit = 100,
        offset = 0,
      } = req.query;

      const session = this.neo4jClient.getSession();
      try {
        let query = 'MATCH (from:CI)-[r]->(to:CI) WHERE 1=1';
        const params: any = {};

        // Apply filters
        if (type) {
          query += ' AND type(r) = $type';
          params.type = type;
        }
        if (from_id) {
          query += ' AND from.id = $from_id';
          params.from_id = from_id;
        }
        if (to_id) {
          query += ' AND to.id = $to_id';
          params.to_id = to_id;
        }
        if (ci_id) {
          // Match relationships where CI is either source or target
          query += ' AND (from.id = $ci_id OR to.id = $ci_id)';
          params.ci_id = ci_id;
        }

        // Get total count
        const countQuery = query + ' RETURN count(r) as total';
        const countResult = await session.run(countQuery, params);
        const total = countResult.records[0]!.get('total').toNumber();

        // Get paginated results
        const limitNum = Math.min(parseInt(limit as string), 1000);
        const offsetNum = parseInt(offset as string);

        query += ' RETURN from, r, to ORDER BY from.name, to.name SKIP $offset LIMIT $limit';
        params.offset = offsetNum;
        params.limit = limitNum;

        const result = await session.run(query, params);

        const relationships = result.records.map((record) => {
          const from = record.get('from').properties;
          const to = record.get('to').properties;
          const rel = record.get('r');

          return {
            _from_id: from.id,
            _from_name: from.name,
            _from_type: from.type,
            _to_id: to.id,
            _to_name: to.name,
            _to_type: to.type,
            _type: rel.type,
            _properties: rel.properties,
            _created_at: rel.properties.created_at,
            _updated_at: rel.properties.updated_at,
          };
        });

        res.json({
          _success: true,
          _data: relationships,
          _pagination: {
            total,
            _count: relationships.length,
            _offset: offsetNum,
            _limit: limitNum,
          },
        });
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error('Error listing relationships', error);
      res.status(500).json({
        _success: false,
        _error: 'Failed to list relationships',
        _message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create a new relationship between CIs
   * POST /relationships
   */
  async createRelationship(req: Request, res: Response): Promise<void> {
    try {
      const { from_id, to_id, type, properties = {} } = req.body;

      // Validate required fields
      if (!from_id || !to_id || !type) {
        res.status(400).json({
          _success: false,
          _error: 'Bad Request',
          _message: 'Missing required fields: from_id, to_id, type'
        });
        return;
      }

      // Validate relationship type
      const validTypes: RelationshipType[] = [
        'DEPENDS_ON',
        'HOSTS',
        'CONNECTS_TO',
        'USES',
        'OWNED_BY',
        'PART_OF',
        'DEPLOYED_ON',
        'BACKED_UP_BY',
      ];

      if (!validTypes.includes(type)) {
        res.status(400).json({
          _success: false,
          _error: 'Bad Request',
          _message: `Invalid relationship type. Must be one of: ${validTypes.join(', ')}`
        });
        return;
      }

      // Check if both CIs exist
      const fromCI = await this.neo4jClient.getCI(from_id);
      const toCI = await this.neo4jClient.getCI(to_id);

      if (!fromCI) {
        res.status(404).json({
          _success: false,
          _error: 'Not Found',
          _message: `Source CI with ID '${from_id}' not found`
        });
        return;
      }

      if (!toCI) {
        res.status(404).json({
          _success: false,
          _error: 'Not Found',
          _message: `Target CI with ID '${to_id}' not found`
        });
        return;
      }

      // Prevent self-relationships
      if (from_id === to_id) {
        res.status(400).json({
          _success: false,
          _error: 'Bad Request',
          _message: 'Cannot create relationship from CI to itself'
        });
        return;
      }

      // Create the relationship
      await this.neo4jClient.createRelationship(from_id, to_id, type, properties);

      logger.info('Relationship created', {
        from_id,
        to_id,
        type,
      });

      res.status(201).json({
        _success: true,
        _data: {
          from_id,
          _from_name: fromCI.name,
          _from_type: fromCI._type,
          to_id,
          _to_name: toCI.name,
          _to_type: toCI._type,
          type,
          properties,
        },
        _message: 'Relationship created successfully',
      });
    } catch (error) {
      logger.error('Error creating relationship', error);

      // Check for duplicate relationship error
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          _success: false,
          _error: 'Conflict',
          _message: 'Relationship already exists'
        });
        return;
      }

      res.status(500).json({
        _success: false,
        _error: 'Failed to create relationship',
        _message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete a relationship between CIs
   * DELETE /relationships/:id
   * Alternative: DELETE /relationships?from_id=X&to_id=Y&type=Z
   */
  async deleteRelationship(req: Request, res: Response): Promise<void> {
    try {
      // Support both path parameter and query parameter deletion
      const { id } = req.params;
      const { from_id, to_id, type } = req.query;

      const session = this.neo4jClient.getSession();
      try {
        let query: string;
        let params: any;

        if (id) {
          // Delete by relationship ID (if Neo4j internal ID or custom ID)
          res.status(400).json({
            _success: false,
            _error: 'Bad Request',
            _message: 'Deletion by relationship ID not supported. Use from_id, to_id, and type query parameters.'
          });
          return;
        } else if (from_id && to_id && type) {
          // Delete by from_id, to_id, and type
          // First check if relationship exists
          const checkQuery = `
            MATCH (from:CI {id: $from_id})-[r:${type}]->(to:CI {id: $to_id})
            RETURN r
          `;

          const checkResult = await session.run(checkQuery, { from_id, to_id });

          if (checkResult.records.length === 0) {
            res.status(404).json({
              _success: false,
              _error: 'Not Found',
              _message: 'Relationship not found'
            });
            return;
          }

          // Delete the relationship
          query = `
            MATCH (from:CI {id: $from_id})-[r:${type}]->(to:CI {id: $to_id})
            DELETE r
          `;
          params = { from_id, to_id };

          await session.run(query, params);

          logger.info('Relationship deleted', {
            from_id,
            to_id,
            type,
          });

          res.json({
            _success: true,
            _message: 'Relationship deleted successfully',
            _data: {
              from_id,
              to_id,
              type,
            },
          });
        } else {
          res.status(400).json({
            _success: false,
            _error: 'Bad Request',
            _message: 'Missing required parameters: from_id, to_id, and type'
          });
        }
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error('Error deleting relationship', error);
      res.status(500).json({
        _success: false,
        _error: 'Failed to delete relationship',
        _message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get relationships by type
   * GET /relationships/type/:type
   */
  async getRelationshipsByType(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const { limit = 100, offset = 0 } = req.query;

      if (!type) {
        res.status(400).json({
          _success: false,
          _error: 'Bad Request',
          _message: 'Relationship type is required'
        });
        return;
      }

      // Validate relationship type
      const validTypes: RelationshipType[] = [
        'DEPENDS_ON',
        'HOSTS',
        'CONNECTS_TO',
        'USES',
        'OWNED_BY',
        'PART_OF',
        'DEPLOYED_ON',
        'BACKED_UP_BY',
      ];

      if (!validTypes.includes(type as RelationshipType)) {
        res.status(400).json({
          _success: false,
          _error: 'Bad Request',
          _message: `Invalid relationship type. Must be one of: ${validTypes.join(', ')}`
        });
        return;
      }

      const session = this.neo4jClient.getSession();
      try {
        // Get total count
        const countQuery = `
          MATCH (from:CI)-[r:${type}]->(to:CI)
          RETURN count(r) as total
        `;
        const countResult = await session.run(countQuery);
        const total = countResult.records[0]!.get('total').toNumber();

        // Get paginated results
        const limitNum = Math.min(parseInt(limit as string), 1000);
        const offsetNum = parseInt(offset as string);

        const query = `
          MATCH (from:CI)-[r:${type}]->(to:CI)
          RETURN from, r, to
          ORDER BY from.name, to.name
          SKIP $offset
          LIMIT $limit
        `;

        const result = await session.run(query, {
          offset: offsetNum,
          limit: limitNum,
        });

        const relationships = result.records.map((record) => {
          const from = record.get('from').properties;
          const to = record.get('to').properties;
          const rel = record.get('r');

          return {
            _from_id: from.id,
            _from_name: from.name,
            _from_type: from.type,
            _to_id: to.id,
            _to_name: to.name,
            _to_type: to.type,
            _type: rel.type,
            _properties: rel.properties,
            _created_at: rel.properties.created_at,
            _updated_at: rel.properties.updated_at,
          };
        });

        res.json({
          _success: true,
          _data: relationships,
          _pagination: {
            total,
            _count: relationships.length,
            _offset: offsetNum,
            _limit: limitNum,
          },
          type,
        });
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error('Error getting relationships by type', error);
      res.status(500).json({
        _success: false,
        _error: 'Failed to retrieve relationships',
        _message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
