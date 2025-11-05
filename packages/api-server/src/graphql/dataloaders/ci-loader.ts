// packages/api-server/src/graphql/dataloaders/ci-loader.ts

import DataLoader from 'dataloader';
import { Neo4jClient } from '@cmdb/database';
import { CI } from '@cmdb/common';

/**
 * DataLoader for batching and caching CI lookups
 * Prevents N+1 query problem when resolving relationships
 */
export function createCILoader(neo4jClient: Neo4jClient): DataLoader<string, CI | null> {
  return new DataLoader<string, CI | null>(
    async (ids: readonly string[]) => {
      const session = neo4jClient.getSession();

      try {
        const result = await session.run(
          `
          UNWIND $ids AS ciId
          OPTIONAL MATCH (ci:CI {id: ciId})
          RETURN ci, ciId
          ORDER BY ciId
          `,
          { ids: [...ids] }
        );

        // Create a map of results
        const ciMap = new Map<string, CI>();

        result.records.forEach((record: any) => {
          const ciNode = record.get('ci');
          const ciId = record.get('ciId');

          if (ciNode) {
            const props = ciNode.properties;
            const ci: CI = {
              _id: props.id,
              external_id: props.external_id,
              name: props.name,
              _type: props.type,
              _status: props.status,
              environment: props.environment,
              _created_at: props.created_at,
              _updated_at: props.updated_at,
              _discovered_at: props.discovered_at,
              _metadata: props.metadata ? JSON.parse(props.metadata) : {},
            };
            ciMap.set(ciId, ci);
          }
        });

        // Return results in the same order as requested IDs
        return ids.map(id => ciMap.get(id) || null);
      } finally {
        await session.close();
      }
    },
    {
      // Cache configuration
      cacheKeyFn: (key: string) => key,
      // Batch multiple requests in single tick
      batchScheduleFn: (callback: any) => setTimeout(callback, 10),
    }
  );
}

/**
 * DataLoader for batching outgoing relationship lookups
 */
export function createRelationshipLoader(
  neo4jClient: Neo4jClient
): DataLoader<string, any[]> {
  return new DataLoader<string, any[]>(
    async (ids: readonly string[]) => {
      const session = neo4jClient.getSession();

      try {
        const result = await session.run(
          `
          UNWIND $ids AS ciId
          OPTIONAL MATCH (ci:CI {id: ciId})-[r]->(related:CI)
          RETURN ciId, type(r) as relType, related, r as relationship
          ORDER BY ciId
          `,
          { ids: [...ids] }
        );

        // Group relationships by CI ID
        const relationshipMap = new Map<string, any[]>();

        result.records.forEach((record: any) => {
          const ciId = record.get('ciId');
          const relatedNode = record.get('related');
          const relType = record.get('relType');
          const relProps = record.get('relationship');

          if (!relationshipMap.has(ciId)) {
            relationshipMap.set(ciId, []);
          }

          if (relatedNode) {
            const props = relatedNode.properties;
            const relatedCI: CI = {
              _id: props.id,
              external_id: props.external_id,
              name: props.name,
              _type: props.type,
              _status: props.status,
              environment: props.environment,
              _created_at: props.created_at,
              _updated_at: props.updated_at,
              _discovered_at: props.discovered_at,
              _metadata: props.metadata ? JSON.parse(props.metadata) : {},
            };

            relationshipMap.get(ciId)!.push({
              _type: relType,
              _ci: relatedCI,
              _properties: relProps?.properties || {},
            });
          }
        });

        // Return results in order
        return ids.map(id => relationshipMap.get(id) || []);
      } finally {
        await session.close();
      }
    },
    {
      cacheKeyFn: (key: string) => key,
      batchScheduleFn: (callback: any) => setTimeout(callback, 10),
    }
  );
}

/**
 * DataLoader for batching incoming relationship lookups (dependents)
 */
export function createDependentLoader(
  neo4jClient: Neo4jClient
): DataLoader<string, any[]> {
  return new DataLoader<string, any[]>(
    async (ids: readonly string[]) => {
      const session = neo4jClient.getSession();

      try {
        const result = await session.run(
          `
          UNWIND $ids AS ciId
          OPTIONAL MATCH (ci:CI {id: ciId})<-[r]-(related:CI)
          RETURN ciId, type(r) as relType, related, r as relationship
          ORDER BY ciId
          `,
          { ids: [...ids] }
        );

        // Group relationships by CI ID
        const relationshipMap = new Map<string, any[]>();

        result.records.forEach((record: any) => {
          const ciId = record.get('ciId');
          const relatedNode = record.get('related');
          const relType = record.get('relType');
          const relProps = record.get('relationship');

          if (!relationshipMap.has(ciId)) {
            relationshipMap.set(ciId, []);
          }

          if (relatedNode) {
            const props = relatedNode.properties;
            const relatedCI: CI = {
              _id: props.id,
              external_id: props.external_id,
              name: props.name,
              _type: props.type,
              _status: props.status,
              environment: props.environment,
              _created_at: props.created_at,
              _updated_at: props.updated_at,
              _discovered_at: props.discovered_at,
              _metadata: props.metadata ? JSON.parse(props.metadata) : {},
            };

            relationshipMap.get(ciId)!.push({
              _type: relType,
              _ci: relatedCI,
              _properties: relProps?.properties || {},
            });
          }
        });

        // Return results in order
        return ids.map(id => relationshipMap.get(id) || []);
      } finally {
        await session.close();
      }
    },
    {
      cacheKeyFn: (key: string) => key,
      batchScheduleFn: (callback: any) => setTimeout(callback, 10),
    }
  );
}
