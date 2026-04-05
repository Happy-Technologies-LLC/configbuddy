// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Incident Repository
 * Database access layer for ITIL Incidents
 */

import { getPostgresClient } from '@cmdb/database';
import { Incident, IncidentInput, IncidentPriority } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class IncidentRepository {
  /**
   * Create a new incident
   */
  async createIncident(
    input: IncidentInput,
    priority: IncidentPriority
  ): Promise<Incident> {
    const postgres = getPostgresClient();

    // Generate incident number (format: INC-YYYYMMDD-####)
    const incidentNumber = await this.generateIncidentNumber();

    const result = await postgres.query(
      `
      INSERT INTO itil_incidents (
        id, incident_number, title, description,
        category, subcategory, impact, urgency, priority,
        affected_ci_id, business_impact,
        status, reported_by, reported_at,
        created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      )
      RETURNING *
      `,
      [
        uuidv4(),
        incidentNumber,
        input.title,
        input.description,
        input.category,
        input.subcategory,
        priority.impact,
        priority.urgency,
        priority.priority,
        input.affectedCIId,
        JSON.stringify({
          estimated_user_impact: priority.estimatedUserImpact,
          estimated_revenue_impact: priority.estimatedRevenueImpact,
          estimated_cost_of_downtime: priority.estimatedCostOfDowntime,
          affected_services: priority.affectedBusinessServices.map((s) => s.id),
        }),
        'new',
        input.reportedBy,
        new Date(),
        new Date(),
        new Date(),
      ]
    );

    return this.rowToIncident(result.rows[0]);
  }

  /**
   * Get incident by ID
   */
  async getIncidentById(id: string): Promise<Incident | null> {
    const postgres = getPostgresClient();

    const result = await postgres.query(
      `
      SELECT * FROM itil_incidents
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.rowToIncident(result.rows[0]);
  }

  /**
   * Update incident
   */
  async updateIncident(
    id: string,
    updates: Partial<Incident>
  ): Promise<Incident> {
    const postgres = getPostgresClient();

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Build dynamic UPDATE query
    if (updates.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(updates.status);
    }
    if (updates.assignedTo !== undefined) {
      fields.push(`assigned_to = $${paramCount++}`);
      values.push(updates.assignedTo);
    }
    if (updates.assignedGroup !== undefined) {
      fields.push(`assigned_group = $${paramCount++}`);
      values.push(updates.assignedGroup);
    }
    if (updates.resolution !== undefined) {
      fields.push(`resolution = $${paramCount++}`);
      values.push(updates.resolution);
    }
    if (updates.resolutionCode !== undefined) {
      fields.push(`resolution_code = $${paramCount++}`);
      values.push(updates.resolutionCode);
    }

    // Always update updated_at
    fields.push(`updated_at = $${paramCount++}`);
    values.push(new Date());

    values.push(id);

    const result = await postgres.query(
      `
      UPDATE itil_incidents
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
      `,
      values
    );

    return this.rowToIncident(result.rows[0]);
  }

  /**
   * Get incidents by CI
   */
  async getIncidentsByCIId(ciId: string, limit: number = 100): Promise<Incident[]> {
    const postgres = getPostgresClient();

    const result = await postgres.query(
      `
      SELECT * FROM itil_incidents
      WHERE affected_ci_id = $1
      ORDER BY reported_at DESC
      LIMIT $2
      `,
      [ciId, limit]
    );

    return result.rows.map(this.rowToIncident);
  }

  /**
   * Get incidents by business service
   */
  async getIncidentsByBusinessServiceId(
    businessServiceId: string,
    limit: number = 100
  ): Promise<Incident[]> {
    const postgres = getPostgresClient();

    const result = await postgres.query(
      `
      SELECT * FROM itil_incidents
      WHERE affected_business_service_id = $1
      ORDER BY reported_at DESC
      LIMIT $2
      `,
      [businessServiceId, limit]
    );

    return result.rows.map(this.rowToIncident);
  }

  /**
   * Get open incidents
   */
  async getOpenIncidents(limit: number = 100): Promise<Incident[]> {
    const postgres = getPostgresClient();

    const result = await postgres.query(
      `
      SELECT * FROM itil_incidents
      WHERE status IN ('new', 'assigned', 'in_progress', 'pending')
      ORDER BY priority ASC, reported_at DESC
      LIMIT $1
      `,
      [limit]
    );

    return result.rows.map(this.rowToIncident);
  }

  /**
   * Generate unique incident number
   */
  private async generateIncidentNumber(): Promise<string> {
    const postgres = getPostgresClient();
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // Get count of incidents created today
    const result = await postgres.query(
      `
      SELECT COUNT(*) as count
      FROM itil_incidents
      WHERE incident_number LIKE $1
      `,
      [`INC-${dateStr}-%`]
    );

    const count = parseInt(result.rows[0].count) + 1;
    const sequence = count.toString().padStart(4, '0');

    return `INC-${dateStr}-${sequence}`;
  }

  /**
   * Convert database row to Incident
   */
  private rowToIncident(row: any): Incident {
    return {
      id: row.id,
      incidentNumber: row.incident_number,
      title: row.title,
      description: row.description,
      category: row.category,
      subcategory: row.subcategory,
      impact: row.impact,
      urgency: row.urgency,
      priority: row.priority,
      affectedCiId: row.affected_ci_id,
      affectedBusinessServiceId: row.affected_business_service_id,
      affectedApplicationServiceId: row.affected_application_service_id,
      businessImpact: row.business_impact,
      assignedTo: row.assigned_to,
      assignedGroup: row.assigned_group,
      status: row.status,
      resolution: row.resolution,
      resolutionCode: row.resolution_code,
      reportedAt: row.reported_at,
      acknowledgedAt: row.acknowledged_at,
      resolvedAt: row.resolved_at,
      closedAt: row.closed_at,
      timeToAcknowledgeMinutes: row.time_to_acknowledge_minutes,
      timeToResolveMinutes: row.time_to_resolve_minutes,
      reportedBy: row.reported_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
