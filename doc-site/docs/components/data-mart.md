---
title: Data Mart
description: PostgreSQL data mart with TimescaleDB for analytics and reporting
---

# Data Mart

PostgreSQL data mart with TimescaleDB for analytics and reporting queries.

## Quick Start

### Check Status
```bash
# Check data mart health
cmdb datamart status

# Check worker status
cmdb worker status
```

### Run ETL Sync
```bash
# Incremental sync (default)
cmdb datamart sync --wait

# Full refresh
cmdb datamart refresh --confirm --wait
```

### View Analytics
```bash
# Dashboard summary
cmdb analytics summary

# CI counts
cmdb analytics by-type
cmdb analytics by-env
```

## CLI Commands

### Analytics Commands

| Command | Description | Example |
|---------|-------------|---------|
| `cmdb analytics summary` | Dashboard overview | `cmdb analytics summary --json` |
| `cmdb analytics by-type` | CI count by type | `cmdb analytics by-type` |
| `cmdb analytics by-env` | CI count by environment | `cmdb analytics by-env` |
| `cmdb analytics changes` | Change history | `cmdb analytics changes --ci-id ci-123 --limit 100` |
| `cmdb analytics relationships` | Relationship stats | `cmdb analytics relationships --limit 20` |
| `cmdb analytics query <type>` | Custom analytics | See below |

**Custom Query Types:**
```bash
# Discovery statistics
cmdb analytics query discovery-stats --start-date 2025-09-01 --end-date 2025-09-30

# Discovery timeline
cmdb analytics query discovery-timeline --interval day --limit 30

# Top connected CIs
cmdb analytics query top-connected --limit 20 --direction both

# Dependency depth analysis
cmdb analytics query dependency-depth --json
```

### Data Mart Commands

| Command | Description | Example |
|---------|-------------|---------|
| `cmdb datamart status` | Health and stats | `cmdb datamart status` |
| `cmdb datamart sync` | Trigger ETL sync | `cmdb datamart sync --incremental --wait` |
| `cmdb datamart reconcile` | Run reconciliation | `cmdb datamart reconcile --strategy neo4j-wins --auto-resolve` |
| `cmdb datamart refresh` | Full refresh | `cmdb datamart refresh --confirm --wait` |
| `cmdb datamart validate` | Validate integrity | `cmdb datamart validate --check-counts --check-relationships` |
| `cmdb datamart job-status <id>` | Check job status | `cmdb datamart job-status abc123` |
| `cmdb datamart jobs` | List recent jobs | `cmdb datamart jobs --status failed --limit 20` |

**Sync Options:**
```bash
# Incremental sync (default)
cmdb datamart sync --incremental

# Sync since specific date
cmdb datamart sync --since 2025-09-30T00:00:00Z

# Sync specific CI types
cmdb datamart sync --types "server,application,database"

# Custom batch size
cmdb datamart sync --batch-size 200

# Wait for completion
cmdb datamart sync --wait
```

**Reconciliation Options:**
```bash
# Manual review (default)
cmdb datamart reconcile

# Auto-resolve with strategy
cmdb datamart reconcile --strategy neo4j-wins --auto-resolve

# Reconcile specific CIs
cmdb datamart reconcile --ci-ids "ci-123,ci-456"

# Check data age
cmdb datamart reconcile --max-age 12
```

**Validation Options:**
```bash
# Check record counts
cmdb datamart validate --check-counts

# Check relationships
cmdb datamart validate --check-relationships

# Check orphaned records
cmdb datamart validate --check-orphans

# All checks
cmdb datamart validate --check-counts --check-relationships --check-orphans
```

## Common SQL Queries

### CI Inventory

**Get CI count by type:**
```sql
SELECT ci_type, COUNT(*) as count
FROM dim_ci
WHERE is_current = TRUE
GROUP BY ci_type
ORDER BY count DESC;
```

**Get CI count by environment:**
```sql
SELECT environment, COUNT(*) as count
FROM dim_ci
WHERE is_current = TRUE AND environment IS NOT NULL
GROUP BY environment
ORDER BY count DESC;
```

**Get CI count by status:**
```sql
SELECT ci_status, COUNT(*) as count
FROM dim_ci
WHERE is_current = TRUE
GROUP BY ci_status
ORDER BY count DESC;
```

### Discovery Analytics

**Get discovery statistics:**
```sql
SELECT
  discovery_provider,
  COUNT(*) as total_discoveries,
  COUNT(DISTINCT ci_key) as unique_cis,
  AVG(confidence_score) as avg_confidence,
  MAX(discovered_at) as last_discovery
FROM fact_discovery
GROUP BY discovery_provider
ORDER BY total_discoveries DESC;
```

**Get discovery timeline (last 30 days):**
```sql
SELECT
  DATE(discovered_at) as date,
  COUNT(*) as discoveries,
  COUNT(DISTINCT ci_key) as unique_cis
FROM fact_discovery
WHERE discovered_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(discovered_at)
ORDER BY date DESC;
```

