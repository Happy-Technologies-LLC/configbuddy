// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Neo4j Schema Initializer
 *
 * This module provides functionality to initialize the Neo4j database schema
 * by executing the schema.cypher file containing constraints, indexes, and
 * full-text search configurations.
 *
 * Features:
 * - Idempotent execution (safe to run multiple times)
 * - Automatic schema file discovery
 * - Statement-by-statement execution with error handling
 * - Progress logging
 * - Schema verification
 */

import { Neo4jClient } from './client';
import { logger } from '@cmdb/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Initialize Neo4j database schema
 *
 * Reads and executes the schema.cypher file to create all necessary
 * constraints, indexes, and full-text search capabilities.
 *
 * @param client - Neo4j client instance
 * @param schemaFilePath - Optional custom path to schema file
 * @throws Error if schema file not found or execution fails
 */
export async function initializeNeo4jSchema(
  client: Neo4jClient,
  schemaFilePath?: string
): Promise<void> {
  const session = client.getSession();

  try {
    // Determine schema file path
    const defaultSchemaPath = path.resolve(__dirname, 'schema.cypher');
    const filePath = schemaFilePath || defaultSchemaPath;

    // Verify schema file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`Schema file not found at: ${filePath}`);
    }

    // Read schema file
    const cypherScript = fs.readFileSync(filePath, 'utf-8');

    // Parse statements from schema file
    const statements = parseSchemaStatements(cypherScript);

    logger.info(`Initializing Neo4j schema from: ${filePath}`);
    logger.info(`Found ${statements.length} statements to execute`);

    // Execute each statement
    let successCount = 0;
    let skipCount = 0;

    for (const statement of statements) {
      try {
        await session.run(statement);
        successCount++;

        // Log progress for major operations
        logStatementExecution(statement);
      } catch (error: any) {
        // Handle idempotent errors (constraint/index already exists)
        if (isIdempotentError(error)) {
          skipCount++;
          logger.debug(`Skipped existing: ${extractConstraintOrIndexName(statement)}`);
        } else {
          logger.error(`Failed to execute statement: ${statement.substring(0, 100)}...`);
          throw error;
        }
      }
    }

    logger.info(
      `Schema initialization complete: ${successCount} created, ${skipCount} skipped (already exist)`
    );

    // Verify schema
    await verifySchema(session);
  } catch (error) {
    logger.error('Failed to initialize Neo4j schema', error);
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Parse schema statements from Cypher script
 *
 * Splits the script into individual statements and filters out
 * comments and empty lines.
 *
 * @param cypherScript - Raw Cypher script content
 * @returns Array of executable statements
 */
function parseSchemaStatements(cypherScript: string): string[] {
  // Split by semicolons to get individual statements
  const rawStatements = cypherScript.split(';');

  // Filter and clean statements
  const statements = rawStatements
    .map((stmt) => {
      // Remove comment-only lines but preserve comments within statements
      const lines = stmt
        .split('\n')
        .filter((line) => {
          const trimmed = line.trim();
          // Keep non-empty lines that aren't pure comment lines
          return trimmed && !trimmed.startsWith('//');
        })
        .join('\n');

      return lines.trim();
    })
    .filter((stmt) => {
      // Filter out empty statements
      return stmt.length > 0;
    });

  return statements;
}

/**
 * Check if error is an idempotent error (already exists)
 *
 * @param error - Error from Neo4j
 * @returns True if error indicates constraint/index already exists
 */
function isIdempotentError(error: any): boolean {
  const message = error.message || '';
  return (
    message.includes('already exists') ||
    message.includes('AlreadyExists') ||
    message.includes('EquivalentSchemaRuleAlreadyExists')
  );
}

/**
 * Log execution of important schema statements
 *
 * @param statement - Cypher statement that was executed
 */
function logStatementExecution(statement: string): void {
  if (statement.includes('CREATE CONSTRAINT')) {
    const name = extractConstraintOrIndexName(statement);
    logger.info(`Created constraint: ${name}`);
  } else if (statement.includes('CREATE INDEX') && !statement.includes('FULLTEXT')) {
    const name = extractConstraintOrIndexName(statement);
    logger.info(`Created index: ${name}`);
  } else if (statement.includes('CREATE FULLTEXT INDEX')) {
    const name = extractConstraintOrIndexName(statement);
    logger.info(`Created full-text index: ${name}`);
  }
}

/**
 * Extract constraint or index name from statement
 *
 * @param statement - Cypher CREATE statement
 * @returns Name of constraint/index or truncated statement
 */
function extractConstraintOrIndexName(statement: string): string {
  // Try to extract name from statement
  // Format: CREATE [CONSTRAINT|INDEX] name_here ...
  const match = statement.match(/CREATE\s+(?:CONSTRAINT|INDEX|FULLTEXT\s+INDEX)\s+(\w+)/i);
  if (match && match[1]) {
    return match[1];
  }

  // If no name found, return truncated statement
  return statement.substring(0, 50).replace(/\s+/g, ' ');
}

/**
 * Verify schema by checking constraints and indexes
 *
 * @param session - Neo4j session
 */
async function verifySchema(session: any): Promise<void> {
  try {
    const constraintsResult = await session.run('SHOW CONSTRAINTS');
    const indexesResult = await session.run('SHOW INDEXES');

    const constraintCount = constraintsResult.records.length || 0;
    const indexCount = indexesResult.records.length || 0;

    logger.info(`Schema verification complete:`);
    logger.info(`  - Constraints: ${constraintCount}`);
    logger.info(`  - Indexes: ${indexCount}`);
  } catch (error) {
    logger.warn('Could not verify schema (SHOW commands may not be available)');
  }
}
