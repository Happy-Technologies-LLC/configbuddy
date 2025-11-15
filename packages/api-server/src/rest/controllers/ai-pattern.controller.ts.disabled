import { Request, Response } from 'express';
import { getPostgresClient } from '@cmdb/database';
import { logger } from '@cmdb/common';
import {
  PatternStorageService,
  PatternAnalyzer,
  PatternCompiler,
  PatternValidator,
  PatternWorkflow
} from '@cmdb/ai-discovery';

export class AIPatternController {
  private postgresClient = getPostgresClient();
  private storage = new PatternStorageService();
  private analyzer = new PatternAnalyzer();
  private compiler = new PatternCompiler();
  private validator = new PatternValidator();
  private workflow = new PatternWorkflow();

  /**
   * List all patterns with optional filters
   * GET /ai/patterns
   */
  async listPatterns(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        status: req.query['status'] ? String(req.query['status']).split(',') : undefined,
        category: req.query['category'] as string | undefined,
        isActive: req.query['isActive'] === 'true' ? true : req.query['isActive'] === 'false' ? false : undefined,
        minConfidence: req.query['minConfidence'] ? parseFloat(String(req.query['minConfidence'])) : undefined,
        minUsage: req.query['minUsage'] ? parseInt(String(req.query['minUsage'])) : undefined,
        search: req.query['search'] as string | undefined,
      };

      const patterns = await this.storage.loadPatterns(filters);

