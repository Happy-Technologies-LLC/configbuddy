/**
 * Relationship Type Definitions
 *
 * This module contains TypeScript types and interfaces for relationships between
 * configuration items. Relationships model the connections and dependencies
 * between different components in the CMDB.
 */

import { RelationshipType } from './ci.types';

/**
 * Relationship Details - Extended relationship information with metadata
 */
export interface RelationshipDetails {
  /** Unique identifier for the relationship */
  id?: string;
  /** Source CI identifier */
  _from_id: string;
  /** Target CI identifier */
  _to_id: string;
  /** Type of relationship */
  _type: RelationshipType;
  /** Additional relationship properties */
  properties?: Record<string, any>;
  /** Timestamp when relationship was created */
  created_at?: string;
  /** Timestamp when relationship was last updated */
  updated_at?: string;
  /** Whether the relationship is currently active */
  is_active?: boolean;
}

/**
 * Relationship Input - Data transfer object for creating/updating relationships
 */
export interface RelationshipInput {
  /** Source CI identifier */
  _from_id: string;
  /** Target CI identifier */
  _to_id: string;
  /** Type of relationship */
  _type: RelationshipType;
  /** Additional relationship properties */
  properties?: Record<string, any>;
}

/**
 * Relationship Query - Parameters for querying relationships
 */
export interface RelationshipQuery {
  /** CI identifier to query relationships for */
  _ci_id: string;
  /** Direction of relationships to include */
  direction?: 'in' | 'out' | 'both';
  /** Filter by relationship type */
  type?: RelationshipType;
  /** Maximum depth for traversal */
  depth?: number;
  /** Include only active relationships */
  active_only?: boolean;
}

/**
 * Dependency Path - Represents a dependency chain between CIs
 */
export interface DependencyPath {
  /** Source CI identifier */
  _source_id: string;
  /** Target CI identifier */
  _target_id: string;
  /** List of CIs in the dependency path */
  _path: string[];
  /** Total distance/hops in the path */
  _distance: number;
  /** List of relationship types in the path */
  _relationship_types: RelationshipType[];
}

/**
 * Impact Analysis Result - Results of impact analysis for a CI
 */
export interface ImpactAnalysisResult {
  /** CI being analyzed */
  _ci_id: string;
  /** List of impacted CIs */
  _impacted_cis: ImpactedCI[];
  /** Total number of impacted CIs */
  _total_impacted: number;
  /** Maximum impact distance */
  _max_distance: number;
}

/**
 * Impacted CI - CI affected by changes to another CI
 */
export interface ImpactedCI {
  /** Identifier of the impacted CI */
  _ci_id: string;
  /** Name of the impacted CI */
  _ciname: string;
  /** Type of the impacted CI */
  _ci_type: string;
  /** Distance from source CI */
  _distance: number;
  /** Path of relationships to this CI */
  _path: RelationshipType[];
}
