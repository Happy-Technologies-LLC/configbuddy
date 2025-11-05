// ============================================
// Neo4j Schema for HappyConfig CMDB
// ============================================
// This script creates all constraints, indexes, and full-text search
// capabilities for the CMDB graph database.
//
// IMPORTANT: This script is idempotent - safe to run multiple times.
// All statements use "IF NOT EXISTS" to prevent errors on re-runs.

// ============================================
// CONSTRAINTS - Uniqueness and Data Integrity
// ============================================

// Unique constraint on CI.id (primary identifier)
CREATE CONSTRAINT ci_id_unique IF NOT EXISTS
FOR (c:CI)
REQUIRE c.id IS UNIQUE;

// Unique constraint on CI.external_id (source system identifier)
// Only enforced when external_id is not null
CREATE CONSTRAINT ci_external_id_unique IF NOT EXISTS
FOR (c:CI)
REQUIRE c.external_id IS UNIQUE;

// ============================================
// INDEXES - Query Performance Optimization
// ============================================

// Index on CI.type for fast filtering by CI type
CREATE INDEX ci_type_idx IF NOT EXISTS
FOR (c:CI)
ON (c.type);

// Index on CI.status for filtering by operational status
CREATE INDEX ci_status_idx IF NOT EXISTS
FOR (c:CI)
ON (c.status);

// Index on CI.environment for filtering by deployment environment
CREATE INDEX ci_environment_idx IF NOT EXISTS
FOR (c:CI)
ON (c.environment);

// Index on CI.name for fast name-based lookups
CREATE INDEX ci_name_idx IF NOT EXISTS
FOR (c:CI)
ON (c.name);

// Index on CI.created_at for temporal queries
CREATE INDEX ci_created_at_idx IF NOT EXISTS
FOR (c:CI)
ON (c.created_at);

// Index on CI.updated_at for finding recently modified CIs
CREATE INDEX ci_updated_at_idx IF NOT EXISTS
FOR (c:CI)
ON (c.updated_at);

// Composite index on (type, status) for common query patterns
CREATE INDEX ci_type_status_idx IF NOT EXISTS
FOR (c:CI)
ON (c.type, c.status);

// Composite index on (environment, status) for env-specific queries
CREATE INDEX ci_env_status_idx IF NOT EXISTS
FOR (c:CI)
ON (c.environment, c.status);

// ============================================
// FULL-TEXT SEARCH INDEXES
// ============================================

// Full-text search index on CI.name and metadata for search functionality
CREATE FULLTEXT INDEX ci_fulltext_idx IF NOT EXISTS
FOR (c:CI)
ON EACH [c.name];

// ============================================
// RELATIONSHIP TYPE INDEXES (Neo4j 5.x)
// ============================================

// Index on DEPENDS_ON relationships for fast dependency traversal
CREATE INDEX depends_on_idx IF NOT EXISTS
FOR ()-[r:DEPENDS_ON]-()
ON (r.created_at);

// Index on HOSTS relationships
CREATE INDEX hosts_idx IF NOT EXISTS
FOR ()-[r:HOSTS]-()
ON (r.created_at);

// Index on CONNECTS_TO relationships for network topology queries
CREATE INDEX connects_to_idx IF NOT EXISTS
FOR ()-[r:CONNECTS_TO]-()
ON (r.created_at);

// ============================================
// SPECIALIZED CI TYPE LABELS
// ============================================
// Note: These are not constraints, just documentation
// Each CI will have multiple labels: CI + specific type
//
// Supported labels:
// - :Server
// - :VirtualMachine
// - :Container
// - :Application
// - :Service
// - :Database
// - :NetworkDevice
// - :Storage
// - :LoadBalancer
// - :CloudResource

// ============================================
// RELATIONSHIP TYPES
// ============================================
// Note: This is documentation - Neo4j doesn't require relationship type declaration
//
// Supported relationship types:
// - DEPENDS_ON: CI depends on another CI
// - HOSTS: CI hosts another CI (e.g., server hosts application)
// - CONNECTS_TO: Network connection between CIs
// - USES: CI uses another CI (e.g., application uses database)
// - OWNED_BY: Ownership relationship
// - PART_OF: Component/composition relationship
// - LOCATED_IN: Physical or logical location
// - DEPLOYED_ON: Deployment relationship
// - BACKED_UP_BY: Backup relationship

// ============================================
// END OF SCHEMA DEFINITION
// ============================================
