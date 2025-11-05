/**
 * Database Helpers for E2E Tests
 *
 * Direct database access utilities for test verification
 */

import neo4j, { Driver, Session } from 'neo4j-driver';
import { Pool, PoolClient } from 'pg';
import { logger } from './logger';

/**
 * Neo4j Test Helper
 */
export class Neo4jTestHelper {
  private driver: Driver;

  constructor(uri: string, user: string, password: string) {
    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }

  async executeQuery<T = any>(query: string, params?: Record<string, any>): Promise<T[]> {
    const session: Session = this.driver.session();
    try {
      const result = await session.run(query, params);
      return result.records.map(record => record.toObject()) as T[];
    } finally {
      await session.close();
    }
  }

  async getCIById(id: string): Promise<any | null> {
    const result = await this.executeQuery(
      'MATCH (ci:CI {id: $id}) RETURN ci',
      { id }
    );
    return result.length > 0 ? result[0].ci.properties : null;
  }

  async getCICount(): Promise<number> {
    const result = await this.executeQuery('MATCH (ci:CI) RETURN count(ci) as count');
    return result[0].count;
  }

  async getCIsByType(type: string): Promise<any[]> {
    const result = await this.executeQuery(
      'MATCH (ci:CI {type: $type}) RETURN ci',
      { type }
    );
    return result.map(r => r.ci.properties);
  }

  async getRelationships(ciId: string): Promise<any[]> {
    const result = await this.executeQuery(
      `MATCH (from:CI {id: $ciId})-[r]->(to:CI)
       RETURN type(r) as type, to.id as to_id, properties(r) as properties`,
      { ciId }
    );
    return result;
  }

  async getImpactUpstream(ciId: string, depth: number = 3): Promise<string[]> {
    const result = await this.executeQuery(
      `MATCH path = (affected:CI)-[*1..${depth}]->(ci:CI {id: $ciId})
       RETURN DISTINCT affected.id as id`,
      { ciId }
    );
    return result.map(r => r.id);
  }

  async getImpactDownstream(ciId: string, depth: number = 3): Promise<string[]> {
    const result = await this.executeQuery(
      `MATCH path = (ci:CI {id: $ciId})-[*1..${depth}]->(affected:CI)
       RETURN DISTINCT affected.id as id`,
      { ciId }
    );
    return result.map(r => r.id);
  }

  async clearAllData(): Promise<void> {
    logger.info('Clearing Neo4j test data...');
    await this.executeQuery('MATCH (n) DETACH DELETE n');
    logger.success('Neo4j test data cleared');
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}

/**
 * PostgreSQL Test Helper
 */
export class PostgresTestHelper {
  private pool: Pool;

  constructor(config: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  }) {
    this.pool = new Pool(config);
  }

  async executeQuery<T = any>(query: string, params?: any[]): Promise<T[]> {
    const client: PoolClient = await this.pool.connect();
    try {
      const result = await client.query(query, params);
      return result.rows as T[];
    } finally {
      client.release();
    }
  }

  async getCIFromDataMart(ciId: string): Promise<any | null> {
    const result = await this.executeQuery(
      'SELECT * FROM dim_ci WHERE ci_id = $1',
      [ciId]
    );
    return result.length > 0 ? result[0] : null;
  }

  async getCICount(): Promise<number> {
    const result = await this.executeQuery('SELECT COUNT(*) as count FROM dim_ci');
    return parseInt(result[0].count, 10);
  }

  async getCIsByType(type: string): Promise<any[]> {
    return this.executeQuery('SELECT * FROM dim_ci WHERE type = $1', [type]);
  }

  async getCIMetrics(ciKey: number, metricName?: string): Promise<any[]> {
    if (metricName) {
      return this.executeQuery(
        'SELECT * FROM fact_ci_metrics WHERE ci_key = $1 AND metric_name = $2 ORDER BY time DESC LIMIT 100',
        [ciKey, metricName]
      );
    }
    return this.executeQuery(
      'SELECT * FROM fact_ci_metrics WHERE ci_key = $1 ORDER BY time DESC LIMIT 100',
      [ciKey]
    );
  }

  async clearAllData(): Promise<void> {
    logger.info('Clearing PostgreSQL test data...');
    await this.executeQuery('TRUNCATE TABLE fact_ci_metrics CASCADE');
    await this.executeQuery('TRUNCATE TABLE dim_ci RESTART IDENTITY CASCADE');
    logger.success('PostgreSQL test data cleared');
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

/**
 * Create database helpers for E2E tests
 */
export function createDatabaseHelpers(config?: {
  neo4j?: { uri: string; user: string; password: string };
  postgres?: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
}) {
  return {
    neo4j: new Neo4jTestHelper(
      config?.neo4j?.uri || 'bolt://localhost:7688',
      config?.neo4j?.user || 'neo4j',
      config?.neo4j?.password || 'test_password'
    ),
    postgres: new PostgresTestHelper(
      config?.postgres || {
        host: 'localhost',
        port: 5433,
        database: 'cmdb_test',
        user: 'test_user',
        password: 'test_password',
      }
    ),
  };
}
