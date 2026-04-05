// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

// packages/api-server/src/graphql/index.ts

/**
 * GraphQL API Module Exports
 *
 * This module provides a complete GraphQL API implementation for the CMDB platform.
 * It includes schema definitions, resolvers, DataLoaders, and server configuration.
 */

// Server exports
export {
  createGraphQLServer,
  startGraphQLServer,
  shutdownGraphQLServer,
} from './server';

// Schema exports
export { typeDefs } from './schema/typeDefs';

// Resolver exports
export { resolvers } from './resolvers';
export type { GraphQLContext } from './resolvers';

// DataLoader exports
export { createCILoader, createRelationshipLoader } from './dataloaders/ci-loader';

/**
 * Usage example:
 *
 * import { startGraphQLServer } from '@cmdb/api-server/graphql';
 *
 * // Start standalone GraphQL server
 * const server = await startGraphQLServer(4000);
 *
 * // Or integrate with existing Express app:
 * import express from 'express';
 * import { createGraphQLServer } from '@cmdb/api-server/graphql';
 *
 * const app = express();
 * await createGraphQLServer(app);
 * app.listen(4000);
 */
