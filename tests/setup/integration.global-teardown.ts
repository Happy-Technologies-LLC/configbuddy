/**
 * Integration Test Global Teardown
 *
 * Stops Testcontainers after all integration tests complete.
 */

export default async function globalTeardown() {
  console.log('Stopping integration test containers...');

  try {
    const neo4jContainer = (global as any).__NEO4J_CONTAINER__;
    const postgresContainer = (global as any).__POSTGRES_CONTAINER__;
    const redisContainer = (global as any).__REDIS_CONTAINER__;

    if (neo4jContainer) {
      await neo4jContainer.stop();
      console.log('Neo4j container stopped');
    }

    if (postgresContainer) {
      await postgresContainer.stop();
      console.log('PostgreSQL container stopped');
    }

    if (redisContainer) {
      await redisContainer.stop();
      console.log('Redis container stopped');
    }

    console.log('All integration test containers stopped successfully');
  } catch (error) {
    console.error('Error stopping integration test containers:', error);
  }
}
