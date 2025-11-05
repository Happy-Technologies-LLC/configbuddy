/**
 * Full Discovery Flow E2E Test
 *
 * Comprehensive end-to-end test covering the complete CMDB discovery workflow:
 * 1. Schedule AWS discovery via API
 * 2. Wait for discovery job to complete
 * 3. Verify CIs created in Neo4j
 * 4. Wait for ETL to sync to PostgreSQL
 * 5. Verify data in data mart
 * 6. Query API to retrieve discovered CIs
 * 7. Test impact analysis on discovered CIs
 * 8. Test relationship queries
 */

import { createApiClient, ApiClient } from './utils/api-client';
import { createDatabaseHelpers } from './utils/database-helpers';
import {
  generateAWSDiscoveryConfig,
  generateAWSEC2Instances,
  generateCIHierarchy,
  wait,
  retry,
} from './utils/test-data-generator';
import { logger } from './utils/logger';
import { CI, Relationship } from '../../packages/common/src/types/ci.types';
import { DiscoveryJob } from '../../packages/common/src/types/discovery.types';

describe('Full Discovery Flow E2E Test', () => {
  let apiClient: ApiClient;
  let dbHelpers: ReturnType<typeof createDatabaseHelpers>;

  // Test timeout: 5 minutes for full workflow
  jest.setTimeout(300000);

  beforeAll(async () => {
    logger.info('========================================');
    logger.info('Initializing E2E Test Suite');
    logger.info('========================================');

    // Create API client
    apiClient = createApiClient({
      baseURL: 'http://localhost:3001',
      timeout: 30000,
      debug: true,
    });

    // Create database helpers
    dbHelpers = createDatabaseHelpers();

    // Verify API is healthy
    const health = await apiClient.healthCheck();
    expect(health.status).toBe('ok');
    logger.success('API server is healthy');
  });

  afterAll(async () => {
    logger.info('Closing database connections...');
    await dbHelpers.neo4j.close();
    await dbHelpers.postgres.close();
    logger.success('E2E Test Suite completed');
  });

  beforeEach(async () => {
    // Clear all test data before each test
    logger.info('Clearing test data...');
    await dbHelpers.neo4j.clearAllData();
    await dbHelpers.postgres.clearAllData();
    logger.success('Test data cleared');
  });

  describe('Discovery Workflow', () => {
    test('should complete full AWS discovery workflow', async () => {
      logger.info('========================================');
      logger.info('Test: Full AWS Discovery Workflow');
      logger.info('========================================');

      // Step 1: Schedule AWS discovery
      logger.info('Step 1: Scheduling AWS discovery job...');
      const discoveryConfig = generateAWSDiscoveryConfig();
      const discoveryJob = await apiClient.scheduleDiscovery('aws', discoveryConfig);

      expect(discoveryJob).toBeDefined();
      expect(discoveryJob.id).toBeDefined();
      expect(discoveryJob.provider).toBe('aws');
      expect(discoveryJob.status).toMatch(/pending|running/);

      logger.success(`Discovery job scheduled: ${discoveryJob.id}`);

      // Step 2: Wait for discovery job to complete
      logger.info('Step 2: Waiting for discovery job to complete...');
      const completedJob = await apiClient.waitForDiscoveryJob(discoveryJob.id, {
        timeout: 120000, // 2 minutes
        interval: 3000,
      });

      expect(completedJob.status).toBe('completed');
      expect(completedJob.completed_at).toBeDefined();
      logger.success('Discovery job completed successfully');

      // Step 3: Verify CIs created in Neo4j
      logger.info('Step 3: Verifying CIs in Neo4j...');
      await wait(2000); // Brief wait for data to settle

      const neo4jCICount = await dbHelpers.neo4j.getCICount();
      expect(neo4jCICount).toBeGreaterThan(0);
      logger.success(`Found ${neo4jCICount} CIs in Neo4j`);

      const virtualMachines = await dbHelpers.neo4j.getCIsByType('virtual-machine');
      expect(virtualMachines.length).toBeGreaterThan(0);
      logger.success(`Found ${virtualMachines.length} virtual machines`);

      // Step 4: Wait for ETL to sync to PostgreSQL
      logger.info('Step 4: Waiting for ETL sync to PostgreSQL...');
      await retry(
        async () => {
          const pgCICount = await dbHelpers.postgres.getCICount();
          if (pgCICount === 0) {
            throw new Error('No CIs synced to PostgreSQL yet');
          }
          expect(pgCICount).toBeGreaterThan(0);
          logger.success(`Found ${pgCICount} CIs in PostgreSQL data mart`);
        },
        { retries: 30, delay: 2000 }
      );

      // Step 5: Verify data in data mart
      logger.info('Step 5: Verifying data consistency...');
      const pgVMs = await dbHelpers.postgres.getCIsByType('virtual-machine');
      expect(pgVMs.length).toBe(virtualMachines.length);
      logger.success('Data mart consistency verified');

      // Step 6: Query API to retrieve discovered CIs
      logger.info('Step 6: Querying API for discovered CIs...');
      const apiResponse = await apiClient.listCIs({
        type: 'virtual-machine',
        limit: 100,
      });

      expect(apiResponse.data).toBeDefined();
      expect(apiResponse.data.length).toBeGreaterThan(0);
      expect(apiResponse.total).toBe(virtualMachines.length);
      logger.success(`API returned ${apiResponse.data.length} CIs`);

      // Verify CI structure
      const firstCI = apiResponse.data[0];
      expect(firstCI).toHaveProperty('id');
      expect(firstCI).toHaveProperty('name');
      expect(firstCI).toHaveProperty('type');
      expect(firstCI).toHaveProperty('status');
      expect(firstCI).toHaveProperty('metadata');

      logger.info('========================================');
      logger.success('Full AWS Discovery Workflow: PASSED');
      logger.info('========================================');
    });
  });

  describe('CI Operations', () => {
    test('should create and manage CI lifecycle', async () => {
      logger.info('Test: CI Lifecycle Management');

      // Create a CI
      const ciInput = {
        id: 'test-ci-001',
        name: 'Test CI',
        type: 'application' as const,
        status: 'active' as const,
        environment: 'test' as const,
        metadata: { test: true },
      };

      const createdCI = await apiClient.createCI(ciInput);
      expect(createdCI.id).toBe(ciInput.id);
      expect(createdCI.name).toBe(ciInput.name);
      logger.success('CI created successfully');

      // Retrieve CI
      const retrievedCI = await apiClient.getCI(ciInput.id);
      expect(retrievedCI.id).toBe(ciInput.id);
      logger.success('CI retrieved successfully');

      // Update CI
      const updatedCI = await apiClient.updateCI(ciInput.id, {
        status: 'maintenance',
      });
      expect(updatedCI.status).toBe('maintenance');
      logger.success('CI updated successfully');

      // Verify in Neo4j
      const neo4jCI = await dbHelpers.neo4j.getCIById(ciInput.id);
      expect(neo4jCI).toBeDefined();
      expect(neo4jCI.status).toBe('maintenance');
      logger.success('CI verified in Neo4j');

      // Delete CI
      await apiClient.deleteCI(ciInput.id);
      logger.success('CI deleted successfully');

      // Verify deletion
      await expect(apiClient.getCI(ciInput.id)).rejects.toThrow();
      logger.success('CI deletion verified');
    });

    test('should search CIs by query', async () => {
      logger.info('Test: CI Search');

      // Create test CIs
      await apiClient.createCI({
        id: 'search-test-001',
        name: 'Production Web Server',
        type: 'server',
        status: 'active',
        environment: 'production',
        metadata: {},
      });

      await apiClient.createCI({
        id: 'search-test-002',
        name: 'Production Database',
        type: 'database',
        status: 'active',
        environment: 'production',
        metadata: {},
      });

      await wait(1000); // Brief wait for indexing

      // Search by name
      const searchResults = await apiClient.searchCIs('Production');
      expect(searchResults.length).toBeGreaterThanOrEqual(2);
      logger.success(`Search returned ${searchResults.length} results`);
    });
  });

  describe('Relationship Operations', () => {
    test('should create and query relationships', async () => {
      logger.info('Test: Relationship Management');

      const { cis, relationships } = generateCIHierarchy();

      // Create all CIs
      logger.info('Creating test hierarchy...');
      for (const ci of cis) {
        await apiClient.createCI(ci);
      }
      logger.success(`Created ${cis.length} CIs`);

      // Create all relationships
      logger.info('Creating relationships...');
      for (const rel of relationships) {
        await apiClient.createRelationship(rel);
      }
      logger.success(`Created ${relationships.length} relationships`);

      // Query relationships for a CI
      const loadBalancerId = cis[0].id;
      const ciRelationships = await apiClient.getRelationships(loadBalancerId);
      expect(ciRelationships.length).toBeGreaterThan(0);
      logger.success(`Found ${ciRelationships.length} relationships`);

      // Verify in Neo4j
      const neo4jRelationships = await dbHelpers.neo4j.getRelationships(loadBalancerId);
      expect(neo4jRelationships.length).toBe(ciRelationships.length);
      logger.success('Relationships verified in Neo4j');
    });
  });

  describe('Impact Analysis', () => {
    test('should perform impact analysis on CI hierarchy', async () => {
      logger.info('Test: Impact Analysis');

      const { cis, relationships } = generateCIHierarchy();

      // Create hierarchy
      logger.info('Creating test hierarchy...');
      for (const ci of cis) {
        await apiClient.createCI(ci);
      }
      for (const rel of relationships) {
        await apiClient.createRelationship(rel);
      }
      logger.success('Hierarchy created');

      await wait(1000); // Wait for graph to update

      // Perform impact analysis on database (bottom of hierarchy)
      const databaseId = cis[5].id; // Last CI is database
      logger.info(`Performing impact analysis on database: ${databaseId}`);

      const impactAnalysis = await apiClient.getImpactAnalysis(databaseId, 3);

      expect(impactAnalysis).toBeDefined();
      expect(impactAnalysis.ci.id).toBe(databaseId);
      expect(impactAnalysis.upstream).toBeDefined();
      expect(impactAnalysis.downstream).toBeDefined();
      expect(impactAnalysis.total_affected).toBeGreaterThan(0);

      logger.success(
        `Impact analysis: ${impactAnalysis.upstream.length} upstream, ` +
        `${impactAnalysis.downstream.length} downstream, ` +
        `${impactAnalysis.total_affected} total affected`
      );

      // Database should have upstream dependencies (apps depend on it)
      expect(impactAnalysis.upstream.length).toBeGreaterThan(0);

      // Perform impact analysis on load balancer (top of hierarchy)
      const loadBalancerId = cis[0].id;
      logger.info(`Performing impact analysis on load balancer: ${loadBalancerId}`);

      const lbImpact = await apiClient.getImpactAnalysis(loadBalancerId, 3);

      // Load balancer should have downstream dependencies
      expect(lbImpact.downstream.length).toBeGreaterThan(0);

      logger.success('Impact analysis completed successfully');
    });
  });

  describe('Data Consistency', () => {
    test('should maintain consistency between Neo4j and PostgreSQL', async () => {
      logger.info('Test: Data Consistency');

      // Create test CIs
      const testCIs = [
        {
          id: 'consistency-test-001',
          name: 'Consistency Test Server 1',
          type: 'server' as const,
          status: 'active' as const,
          environment: 'test' as const,
          metadata: { test: true },
        },
        {
          id: 'consistency-test-002',
          name: 'Consistency Test Server 2',
          type: 'server' as const,
          status: 'active' as const,
          environment: 'test' as const,
          metadata: { test: true },
        },
      ];

      for (const ci of testCIs) {
        await apiClient.createCI(ci);
      }
      logger.success('Test CIs created');

      // Wait for ETL sync
      logger.info('Waiting for ETL sync...');
      await retry(
        async () => {
          const pgCount = await dbHelpers.postgres.getCICount();
          if (pgCount < testCIs.length) {
            throw new Error('ETL not complete');
          }
        },
        { retries: 20, delay: 1000 }
      );

      // Verify consistency
      for (const ci of testCIs) {
        const neo4jCI = await dbHelpers.neo4j.getCIById(ci.id);
        const pgCI = await dbHelpers.postgres.getCIFromDataMart(ci.id);

        expect(neo4jCI).toBeDefined();
        expect(pgCI).toBeDefined();
        expect(neo4jCI.name).toBe(pgCI.name);
        expect(neo4jCI.type).toBe(pgCI.type);
        expect(neo4jCI.status).toBe(pgCI.status);
      }

      logger.success('Data consistency verified across Neo4j and PostgreSQL');
    });
  });

  describe('Discovery Job Management', () => {
    test('should list and manage discovery jobs', async () => {
      logger.info('Test: Discovery Job Management');

      // Schedule multiple discovery jobs
      const jobs: DiscoveryJob[] = [];
      for (let i = 0; i < 3; i++) {
        const config = generateAWSDiscoveryConfig();
        const job = await apiClient.scheduleDiscovery('aws', config);
        jobs.push(job);
      }
      logger.success(`Scheduled ${jobs.length} discovery jobs`);

      // List discovery jobs
      const jobsList = await apiClient.listDiscoveryJobs({
        provider: 'aws',
        limit: 10,
      });

      expect(jobsList.data.length).toBeGreaterThanOrEqual(jobs.length);
      expect(jobsList.total).toBeGreaterThanOrEqual(jobs.length);
      logger.success(`Found ${jobsList.total} total discovery jobs`);

      // Cancel a job (if still running)
      const runningJob = jobsList.data.find(j => j.status === 'pending' || j.status === 'running');
      if (runningJob) {
        await apiClient.cancelDiscoveryJob(runningJob.id);
        logger.success(`Cancelled job: ${runningJob.id}`);
      }
    });
  });
});
