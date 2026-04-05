// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Business Service Repository
 * Database access layer for Business Services
 */

import { getPostgresClient, getNeo4jClient } from '@cmdb/database';
import { BusinessService } from '@cmdb/unified-model';

export class BusinessServiceRepository {
  /**
   * Get business service by ID
   */
  async getBusinessServiceById(id: string): Promise<BusinessService | null> {
    const postgres = getPostgresClient();

    const result = await postgres.query(
      `
      SELECT * FROM business_services
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.rowToBusinessService(result.rows[0]);
  }

  /**
   * Get business services by IDs
   */
  async getBusinessServicesByIds(ids: string[]): Promise<BusinessService[]> {
    if (ids.length === 0) {
      return [];
    }

    const postgres = getPostgresClient();

    const result = await postgres.query(
      `
      SELECT * FROM business_services
      WHERE id = ANY($1::uuid[])
      `,
      [ids]
    );

    return result.rows.map(this.rowToBusinessService);
  }

  /**
   * Get business services supported by a CI
   * Traverses the dependency graph to find business services
   */
  async getBusinessServicesByCIId(ciId: string): Promise<BusinessService[]> {
    const neo4j = getNeo4jClient();
    const session = neo4j.getSession();

    try {
      // Query Neo4j to find business services that depend on this CI
      const result = await session.run(
        `
        MATCH (ci:CI {id: $ciId})
        MATCH path = (bs:BusinessService)-[:DEPENDS_ON*1..5]->(ci)
        RETURN DISTINCT bs.id as id
        `,
        { ciId }
      );

      if (result.records.length === 0) {
        return [];
      }

      const businessServiceIds = result.records.map((record) => record.get('id'));

      // Get full business service details from PostgreSQL
      return await this.getBusinessServicesByIds(businessServiceIds);
    } finally {
      await session.close();
    }
  }

  /**
   * Get critical business services (Tier 1)
   */
  async getCriticalBusinessServices(): Promise<BusinessService[]> {
    const postgres = getPostgresClient();

    const result = await postgres.query(
      `
      SELECT * FROM business_services
      WHERE bsm_attributes->>'business_criticality' = 'tier_1'
      ORDER BY name
      `
    );

    return result.rows.map(this.rowToBusinessService);
  }

  /**
   * Convert database row to BusinessService
   */
  private rowToBusinessService(row: any): BusinessService {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      itil_attributes: row.itil_attributes,
      tbm_attributes: row.tbm_attributes,
      bsm_attributes: row.bsm_attributes,
      application_services: row.application_services || [],
      technical_owner: row.technical_owner,
      platform_team: row.platform_team,
      operational_status: row.operational_status,
      last_incident: row.last_incident,
      last_validated: row.last_validated,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      updated_by: row.updated_by,
    };
  }
}