      res.json({
        _success: true,
        _data: patterns,
      });
    } catch (error) {
      logger.error('Error listing patterns', error);
      res.status(500).json({
        _success: false,
        _error: 'Failed to list patterns',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get a single pattern by ID
   * GET /ai/patterns/:patternId
   */
  async getPattern(req: Request, res: Response): Promise<void> {
    try {
      const { patternId } = req.params;
      const pattern = await this.storage.getPattern(patternId);

      if (!pattern) {
        res.status(404).json({
          _success: false,
          _error: 'Not Found',
          _message: `Pattern ${patternId} not found`,
        });
        return;
      }

      res.json({
        _success: true,
        _data: pattern,
      });
    } catch (error) {
      logger.error('Error getting pattern', error);
      res.status(500).json({
        _success: false,
        _error: 'Failed to get pattern',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Create a new pattern
   * POST /ai/patterns
   */
  async createPattern(req: Request, res: Response): Promise<void> {
    try {
      const pattern = req.body;
      const created = await this.storage.savePattern(pattern);

      res.status(201).json({
        _success: true,
        _data: created,
      });
    } catch (error) {
      logger.error('Error creating pattern', error);
      res.status(500).json({
        _success: false,
        _error: 'Failed to create pattern',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Update an existing pattern
   * PUT /ai/patterns/:patternId
   */
  async updatePattern(req: Request, res: Response): Promise<void> {
    try {
      const { patternId } = req.params;
      const updates = req.body;

      const updated = await this.storage.updatePattern(patternId, updates);

      res.json({
        _success: true,
        _data: updated,
      });
    } catch (error) {
      logger.error('Error updating pattern', error);
      res.status(500).json({
        _success: false,
        _error: 'Failed to update pattern',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Delete a pattern
   * DELETE /ai/patterns/:patternId
   */
  async deletePattern(req: Request, res: Response): Promise<void> {
    try {
      const { patternId } = req.params;
      await this.storage.deletePattern(patternId);

      res.json({
        _success: true,
        _message: 'Pattern deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting pattern', error);
      res.status(500).json({
        _success: false,
        _error: 'Failed to delete pattern',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Submit pattern for review
   * POST /ai/patterns/:patternId/submit
   */
  async submitForReview(req: Request, res: Response): Promise<void> {
    try {
      const { patternId } = req.params;
      const { submittedBy, notes } = req.body;

      const result = await this.workflow.submitForReview(patternId, submittedBy, notes);

      res.json({
        _success: result.success,
        _data: result,
      });
    } catch (error) {
      logger.error('Error submitting pattern', error);
      res.status(500).json({
        _success: false,
        _error: 'Failed to submit pattern',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Approve a pattern
   * POST /ai/patterns/:patternId/approve
   */
  async approvePattern(req: Request, res: Response): Promise<void> {
    try {
      const { patternId } = req.params;
      const { approvedBy, notes } = req.body;

      const result = await this.workflow.approvePattern(patternId, approvedBy, notes);

      res.json({
        _success: result.success,
        _data: result,
      });
    } catch (error) {
      logger.error('Error approving pattern', error);
      res.status(500).json({
        _success: false,
        _error: 'Failed to approve pattern',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Reject a pattern
   * POST /ai/patterns/:patternId/reject
   */
  async rejectPattern(req: Request, res: Response): Promise<void> {
    try {
      const { patternId } = req.params;
      const { rejectedBy, reason } = req.body;

      const result = await this.workflow.rejectPattern(patternId, rejectedBy, reason);

      res.json({
        _success: result.success,
        _data: result,
      });
    } catch (error) {
      logger.error('Error rejecting pattern', error);
      res.status(500).json({
        _success: false,
        _error: 'Failed to reject pattern',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Activate a pattern
   * POST /ai/patterns/:patternId/activate
   */
  async activatePattern(req: Request, res: Response): Promise<void> {
    try {
      const { patternId } = req.params;
      const { activatedBy } = req.body;

      const result = await this.workflow.activatePattern(patternId, activatedBy);

      res.json({
        _success: result.success,
        _data: result,
      });
    } catch (error) {
      logger.error('Error activating pattern', error);
      res.status(500).json({
        _success: false,
        _error: 'Failed to activate pattern',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Deactivate a pattern
   * POST /ai/patterns/:patternId/deactivate
   */
  async deactivatePattern(req: Request, res: Response): Promise<void> {
    try {
      const { patternId } = req.params;
      const { deactivatedBy, reason } = req.body;

      const result = await this.workflow.deactivatePattern(patternId, deactivatedBy, reason);

      res.json({
        _success: result.success,
        _data: result,
      });
    } catch (error) {
      logger.error('Error deactivating pattern', error);
      res.status(500).json({
        _success: false,
        _error: 'Failed to deactivate pattern',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Validate a pattern
   * POST /ai/patterns/:patternId/validate
   */
  async validatePattern(req: Request, res: Response): Promise<void> {
    try {
      const { patternId } = req.params;
      const pattern = await this.storage.getPattern(patternId);

      if (!pattern) {
        res.status(404).json({
          _success: false,
          _error: 'Not Found',
          _message: `Pattern ${patternId} not found`,
        });
        return;
      }

      const result = await this.validator.validate(pattern);

      res.json({
        _success: true,
        _data: result,
      });
    } catch (error) {
      logger.error('Error validating pattern', error);
      res.status(500).json({
        _success: false,
        _error: 'Failed to validate pattern',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get pattern usage metrics
   * GET /ai/patterns/:patternId/usage
   */
  async getPatternUsage(req: Request, res: Response): Promise<void> {
    try {
      const { patternId } = req.params;
      const days = parseInt(String(req.query['days'] || 30));

      const usage = await this.storage.getPatternUsage(patternId, days);

      res.json({
        _success: true,
        _data: usage,
      });
    } catch (error) {
      logger.error('Error getting pattern usage', error);
      res.status(500).json({
        _success: false,
        _error: 'Failed to get pattern usage',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get pattern history
   * GET /ai/patterns/:patternId/history
   */
  async getPatternHistory(req: Request, res: Response): Promise<void> {
    try {
      const { patternId } = req.params;
      const history = await this.workflow.getPatternHistory(patternId);

      res.json({
        _success: true,
        _data: history,
      });
    } catch (error) {
      logger.error('Error getting pattern history', error);
      res.status(500).json({
        _success: false,
        _error: 'Failed to get pattern history',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * List all discovery sessions
   * GET /ai/sessions
   */
  async listSessions(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        status: req.query['status'] ? String(req.query['status']).split(',') : undefined,
        provider: req.query['provider'] as string | undefined,
        dateFrom: req.query['dateFrom'] as string | undefined,
        dateTo: req.query['dateTo'] as string | undefined,
        minCost: req.query['minCost'] ? parseFloat(String(req.query['minCost'])) : undefined,
        maxCost: req.query['maxCost'] ? parseFloat(String(req.query['maxCost'])) : undefined,
        search: req.query['search'] as string | undefined,
      };

      // Query sessions from database
      let query = `
        SELECT *
        FROM ai_discovery_sessions
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters.status) {
        params.push(filters.status);
        query += ` AND status = ANY($${params.length})`;
      }

      if (filters.provider) {
        params.push(filters.provider);
        query += ` AND provider = $${params.length}`;
      }

      if (filters.dateFrom) {
        params.push(filters.dateFrom);
        query += ` AND started_at >= $${params.length}`;
      }

      if (filters.dateTo) {
        params.push(filters.dateTo);
        query += ` AND started_at <= $${params.length}`;
      }

      if (filters.minCost !== undefined) {
        params.push(filters.minCost);
        query += ` AND estimated_cost >= $${params.length}`;
      }

      if (filters.maxCost !== undefined) {
        params.push(filters.maxCost);
        query += ` AND estimated_cost <= $${params.length}`;
      }

      if (filters.search) {
        params.push(`%${filters.search}%`);
        query += ` AND (target_host ILIKE $${params.length} OR session_id ILIKE $${params.length})`;
      }

      query += ` ORDER BY started_at DESC LIMIT 100`;

      const result = await this.postgresClient.query(query, params);

      res.json({
        _success: true,
        _data: result.rows,
      });
    } catch (error) {
      logger.error('Error listing sessions', error);
      res.status(500).json({
        _success: false,
        _error: 'Failed to list sessions',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get a single discovery session by ID
   * GET /ai/sessions/:sessionId
   */
  async getSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const result = await this.postgresClient.query(
        'SELECT * FROM ai_discovery_sessions WHERE session_id = $1',
        [sessionId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          _success: false,
          _error: 'Not Found',
          _message: `Session ${sessionId} not found`,
        });
        return;
      }

      res.json({
        _success: true,
        _data: result.rows[0],
      });
    } catch (error) {
      logger.error('Error getting session', error);
      res.status(500).json({
        _success: false,
        _error: 'Failed to get session',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Analyze a session for patterns
   * POST /ai/sessions/:sessionId/analyze
   */
  async analyzeSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const result = await this.postgresClient.query(
        'SELECT * FROM ai_discovery_sessions WHERE session_id = $1',
        [sessionId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          _success: false,
          _error: 'Not Found',
          _message: `Session ${sessionId} not found`,
        });
        return;
      }

      const session = result.rows[0];
      const analysis = await this.analyzer.analyzeSession(session);

      res.json({
        _success: true,
        _data: analysis,
      });
    } catch (error) {
      logger.error('Error analyzing session', error);
      res.status(500).json({
        _success: false,
        _error: 'Failed to analyze session',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Compile and submit patterns from similar sessions
   * POST /ai/patterns/compile
   */
  async compileAndSubmitPatterns(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.workflow.compileAndSubmitPatterns();

      res.json({
        _success: true,
        _data: result,
      });
    } catch (error) {
      logger.error('Error compiling patterns', error);
      res.status(500).json({
        _success: false,
        _error: 'Failed to compile patterns',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get cost analytics
   * GET /ai/analytics/cost
   */
  async getCostAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const dateFrom = req.query['dateFrom'] as string | undefined;
      const dateTo = req.query['dateTo'] as string | undefined;

      // Calculate cost analytics
      const totalCostResult = await this.postgresClient.query(
        `SELECT
          SUM(estimated_cost) as total_cost,
          COUNT(*) as total_sessions,
          AVG(estimated_cost) as avg_cost_per_session
        FROM ai_discovery_sessions
        WHERE ($1::timestamp IS NULL OR started_at >= $1)
          AND ($2::timestamp IS NULL OR started_at <= $2)`,
        [dateFrom || null, dateTo || null]
      );

      const costByProviderResult = await this.postgresClient.query(
        `SELECT
          provider,
          SUM(estimated_cost) as cost,
          COUNT(*) as sessions
        FROM ai_discovery_sessions
        WHERE ($1::timestamp IS NULL OR started_at >= $1)
          AND ($2::timestamp IS NULL OR started_at <= $2)
        GROUP BY provider
        ORDER BY cost DESC`,
        [dateFrom || null, dateTo || null]
      );

      const costByDayResult = await this.postgresClient.query(
        `SELECT
          DATE(started_at) as date,
          SUM(estimated_cost) as cost,
          COUNT(*) as sessions
        FROM ai_discovery_sessions
        WHERE ($1::timestamp IS NULL OR started_at >= $1)
          AND ($2::timestamp IS NULL OR started_at <= $2)
        GROUP BY DATE(started_at)
        ORDER BY date DESC
        LIMIT 90`,
        [dateFrom || null, dateTo || null]
      );

      // Calculate savings from patterns (mock for now - would need pattern usage tracking)
      const totalSaved = 0;
      const percentSaved = 0;
      const patternHits = 0;
      const aiDiscoveries = totalCostResult.rows[0]?.total_sessions || 0;

      const analytics = {
        totalCost: parseFloat(totalCostResult.rows[0]?.total_cost || 0),
        totalSessions: parseInt(totalCostResult.rows[0]?.total_sessions || 0),
        avgCostPerSession: parseFloat(totalCostResult.rows[0]?.avg_cost_per_session || 0),
        costByProvider: costByProviderResult.rows,
        costByDay: costByDayResult.rows,
        savingsFromPatterns: {
          totalSaved,
          percentSaved,
          patternHits,
          aiDiscoveries,
        },
      };

      res.json({
        _success: true,
        _data: analytics,
      });
    } catch (error) {
      logger.error('Error getting cost analytics', error);
      res.status(500).json({
        _success: false,
        _error: 'Failed to get cost analytics',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get learning statistics
   * GET /ai/analytics/learning
   */
  async getLearningStats(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.postgresClient.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'active') as active_patterns,
          COUNT(*) FILTER (WHERE status = 'review') as pending_review,
          COUNT(*) as total_patterns,
          AVG(confidence_score) as avg_confidence
        FROM ai_discovery_patterns
      `);

      const sessionResult = await this.postgresClient.query(`
        SELECT COUNT(*) as total_sessions
        FROM ai_discovery_sessions
        WHERE status = 'completed'
      `);

      const stats = {
        totalPatterns: parseInt(result.rows[0]?.total_patterns || 0),
        activePatterns: parseInt(result.rows[0]?.active_patterns || 0),
        pendingReview: parseInt(result.rows[0]?.pending_review || 0),
        autoApproved: 0, // Would need to track this in pattern history
        manualApproved: 0, // Would need to track this in pattern history
        totalSessions: parseInt(sessionResult.rows[0]?.total_sessions || 0),
        avgConfidence: parseFloat(result.rows[0]?.avg_confidence || 0),
      };

      res.json({
        _success: true,
        _data: stats,
      });
    } catch (error) {
      logger.error('Error getting learning stats', error);
      res.status(500).json({
        _success: false,
        _error: 'Failed to get learning stats',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get pattern categories
   * GET /ai/patterns/categories
   */
  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.postgresClient.query(`
        SELECT DISTINCT category
        FROM ai_discovery_patterns
        ORDER BY category
      `);

      const categories = result.rows.map(row => row.category);

      res.json({
        _success: true,
        _data: categories,
      });
    } catch (error) {
      logger.error('Error getting categories', error);
      res.status(500).json({
        _success: false,
        _error: 'Failed to get categories',
        _message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