### Relationship Analytics

**Get relationship counts:**
```sql
SELECT
  relationship_type,
  COUNT(*) as count
FROM fact_relationship
WHERE is_active = TRUE
GROUP BY relationship_type
ORDER BY count DESC;
```

**Get top connected CIs:**
```sql
SELECT
  c.ci_id,
  c.ci_name,
  c.ci_type,
  COUNT(DISTINCT r1.relationship_id) + COUNT(DISTINCT r2.relationship_id) as total_connections
FROM dim_ci c
LEFT JOIN fact_relationship r1 ON c.ci_key = r1.from_ci_key
LEFT JOIN fact_relationship r2 ON c.ci_key = r2.to_ci_key
WHERE c.is_current = TRUE
GROUP BY c.ci_id, c.ci_name, c.ci_type
ORDER BY total_connections DESC
LIMIT 10;
```

**Get dependency depth (recursive):**
```sql
WITH RECURSIVE dependency_tree AS (
  SELECT
    from_ci_key as ci_key,
    to_ci_key,
    1 as depth
  FROM fact_relationship
  WHERE relationship_type = 'DEPENDS_ON' AND is_active = TRUE

  UNION ALL

  SELECT
    dt.ci_key,
    r.to_ci_key,
    dt.depth + 1
  FROM dependency_tree dt
  JOIN fact_relationship r ON dt.to_ci_key = r.from_ci_key
  WHERE r.relationship_type = 'DEPENDS_ON' AND r.is_active = TRUE AND dt.depth < 10
)
SELECT
  c.ci_id,
  c.ci_name,
  MAX(dt.depth) as max_depth,
  COUNT(DISTINCT dt.to_ci_key) as total_dependencies
FROM dependency_tree dt
JOIN dim_ci c ON dt.ci_key = c.ci_key
WHERE c.is_current = TRUE
GROUP BY c.ci_id, c.ci_name
ORDER BY max_depth DESC, total_dependencies DESC
LIMIT 20;
```

### Change Analytics

**Get recent changes:**
```sql
SELECT
  c.ci_id,
  c.ci_name,
  ch.change_type,
  ch.field_name,
  ch.old_value,
  ch.new_value,
  ch.changed_at,
  ch.changed_by
FROM fact_ci_changes ch
JOIN dim_ci c ON ch.ci_key = c.ci_key
WHERE ch.changed_at >= NOW() - INTERVAL '7 days'
ORDER BY ch.changed_at DESC
LIMIT 100;
```

**Get change frequency by CI type:**
```sql
SELECT
  c.ci_type,
  DATE(ch.changed_at) as date,
  COUNT(*) as change_count
FROM fact_ci_changes ch
JOIN dim_ci c ON ch.ci_key = c.ci_key
WHERE ch.changed_at >= NOW() - INTERVAL '30 days'
  AND c.is_current = TRUE
GROUP BY c.ci_type, DATE(ch.changed_at)
ORDER BY date DESC, change_count DESC;
```

### SCD Type 2 Queries

**Get CI history (all versions):**
```sql
SELECT
  ci_key,
  ci_name,
  ci_type,
  ci_status,
  environment,
  effective_from,
  effective_to,
  is_current
FROM dim_ci
WHERE ci_id = 'ci-123'
ORDER BY effective_from DESC;
```

**Get CIs that changed today:**
```sql
SELECT
  ci_id,
  ci_name,
  ci_type,
  effective_from
FROM dim_ci
WHERE DATE(effective_from) = CURRENT_DATE
  AND is_current = TRUE
ORDER BY effective_from DESC;
```

**Get CI as of specific date (point-in-time query):**
```sql
SELECT
  ci_id,
  ci_name,
  ci_type,
  ci_status,
  environment
FROM dim_ci
WHERE ci_id = 'ci-123'
  AND effective_from <= '2025-09-15'
  AND (effective_to IS NULL OR effective_to > '2025-09-15')
LIMIT 1;
```

## REST API Examples

**Base URL:** `http://localhost:3000/api/v1`

### Analytics Endpoints

**Get CI counts by type:**
```bash
curl http://localhost:3000/api/v1/analytics/ci-counts
```

**Get dashboard summary:**
```bash
curl http://localhost:3000/api/v1/analytics/dashboard
```

**Get discovery timeline:**
```bash
curl "http://localhost:3000/api/v1/analytics/discovery-timeline?interval=day&limit=30"
```

**Get top connected CIs:**
```bash
curl "http://localhost:3000/api/v1/analytics/top-connected?limit=20&direction=both"
```

### Data Mart Endpoints

**Get data mart health:**
```bash
curl http://localhost:3000/api/v1/datamart/health
```

**Trigger ETL sync:**
```bash
curl -X POST http://localhost:3000/api/v1/datamart/sync \
  -H "Content-Type: application/json" \
  -d '{
    "batchSize": 100,
    "fullRefresh": false,
    "ciTypes": ["server", "application"]
  }'
```

