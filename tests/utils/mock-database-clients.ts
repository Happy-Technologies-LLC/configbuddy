/**
 * Mock Database Clients
 *
 * TDD London School: Mock external collaborators (databases) to test
 * interactions and verify the contracts between components.
 */

import { jest } from '@jest/globals';

/**
 * Mock Neo4j Driver and Session
 *
 * Mocks the contract between application code and Neo4j driver.
 */
export const createMockNeo4jDriver = () => {
  const mockSession = {
    run: jest.fn(),
    close: jest.fn(),
    beginTransaction: jest.fn(),
    readTransaction: jest.fn(),
    writeTransaction: jest.fn(),
    lastBookmarks: jest.fn(),
  };

  const mockDriver = {
    session: jest.fn().mockReturnValue(mockSession),
    verifyConnectivity: jest.fn(),
    close: jest.fn(),
    getServerInfo: jest.fn(),
  };

  return {
    driver: mockDriver,
    session: mockSession,
  };
};

/**
 * Mock Neo4j Transaction
 */
export const createMockNeo4jTransaction = () => ({
  run: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  isOpen: jest.fn().mockReturnValue(true),
});

/**
 * Mock Neo4j Result
 */
export const createMockNeo4jResult = (records: any[] = []) => {
  const mockRecords = records.map((record) => ({
    get: jest.fn((key: string) => record[key]),
    keys: Object.keys(record),
    length: Object.keys(record).length,
    toObject: () => record,
  }));

  return {
    records: mockRecords,
    summary: {
      counters: {
        nodesCreated: jest.fn().mockReturnValue(0),
        nodesDeleted: jest.fn().mockReturnValue(0),
        relationshipsCreated: jest.fn().mockReturnValue(0),
        relationshipsDeleted: jest.fn().mockReturnValue(0),
        propertiesSet: jest.fn().mockReturnValue(0),
      },
    },
  };
};

/**
 * Mock PostgreSQL Client Pool
 *
 * Mocks the contract between application code and pg client.
 */
export const createMockPostgresPool = () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  const mockPool = {
    connect: jest.fn().mockResolvedValue(mockClient),
    query: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0,
  };

  return {
    pool: mockPool,
    client: mockClient,
  };
};

/**
 * Mock PostgreSQL Query Result
 */
export const createMockPostgresResult = (rows: any[] = []) => ({
  rows,
  rowCount: rows.length,
  command: 'SELECT',
  oid: 0,
  fields: [],
});

/**
 * Mock Redis Client
 *
 * Mocks the contract between application code and Redis client.
 */
export const createMockRedisClient = () => ({
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  keys: jest.fn(),
  mget: jest.fn(),
  mset: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
  hgetall: jest.fn(),
  hdel: jest.fn(),
  sadd: jest.fn(),
  smembers: jest.fn(),
  sismember: jest.fn(),
  srem: jest.fn(),
  zadd: jest.fn(),
  zrange: jest.fn(),
  zrangebyscore: jest.fn(),
  zrem: jest.fn(),
  ping: jest.fn(),
  quit: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  removeListener: jest.fn(),
});

/**
 * Mock BullMQ Queue
 *
 * Mocks the contract for job queue operations.
 */
export const createMockBullMQQueue = (name: string = 'test-queue') => ({
  name,
  add: jest.fn(),
  addBulk: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  getJob: jest.fn(),
  getJobs: jest.fn(),
  getJobCounts: jest.fn(),
  clean: jest.fn(),
  obliterate: jest.fn(),
  close: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  removeListener: jest.fn(),
});

/**
 * Mock BullMQ Worker
 */
export const createMockBullMQWorker = (name: string = 'test-worker') => ({
  name,
  on: jest.fn(),
  once: jest.fn(),
  close: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  removeListener: jest.fn(),
});

/**
 * Mock BullMQ Job
 */
export const createMockBullMQJob = (data: any = {}, id: string = '1') => ({
  id,
  name: 'test-job',
  data,
  opts: {},
  progress: jest.fn(),
  log: jest.fn(),
  updateProgress: jest.fn(),
  remove: jest.fn(),
  retry: jest.fn(),
  discard: jest.fn(),
  moveToCompleted: jest.fn(),
  moveToFailed: jest.fn(),
  attemptsMade: 0,
  finishedOn: null,
  processedOn: null,
  timestamp: Date.now(),
});

/**
 * Combined database mock context for integration testing
 */
export const createMockDatabaseContext = () => {
  const neo4j = createMockNeo4jDriver();
  const postgres = createMockPostgresPool();
  const redis = createMockRedisClient();

  return {
    neo4j,
    postgres,
    redis,
    cleanup: () => {
      neo4j.session.close.mockClear();
      neo4j.driver.close.mockClear();
      postgres.pool.end.mockClear();
      redis.quit.mockClear();
    },
  };
};
