// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from 'express';
import { getNeo4jClient, getPostgresClient } from '@cmdb/database';
import { logger } from '@cmdb/common';
import { v4 as uuidv4 } from 'uuid';

/**
 * ITIL Controller
 *
 * Handles ITIL v4 Service Management operations:
 * - Configuration Management (lifecycle, status, audit)
 * - Incident Management (priority calculation, resolution)
 * - Change Management (risk assessment, approval workflow)
 * - Configuration Baselines (snapshot, comparison, restoration)
 * - ITIL Metrics (accuracy, MTTR, MTBF, change success rate)
 *
 * NOTE: This controller provides REST API endpoints. The actual business logic
 * will be implemented by Agent 5 in the @cmdb/itil-service-manager package.
 * For now, we implement the API contract with placeholder logic.
 */
export class ITILController {
  private neo4jClient = getNeo4jClient();
  private postgresClient = getPostgresClient();

  // ============================================================================
  // Configuration Items (ITIL Management)
  // ============================================================================

  async getConfigurationItems(req: Request, res: Response): Promise<void> {
    try {
      const { lifecycle, status, ciType, page = 1, limit = 50 } = req.query;

      const session = this.neo4jClient.getSession();
      try {
        let query = 'MATCH (ci:CI) WHERE 1=1';
        const params: any = {};

        // Apply filters
        if (lifecycle) {
          query += ' AND ci.itil_lifecycle = $lifecycle';
          params.lifecycle = lifecycle;
        }
        if (status) {
          query += ' AND ci.itil_config_status = $status';
          params.status = status;
        }
        if (ciType) {
          query += ' AND ci.type = $ciType';
          params.ciType = ciType;
        }

        // Get total count
        const countResult = await session.run(query + ' RETURN count(ci) as total', params);
        const total = countResult.records[0]!.get('total').toNumber();

        // Get paginated results
        const pageNum = parseInt(page as string);
        const limitNum = Math.min(parseInt(limit as string), 1000);
        const offset = (pageNum - 1) * limitNum;

        query += ' RETURN ci ORDER BY ci.name SKIP $offset LIMIT $limit';
        params.offset = offset;
        params.limit = limitNum;

        const result = await session.run(query, params);
        const items = result.records.map((r: any) => this.convertNeo4jCI(r.get('ci').properties));

        res.json({
          success: true,
          data: items,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum),
          },
        });
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error('Error getting configuration items', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve configuration items',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getConfigurationItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const ci = await this.neo4jClient.getCI(id);

      if (!ci) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Configuration item with ID '${id}' not found`,
        });
        return;
      }

      res.json({
        success: true,
        data: this.convertNeo4jCI(ci),
      });
    } catch (error) {
      logger.error('Error getting configuration item', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve configuration item',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async updateLifecycleStage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { stage } = req.body;

      const session = this.neo4jClient.getSession();
      try {
        const result = await session.run(
          `
          MATCH (ci:CI {id: $id})
          SET ci.itil_lifecycle = $stage,
              ci.updated_at = datetime()
          RETURN ci
          `,
          { id, stage }
        );

        if (result.records.length === 0) {
          res.status(404).json({
            success: false,
            error: 'Not Found',
            message: `Configuration item with ID '${id}' not found`,
          });
          return;
        }

        const ci = this.convertNeo4jCI(result.records[0]!.get('ci').properties);

        res.json({
          success: true,
          data: ci,
          message: `Lifecycle stage updated to ${stage}`,
        });
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error('Error updating lifecycle stage', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update lifecycle stage',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async updateConfigurationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const session = this.neo4jClient.getSession();
      try {
        const result = await session.run(
          `
          MATCH (ci:CI {id: $id})
          SET ci.itil_config_status = $status,
              ci.updated_at = datetime()
          RETURN ci
          `,
          { id, status }
        );

        if (result.records.length === 0) {
          res.status(404).json({
            success: false,
            error: 'Not Found',
            message: `Configuration item with ID '${id}' not found`,
          });
          return;
        }

        const ci = this.convertNeo4jCI(result.records[0]!.get('ci').properties);

        res.json({
          success: true,
          data: ci,
          message: `Configuration status updated to ${status}`,
        });
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error('Error updating configuration status', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update configuration status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getCIHistory(_req: Request, res: Response): Promise<void> {
    try {
      const { id } = _req.params;
      const { limit = 100 } = _req.query;

      const pool = this.postgresClient.pool;
      const result = await pool.query(
        `
        SELECT * FROM ci_history
        WHERE ci_id = $1
        ORDER BY changed_at DESC
        LIMIT $2
        `,
        [id, parseInt(limit as string)]
      );

      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length,
      });
    } catch (error) {
      logger.error('Error getting CI history', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve CI history',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getCIsDueForAudit(req: Request, res: Response): Promise<void> {
    try {
      const session = this.neo4jClient.getSession();
      try {
        const result = await session.run(
          `
          MATCH (ci:CI)
          WHERE ci.itil_next_audit_date <= datetime()
          OR ci.itil_last_audited IS NULL
          RETURN ci
          ORDER BY ci.itil_next_audit_date
          LIMIT 100
          `
        );

        const cis = result.records.map((r: any) => this.convertNeo4jCI(r.get('ci').properties));

        res.json({
          success: true,
          data: cis,
          count: cis.length,
        });
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error('Error getting CIs due for audit', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve CIs due for audit',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async scheduleAudit(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { auditDate, auditor, notes } = req.body;

      const session = this.neo4jClient.getSession();
      try {
        const result = await session.run(
          `
          MATCH (ci:CI {id: $id})
          SET ci.itil_next_audit_date = datetime($auditDate),
              ci.itil_audit_scheduled_by = $auditor,
              ci.itil_audit_notes = $notes,
              ci.updated_at = datetime()
          RETURN ci
          `,
          { id, auditDate, auditor, notes }
        );

        if (result.records.length === 0) {
          res.status(404).json({
            success: false,
            error: 'Not Found',
            message: `Configuration item with ID '${id}' not found`,
          });
          return;
        }

        const ci = this.convertNeo4jCI(result.records[0]!.get('ci').properties);

        res.json({
          success: true,
          data: ci,
          message: 'Audit scheduled successfully',
        });
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error('Error scheduling audit', error);
      res.status(500).json({
        success: false,
        error: 'Failed to schedule audit',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async completeAudit(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { auditStatus, findings, completedBy } = req.body;

      const session = this.neo4jClient.getSession();
      try {
        const result = await session.run(
          `
          MATCH (ci:CI {id: $id})
          SET ci.itil_audit_status = $auditStatus,
              ci.itil_last_audited = datetime(),
              ci.itil_audit_findings = $findings,
              ci.itil_audit_completed_by = $completedBy,
              ci.updated_at = datetime()
          RETURN ci
          `,
          { id, auditStatus, findings, completedBy }
        );

        if (result.records.length === 0) {
          res.status(404).json({
            success: false,
            error: 'Not Found',
            message: `Configuration item with ID '${id}' not found`,
          });
          return;
        }

        const ci = this.convertNeo4jCI(result.records[0]!.get('ci').properties);

        res.json({
          success: true,
          data: ci,
          message: 'Audit completed successfully',
        });
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error('Error completing audit', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete audit',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ============================================================================
  // Incidents
  // ============================================================================

  async createIncident(req: Request, res: Response): Promise<void> {
    try {
      const { affectedCIId, description, reportedBy, symptoms = [], detectedAt } = req.body;

      // Verify CI exists
      const ci = await this.neo4jClient.getCI(affectedCIId);
      if (!ci) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `CI with ID '${affectedCIId}' not found`,
        });
        return;
      }

      // TODO: Call IncidentPriorityService to calculate priority
      // For now, use a simple default priority calculation
      const priority = this.calculateBasicPriority(ci);

      const incidentId = `INC-${Date.now()}`;
      const pool = this.postgresClient.pool;

      const result = await pool.query(
        `
        INSERT INTO itil_incidents (
          id, incident_number, affected_ci_id, description,
          reported_by, reported_at, priority, impact, urgency,
          status, symptoms
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
        `,
        [
          incidentId,
          incidentId,
          affectedCIId,
          description,
          reportedBy,
          detectedAt || new Date(),
          priority.priority,
          priority.impact,
          priority.urgency,
          'NEW',
          JSON.stringify(symptoms),
        ]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
        priorityCalculation: priority,
        message: `Incident created with priority P${priority.priority}`,
      });
    } catch (error) {
      logger.error('Error creating incident', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create incident',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getIncidents(req: Request, res: Response): Promise<void> {
    try {
      const { status, priority, affectedCIId, page = 1, limit = 50 } = req.query;

      const pool = this.postgresClient.pool;
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(status);
      }
      if (priority) {
        conditions.push(`priority = $${paramIndex++}`);
        params.push(parseInt(priority as string));
      }
      if (affectedCIId) {
        conditions.push(`affected_ci_id = $${paramIndex++}`);
        params.push(affectedCIId);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await pool.query(
        `SELECT COUNT(*) as total FROM itil_incidents ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0]!.total);

      // Get paginated results
      const pageNum = parseInt(page as string);
      const limitNum = Math.min(parseInt(limit as string), 1000);
      const offset = (pageNum - 1) * limitNum;

      params.push(limitNum, offset);
      const result = await pool.query(
        `
        SELECT * FROM itil_incidents
        ${whereClause}
        ORDER BY reported_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `,
        params
      );

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      logger.error('Error getting incidents', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve incidents',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getIncident(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const pool = this.postgresClient.pool;
      const result = await pool.query(
        'SELECT * FROM itil_incidents WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Incident with ID '${id}' not found`,
        });
        return;
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      logger.error('Error getting incident', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve incident',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async updateIncident(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, assignedTo, priority } = req.body;

      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (status) {
        updates.push(`status = $${paramIndex++}`);
        params.push(status);
      }
      if (assignedTo) {
        updates.push(`assigned_to = $${paramIndex++}`);
        params.push(assignedTo);
      }
      if (priority) {
        updates.push(`priority = $${paramIndex++}`);
        params.push(priority);
      }

      updates.push(`updated_at = NOW()`);

      if (updates.length === 1) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'No fields to update',
        });
        return;
      }

      params.push(id);
      const pool = this.postgresClient.pool;
      const result = await pool.query(
        `
        UPDATE itil_incidents
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
        `,
        params
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Incident with ID '${id}' not found`,
        });
        return;
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Incident updated successfully',
      });
    } catch (error) {
      logger.error('Error updating incident', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update incident',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async resolveIncident(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { resolution, resolvedBy } = req.body;

      const pool = this.postgresClient.pool;
      const result = await pool.query(
        `
        UPDATE itil_incidents
        SET status = 'RESOLVED',
            resolution = $1,
            resolved_by = $2,
            resolved_at = NOW(),
            updated_at = NOW()
        WHERE id = $3
        RETURNING *
        `,
        [resolution, resolvedBy, id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Incident with ID '${id}' not found`,
        });
        return;
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Incident resolved successfully',
      });
    } catch (error) {
      logger.error('Error resolving incident', error);
      res.status(500).json({
        success: false,
        error: 'Failed to resolve incident',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getIncidentPriority(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const pool = this.postgresClient.pool;
      const result = await pool.query(
        'SELECT priority, impact, urgency FROM itil_incidents WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Incident with ID '${id}' not found`,
        });
        return;
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      logger.error('Error getting incident priority', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve incident priority',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ============================================================================
  // Changes
  // ============================================================================

  async createChange(req: Request, res: Response): Promise<void> {
    try {
      const {
        changeType,
        description,
        affectedCIIds,
        requestedBy,
        plannedStart,
        plannedDuration,
        implementationPlan,
        backoutPlan = '',
        testPlan = '',
      } = req.body;

      // Verify all affected CIs exist
      for (const ciId of affectedCIIds) {
        const ci = await this.neo4jClient.getCI(ciId);
        if (!ci) {
          res.status(404).json({
            success: false,
            error: 'Not Found',
            message: `CI with ID '${ciId}' not found`,
          });
          return;
        }
      }

      const changeId = `CHG-${Date.now()}`;
      const pool = this.postgresClient.pool;

      const result = await pool.query(
        `
        INSERT INTO itil_changes (
          id, change_number, change_type, description,
          affected_ci_ids, requested_by, requested_at,
          planned_start, planned_duration, status,
          implementation_plan, backout_plan, test_plan
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
        `,
        [
          changeId,
          changeId,
          changeType,
          description,
          JSON.stringify(affectedCIIds),
          requestedBy,
          new Date(),
          plannedStart,
          plannedDuration,
          'REQUESTED',
          implementationPlan,
          backoutPlan,
          testPlan,
        ]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Change request created successfully',
      });
    } catch (error) {
      logger.error('Error creating change', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create change request',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getChanges(req: Request, res: Response): Promise<void> {
    try {
      const { status, changeType, requestedBy, page = 1, limit = 50 } = req.query;

      const pool = this.postgresClient.pool;
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(status);
      }
      if (changeType) {
        conditions.push(`change_type = $${paramIndex++}`);
        params.push(changeType);
      }
      if (requestedBy) {
        conditions.push(`requested_by = $${paramIndex++}`);
        params.push(requestedBy);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await pool.query(
        `SELECT COUNT(*) as total FROM itil_changes ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0]!.total);

      // Get paginated results
      const pageNum = parseInt(page as string);
      const limitNum = Math.min(parseInt(limit as string), 1000);
      const offset = (pageNum - 1) * limitNum;

      params.push(limitNum, offset);
      const result = await pool.query(
        `
        SELECT * FROM itil_changes
        ${whereClause}
        ORDER BY requested_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `,
        params
      );

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      logger.error('Error getting changes', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve changes',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getChange(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const pool = this.postgresClient.pool;
      const result = await pool.query(
        'SELECT * FROM itil_changes WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Change with ID '${id}' not found`,
        });
        return;
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      logger.error('Error getting change', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve change',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async updateChange(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, implementedBy, actualDuration } = req.body;

      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (status) {
        updates.push(`status = $${paramIndex++}`);
        params.push(status);
      }
      if (implementedBy) {
        updates.push(`implemented_by = $${paramIndex++}`);
        params.push(implementedBy);
      }
      if (actualDuration) {
        updates.push(`actual_duration = $${paramIndex++}`);
        params.push(actualDuration);
      }

      updates.push(`updated_at = NOW()`);

      if (updates.length === 1) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'No fields to update',
        });
        return;
      }

      params.push(id);
      const pool = this.postgresClient.pool;
      const result = await pool.query(
        `
        UPDATE itil_changes
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
        `,
        params
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Change with ID '${id}' not found`,
        });
        return;
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Change updated successfully',
      });
    } catch (error) {
      logger.error('Error updating change', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update change',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async assessChangeRisk(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const pool = this.postgresClient.pool;
      const result = await pool.query(
        'SELECT * FROM itil_changes WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Change with ID '${id}' not found`,
        });
        return;
      }

      const change = result.rows[0];

      // TODO: Call ChangeRiskService to assess risk
      // For now, use a simple risk assessment
      const riskAssessment = await this.calculateBasicRisk(change);

      res.json({
        success: true,
        data: riskAssessment,
      });
    } catch (error) {
      logger.error('Error assessing change risk', error);
      res.status(500).json({
        success: false,
        error: 'Failed to assess change risk',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async approveChange(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const pool = this.postgresClient.pool;
      const result = await pool.query(
        `
        UPDATE itil_changes
        SET status = 'APPROVED',
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Change with ID '${id}' not found`,
        });
        return;
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Change approved successfully',
      });
    } catch (error) {
      logger.error('Error approving change', error);
      res.status(500).json({
        success: false,
        error: 'Failed to approve change',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async implementChange(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const pool = this.postgresClient.pool;
      const result = await pool.query(
        `
        UPDATE itil_changes
        SET status = 'IMPLEMENTED',
            implemented_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Change with ID '${id}' not found`,
        });
        return;
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Change implemented successfully',
      });
    } catch (error) {
      logger.error('Error implementing change', error);
      res.status(500).json({
        success: false,
        error: 'Failed to implement change',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async closeChange(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { result: changeResult, notes, closedBy } = req.body;

      const pool = this.postgresClient.pool;
      const result = await pool.query(
        `
        UPDATE itil_changes
        SET status = 'CLOSED',
            result = $1,
            closure_notes = $2,
            closed_by = $3,
            closed_at = NOW(),
            updated_at = NOW()
        WHERE id = $4
        RETURNING *
        `,
        [changeResult, notes, closedBy, id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Change with ID '${id}' not found`,
        });
        return;
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Change closed successfully',
      });
    } catch (error) {
      logger.error('Error closing change', error);
      res.status(500).json({
        success: false,
        error: 'Failed to close change',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ============================================================================
  // Baselines
  // ============================================================================

  async createBaseline(req: Request, res: Response): Promise<void> {
    try {
      const { name, ciIds, description, createdBy } = req.body;

      // Verify all CIs exist
      for (const ciId of ciIds) {
        const ci = await this.neo4jClient.getCI(ciId);
        if (!ci) {
          res.status(404).json({
            success: false,
            error: 'Not Found',
            message: `CI with ID '${ciId}' not found`,
          });
          return;
        }
      }

      const baselineId = uuidv4();
      const pool = this.postgresClient.pool;

      const result = await pool.query(
        `
        INSERT INTO itil_baselines (
          id, name, description, ci_ids, created_by, snapshot_date
        )
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
        `,
        [baselineId, name, description, JSON.stringify(ciIds), createdBy]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Baseline created successfully',
      });
    } catch (error) {
      logger.error('Error creating baseline', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create baseline',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getBaselines(_req: Request, res: Response): Promise<void> {
    try {
      const pool = this.postgresClient.pool;
      const result = await pool.query(
        'SELECT * FROM itil_baselines ORDER BY snapshot_date DESC LIMIT 100'
      );

      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length,
      });
    } catch (error) {
      logger.error('Error getting baselines', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve baselines',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getBaseline(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const pool = this.postgresClient.pool;
      const result = await pool.query(
        'SELECT * FROM itil_baselines WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Baseline with ID '${id}' not found`,
        });
        return;
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      logger.error('Error getting baseline', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve baseline',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async deleteBaseline(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const pool = this.postgresClient.pool;
      const result = await pool.query(
        'DELETE FROM itil_baselines WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Baseline with ID '${id}' not found`,
        });
        return;
      }

      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting baseline', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete baseline',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async compareToBaseline(_req: Request, res: Response): Promise<void> {
    try {
      const { id } = _req.params;

      // TODO: Implement baseline comparison logic
      // This would compare current CI state to baseline snapshot

      res.json({
        success: true,
        data: {
          baselineId: id,
          comparisonDate: new Date(),
          driftedCIs: [],
          totalDriftCount: 0,
          driftPercentage: 0,
        },
        message: 'Baseline comparison feature coming soon',
      });
    } catch (error) {
      logger.error('Error comparing to baseline', error);
      res.status(500).json({
        success: false,
        error: 'Failed to compare to baseline',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async restoreFromBaseline(_req: Request, res: Response): Promise<void> {
    try {
      // const { id } = _req.params;
      // const { ciId, restoreAttributes, performedBy } = _req.body;

      // TODO: Implement baseline restoration logic
      // This would restore CI attributes from baseline snapshot

      res.json({
        success: true,
        message: 'Baseline restoration feature coming soon',
      });
    } catch (error) {
      logger.error('Error restoring from baseline', error);
      res.status(500).json({
        success: false,
        error: 'Failed to restore from baseline',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ============================================================================
  // Metrics
  // ============================================================================

  async getConfigurationAccuracy(_req: Request, res: Response): Promise<void> {
    try {
      const pool = this.postgresClient.pool;

      // Get CIs that have been audited and are compliant
      const result = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE itil_audit_status = 'COMPLIANT') as compliant_count,
          COUNT(*) as total_audited
        FROM ci_snapshot
        WHERE itil_audit_status IS NOT NULL
      `);

      const compliantCount = parseInt(result.rows[0]?.compliant_count || '0');
      const totalAudited = parseInt(result.rows[0]?.total_audited || '1');
      const accuracy = (compliantCount / totalAudited) * 100;

      res.json({
        success: true,
        data: {
          accuracy: accuracy.toFixed(2),
          compliantCount,
          totalAudited,
        },
      });
    } catch (error) {
      logger.error('Error getting configuration accuracy', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve configuration accuracy',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getIncidentSummary(_req: Request, res: Response): Promise<void> {
    try {
      const pool = this.postgresClient.pool;
      const result = await pool.query(`
        SELECT
          status,
          priority,
          COUNT(*) as count
        FROM itil_incidents
        GROUP BY status, priority
        ORDER BY priority, status
      `);

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      logger.error('Error getting incident summary', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve incident summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getChangeSuccessRate(_req: Request, res: Response): Promise<void> {
    try {
      const pool = this.postgresClient.pool;
      const result = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE result = 'SUCCESS') as successful_changes,
          COUNT(*) FILTER (WHERE status = 'CLOSED') as total_closed_changes
        FROM itil_changes
        WHERE status = 'CLOSED'
      `);

      const successfulChanges = parseInt(result.rows[0]?.successful_changes || '0');
      const totalClosedChanges = parseInt(result.rows[0]?.total_closed_changes || '1');
      const successRate = (successfulChanges / totalClosedChanges) * 100;

      res.json({
        success: true,
        data: {
          successRate: successRate.toFixed(2),
          successfulChanges,
          totalClosedChanges,
        },
      });
    } catch (error) {
      logger.error('Error getting change success rate', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve change success rate',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getMeanTimeToResolve(_req: Request, res: Response): Promise<void> {
    try {
      const pool = this.postgresClient.pool;
      const result = await pool.query(`
        SELECT
          AVG(EXTRACT(EPOCH FROM (resolved_at - reported_at))/3600) as mttr_hours
        FROM itil_incidents
        WHERE status = 'RESOLVED'
        AND resolved_at IS NOT NULL
      `);

      const mttrHours = parseFloat(result.rows[0]?.mttr_hours || '0');

      res.json({
        success: true,
        data: {
          mttr: mttrHours.toFixed(2),
          unit: 'hours',
        },
      });
    } catch (error) {
      logger.error('Error getting MTTR', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve MTTR',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getMeanTimeBetweenFailures(_req: Request, res: Response): Promise<void> {
    try {
      const pool = this.postgresClient.pool;

      // Get average time between incidents for the same CI
      const result = await pool.query(`
        WITH incident_gaps AS (
          SELECT
            affected_ci_id,
            reported_at - LAG(reported_at) OVER (PARTITION BY affected_ci_id ORDER BY reported_at) as gap
          FROM itil_incidents
        )
        SELECT
          AVG(EXTRACT(EPOCH FROM gap)/3600) as mtbf_hours
        FROM incident_gaps
        WHERE gap IS NOT NULL
      `);

      const mtbfHours = parseFloat(result.rows[0]?.mtbf_hours || '0');

      res.json({
        success: true,
        data: {
          mtbf: mtbfHours.toFixed(2),
          unit: 'hours',
        },
      });
    } catch (error) {
      logger.error('Error getting MTBF', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve MTBF',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private convertNeo4jCI(ci: any): any {
    // Convert Neo4j types to plain JavaScript objects
    // Remove underscore prefixes for frontend compatibility
    const converted: any = {};
    for (const key in ci) {
      if (ci.hasOwnProperty(key)) {
        const newKey = key.startsWith('_') ? key.substring(1) : key;
        converted[newKey] = ci[key];
      }
    }
    return converted;
  }

  private calculateBasicPriority(ci: any): any {
    // Basic priority calculation based on CI type and environment
    // TODO: Replace with actual IncidentPriorityService logic

    let priority = 3; // Default to P3 (Medium)
    let impact = 'MEDIUM';
    let urgency = 'MEDIUM';

    // Production environment gets higher priority
    if (ci.environment === 'production') {
      priority = 2;
      impact = 'HIGH';
    }

    // Critical CI types get highest priority
    if (['database', 'load-balancer', 'service'].includes(ci.type)) {
      priority = 1;
      impact = 'CRITICAL';
      urgency = 'HIGH';
    }

    return {
      priority,
      impact,
      urgency,
      reasoning: 'Basic calculation based on CI type and environment',
      estimatedUserImpact: priority === 1 ? 1000 : priority === 2 ? 100 : 10,
      estimatedRevenueImpact: priority === 1 ? 10000 : priority === 2 ? 1000 : 100,
    };
  }

  private async calculateBasicRisk(change: any): Promise<any> {
    // Basic risk calculation
    // TODO: Replace with actual ChangeRiskService logic

    const affectedCIIds = JSON.parse(change.affected_ci_ids || '[]');
    const ciCount = affectedCIIds.length;

    let riskScore = 0.5; // Default medium risk
    let riskLevel = 'MEDIUM';

    // More CIs affected = higher risk
    if (ciCount > 10) {
      riskScore = 0.8;
      riskLevel = 'HIGH';
    } else if (ciCount > 5) {
      riskScore = 0.6;
      riskLevel = 'MEDIUM';
    }

    // Emergency changes are higher risk
    if (change.change_type === 'EMERGENCY') {
      riskScore = Math.min(riskScore + 0.2, 1.0);
      riskLevel = 'HIGH';
    }

    return {
      riskScore,
      riskLevel,
      requiresCABApproval: riskScore > 0.6,
      affectedCICount: ciCount,
      estimatedDowntime: change.planned_duration || 0,
      estimatedUserImpact: ciCount * 10,
      estimatedRevenueAtRisk: ciCount * 1000,
      recommendations: [
        'Review implementation plan thoroughly',
        'Ensure backout plan is tested',
        'Schedule during maintenance window',
      ],
      mitigationStrategies: [
        'Perform change in stages',
        'Have rollback procedures ready',
        'Monitor closely during implementation',
      ],
    };
  }
}
