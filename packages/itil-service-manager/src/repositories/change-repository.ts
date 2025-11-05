/**
 * Change Repository
 * Database access layer for ITIL Changes
 */

import { getPostgresClient } from '@cmdb/database';
import { Change, ChangeRequest, ChangeRiskAssessment } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class ChangeRepository {
  /**
   * Create a new change
   */
  async createChange(
    request: ChangeRequest,
    riskAssessment: ChangeRiskAssessment
  ): Promise<Change> {
    const postgres = getPostgresClient();

    // Generate change number (format: CHG-YYYYMMDD-####)
    const changeNumber = await this.generateChangeNumber();

    const result = await postgres.query(
      `
      INSERT INTO itil_changes (
        id, change_number, title, description,
        change_type, category,
        risk_assessment, business_impact, financial_impact,
        affected_ci_ids, implementation_plan, backout_plan, test_plan,
        approval_status, status, scheduled_start, scheduled_end,
        requested_by, created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      )
      RETURNING *
      `,
      [
        request.changeId || uuidv4(),
        changeNumber,
        request.title,
        request.description,
        request.changeType,
        request.category,
        JSON.stringify({
          overall_risk_score: riskAssessment.overallRiskScore,
          risk_level: riskAssessment.riskLevel,
          requires_cab_approval: riskAssessment.requiresCABApproval,
        }),
        JSON.stringify({
          critical_services_affected: riskAssessment.criticalServicesAffected,
          estimated_downtime_minutes: riskAssessment.estimatedDowntime,
          customer_impact: riskAssessment.estimatedUserImpact > 0,
          revenue_at_risk: riskAssessment.estimatedRevenueAtRisk,
        }),
        JSON.stringify({
          implementation_cost: riskAssessment.implementationCost,
          downtime_cost: riskAssessment.downtimeCost,
          total_cost: riskAssessment.totalCost,
        }),
        request.affectedCIIds,
        request.implementationPlan,
        request.backoutPlan,
        request.testPlan,
        'pending',
        'draft',
        request.plannedStart,
        request.plannedEnd,
        request.requestedBy,
        new Date(),
        new Date(),
      ]
    );

    return this.rowToChange(result.rows[0]);
  }

  /**
   * Get change by ID
   */
  async getChangeById(id: string): Promise<Change | null> {
    const postgres = getPostgresClient();

    const result = await postgres.query(
      `
      SELECT * FROM itil_changes
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.rowToChange(result.rows[0]);
  }

  /**
   * Update change
   */
  async updateChange(id: string, updates: Partial<Change>): Promise<Change> {
    const postgres = getPostgresClient();

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Build dynamic UPDATE query
    if (updates.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(updates.status);
    }
    if (updates.approvalStatus !== undefined) {
      fields.push(`approval_status = $${paramCount++}`);
      values.push(updates.approvalStatus);
    }
    if (updates.approvedBy !== undefined) {
      fields.push(`approved_by = $${paramCount++}`);
      values.push(updates.approvedBy);
    }
    if (updates.approvedAt !== undefined) {
      fields.push(`approved_at = $${paramCount++}`);
      values.push(updates.approvedAt);
    }
    if (updates.assignedTo !== undefined) {
      fields.push(`assigned_to = $${paramCount++}`);
      values.push(updates.assignedTo);
    }
    if (updates.assignedGroup !== undefined) {
      fields.push(`assigned_group = $${paramCount++}`);
      values.push(updates.assignedGroup);
    }
    if (updates.actualStart !== undefined) {
      fields.push(`actual_start = $${paramCount++}`);
      values.push(updates.actualStart);
    }
    if (updates.actualEnd !== undefined) {
      fields.push(`actual_end = $${paramCount++}`);
      values.push(updates.actualEnd);
    }
    if (updates.outcome !== undefined) {
      fields.push(`outcome = $${paramCount++}`);
      values.push(updates.outcome);
    }
    if (updates.closureNotes !== undefined) {
      fields.push(`closure_notes = $${paramCount++}`);
      values.push(updates.closureNotes);
    }

    // Always update updated_at
    fields.push(`updated_at = $${paramCount++}`);
    values.push(new Date());

    values.push(id);

    const result = await postgres.query(
      `
      UPDATE itil_changes
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
      `,
      values
    );

    return this.rowToChange(result.rows[0]);
  }

  /**
   * Get changes by CI
   */
  async getChangesByCIId(ciId: string, limit: number = 100): Promise<Change[]> {
    const postgres = getPostgresClient();

    const result = await postgres.query(
      `
      SELECT * FROM itil_changes
      WHERE $1 = ANY(affected_ci_ids)
      ORDER BY created_at DESC
      LIMIT $2
      `,
      [ciId, limit]
    );

    return result.rows.map(this.rowToChange);
  }

  /**
   * Get change success rate for a CI
   * Returns percentage of successful changes
   */
  async getChangeSuccessRateByCIId(ciId: string): Promise<number> {
    const postgres = getPostgresClient();

    const result = await postgres.query(
      `
      SELECT
        COUNT(*) as total_changes,
        COUNT(CASE WHEN outcome = 'successful' THEN 1 END) as successful_changes
      FROM itil_changes
      WHERE $1 = ANY(affected_ci_ids)
        AND outcome IS NOT NULL
        AND created_at > NOW() - INTERVAL '1 year'
      `,
      [ciId]
    );

    const row = result.rows[0];
    const total = parseInt(row.total_changes);
    const successful = parseInt(row.successful_changes);

    if (total === 0) {
      return 100; // No history, assume 100% success
    }

    return (successful / total) * 100;
  }

  /**
   * Get pending changes
   */
  async getPendingChanges(limit: number = 100): Promise<Change[]> {
    const postgres = getPostgresClient();

    const result = await postgres.query(
      `
      SELECT * FROM itil_changes
      WHERE status IN ('draft', 'pending_approval', 'approved', 'scheduled')
      ORDER BY scheduled_start ASC
      LIMIT $1
      `,
      [limit]
    );

    return result.rows.map(this.rowToChange);
  }

  /**
   * Generate unique change number
   */
  private async generateChangeNumber(): Promise<string> {
    const postgres = getPostgresClient();
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // Get count of changes created today
    const result = await postgres.query(
      `
      SELECT COUNT(*) as count
      FROM itil_changes
      WHERE change_number LIKE $1
      `,
      [`CHG-${dateStr}-%`]
    );

    const count = parseInt(result.rows[0].count) + 1;
    const sequence = count.toString().padStart(4, '0');

    return `CHG-${dateStr}-${sequence}`;
  }

  /**
   * Convert database row to Change
   */
  private rowToChange(row: any): Change {
    return {
      id: row.id,
      changeNumber: row.change_number,
      title: row.title,
      description: row.description,
      changeType: row.change_type,
      category: row.category,
      riskAssessment: row.risk_assessment,
      businessImpact: row.business_impact,
      financialImpact: row.financial_impact,
      affectedCiIds: row.affected_ci_ids || [],
      affectedBusinessServiceIds: row.affected_business_service_ids || [],
      affectedApplicationServiceIds: row.affected_application_service_ids || [],
      implementationPlan: row.implementation_plan,
      backoutPlan: row.backout_plan,
      testPlan: row.test_plan,
      approvalStatus: row.approval_status,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      assignedTo: row.assigned_to,
      assignedGroup: row.assigned_group,
      status: row.status,
      scheduledStart: row.scheduled_start,
      scheduledEnd: row.scheduled_end,
      actualStart: row.actual_start,
      actualEnd: row.actual_end,
      outcome: row.outcome,
      closureNotes: row.closure_notes,
      requestedBy: row.requested_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      closedAt: row.closed_at,
    };
  }
}