**Run reconciliation:**
```bash
curl -X POST http://localhost:3000/api/v1/datamart/reconcile \
  -H "Content-Type: application/json" \
  -d '{
    "conflictStrategy": "neo4j-wins",
    "autoResolve": true,
    "maxAgeHours": 24
  }'
```

**Validate data integrity:**
```bash
curl "http://localhost:3000/api/v1/datamart/validate?checkCounts=true&checkRelationships=true"
```

## GraphQL Examples

**Endpoint:** `http://localhost:3000/graphql`

### Dashboard Summary

```graphql
query DashboardSummary {
  analytics {
    getDashboardStats {
      summary {
        totalCis
        uniqueTypes
        uniqueEnvironments
        totalRelationships
        recentDiscoveries24h
      }
      breakdown {
        byType {
          ciType
          count
        }
        byStatus {
          status
          count
        }
        byEnvironment {
          environment
          count
        }
      }
    }
  }
}
```

### Discovery Analytics

```graphql
query DiscoveryAnalytics {
  analytics {
    getDiscoveryStats(startDate: "2025-09-01", endDate: "2025-09-30") {
      summary {
        totalCis
        uniqueTypes
        firstDiscovery
        lastDiscovery
      }
      byProvider {
        discoveryProvider
        count
      }
    }

    getDiscoveryTimeline(interval: DAY, limit: 30) {
      period
      count
      uniqueTypes
    }
  }
}
```

### Relationship Analytics

```graphql
query RelationshipAnalytics {
  analytics {
    getRelationshipCounts {
      relationshipType
      count
    }

    getTopConnectedCIs(limit: 10, direction: BOTH) {
      ciId
      ciName
      ciType
      relationshipCount
    }

    getDependencyDepthStats {
      topCis {
        ciId
        maxDepth
        totalDependencies
      }
      depthDistribution {
        maxDepth
        count
      }
    }
  }
}
```

## Troubleshooting

### ETL sync failing
```bash
# Check Neo4j connectivity
cmdb health check

# Reduce batch size
cmdb datamart sync --batch-size 50

# Check logs
cmdb jobs logs <job-id>
```

### Data inconsistencies
```bash
# Run validation
cmdb datamart validate --check-counts --check-relationships

# Run reconciliation
cmdb datamart reconcile --auto-resolve --strategy neo4j-wins

# Last resort: full refresh
cmdb datamart refresh --confirm --wait
```

### Slow analytics queries
```sql
-- Check for missing indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Update statistics
ANALYZE dim_ci;
ANALYZE fact_discovery;
ANALYZE fact_relationship;
ANALYZE fact_ci_changes;

-- Rebuild indexes
REINDEX TABLE dim_ci;
REINDEX TABLE fact_discovery;
```

## Performance Tuning

### PostgreSQL Configuration

**Optimize for analytics:**
```sql
-- Increase work memory
SET work_mem = '256MB';

-- Enable parallel queries
SET max_parallel_workers_per_gather = 4;

-- Increase shared buffers
ALTER SYSTEM SET shared_buffers = '4GB';

-- Reload configuration
SELECT pg_reload_conf();
```

### Index Optimization

**Check index usage:**
```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

**View slow queries:**
```sql
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Environment Variables

**PostgreSQL Data Mart:**
```bash
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_DB=cmdb_datamart
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_POOL_MIN=5
POSTGRES_POOL_MAX=20
```

**ETL Configuration:**
```bash
ETL_SYNC_INTERVAL_MINUTES=5
ETL_CHANGE_DETECTION_INTERVAL_MINUTES=10
ETL_RECONCILIATION_INTERVAL_MINUTES=60
ETL_FULL_REFRESH_CRON="0 2 * * *"
ETL_BATCH_SIZE=100
ETL_MAX_RETRIES=3
```

**Analytics Configuration:**
```bash
ANALYTICS_CACHE_TTL_SECONDS=300
ANALYTICS_MAX_QUERY_ROWS=10000
ANALYTICS_ENABLE_CUSTOM_QUERIES=true
```

**TimescaleDB:**
```bash
TIMESCALEDB_ENABLED=true
TIMESCALEDB_CHUNK_INTERVAL="1 day"
```

## Quick Tips

1. **Always run incremental sync first** - Only use full refresh when necessary
2. **Monitor ETL job duration** - Set up alerts for jobs exceeding expected time
3. **Run reconciliation daily** - Catch inconsistencies early
4. **Use date filters in analytics** - Always specify date ranges to limit result sets
5. **Cache frequently accessed analytics** - Set appropriate TTL values
6. **Update statistics weekly** - Keep query planner accurate
7. **Validate after major changes** - Run validation after full refresh or schema changes
8. **Export dashboards as JSON** - Use `--json` flag for integration with other tools

## See Also

- [BullMQ Queue Management](/components/bullmq)
- [CLI Commands Reference](/quick-reference/cli-commands)
- [Environment Variables](/configuration/environment-variables)
- [Troubleshooting Guide](/operations/troubleshooting)
