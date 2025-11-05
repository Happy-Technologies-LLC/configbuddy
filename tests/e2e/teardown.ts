/**
 * E2E Test Teardown
 *
 * Global teardown script that runs after all E2E tests complete.
 * Responsibilities:
 * - Stop Docker Compose services
 * - Clean up test data and volumes
 * - Generate test reports
 */

import { execSync } from 'child_process';
import * as path from 'path';
import { logger } from './utils/logger';

const E2E_COMPOSE_FILE = path.join(__dirname, 'docker-compose.e2e.yml');

/**
 * Global teardown function
 * Called once after all test suites complete
 */
export default async function globalTeardown() {
  logger.info('========================================');
  logger.info('Starting E2E Test Environment Teardown');
  logger.info('========================================');

  try {
    // Step 1: Print container logs for debugging (if tests failed)
    if (process.env.E2E_SAVE_LOGS === 'true') {
      logger.info('Step 1: Saving container logs...');
      try {
        const logsDir = path.join(__dirname, '../../logs/e2e');
        execSync(`mkdir -p ${logsDir}`, { stdio: 'pipe' });

        const services = [
          'neo4j-e2e',
          'postgres-e2e',
          'redis-e2e',
          'api-server-e2e',
          'discovery-engine-e2e',
          'etl-processor-e2e',
        ];

        for (const service of services) {
          try {
            execSync(
              `docker-compose -f ${E2E_COMPOSE_FILE} logs ${service} > ${logsDir}/${service}.log 2>&1`,
              { stdio: 'pipe' }
            );
          } catch (error) {
            logger.warn(`Could not save logs for ${service}`);
          }
        }

        logger.info(`Logs saved to ${logsDir}`);
      } catch (error) {
        logger.warn('Failed to save logs:', error);
      }
    }

    // Step 2: Stop and remove containers
    logger.info('Step 2: Stopping Docker Compose services...');
    execSync(`docker-compose -f ${E2E_COMPOSE_FILE} down`, {
      stdio: 'inherit',
      timeout: 60000,
    });
    logger.info('Services stopped');

    // Step 3: Clean up volumes (if requested)
    if (process.env.E2E_CLEANUP_VOLUMES !== 'false') {
      logger.info('Step 3: Removing volumes...');
      execSync(`docker-compose -f ${E2E_COMPOSE_FILE} down -v`, {
        stdio: 'pipe',
        timeout: 30000,
      });
      logger.info('Volumes removed');
    } else {
      logger.info('Step 3: Skipping volume cleanup (E2E_CLEANUP_VOLUMES=false)');
    }

    // Step 4: Clean up network
    logger.info('Step 4: Cleaning up network...');
    try {
      execSync('docker network rm cmdb_e2e_network', {
        stdio: 'pipe',
        timeout: 10000,
      });
      logger.info('Network removed');
    } catch (error) {
      logger.warn('Network already removed or does not exist');
    }

    logger.info('========================================');
    logger.info('E2E Test Environment Teardown Complete');
    logger.info('========================================');

  } catch (error) {
    logger.error('========================================');
    logger.error('E2E Teardown Failed');
    logger.error('========================================');
    logger.error(error);

    // Don't throw - teardown failures shouldn't fail the test run
    // Just log the error and continue
  }
}
