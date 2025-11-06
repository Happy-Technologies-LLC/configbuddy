# ConfigBuddy v3.0 Troubleshooting Guide

Comprehensive troubleshooting guide for ConfigBuddy v3.0, covering all components, services, and common issues.

## Table of Contents

- [General Troubleshooting](#general-troubleshooting)
- [ITIL Service Manager Issues](#itil-service-manager-issues)
- [TBM Cost Engine Issues](#tbm-cost-engine-issues)
- [BSM Impact Engine Issues](#bsm-impact-engine-issues)
- [AI Discovery Issues](#ai-discovery-issues)
- [AI/ML Engine Issues](#aiml-engine-issues)
- [Event Streaming Issues](#event-streaming-issues)
- [Dashboard Issues](#dashboard-issues)
- [Metabase Issues](#metabase-issues)
- [Performance Issues](#performance-issues)

---

## General Troubleshooting

### Docker Containers Not Starting

**Symptoms:**
- Container exits immediately after `docker-compose up`
- Container status shows `Exited (1)` or `Restarting`
- Logs show connection errors or missing environment variables

**Root Cause:**
- Missing or invalid environment variables
- Database not ready before application starts
- Port conflicts with existing services
- Insufficient resources (memory, disk)

**Diagnosis Steps:**

1. **Check container status:**
```bash
docker ps -a | grep cmdb
```

2. **View container logs:**
```bash
docker logs cmdb-api-server --tail=100
docker logs cmdb-neo4j --tail=100
docker logs cmdb-postgres --tail=100
```

3. **Check environment variables:**
```bash
docker exec cmdb-api-server env | grep -E "(NEO4J|POSTGRES|REDIS)"
```

4. **Check resource usage:**
```bash
docker stats --no-stream
```

**Solution:**

**1. Missing environment variables:**
```bash
# Check .env file exists
ls -la .env

# Validate required variables
grep -E "^(NEO4J_URI|POSTGRES_HOST|REDIS_HOST)" .env

# Reload environment and restart
docker-compose -f infrastructure/docker/docker-compose.yml down
docker-compose -f infrastructure/docker/docker-compose.yml up -d
```

**2. Database connection timing:**
```yaml
# Add depends_on with health checks to docker-compose.yml
services:
  api-server:
    depends_on:
      neo4j:
        condition: service_healthy
      postgres:
        condition: service_healthy
    restart: on-failure
```

**3. Port conflicts:**
```bash
# Check if port is in use
sudo lsof -i :3000
sudo lsof -i :7687

# Change port in .env or docker-compose.yml
API_PORT=3001
```

**4. Resource constraints:**
```bash
# Check available resources
df -h                    # Disk space
free -h                  # Memory

# Increase Docker resources (Docker Desktop)
# Settings → Resources → Advanced → Memory: 8GB
```

**Prevention:**
- Use health checks in `docker-compose.yml`
- Implement startup delays with `wait-for-it.sh`
- Monitor resource usage with Prometheus
- Use `.env.example` as template for required variables

---

### Database Connection Issues

**Symptoms:**
- "Connection refused" errors in application logs
- "ECONNREFUSED" or "Connection timeout" errors
- Neo4j queries fail with "ServiceUnavailable" error
- PostgreSQL queries fail with "connection terminated"

**Root Cause:**
- Database service not running
- Incorrect connection credentials
- Network isolation between containers
- Database resource exhaustion (connections, memory)

**Diagnosis Steps:**

1. **Check database services:**
```bash
docker ps | grep -E "(neo4j|postgres|redis)"
```

2. **Test connectivity from container:**
```bash
# Test Neo4j
docker exec cmdb-api-server curl -v bolt://cmdb-neo4j:7687

# Test PostgreSQL
docker exec cmdb-api-server pg_isready -h cmdb-postgres -p 5432 -U cmdb_user

# Test Redis
docker exec cmdb-api-server redis-cli -h cmdb-redis ping
```

3. **Check database logs:**
```bash
docker logs cmdb-neo4j --tail=100
docker logs cmdb-postgres --tail=100
docker logs cmdb-redis --tail=100
```

4. **Check connection pool status:**
```bash
# Neo4j active connections
docker exec cmdb-neo4j cypher-shell "CALL dbms.listConnections()"

# PostgreSQL active connections
docker exec cmdb-postgres psql -U cmdb_user -d cmdb -c \
  "SELECT count(*) FROM pg_stat_activity WHERE datname='cmdb';"
```

**Solution:**

**1. Restart database services:**
```bash
docker-compose -f infrastructure/docker/docker-compose.yml restart neo4j postgres redis
```

**2. Verify connection strings:**
```bash
# Check environment variables
docker exec cmdb-api-server env | grep -E "(NEO4J|POSTGRES|REDIS)"

# Should be:
# NEO4J_URI=bolt://cmdb-neo4j:7687 (container name, not localhost!)
# POSTGRES_HOST=cmdb-postgres
# REDIS_HOST=cmdb-redis
```

**3. Fix network isolation:**
```bash
# Check containers are on same network
docker network inspect cmdb-network

# Recreate network if needed
docker-compose -f infrastructure/docker/docker-compose.yml down
docker network rm cmdb-network
docker-compose -f infrastructure/docker/docker-compose.yml up -d
```

**4. Increase connection pool:**
```bash
# .env file
NEO4J_MAX_POOL_SIZE=100
POSTGRES_MAX_POOL_SIZE=20

# Restart services
docker-compose -f infrastructure/docker/docker-compose.yml restart api-server
```

**Prevention:**
- Use container names (not `localhost`) in connection strings
- Implement connection pooling with limits
- Set up database connection health checks
- Monitor connection pool usage with metrics

---

### Service Health Check Failures

**Symptoms:**
- Container marked as "unhealthy" in `docker ps`
- Load balancer removes service from rotation
- Kubernetes pod in `CrashLoopBackOff` state
- Health check endpoint returns 503 or times out

**Root Cause:**
- Health check endpoint not implemented
- Database dependencies not ready
- Health check timeout too short
- Resource exhaustion (CPU, memory)

**Diagnosis Steps:**

1. **Check health status:**
```bash
# Docker health status
docker inspect cmdb-api-server | jq '.[0].State.Health'

# Manual health check
curl -v http://localhost:3000/health
curl -v http://localhost:3000/health/ready
```

2. **Check health check logs:**
```bash
# View last 5 health check results
docker inspect cmdb-api-server | jq '.[0].State.Health.Log | .[-5:]'
```

3. **Check dependencies:**
```bash
# Test database connectivity
curl http://localhost:3000/health/ready

# Check Redis
docker exec cmdb-redis redis-cli ping

# Check Neo4j
docker exec cmdb-neo4j cypher-shell "RETURN 1"
```

**Solution:**

**1. Implement health checks:**
```typescript
// packages/api-server/src/routes/health.routes.ts
import { Router } from 'express';
import { getNeo4jClient } from '@cmdb/database';
import { getPostgresClient } from '@cmdb/database';
import { getRedisClient } from '@cmdb/database';

const router = Router();

// Liveness check (service is running)
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness check (service is ready to accept traffic)
router.get('/health/ready', async (req, res) => {
  const checks = {
    neo4j: false,
    postgres: false,
    redis: false
  };

  try {
    // Check Neo4j
    const neo4j = getNeo4jClient();
    await neo4j.verifyConnectivity();
    checks.neo4j = true;

    // Check PostgreSQL
    const postgres = getPostgresClient();
    await postgres.query('SELECT 1');
    checks.postgres = true;

    // Check Redis
    const redis = getRedisClient();
    await redis.ping();
    checks.redis = true;

    if (checks.neo4j && checks.postgres && checks.redis) {
      res.status(200).json({ status: 'ready', checks });
    } else {
      res.status(503).json({ status: 'not_ready', checks });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      checks,
      error: error.message
    });
  }
});

export default router;
```

**2. Configure health checks in Docker:**
```yaml
# infrastructure/docker/docker-compose.yml
services:
  api-server:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health/ready"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

**3. Increase timeout:**
```yaml
healthcheck:
  timeout: 15s      # Increase from 10s
  start_period: 60s # Increase startup grace period
```

**Prevention:**
- Implement both liveness and readiness checks
- Check all critical dependencies in readiness probe
- Set appropriate timeout and retry values
- Monitor health check failures with alerts

---

## ITIL Service Manager Issues

### Incident Priority Calculation Errors

**Symptoms:**
- Incidents assigned incorrect priority (e.g., P1 instead of P3)
- Priority not updating based on impact/urgency changes
- Priority calculation API returns 500 error
- Incidents stuck in "pending priority calculation" state

**Root Cause:**
- Missing impact or urgency values
- Invalid priority matrix configuration
- BSM Impact Engine not responding
- Database constraint violations

**Diagnosis Steps:**

1. **Check incident priority:**
```bash
# Query incident
curl http://localhost:3000/api/v1/itil/incidents/INC0012345 | jq '.priority'

# Check priority calculation
curl -X POST http://localhost:3000/api/v1/itil/incidents/INC0012345/recalculate-priority
```

2. **View priority matrix:**
```bash
curl http://localhost:3000/api/v1/itil/config/priority-matrix | jq .
```

3. **Check BSM Impact Engine:**
```bash
# Test impact calculation
curl -X POST http://localhost:3000/api/v1/bsm/calculate-impact \
  -H "Content-Type: application/json" \
  -d '{"ci_id": "ci_12345"}'
```

4. **Check logs:**
```bash
docker logs cmdb-api-server | grep "Priority calculation failed"
```

**Solution:**

**1. Validate incident data:**
```sql
-- Check for missing values
SELECT incident_id, impact, urgency, priority
FROM itil_incidents
WHERE impact IS NULL OR urgency IS NULL;

-- Set default values
UPDATE itil_incidents
SET impact = 'medium', urgency = 'medium'
WHERE impact IS NULL OR urgency IS NULL;
```

**2. Fix priority matrix:**
```bash
# Reset to default matrix
curl -X POST http://localhost:3000/api/v1/itil/config/priority-matrix/reset

# Or update specific mapping
curl -X PUT http://localhost:3000/api/v1/itil/config/priority-matrix \
  -H "Content-Type: application/json" \
  -d '{
    "high_high": "P1",
    "high_medium": "P2",
    "high_low": "P3",
    "medium_high": "P2",
    "medium_medium": "P3",
    "medium_low": "P4",
    "low_high": "P3",
    "low_medium": "P4",
    "low_low": "P5"
  }'
```

**3. Recalculate priorities:**
```bash
# Bulk recalculation
curl -X POST http://localhost:3000/api/v1/itil/incidents/recalculate-priorities \
  -H "Content-Type: application/json" \
  -d '{"status": "open"}'
```

**Prevention:**
- Set default impact/urgency values for new incidents
- Validate priority matrix on startup
- Implement priority calculation retries with exponential backoff
- Add monitoring alert for priority calculation failures

---

### Change Risk Assessment Failures

**Symptoms:**
- Change requests show "Risk assessment pending" indefinitely
- Risk score is `null` or incorrect
- CAB approval workflow blocked due to missing risk assessment
- Risk calculation API times out

**Root Cause:**
- BSM Impact Engine unavailable
- Missing CI criticality scores
- Blast radius calculation timeout (>5 min)
- Relationship graph incomplete

**Diagnosis Steps:**

1. **Check change risk:**
```bash
# Get change request
curl http://localhost:3000/api/v1/itil/changes/CHG0012345 | jq '.risk'

# Trigger risk assessment
curl -X POST http://localhost:3000/api/v1/itil/changes/CHG0012345/assess-risk
```

2. **Check BSM Impact Engine:**
```bash
# Test blast radius calculation
curl -X POST http://localhost:3000/api/v1/bsm/blast-radius \
  -H "Content-Type: application/json" \
  -d '{"ci_id": "ci_12345", "max_depth": 3}'
```

3. **Check CI criticality:**
```bash
# Query CI criticality
curl http://localhost:3000/api/v1/bsm/criticality/ci_12345
```

4. **Check timeout errors:**
```bash
docker logs cmdb-api-server | grep "Risk assessment timeout"
```

**Solution:**

**1. Restart BSM Impact Engine:**
```bash
# Check if BSM service is running
curl http://localhost:3000/api/v1/bsm/health

# Restart if needed
docker-compose -f infrastructure/docker/docker-compose.yml restart api-server
```

**2. Calculate missing criticality scores:**
```bash
# Bulk criticality calculation
curl -X POST http://localhost:3000/api/v1/bsm/calculate-criticality \
  -H "Content-Type: application/json" \
  -d '{"ci_types": ["server", "application", "database"]}'
```

**3. Increase blast radius timeout:**
```bash
# .env
BSM_BLAST_RADIUS_TIMEOUT_MS=300000  # 5 minutes

# Restart
docker-compose -f infrastructure/docker/docker-compose.yml restart api-server
```

**4. Retry failed assessments:**
```bash
# Retry all pending risk assessments
curl -X POST http://localhost:3000/api/v1/itil/changes/retry-risk-assessments
```

**Prevention:**
- Pre-calculate CI criticality scores nightly
- Implement caching for blast radius results (TTL: 1 hour)
- Set blast radius max depth limit (default: 3)
- Monitor BSM Impact Engine health

---

### Baseline Drift Detection Issues

**Symptoms:**
- Drift detection not running on schedule
- CIs show "Never scanned" for baseline status
- Drift reports show no changes despite known configuration changes
- Drift detection job fails with timeout

**Root Cause:**
- Discovery not collecting baseline attributes
- Baseline snapshot not saved
- Comparison logic bug (ignoring changed fields)
- BullMQ queue stalled

**Diagnosis Steps:**

1. **Check drift detection status:**
```bash
# View drift detection schedule
curl http://localhost:3000/api/v1/itil/drift-detection/schedules

# Check last scan time
curl http://localhost:3000/api/v1/itil/drift-detection/status/ci_12345
```

2. **Check baseline snapshots:**
```sql
-- Query baseline snapshots
SELECT ci_id, snapshot_date, attribute_count
FROM itil_baselines
ORDER BY snapshot_date DESC
LIMIT 10;
```

3. **Check BullMQ queue:**
```bash
# View drift detection queue
curl http://localhost:3000/api/v1/bullmq/queues/drift-detection
```

4. **Test drift detection manually:**
```bash
curl -X POST http://localhost:3000/api/v1/itil/drift-detection/scan \
  -H "Content-Type: application/json" \
  -d '{"ci_id": "ci_12345"}'
```

**Solution:**

**1. Create baseline snapshots:**
```bash
# Create baseline for specific CI
curl -X POST http://localhost:3000/api/v1/itil/baselines \
  -H "Content-Type: application/json" \
  -d '{
    "ci_id": "ci_12345",
    "snapshot_type": "manual",
    "notes": "Initial baseline"
  }'

# Bulk baseline creation
curl -X POST http://localhost:3000/api/v1/itil/baselines/bulk \
  -H "Content-Type: application/json" \
  -d '{"ci_types": ["server", "database"]}'
```

**2. Fix drift detection schedule:**
```bash
# Update schedule
curl -X PUT http://localhost:3000/api/v1/itil/drift-detection/schedules/default \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Drift Scan",
    "cron": "0 2 * * *",
    "ci_types": ["server", "database", "application"],
    "enabled": true
  }'
```

**3. Clear stalled queue:**
```bash
# Clean BullMQ queue
curl -X POST http://localhost:3000/api/v1/bullmq/queues/drift-detection/clean \
  -H "Content-Type: application/json" \
  -d '{"status": "failed", "grace": 3600000}'

# Resume queue
curl -X POST http://localhost:3000/api/v1/bullmq/queues/drift-detection/resume
```

**4. Re-run drift detection:**
```bash
# Trigger immediate scan
curl -X POST http://localhost:3000/api/v1/itil/drift-detection/scan-all \
  -H "Content-Type: application/json" \
  -d '{"ci_types": ["server"]}'
```

**Prevention:**
- Create initial baselines during discovery
- Schedule drift detection during off-peak hours
- Implement drift detection timeout (default: 10 minutes)
- Monitor drift detection job success rate

---

### SLA Targets Not Assigned

**Symptoms:**
- Incidents/changes show "No SLA assigned"
- SLA breach time is `null`
- SLA timers not counting down
- SLA compliance reports show 0% coverage

**Root Cause:**
- SLA policy not configured
- CI assignment rules missing
- Priority/category not matching SLA criteria
- SLA engine service not running

**Diagnosis Steps:**

1. **Check SLA assignment:**
```bash
# View incident SLA
curl http://localhost:3000/api/v1/itil/incidents/INC0012345/sla

# Check SLA policies
curl http://localhost:3000/api/v1/itil/sla-policies
```

2. **Check SLA matching rules:**
```sql
-- View SLA policies
SELECT name, priority, category, response_time_minutes, resolution_time_minutes
FROM itil_sla_policies
WHERE active = true;
```

3. **Test SLA matching:**
```bash
curl -X POST http://localhost:3000/api/v1/itil/sla-policies/match \
  -H "Content-Type: application/json" \
  -d '{
    "priority": "P1",
    "category": "infrastructure",
    "ci_id": "ci_12345"
  }'
```

**Solution:**

**1. Create SLA policies:**
```bash
# Create P1 SLA
curl -X POST http://localhost:3000/api/v1/itil/sla-policies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "P1 Critical Incidents",
    "priority": "P1",
    "response_time_minutes": 15,
    "resolution_time_minutes": 240,
    "active": true
  }'

# Create P2 SLA
curl -X POST http://localhost:3000/api/v1/itil/sla-policies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "P2 High Incidents",
    "priority": "P2",
    "response_time_minutes": 60,
    "resolution_time_minutes": 480,
    "active": true
  }'
```

**2. Assign SLAs to existing incidents:**
```bash
# Bulk SLA assignment
curl -X POST http://localhost:3000/api/v1/itil/incidents/assign-slas \
  -H "Content-Type: application/json" \
  -d '{"status": "open"}'
```

**3. Enable SLA engine:**
```bash
# .env
ITIL_SLA_ENGINE_ENABLED=true
ITIL_SLA_CHECK_INTERVAL_MS=60000  # Check every minute

# Restart
docker-compose -f infrastructure/docker/docker-compose.yml restart api-server
```

**Prevention:**
- Create default SLA policies during initial setup
- Validate SLA assignment on incident creation
- Implement SLA breach alerts
- Monitor SLA compliance with dashboards

---

## TBM Cost Engine Issues

### Tower Mapping Failures

**Symptoms:**
- CIs show "Unmapped" in cost tower assignment
- Cost allocation reports missing CIs
- Tower totals don't match expected values
- Manual tower assignment not persisting

**Root Cause:**
- Mapping rules incomplete or incorrect
- CI metadata missing required fields
- Database transaction rollback
- Concurrent update conflicts

**Diagnosis Steps:**

1. **Check tower mapping:**
```bash
# Get CI tower assignment
curl http://localhost:3000/api/v1/tbm/cost-towers/mapping/ci_12345

# View all tower mappings
curl http://localhost:3000/api/v1/tbm/cost-towers/mappings
```

2. **Check mapping rules:**
```sql
-- View tower mapping rules
SELECT tower_name, rule_type, rule_criteria
FROM tbm_tower_mapping_rules
ORDER BY priority;
```

3. **Test mapping logic:**
```bash
curl -X POST http://localhost:3000/api/v1/tbm/cost-towers/test-mapping \
  -H "Content-Type: application/json" \
  -d '{"ci_id": "ci_12345"}'
```

**Solution:**

**1. Create mapping rules:**
```bash
# Map servers to Infrastructure tower
curl -X POST http://localhost:3000/api/v1/tbm/cost-towers/mapping-rules \
  -H "Content-Type: application/json" \
  -d '{
    "tower_name": "Infrastructure",
    "rule_type": "ci_type",
    "rule_criteria": {"ci_type": "server"},
    "priority": 1
  }'

# Map applications to Applications tower
curl -X POST http://localhost:3000/api/v1/tbm/cost-towers/mapping-rules \
  -H "Content-Type: application/json" \
  -d '{
    "tower_name": "Applications",
    "rule_type": "ci_type",
    "rule_criteria": {"ci_type": "application"},
    "priority": 2
  }'
```

**2. Re-run tower mapping:**
```bash
# Bulk remapping
curl -X POST http://localhost:3000/api/v1/tbm/cost-towers/remap-all
```

**3. Fix unmapped CIs:**
```bash
# Find unmapped CIs
curl http://localhost:3000/api/v1/tbm/cost-towers/unmapped

# Manually assign tower
curl -X PUT http://localhost:3000/api/v1/tbm/cost-towers/mapping/ci_12345 \
  -H "Content-Type: application/json" \
  -d '{"tower_name": "Infrastructure"}'
```

**Prevention:**
- Create comprehensive mapping rules covering all CI types
- Validate mapping rules on creation
- Implement fallback "Unallocated" tower for unmapped CIs
- Monitor unmapped CI count with alerts

---

### Cost Allocation Errors

**Symptoms:**
- CI costs show as $0.00 despite having expenses
- Cost allocation percentages don't sum to 100%
- Allocation API returns 400 "Invalid allocation" error
- Monthly cost reports incomplete

**Root Cause:**
- Missing cost allocation rules
- Division by zero in percentage calculations
- Parent CI missing cost data
- Circular allocation dependencies

**Diagnosis Steps:**

1. **Check CI costs:**
```bash
# Get CI cost breakdown
curl http://localhost:3000/api/v1/tbm/costs/ci_12345

# Get allocation rules
curl http://localhost:3000/api/v1/tbm/allocations/rules/ci_12345
```

2. **Validate allocation percentages:**
```sql
-- Check allocation totals
SELECT parent_ci_id, SUM(allocation_percentage) as total_percentage
FROM tbm_cost_allocations
GROUP BY parent_ci_id
HAVING SUM(allocation_percentage) != 100;
```

3. **Check for circular dependencies:**
```bash
curl http://localhost:3000/api/v1/tbm/allocations/validate
```

**Solution:**

**1. Create allocation rules:**
```bash
# Equal split allocation
curl -X POST http://localhost:3000/api/v1/tbm/allocations \
  -H "Content-Type: application/json" \
  -d '{
    "parent_ci_id": "ci_server_01",
    "child_ci_ids": ["ci_app_01", "ci_app_02", "ci_app_03"],
    "allocation_method": "equal_split"
  }'

# Custom percentage allocation
curl -X POST http://localhost:3000/api/v1/tbm/allocations \
  -H "Content-Type: application/json" \
  -d '{
    "parent_ci_id": "ci_server_01",
    "allocations": [
      {"child_ci_id": "ci_app_01", "percentage": 50},
      {"child_ci_id": "ci_app_02", "percentage": 30},
      {"child_ci_id": "ci_app_03", "percentage": 20}
    ]
  }'
```

**2. Fix percentage totals:**
```bash
# Auto-normalize percentages
curl -X POST http://localhost:3000/api/v1/tbm/allocations/normalize \
  -H "Content-Type: application/json" \
  -d '{"parent_ci_id": "ci_server_01"}'
```

**3. Recalculate costs:**
```bash
# Trigger cost recalculation
curl -X POST http://localhost:3000/api/v1/tbm/costs/recalculate \
  -H "Content-Type: application/json" \
  -d '{"period": "2025-11"}'
```

**Prevention:**
- Validate allocation percentages sum to 100%
- Detect circular allocation dependencies at creation time
- Implement allocation validation webhook
- Monitor allocation accuracy with reports

---

### Depreciation Calculation Issues

**Symptoms:**
- Asset depreciation not updating monthly
- Depreciation values stuck at initial amount
- Straight-line depreciation incorrect
- End-of-life assets showing non-zero value

**Root Cause:**
- Depreciation job not scheduled
- Acquisition date or cost missing
- Useful life not configured
- Calculation logic bug (leap year, partial months)

**Diagnosis Steps:**

1. **Check depreciation values:**
```bash
# Get asset depreciation
curl http://localhost:3000/api/v1/tbm/depreciation/ci_12345

# View depreciation schedule
curl http://localhost:3000/api/v1/tbm/depreciation/ci_12345/schedule
```

2. **Check depreciation job:**
```bash
# View scheduled jobs
curl http://localhost:3000/api/v1/bullmq/queues/tbm-depreciation

# Trigger manual depreciation
curl -X POST http://localhost:3000/api/v1/tbm/depreciation/calculate
```

3. **Validate asset data:**
```sql
-- Check asset data completeness
SELECT ci_id, acquisition_cost, acquisition_date, useful_life_months
FROM tbm_assets
WHERE acquisition_cost IS NULL
   OR acquisition_date IS NULL
   OR useful_life_months IS NULL;
```

**Solution:**

**1. Configure asset depreciation:**
```bash
# Set asset details
curl -X PUT http://localhost:3000/api/v1/tbm/assets/ci_12345 \
  -H "Content-Type: application/json" \
  -d '{
    "acquisition_cost": 50000.00,
    "acquisition_date": "2024-01-01",
    "useful_life_months": 60,
    "depreciation_method": "straight_line",
    "salvage_value": 5000.00
  }'
```

**2. Recalculate depreciation:**
```bash
# Recalculate single asset
curl -X POST http://localhost:3000/api/v1/tbm/depreciation/ci_12345/recalculate

# Bulk recalculation
curl -X POST http://localhost:3000/api/v1/tbm/depreciation/recalculate-all
```

**3. Enable depreciation job:**
```bash
# .env
TBM_DEPRECIATION_ENABLED=true
TBM_DEPRECIATION_SCHEDULE=0 0 1 * *  # Run on 1st of each month

# Restart
docker-compose -f infrastructure/docker/docker-compose.yml restart api-server
```

**Prevention:**
- Require acquisition details when creating assets
- Validate useful life is reasonable (12-180 months)
- Schedule depreciation calculation monthly
- Alert on assets with missing depreciation data

---

### Cloud Cost Sync Failures

**Symptoms:**
- AWS/Azure/GCP costs not syncing
- Cloud cost data stale (>24 hours old)
- Sync job fails with authentication error
- Cost data missing for specific services

**Root Cause:**
- Cloud API credentials expired or invalid
- API rate limiting
- Cost Explorer API disabled
- Billing data export not configured

**Diagnosis Steps:**

1. **Check cloud cost sync status:**
```bash
# View sync status
curl http://localhost:3000/api/v1/tbm/cloud-costs/sync-status

# View last sync time
curl http://localhost:3000/api/v1/tbm/cloud-costs/last-sync
```

2. **Test cloud API credentials:**
```bash
# Test AWS credentials
curl -X POST http://localhost:3000/api/v1/tbm/cloud-costs/aws/test-credentials

# Test Azure credentials
curl -X POST http://localhost:3000/api/v1/tbm/cloud-costs/azure/test-credentials

# Test GCP credentials
curl -X POST http://localhost:3000/api/v1/tbm/cloud-costs/gcp/test-credentials
```

3. **Check sync job logs:**
```bash
docker logs cmdb-api-server | grep "Cloud cost sync"
```

**Solution:**

**1. Update cloud credentials:**

**AWS:**
```bash
# Update AWS credentials
curl -X PUT http://localhost:3000/api/v1/credentials/aws-cost-explorer \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AWS Cost Explorer",
    "credential_type": "aws",
    "auth_method": "access_key",
    "credentials": {
      "access_key_id": "AKIA...",
      "secret_access_key": "...",
      "region": "us-east-1"
    }
  }'
```

**Azure:**
```bash
# Update Azure credentials
curl -X PUT http://localhost:3000/api/v1/credentials/azure-cost-management \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Azure Cost Management",
    "credential_type": "azure",
    "auth_method": "service_principal",
    "credentials": {
      "client_id": "...",
      "client_secret": "...",
      "tenant_id": "...",
      "subscription_id": "..."
    }
  }'
```

**GCP:**
```bash
# Update GCP credentials
curl -X PUT http://localhost:3000/api/v1/credentials/gcp-billing \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GCP Billing",
    "credential_type": "gcp",
    "auth_method": "service_account",
    "credentials": {
      "project_id": "my-project",
      "private_key": "...",
      "client_email": "..."
    }
  }'
```

**2. Trigger manual sync:**
```bash
# Sync AWS costs
curl -X POST http://localhost:3000/api/v1/tbm/cloud-costs/aws/sync \
  -H "Content-Type: application/json" \
  -d '{"start_date": "2025-11-01", "end_date": "2025-11-06"}'

# Sync Azure costs
curl -X POST http://localhost:3000/api/v1/tbm/cloud-costs/azure/sync

# Sync GCP costs
curl -X POST http://localhost:3000/api/v1/tbm/cloud-costs/gcp/sync
```

**3. Enable scheduled sync:**
```bash
# .env
TBM_CLOUD_COST_SYNC_ENABLED=true
TBM_CLOUD_COST_SYNC_INTERVAL=86400000  # Daily (24 hours)

# Restart
docker-compose -f infrastructure/docker/docker-compose.yml restart api-server
```

**Prevention:**
- Rotate cloud credentials before expiration
- Implement retry logic with exponential backoff
- Monitor sync job success rate
- Alert on sync failures >24 hours

---

### GL Import Errors

**Symptoms:**
- GL data import fails with validation error
- Imported costs don't match GL totals
- Duplicate GL entries created
- Account mapping missing for certain GL accounts

**Root Cause:**
- CSV format doesn't match expected schema
- Date format inconsistency
- Missing account mappings
- Duplicate detection not working

**Diagnosis Steps:**

1. **Check import status:**
```bash
# View recent imports
curl http://localhost:3000/api/v1/tbm/gl-imports

# Check specific import
curl http://localhost:3000/api/v1/tbm/gl-imports/import_12345
```

2. **Validate CSV format:**
```bash
# Upload and validate (dry run)
curl -X POST http://localhost:3000/api/v1/tbm/gl-imports/validate \
  -F "file=@gl-export-2025-11.csv" \
  -F "dry_run=true"
```

3. **Check account mappings:**
```bash
curl http://localhost:3000/api/v1/tbm/gl-accounts/mappings
```

**Solution:**

**1. Fix CSV format:**

**Expected format:**
```csv
account_code,account_name,period,amount,currency
610100,Server Hosting,2025-11,50000.00,USD
620200,Software Licenses,2025-11,25000.00,USD
630300,Network Bandwidth,2025-11,15000.00,USD
```

**2. Create account mappings:**
```bash
# Map GL account to cost tower
curl -X POST http://localhost:3000/api/v1/tbm/gl-accounts/mappings \
  -H "Content-Type: application/json" \
  -d '{
    "account_code": "610100",
    "account_name": "Server Hosting",
    "cost_tower": "Infrastructure",
    "cost_category": "Compute"
  }'
```

**3. Import GL data:**
```bash
# Import with validation
curl -X POST http://localhost:3000/api/v1/tbm/gl-imports \
  -F "file=@gl-export-2025-11.csv" \
  -F "period=2025-11" \
  -F "overwrite_duplicates=true"
```

**4. Reconcile totals:**
```bash
# View GL reconciliation report
curl http://localhost:3000/api/v1/tbm/gl-imports/import_12345/reconciliation
```

**Prevention:**
- Provide CSV template for GL exports
- Validate CSV before import
- Implement duplicate detection (account + period)
- Create account mappings for all GL accounts upfront

---

## BSM Impact Engine Issues

### Criticality Calculation Errors

**Symptoms:**
- CIs show criticality score of 0 or `null`
- All CIs have same criticality (e.g., 50)
- Criticality not updating after relationship changes
- Calculation API returns 500 error

**Root Cause:**
- Missing business service mappings
- Revenue impact data not configured
- Compliance requirements not assigned
- Calculation timeout (complex graph)

**Diagnosis Steps:**

1. **Check CI criticality:**
```bash
# Get CI criticality
curl http://localhost:3000/api/v1/bsm/criticality/ci_12345

# Get criticality breakdown
curl http://localhost:3000/api/v1/bsm/criticality/ci_12345/breakdown
```

2. **Check business service mappings:**
```bash
# View business services
curl http://localhost:3000/api/v1/bsm/business-services

# Check CI to service mapping
curl http://localhost:3000/api/v1/bsm/business-services/ci_12345/mappings
```

3. **Test calculation:**
```bash
curl -X POST http://localhost:3000/api/v1/bsm/criticality/calculate \
  -H "Content-Type: application/json" \
  -d '{"ci_id": "ci_12345"}'
```

**Solution:**

**1. Configure business services:**
```bash
# Create business service
curl -X POST http://localhost:3000/api/v1/bsm/business-services \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Online Shopping",
    "description": "E-commerce platform",
    "criticality": "high",
    "revenue_impact": 1000000,
    "compliance_frameworks": ["PCI-DSS", "SOC2"]
  }'

# Map CI to business service
curl -X POST http://localhost:3000/api/v1/bsm/business-services/bs_12345/mappings \
  -H "Content-Type: application/json" \
  -d '{
    "ci_id": "ci_12345",
    "relationship_type": "SUPPORTS"
  }'
```

**2. Set revenue impact:**
```bash
curl -X PUT http://localhost:3000/api/v1/bsm/revenue-impact/ci_12345 \
  -H "Content-Type: application/json" \
  -d '{
    "hourly_revenue": 50000,
    "peak_multiplier": 2.5,
    "currency": "USD"
  }'
```

**3. Recalculate criticality:**
```bash
# Single CI
curl -X POST http://localhost:3000/api/v1/bsm/criticality/calculate/ci_12345

# Bulk calculation
curl -X POST http://localhost:3000/api/v1/bsm/criticality/calculate-all \
  -H "Content-Type: application/json" \
  -d '{"ci_types": ["application", "database", "server"]}'
```

**Prevention:**
- Map CIs to business services during discovery
- Set revenue impact for all customer-facing services
- Schedule nightly criticality recalculation
- Monitor CIs with zero criticality

---

### Impact Scoring Failures

**Symptoms:**
- Impact scores always show "low" regardless of criticality
- Impact calculation returns same value for all CIs
- Impact scores not considering downstream dependencies
- Incident impact assessment incorrect

**Root Cause:**
- Relationship graph incomplete
- Weight configuration incorrect (all 1.0)
- Caching returning stale values
- Circular dependency in relationships

**Diagnosis Steps:**

1. **Check impact score:**
```bash
# Get current impact
curl http://localhost:3000/api/v1/bsm/impact/ci_12345

# Get impact factors
curl http://localhost:3000/api/v1/bsm/impact/ci_12345/factors
```

2. **Check relationships:**
```bash
# View CI relationships
curl http://localhost:3000/api/v1/cis/ci_12345/relationships

# Check downstream dependencies
curl http://localhost:3000/api/v1/cis/ci_12345/downstream?depth=3
```

3. **Check weight configuration:**
```bash
curl http://localhost:3000/api/v1/bsm/config/impact-weights
```

**Solution:**

**1. Configure impact weights:**
```bash
curl -X PUT http://localhost:3000/api/v1/bsm/config/impact-weights \
  -H "Content-Type: application/json" \
  -d '{
    "business_service_weight": 0.4,
    "revenue_impact_weight": 0.3,
    "user_count_weight": 0.2,
    "compliance_weight": 0.1
  }'
```

**2. Fix relationships:**
```bash
# Create missing relationship
curl -X POST http://localhost:3000/api/v1/relationships \
  -H "Content-Type: application/json" \
  -d '{
    "source_ci_id": "ci_app_01",
    "target_ci_id": "ci_db_01",
    "relationship_type": "DEPENDS_ON"
  }'
```

**3. Clear impact cache:**
```bash
curl -X POST http://localhost:3000/api/v1/bsm/cache/clear \
  -H "Content-Type: application/json" \
  -d '{"cache_type": "impact"}'
```

**4. Recalculate impact:**
```bash
curl -X POST http://localhost:3000/api/v1/bsm/impact/recalculate-all
```

**Prevention:**
- Validate relationship graph completeness
- Test weight changes in non-production first
- Implement impact calculation monitoring
- Alert on impact calculation failures

---

### Blast Radius Timeout

**Symptoms:**
- Blast radius calculation exceeds 5 minutes
- API returns 504 Gateway Timeout
- Browser times out waiting for response
- Partial results returned with "calculation incomplete" warning

**Root Cause:**
- Graph too large (millions of nodes/relationships)
- No max depth limit configured
- Inefficient Neo4j query
- Missing graph indexes

**Diagnosis Steps:**

1. **Check graph size:**
```bash
# Count nodes and relationships
curl http://localhost:3000/api/v1/neo4j/stats
```

2. **Test blast radius with limits:**
```bash
# Test with depth 1
curl -X POST http://localhost:3000/api/v1/bsm/blast-radius \
  -H "Content-Type: application/json" \
  -d '{"ci_id": "ci_12345", "max_depth": 1}'

# Test with depth 2
curl -X POST http://localhost:3000/api/v1/bsm/blast-radius \
  -H "Content-Type: application/json" \
  -d '{"ci_id": "ci_12345", "max_depth": 2}'
```

3. **Check Neo4j query performance:**
```bash
docker exec cmdb-neo4j cypher-shell \
  "PROFILE MATCH (c:CI {id: 'ci_12345'})-[*1..5]-(related:CI) RETURN count(related)"
```

**Solution:**

**1. Set max depth limit:**
```bash
# .env
BSM_BLAST_RADIUS_MAX_DEPTH=3
BSM_BLAST_RADIUS_TIMEOUT_MS=60000  # 1 minute

# Restart
docker-compose -f infrastructure/docker/docker-compose.yml restart api-server
```

**2. Create graph indexes:**
```bash
# Create indexes for performance
docker exec cmdb-neo4j cypher-shell "
CREATE INDEX ci_id_index IF NOT EXISTS FOR (c:CI) ON (c.id);
CREATE INDEX ci_type_index IF NOT EXISTS FOR (c:CI) ON (c.ci_type);
CREATE INDEX ci_status_index IF NOT EXISTS FOR (c:CI) ON (c.ci_status);
"
```

**3. Optimize blast radius query:**
```typescript
// Use variable-length paths with limits
const query = `
  MATCH path = (source:CI {id: $ci_id})-[*1..${maxDepth}]-(related:CI)
  WHERE related.ci_status = 'active'
  WITH related, length(path) as distance
  ORDER BY distance
  LIMIT 1000
  RETURN related, distance
`;
```

**4. Use caching:**
```bash
# Enable blast radius caching
curl -X PUT http://localhost:3000/api/v1/bsm/config \
  -H "Content-Type: application/json" \
  -d '{
    "blast_radius_cache_ttl": 3600,
    "blast_radius_cache_enabled": true
  }'
```

**Prevention:**
- Always use max depth limit (default: 3)
- Implement query timeout at database level
- Cache blast radius results (TTL: 1 hour)
- Monitor Neo4j query performance

---

### Revenue Impact Calculation Errors

**Symptoms:**
- Revenue impact shows $0 for critical services
- Impact calculation doesn't consider peak hours
- Currency conversion incorrect
- Historical revenue data missing

**Root Cause:**
- Revenue impact not configured
- Peak hour multiplier not set
- Currency exchange rates stale
- Data import failed

**Diagnosis Steps:**

1. **Check revenue configuration:**
```bash
# Get revenue impact config
curl http://localhost:3000/api/v1/bsm/revenue-impact/ci_12345
```

2. **Validate calculations:**
```bash
# Calculate revenue impact for outage
curl -X POST http://localhost:3000/api/v1/bsm/revenue-impact/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "ci_id": "ci_12345",
    "outage_duration_minutes": 60,
    "peak_hours": true
  }'
```

3. **Check exchange rates:**
```bash
curl http://localhost:3000/api/v1/tbm/exchange-rates
```

**Solution:**

**1. Configure revenue impact:**
```bash
# Set hourly revenue
curl -X PUT http://localhost:3000/api/v1/bsm/revenue-impact/ci_12345 \
  -H "Content-Type: application/json" \
  -d '{
    "hourly_revenue": 100000,
    "peak_hour_multiplier": 3.0,
    "peak_hours": [9, 10, 11, 12, 13, 14, 15, 16, 17],
    "currency": "USD"
  }'
```

**2. Update exchange rates:**
```bash
# Manual update
curl -X POST http://localhost:3000/api/v1/tbm/exchange-rates/update

# Enable auto-update
# .env
TBM_EXCHANGE_RATE_AUTO_UPDATE=true
TBM_EXCHANGE_RATE_UPDATE_INTERVAL=86400000  # Daily
```

**3. Import historical revenue:**
```bash
curl -X POST http://localhost:3000/api/v1/bsm/revenue-impact/import \
  -F "file=@revenue-data-2025.csv"
```

**Prevention:**
- Require revenue impact for customer-facing services
- Update exchange rates daily
- Validate revenue calculations monthly
- Alert on services with $0 revenue impact

---

### Compliance Framework Mapping Issues

**Symptoms:**
- CIs not tagged with compliance requirements
- Compliance reports incomplete
- Audit trail missing for critical CIs
- Compliance score always 0%

**Root Cause:**
- Compliance frameworks not configured
- CI to framework mapping missing
- Control mappings incomplete
- Audit data not collected

**Diagnosis Steps:**

1. **Check compliance frameworks:**
```bash
# List frameworks
curl http://localhost:3000/api/v1/bsm/compliance/frameworks

# Check CI compliance
curl http://localhost:3000/api/v1/bsm/compliance/ci_12345
```

2. **View control mappings:**
```bash
curl http://localhost:3000/api/v1/bsm/compliance/frameworks/PCI-DSS/controls
```

3. **Check audit logs:**
```bash
curl http://localhost:3000/api/v1/bsm/compliance/ci_12345/audit-trail
```

**Solution:**

**1. Configure compliance frameworks:**
```bash
# Create framework
curl -X POST http://localhost:3000/api/v1/bsm/compliance/frameworks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "PCI-DSS",
    "version": "4.0",
    "description": "Payment Card Industry Data Security Standard",
    "controls": [
      {
        "control_id": "1.1",
        "description": "Establish and maintain firewall configuration"
      },
      {
        "control_id": "2.1",
        "description": "Change vendor-supplied defaults"
      }
    ]
  }'
```

**2. Map CIs to frameworks:**
```bash
# Map CI to compliance framework
curl -X POST http://localhost:3000/api/v1/bsm/compliance/mappings \
  -H "Content-Type: application/json" \
  -d '{
    "ci_id": "ci_12345",
    "frameworks": ["PCI-DSS", "SOC2", "HIPAA"],
    "controls": ["1.1", "2.1", "8.1"]
  }'
```

**3. Enable audit logging:**
```bash
# .env
BSM_COMPLIANCE_AUDIT_ENABLED=true
BSM_COMPLIANCE_AUDIT_RETENTION_DAYS=2555  # 7 years for PCI-DSS

# Restart
docker-compose -f infrastructure/docker/docker-compose.yml restart api-server
```

**Prevention:**
- Tag CIs with compliance requirements during discovery
- Validate compliance mappings quarterly
- Implement automated compliance scanning
- Monitor compliance coverage percentage

---

## AI Discovery Issues

### LLM API Failures

**Symptoms:**
- Discovery sessions fail with "LLM API error"
- Rate limit errors (429 Too Many Requests)
- Authentication errors (401 Unauthorized)
- Timeout errors after 30 seconds

**Root Cause:**
- API key expired or invalid
- Rate limit exceeded
- LLM provider service outage
- Network connectivity issues

**Diagnosis Steps:**

1. **Check API credentials:**
```bash
# Test Anthropic credentials
curl -X POST http://localhost:3000/api/v1/ai/test-connection \
  -H "Content-Type: application/json" \
  -d '{"provider": "anthropic"}'

# Test OpenAI credentials
curl -X POST http://localhost:3000/api/v1/ai/test-connection \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai"}'
```

2. **Check rate limits:**
```bash
# View current usage
curl http://localhost:3000/api/v1/ai/usage
```

3. **View error logs:**
```bash
docker logs cmdb-api-server | grep "LLM API"
```

**Solution:**

**1. Update API key:**
```bash
# .env
ANTHROPIC_API_KEY=sk-ant-api01-NEW_KEY_HERE
OPENAI_API_KEY=sk-NEW_KEY_HERE

# Restart
docker-compose -f infrastructure/docker/docker-compose.yml restart api-server
```

**2. Handle rate limits:**
```bash
# Reduce concurrency
# .env
AI_DISCOVERY_MAX_CONCURRENT_SESSIONS=5  # Reduce from 10

# Enable request queuing
AI_DISCOVERY_ENABLE_QUEUE=true
AI_DISCOVERY_QUEUE_MAX_SIZE=100

# Restart
docker-compose -f infrastructure/docker/docker-compose.yml restart api-server
```

**3. Implement fallback provider:**
```bash
# .env
AI_DISCOVERY_PROVIDER=anthropic
AI_DISCOVERY_FALLBACK_PROVIDER=openai  # Fallback if primary fails

# Restart
docker-compose -f infrastructure/docker/docker-compose.yml restart api-server
```

**4. Increase timeout:**
```bash
# .env
AI_DISCOVERY_TIMEOUT_MS=60000  # Increase to 60 seconds

# Restart
docker-compose -f infrastructure/docker/docker-compose.yml restart api-server
```

**Prevention:**
- Monitor API key expiration dates
- Implement rate limit backoff strategy
- Set up provider health monitoring
- Configure multi-provider failover

---

### Pattern Compilation Failures

**Symptoms:**
- Patterns stuck in "draft" status
- Compilation job fails with validation error
- Generated pattern code has syntax errors
- Test cases fail during validation

**Root Cause:**
- Insufficient session data (< 3 sessions)
- Low success rate (<85%)
- Generated code doesn't compile
- Test fixtures missing or invalid

**Diagnosis Steps:**

1. **Check compilation queue:**
```bash
curl http://localhost:3000/api/v1/ai/patterns/compilation-queue
```

2. **View compilation errors:**
```bash
docker logs cmdb-api-server | grep "Pattern compilation failed"
```

3. **Test pattern validation:**
```bash
curl -X POST http://localhost:3000/api/v1/ai/patterns/pat_12345/validate
```

**Solution:**

**1. Increase session threshold:**
```bash
# .env
AI_PATTERN_MIN_SESSIONS=3  # Require at least 3 sessions
AI_PATTERN_MIN_CONFIDENCE=0.85

# Trigger compilation
curl -X POST http://localhost:3000/api/v1/ai/patterns/compile \
  -H "Content-Type: application/json" \
  -d '{
    "minSessions": 3,
    "minConfidence": 0.85
  }'
```

**2. Fix generated code:**
```bash
# View generated pattern
curl http://localhost:3000/api/v1/ai/patterns/pat_12345/code

# Manually edit and resubmit
curl -X PUT http://localhost:3000/api/v1/ai/patterns/pat_12345/code \
  -H "Content-Type: application/json" \
  -d @fixed-pattern.json
```

**3. Regenerate pattern:**
```bash
# Delete failed pattern
curl -X DELETE http://localhost:3000/api/v1/ai/patterns/pat_12345

# Trigger recompilation
curl -X POST http://localhost:3000/api/v1/ai/patterns/compile
```

**Prevention:**
- Validate generated code before saving
- Require minimum 3 successful sessions
- Implement pattern code linting
- Test patterns against fixtures automatically

---

### High Costs / Budget Exceeded

**Symptoms:**
- Monthly budget alert triggered
- AI discovery sessions aborted with "budget exceeded"
- Cost per session higher than expected
- Low pattern hit rate (<50%)

**Root Cause:**
- Pattern matching disabled or not working
- Using expensive model for simple tasks
- No per-session cost limits
- Discovery running too frequently

**Diagnosis Steps:**

1. **Check budget usage:**
```bash
# View current month costs
curl http://localhost:3000/api/v1/ai/analytics/cost-summary

# View cost trends
curl http://localhost:3000/api/v1/ai/analytics/cost-trends?period=90d
```

2. **Check pattern hit rate:**
```bash
# View pattern usage
curl http://localhost:3000/api/v1/ai/patterns/usage-stats
```

3. **View expensive sessions:**
```bash
# Find high-cost sessions
curl "http://localhost:3000/api/v1/ai/sessions?sort=cost&order=desc&limit=10"
```

**Solution:**

**1. Enable pattern matching:**
```bash
# .env
AI_HYBRID_DISCOVERY_ENABLED=true
AI_PATTERN_CONFIDENCE_THRESHOLD=0.85

# Restart
docker-compose -f infrastructure/docker/docker-compose.yml restart api-server
```

**2. Reduce model cost:**
```bash
# Switch to cheaper model
# .env
AI_DISCOVERY_MODEL=gpt-3.5-turbo  # Instead of claude-sonnet-4

# Or use self-hosted
AI_DISCOVERY_PROVIDER=custom
AI_DISCOVERY_BASE_URL=http://vllm-server:8000/v1
```

**3. Set cost limits:**
```bash
# .env
AI_DISCOVERY_MONTHLY_BUDGET=100.00
AI_DISCOVERY_MAX_COST_PER_SESSION=0.25

# Restart
docker-compose -f infrastructure/docker/docker-compose.yml restart api-server
```

**4. Compile more patterns:**
```bash
# Lower compilation threshold
curl -X POST http://localhost:3000/api/v1/ai/patterns/compile \
  -H "Content-Type: application/json" \
  -d '{
    "minSessions": 2,
    "minConfidence": 0.80,
    "autoApprove": true
  }'
```

**Prevention:**
- Enable hybrid discovery from day one
- Set conservative budgets initially
- Monitor pattern hit rate weekly
- Auto-approve high-confidence patterns

---

### Low Confidence Scores

**Symptoms:**
- Discovered CIs have confidence <0.7
- Many CIs flagged for manual review
- Pattern matching not activating (confidence too low)
- Inconsistent discovery results

**Root Cause:**
- Incomplete scan data (missing ports/services)
- Target system not responding to probes
- Pattern detection logic too strict
- Ambiguous CI type (could be multiple types)

**Diagnosis Steps:**

1. **Check session details:**
```bash
# View discovery session
curl http://localhost:3000/api/v1/ai/sessions/sess_12345

# View confidence breakdown
curl http://localhost:3000/api/v1/ai/sessions/sess_12345/confidence-breakdown
```

2. **Check scan results:**
```bash
# View scan data used for discovery
curl http://localhost:3000/api/v1/ai/sessions/sess_12345/scan-data
```

3. **Test with additional data:**
```bash
# Re-run with enhanced scanning
curl -X POST http://localhost:3000/api/v1/discovery/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "ai",
    "config": {
      "targetHost": "10.0.1.50",
      "deepScan": true,
      "includeSSH": true
    }
  }'
```

**Solution:**

**1. Enhance scan data:**
```bash
# Enable deep scanning
# .env
AI_DISCOVERY_DEEP_SCAN_ENABLED=true
AI_DISCOVERY_INCLUDE_SSH_SCAN=true
AI_DISCOVERY_INCLUDE_HTTP_HEADERS=true

# Restart
docker-compose -f infrastructure/docker/docker-compose.yml restart api-server
```

**2. Adjust confidence threshold:**
```bash
# Lower pattern matching threshold temporarily
# .env
AI_PATTERN_CONFIDENCE_THRESHOLD=0.75  # Reduce from 0.9

# Restart
docker-compose -f infrastructure/docker/docker-compose.yml restart api-server
```

**3. Provide more context:**
```typescript
// Include additional context in discovery request
{
  "targetHost": "10.0.1.50",
  "context": {
    "datacenter": "us-west-2",
    "environment": "production",
    "expectedType": "web-server",
    "knownSoftware": ["nginx"]
  }
}
```

**Prevention:**
- Always include SSH credentials for deep scanning
- Collect HTTP headers and service banners
- Provide datacenter/environment context
- Review low-confidence sessions to improve patterns

---

### Tool Execution Failures

**Symptoms:**
- Discovery session fails at specific tool step
- "Tool execution error" in session logs
- Timeout waiting for SSH command
- Port scan returns empty results

**Root Cause:**
- Network connectivity issues
- Firewall blocking scan ports
- SSH credentials incorrect
- Target host down or unreachable

**Diagnosis Steps:**

1. **Check tool logs:**
```bash
# View session execution steps
curl http://localhost:3000/api/v1/ai/sessions/sess_12345/steps

# Check which tool failed
docker logs cmdb-api-server | grep "Tool execution failed"
```

2. **Test connectivity:**
```bash
# Test network connectivity
docker exec cmdb-api-server ping -c 3 10.0.1.50

# Test SSH
docker exec cmdb-api-server ssh -o ConnectTimeout=5 user@10.0.1.50 "echo test"

# Test port scan
docker exec cmdb-api-server nmap -Pn -p 22,80,443 10.0.1.50
```

3. **Verify credentials:**
```bash
# Test SSH credentials
curl -X POST http://localhost:3000/api/v1/credentials/cred_12345/test
```

**Solution:**

**1. Fix network connectivity:**
```bash
# Check firewall rules
sudo iptables -L -n | grep 10.0.1.50

# Allow traffic from ConfigBuddy
sudo iptables -A OUTPUT -d 10.0.1.50 -j ACCEPT
```

**2. Update credentials:**
```bash
# Update SSH credentials
curl -X PUT http://localhost:3000/api/v1/credentials/cred_12345 \
  -H "Content-Type: application/json" \
  -d '{
    "username": "discovery-user",
    "password": "NEW_PASSWORD",
    "port": 22
  }'
```

**3. Increase timeouts:**
```bash
# .env
AI_DISCOVERY_TOOL_TIMEOUT_MS=30000  # 30 seconds per tool
AI_DISCOVERY_SSH_TIMEOUT_MS=10000   # 10 seconds for SSH

# Restart
docker-compose -f infrastructure/docker/docker-compose.yml restart api-server
```

**4. Retry failed tools:**
```bash
# Replay session with retries
curl -X POST http://localhost:3000/api/v1/ai/sessions/sess_12345/retry
```

**Prevention:**
- Validate credentials before discovery
- Test network connectivity upfront
- Implement tool execution retry logic
- Monitor tool success rates

---

## AI/ML Engine Issues

### Anomaly Detection False Positives

**Symptoms:**
- Alerts triggered for normal behavior
- Alert fatigue from too many false positives
- Anomaly score threshold too low
- Seasonal patterns flagged as anomalies

**Root Cause:**
- Training data insufficient (<30 days)
- Seasonal adjustments not configured
- Threshold too sensitive
- Model not retrained regularly

**Diagnosis Steps:**

1. **Check anomaly alerts:**
```bash
# View recent anomalies
curl http://localhost:3000/api/v1/aiml/anomalies?days=7

# Check specific anomaly
curl http://localhost:3000/api/v1/aiml/anomalies/anom_12345
```

2. **View model training status:**
```bash
curl http://localhost:3000/api/v1/aiml/models/anomaly-detection/status
```

3. **Check threshold:**
```bash
curl http://localhost:3000/api/v1/aiml/config/anomaly-threshold
```

**Solution:**

**1. Retrain model with more data:**
```bash
# Trigger retraining
curl -X POST http://localhost:3000/api/v1/aiml/models/anomaly-detection/train \
  -H "Content-Type: application/json" \
  -d '{
    "training_days": 90,
    "include_seasonal": true
  }'
```

**2. Adjust threshold:**
```bash
# Increase threshold to reduce false positives
curl -X PUT http://localhost:3000/api/v1/aiml/config \
  -H "Content-Type: application/json" \
  -d '{
    "anomaly_threshold": 0.85,
    "anomaly_sensitivity": "medium"
  }'
```

**3. Enable seasonal adjustment:**
```bash
# .env
AIML_SEASONAL_ADJUSTMENT_ENABLED=true
AIML_SEASONAL_PERIOD_DAYS=7  # Weekly seasonality

# Restart
docker-compose -f infrastructure/docker/docker-compose.yml restart api-server
```

**4. Suppress known patterns:**
```bash
# Add suppression rule
curl -X POST http://localhost:3000/api/v1/aiml/anomalies/suppressions \
  -H "Content-Type: application/json" \
  -d '{
    "pattern": "daily_backup_spike",
    "time_range": "02:00-04:00",
    "days_of_week": ["*"]
  }'
```

**Prevention:**
- Train model with minimum 30 days of data
- Enable seasonal adjustments from start
- Start with conservative threshold (0.9)
- Review and tune threshold monthly

---

### Drift Detection Not Triggering

**Symptoms:**
- No drift alerts despite known configuration changes
- Last drift scan shows "Never"
- Drift detection job not running
- All CIs show "No drift detected"

**Root Cause:**
- Drift detection disabled
- Baseline snapshots missing
- Scan schedule not configured
- Comparison logic not detecting changes

**Diagnosis Steps:**

1. **Check drift detection status:**
```bash
# View drift detection config
curl http://localhost:3000/api/v1/aiml/drift-detection/status

# Check scheduled jobs
curl http://localhost:3000/api/v1/bullmq/queues/drift-detection
```

2. **Check baselines:**
```bash
# View baseline snapshots
curl http://localhost:3000/api/v1/aiml/baselines?ci_id=ci_12345
```

3. **Manual drift scan:**
```bash
curl -X POST http://localhost:3000/api/v1/aiml/drift-detection/scan \
  -H "Content-Type: application/json" \
  -d '{"ci_id": "ci_12345"}'
```

**Solution:**

**1. Enable drift detection:**
```bash
# .env
AIML_DRIFT_DETECTION_ENABLED=true
AIML_DRIFT_SCAN_INTERVAL=86400000  # Daily

# Restart
docker-compose -f infrastructure/docker/docker-compose.yml restart api-server
```

**2. Create baseline snapshots:**
```bash
# Create baselines for all CIs
curl -X POST http://localhost:3000/api/v1/aiml/baselines/create-all
```

**3. Configure scan schedule:**
```bash
curl -X POST http://localhost:3000/api/v1/aiml/drift-detection/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "cron": "0 3 * * *",
    "ci_types": ["server", "database", "application"]
  }'
```

**Prevention:**
- Enable drift detection during initial setup
- Create baselines after discovery
- Schedule daily scans during off-peak hours
- Monitor baseline coverage percentage

---

### Impact Prediction Errors

**Symptoms:**
- Predicted impact doesn't match actual impact
- Impact predictions always show "low"
- Prediction confidence <0.5
- Model accuracy degrading over time

**Root Cause:**
- Model not trained or stale
- Insufficient historical incident data
- Features missing or incorrect
- Training data quality issues

**Diagnosis Steps:**

1. **Check model status:**
```bash
# View model info
curl http://localhost:3000/api/v1/aiml/models/impact-prediction/info

# Check accuracy
curl http://localhost:3000/api/v1/aiml/models/impact-prediction/metrics
```

2. **Test prediction:**
```bash
curl -X POST http://localhost:3000/api/v1/aiml/predict-impact \
  -H "Content-Type: application/json" \
  -d '{
    "ci_id": "ci_12345",
    "incident_type": "outage",
    "duration_minutes": 60
  }'
```

3. **Check training data:**
```bash
# View training data stats
curl http://localhost:3000/api/v1/aiml/models/impact-prediction/training-data-stats
```

**Solution:**

**1. Retrain model:**
```bash
# Trigger model retraining
curl -X POST http://localhost:3000/api/v1/aiml/models/impact-prediction/train \
  -H "Content-Type: application/json" \
  -d '{
    "min_incidents": 100,
    "include_features": ["ci_criticality", "time_of_day", "day_of_week"]
  }'
```

**2. Improve training data:**
```bash
# Import historical incidents
curl -X POST http://localhost:3000/api/v1/itil/incidents/import \
  -F "file=@historical-incidents.csv"

# Validate data quality
curl http://localhost:3000/api/v1/aiml/models/impact-prediction/validate-data
```

**3. Enable auto-retraining:**
```bash
# .env
AIML_AUTO_RETRAIN_ENABLED=true
AIML_RETRAIN_INTERVAL_DAYS=30

# Restart
docker-compose -f infrastructure/docker/docker-compose.yml restart api-server
```

**Prevention:**
- Train model with minimum 100 historical incidents
- Retrain model monthly or when accuracy drops below 80%
- Validate training data quality before training
- Monitor model accuracy over time

---

### Auto-Baseline Failures

**Symptoms:**
- Auto-baseline job fails with "Insufficient data"
- Baselines not updating automatically
- Baseline calculation timeout
- Baseline values incorrect or missing

**Root Cause:**
- Discovery data incomplete
- Not enough historical data points
- Calculation timeout (large dataset)
- Statistics calculation error

**Diagnosis Steps:**

1. **Check auto-baseline status:**
```bash
# View auto-baseline config
curl http://localhost:3000/api/v1/aiml/auto-baseline/status

# Check recent runs
curl http://localhost:3000/api/v1/bullmq/queues/auto-baseline/jobs?status=failed
```

2. **Check data availability:**
```bash
# View metric data points
curl http://localhost:3000/api/v1/aiml/metrics/ci_12345?days=30
```

3. **Manual baseline calculation:**
```bash
curl -X POST http://localhost:3000/api/v1/aiml/auto-baseline/calculate \
  -H "Content-Type: application/json" \
  -d '{"ci_id": "ci_12345"}'
```

**Solution:**

**1. Collect more data:**
```bash
# Enable metric collection
# .env
AIML_METRIC_COLLECTION_ENABLED=true
AIML_METRIC_COLLECTION_INTERVAL_MS=300000  # 5 minutes

# Restart
docker-compose -f infrastructure/docker/docker-compose.yml restart api-server
```

**2. Adjust baseline requirements:**
```bash
# Reduce minimum data points
curl -X PUT http://localhost:3000/api/v1/aiml/auto-baseline/config \
  -H "Content-Type: application/json" \
  -d '{
    "min_data_points": 100,
    "min_days": 7,
    "percentile": 95
  }'
```

**3. Increase timeout:**
```bash
# .env
AIML_AUTO_BASELINE_TIMEOUT_MS=300000  # 5 minutes

# Restart
docker-compose -f infrastructure/docker/docker-compose.yml restart api-server
```

**Prevention:**
- Collect metrics for 7+ days before auto-baseline
- Schedule baseline calculation during off-peak hours
- Monitor metric collection coverage
- Alert on auto-baseline failures

---

## Event Streaming Issues

### Kafka Broker Down

**Symptoms:**
- Event streaming unavailable
- Producers can't publish events
- Consumers not receiving messages
- Kafka container not running

**Root Cause:**
- Kafka container crashed
- Insufficient disk space
- Out of memory
- Network partition

**Diagnosis Steps:**

1. **Check Kafka status:**
```bash
# Check container
docker ps | grep kafka

# Check logs
docker logs cmdb-kafka --tail=100
```

2. **Test connectivity:**
```bash
# Test from producer
docker exec cmdb-api-server nc -zv cmdb-kafka 9092
```

3. **Check disk space:**
```bash
docker exec cmdb-kafka df -h
```

**Solution:**

**1. Restart Kafka:**
```bash
docker-compose -f infrastructure/docker/docker-compose.yml restart kafka
```

**2. Free up disk space:**
```bash
# Clean old logs
docker exec cmdb-kafka kafka-log-dirs.sh --describe --bootstrap-server localhost:9092 | grep "logEndOffset"

# Set retention policy
docker exec cmdb-kafka kafka-configs.sh --alter \
  --bootstrap-server localhost:9092 \
  --entity-type topics \
  --entity-name cmdb-events \
  --add-config retention.ms=604800000  # 7 days
```

**3. Increase resources:**
```yaml
# docker-compose.yml
services:
  kafka:
    environment:
      KAFKA_HEAP_OPTS: "-Xmx2G -Xms2G"  # Increase from 1G
    volumes:
      - kafka-data:/var/lib/kafka/data
```

**Prevention:**
- Monitor Kafka disk usage
- Set retention policies on all topics
- Implement Kafka health checks
- Alert on broker unavailability

---

### Consumer Lag High

**Symptoms:**
- Events delayed by minutes/hours
- Consumer lag increasing
- Events piling up in topics
- Real-time dashboards showing stale data

**Root Cause:**
- Consumer processing too slow
- Not enough consumer instances
- Large message processing time
- Consumer group rebalancing

**Diagnosis Steps:**

1. **Check consumer lag:**
```bash
# View consumer groups
docker exec cmdb-kafka kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --list

# Check lag
docker exec cmdb-kafka kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --group cmdb-event-processor \
  --describe
```

2. **Check processing time:**
```bash
# View metrics
curl http://localhost:3000/api/v1/metrics | grep event_processing_duration
```

**Solution:**

**1. Scale consumers:**
```bash
# Increase consumer instances
docker-compose -f infrastructure/docker/docker-compose.yml scale event-processor=5
```

**2. Optimize processing:**
```typescript
// Batch process events
const events = await consumer.fetchBatch(100);
await Promise.all(events.map(e => processEvent(e)));
```

**3. Increase partitions:**
```bash
# Increase topic partitions
docker exec cmdb-kafka kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --alter \
  --topic cmdb-events \
  --partitions 10
```

**Prevention:**
- Monitor consumer lag continuously
- Auto-scale consumers based on lag
- Optimize event processing logic
- Set lag alerts (<1000 messages)

---

### Dead Letter Queue Filling Up

**Symptoms:**
- DLQ topic growing rapidly
- Failed events not retried
- Event processing errors increasing
- Disk space consumed by DLQ

**Root Cause:**
- Invalid event format
- Processing logic bug
- External service unavailable
- Schema validation errors

**Diagnosis Steps:**

1. **Check DLQ:**
```bash
# View DLQ messages
docker exec cmdb-kafka kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic cmdb-events-dlq \
  --from-beginning \
  --max-messages 10
```

2. **Analyze errors:**
```bash
# View DLQ error patterns
curl http://localhost:3000/api/v1/event-streaming/dlq/errors
```

**Solution:**

**1. Fix processing errors:**
```bash
# View error details
curl http://localhost:3000/api/v1/event-streaming/dlq/errors/detailed

# Fix code and deploy
```

**2. Replay DLQ messages:**
```bash
# Replay to main topic
curl -X POST http://localhost:3000/api/v1/event-streaming/dlq/replay \
  -H "Content-Type: application/json" \
  -d '{"max_messages": 100}'
```

**3. Purge DLQ:**
```bash
# Delete old DLQ messages
docker exec cmdb-kafka kafka-delete-records.sh \
  --bootstrap-server localhost:9092 \
  --offset-json-file /tmp/delete-offsets.json
```

**Prevention:**
- Validate event schema before publishing
- Implement retry logic with exponential backoff
- Monitor DLQ depth
- Alert on DLQ growth

---

### Event Schema Validation Errors

**Symptoms:**
- Events rejected with "Schema validation failed"
- Incompatible schema versions
- Null values in required fields
- Type mismatch errors

**Root Cause:**
- Producer using old schema version
- Schema registry unavailable
- Required fields missing
- Data type incorrect

**Diagnosis Steps:**

1. **Check schema:**
```bash
# View current schema
curl http://localhost:8081/subjects/cmdb-events-value/versions/latest

# View validation errors
docker logs cmdb-api-server | grep "Schema validation"
```

2. **Test event:**
```bash
# Validate event against schema
curl -X POST http://localhost:3000/api/v1/event-streaming/validate \
  -H "Content-Type: application/json" \
  -d @test-event.json
```

**Solution:**

**1. Update schema:**
```bash
# Register new schema version
curl -X POST http://localhost:8081/subjects/cmdb-events-value/versions \
  -H "Content-Type: application/json" \
  -d '{
    "schema": "{\"type\":\"record\",\"name\":\"CMDBEvent\",\"fields\":[...]}"
  }'
```

**2. Fix event format:**
```typescript
// Ensure required fields
const event = {
  event_type: "ci.created",
  timestamp: new Date().toISOString(),
  ci_id: "ci_12345",
  payload: {...},
  metadata: {
    source: "discovery-engine",
    version: "1.0"
  }
};
```

**3. Enable schema evolution:**
```bash
# Set compatibility mode
curl -X PUT http://localhost:8081/config/cmdb-events-value \
  -H "Content-Type: application/json" \
  -d '{"compatibility": "BACKWARD"}'
```

**Prevention:**
- Version schemas properly
- Use schema registry for validation
- Implement backward compatibility
- Test schema changes before deployment

---

## Dashboard Issues

### Dashboard Loading Slowly

**Symptoms:**
- Dashboard takes >10 seconds to load
- Browser shows "Loading..." indefinitely
- Widgets timeout
- Page becomes unresponsive

**Root Cause:**
- Too many widgets (>20)
- Complex queries without caching
- Large datasets (>10,000 records)
- No pagination on data tables

**Diagnosis Steps:**

1. **Check load time:**
```bash
# Check browser network tab
# Identify slow API calls

# Test API directly
time curl http://localhost:3000/api/v1/dashboards/exec-summary
```

2. **Check query performance:**
```sql
-- PostgreSQL slow query log
SELECT query, total_time, calls
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

3. **Check cache:**
```bash
# Verify cache is working
curl http://localhost:3000/api/v1/cache/stats
```

**Solution:**

**1. Enable caching:**
```bash
# .env
DASHBOARD_CACHE_ENABLED=true
DASHBOARD_CACHE_TTL=300  # 5 minutes

# Restart
docker-compose -f infrastructure/docker/docker-compose.yml restart api-server
```

**2. Optimize queries:**
```typescript
// Add indexes
CREATE INDEX idx_ci_status ON cis(ci_status);
CREATE INDEX idx_ci_type ON cis(ci_type);

// Use query limits
const cis = await db.query(`
  SELECT * FROM cis
  WHERE ci_status = 'active'
  LIMIT 100
`);
```

**3. Reduce widget count:**
```bash
# Limit to 12 widgets per dashboard
curl -X PUT http://localhost:3000/api/v1/dashboards/exec-summary \
  -H "Content-Type: application/json" \
  -d '{"max_widgets": 12}'
```

**4. Implement pagination:**
```typescript
// Add pagination to tables
<DataTable
  data={cis}
  pagination={true}
  pageSize={25}
/>
```

**Prevention:**
- Cache dashboard data (TTL: 5 min)
- Limit widgets to 12 per dashboard
- Use pagination for tables
- Monitor query performance

---

### Data Not Refreshing

**Symptoms:**
- Dashboard shows stale data
- Manual refresh doesn't update data
- Real-time updates not working
- "Last updated" timestamp not changing

**Root Cause:**
- Cache not expiring
- WebSocket connection broken
- Event streaming not publishing updates
- Browser cache issue

**Diagnosis Steps:**

1. **Check cache:**
```bash
# View cache entries
docker exec cmdb-redis redis-cli KEYS "dashboard:*"

# Check TTL
docker exec cmdb-redis redis-cli TTL "dashboard:exec-summary"
```

2. **Check WebSocket:**
```bash
# Test WebSocket connection
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  http://localhost:3000/ws
```

3. **Check events:**
```bash
# Verify events are published
docker logs cmdb-kafka | grep "Event published"
```

**Solution:**

**1. Clear cache:**
```bash
# Clear dashboard cache
curl -X POST http://localhost:3000/api/v1/cache/clear \
  -H "Content-Type: application/json" \
  -d '{"pattern": "dashboard:*"}'
```

**2. Restart WebSocket:**
```bash
# Restart API server
docker-compose -f infrastructure/docker/docker-compose.yml restart api-server
```

**3. Enable real-time updates:**
```typescript
// Enable WebSocket in dashboard
const ws = new WebSocket('ws://localhost:3000/ws');
ws.on('message', (data) => {
  // Update dashboard
  updateDashboard(JSON.parse(data));
});
```

**4. Clear browser cache:**
```javascript
// Force refresh in browser
// Ctrl+Shift+R (Windows/Linux)
// Cmd+Shift+R (Mac)
```

**Prevention:**
- Set appropriate cache TTL (5 min for dashboards)
- Implement WebSocket reconnection logic
- Monitor WebSocket connection health
- Add "Last updated" timestamp to UI

---

### Export Failures

**Symptoms:**
- Export to CSV/PDF fails
- Download button does nothing
- Export times out
- Generated file is empty or corrupt

**Root Cause:**
- Dataset too large (>100,000 rows)
- Memory exhaustion during export
- Export timeout (default: 30s)
- File permissions issue

**Diagnosis Steps:**

1. **Check export logs:**
```bash
docker logs cmdb-api-server | grep "Export"
```

2. **Test export:**
```bash
# Test small export
curl -X POST http://localhost:3000/api/v1/dashboards/exec-summary/export \
  -H "Content-Type: application/json" \
  -d '{"format": "csv", "limit": 100}'
```

3. **Check memory:**
```bash
docker stats cmdb-api-server --no-stream
```

**Solution:**

**1. Add pagination to exports:**
```typescript
// Export in chunks
async function exportLargeDataset(query) {
  const chunkSize = 10000;
  let offset = 0;
  const csvStream = fs.createWriteStream('export.csv');

  while (true) {
    const rows = await db.query(`${query} LIMIT ${chunkSize} OFFSET ${offset}`);
    if (rows.length === 0) break;

    csvStream.write(rows.map(r => CSV.stringify(r)).join('\n'));
    offset += chunkSize;
  }

  csvStream.end();
}
```

**2. Increase timeout:**
```bash
# .env
DASHBOARD_EXPORT_TIMEOUT_MS=300000  # 5 minutes

# Restart
docker-compose -f infrastructure/docker/docker-compose.yml restart api-server
```

**3. Use async export:**
```bash
# Trigger async export
curl -X POST http://localhost:3000/api/v1/dashboards/exec-summary/export-async \
  -H "Content-Type: application/json" \
  -d '{"format": "csv", "email": "user@example.com"}'

# Download later
curl -O http://localhost:3000/api/v1/exports/export_12345.csv
```

**Prevention:**
- Limit export to 100,000 rows
- Implement async export for large datasets
- Use streaming for CSV exports
- Monitor export success rate

---

### Real-time Updates Not Working

**Symptoms:**
- Dashboard doesn't update when data changes
- WebSocket disconnected
- "Connection lost" error
- Manual refresh required

**Root Cause:**
- WebSocket service not initialized
- Event streaming disabled
- Browser blocking WebSocket
- Load balancer not supporting WebSocket

**Diagnosis Steps:**

1. **Check WebSocket status:**
```bash
# Test WebSocket endpoint
wscat -c ws://localhost:3000/ws
```

2. **Check browser console:**
```javascript
// Open browser console (F12)
// Look for WebSocket errors
```

3. **Check event streaming:**
```bash
# Verify events are published
curl http://localhost:3000/api/v1/event-streaming/stats
```

**Solution:**

**1. Enable WebSocket:**
```bash
# .env
WEBSOCKET_ENABLED=true
WEBSOCKET_PORT=3000

# Restart
docker-compose -f infrastructure/docker/docker-compose.yml restart api-server
```

**2. Fix browser blocking:**
```javascript
// Use secure WebSocket in production
const wsUrl = window.location.protocol === 'https:'
  ? 'wss://api.example.com/ws'
  : 'ws://localhost:3000/ws';
const ws = new WebSocket(wsUrl);
```

**3. Configure load balancer:**
```nginx
# Nginx config for WebSocket
location /ws {
  proxy_pass http://api-server;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_read_timeout 86400;
}
```

**4. Implement reconnection:**
```typescript
// Auto-reconnect WebSocket
class WebSocketClient {
  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onclose = () => {
      setTimeout(() => this.connect(), 5000);  // Reconnect after 5s
    };
  }
}
```

**Prevention:**
- Enable WebSocket from start
- Implement reconnection logic
- Monitor WebSocket connection count
- Test WebSocket through load balancer

---

## Metabase Issues

### Dashboard Not Loading

**Symptoms:**
- Metabase dashboard shows blank page
- "Failed to load" error
- Infinite loading spinner
- HTTP 500 error

**Root Cause:**
- Metabase service down
- Database connection failed
- Query timeout
- Memory exhaustion

**Diagnosis Steps:**

1. **Check Metabase status:**
```bash
# Check container
docker ps | grep metabase

# Check logs
docker logs cmdb-metabase --tail=100
```

2. **Test connectivity:**
```bash
# Access Metabase UI
curl -v http://localhost:3001

# Check database connection
docker exec cmdb-metabase psql -h cmdb-postgres -U cmdb_user -d cmdb -c "SELECT 1"
```

**Solution:**

**1. Restart Metabase:**
```bash
docker-compose -f infrastructure/docker/docker-compose.yml restart metabase
```

**2. Fix database connection:**
```bash
# Update Metabase database config
# Settings → Admin → Databases → Edit
# Host: cmdb-postgres (not localhost!)
# Port: 5432
# Database: cmdb
```

**3. Increase memory:**
```yaml
# docker-compose.yml
services:
  metabase:
    environment:
      MB_JAVA_OPTS: "-Xmx2g"  # Increase from 1g
```

**Prevention:**
- Monitor Metabase health
- Use container names for DB connections
- Set resource limits in docker-compose
- Implement health checks

---

### Query Timeout

**Symptoms:**
- Dashboard query times out
- "Query took too long" error
- Question won't save
- Partial results returned

**Root Cause:**
- Complex query without indexes
- Large dataset (millions of rows)
- Query timeout too short
- Database overloaded

**Diagnosis Steps:**

1. **Check query:**
```bash
# View running queries
docker exec cmdb-postgres psql -U cmdb_user -d cmdb -c \
  "SELECT pid, now() - query_start as duration, query
   FROM pg_stat_activity
   WHERE state = 'active'
   ORDER BY duration DESC;"
```

2. **Explain query:**
```bash
# Get query plan
docker exec cmdb-postgres psql -U cmdb_user -d cmdb -c \
  "EXPLAIN ANALYZE <your-query>"
```

**Solution:**

**1. Add indexes:**
```sql
-- Add missing indexes
CREATE INDEX idx_incidents_created_at ON itil_incidents(created_at);
CREATE INDEX idx_changes_status ON itil_changes(status);
CREATE INDEX idx_cis_criticality ON cis(criticality_score);
```

**2. Increase timeout:**
```bash
# Metabase settings
# Admin → Settings → General → Query Timeout
# Set to 300 seconds (5 minutes)
```

**3. Optimize query:**
```sql
-- Bad: Full table scan
SELECT * FROM itil_incidents WHERE created_at >= NOW() - INTERVAL '90 days';

-- Good: Use index
SELECT incident_id, priority, status FROM itil_incidents
WHERE created_at >= NOW() - INTERVAL '90 days'
AND status IN ('open', 'in_progress')
LIMIT 1000;
```

**Prevention:**
- Create indexes for common query patterns
- Use date range filters
- Limit result sets
- Monitor slow queries

---

### Database Connection Failed

**Symptoms:**
- "Database connection error" in Metabase
- Can't test database connection
- All dashboards show errors
- Login to database fails

**Root Cause:**
- PostgreSQL service down
- Incorrect credentials
- Network isolation
- Max connections reached

**Diagnosis Steps:**

1. **Check PostgreSQL:**
```bash
# Check service
docker ps | grep postgres

# Test connection
docker exec cmdb-metabase pg_isready -h cmdb-postgres -p 5432
```

2. **Check credentials:**
```bash
# Test login
docker exec cmdb-postgres psql -U cmdb_user -d cmdb -c "SELECT 1"
```

3. **Check connections:**
```bash
# View active connections
docker exec cmdb-postgres psql -U cmdb_user -d cmdb -c \
  "SELECT count(*) FROM pg_stat_activity;"
```

**Solution:**

**1. Restart PostgreSQL:**
```bash
docker-compose -f infrastructure/docker/docker-compose.yml restart postgres
```

**2. Fix credentials:**
```bash
# Update Metabase database connection
# Admin → Databases → Edit cmdb
# Username: cmdb_user
# Password: <from .env>
# Host: cmdb-postgres
```

**3. Increase max connections:**
```yaml
# docker-compose.yml
services:
  postgres:
    command: postgres -c max_connections=200
```

**Prevention:**
- Use container names for connections
- Monitor connection pool usage
- Set max connections appropriately
- Implement connection health checks

---

### Scheduled Reports Not Sending

**Symptoms:**
- Email reports not received
- Report schedule shows "Failed"
- No errors in Metabase UI
- SMTP errors in logs

**Root Cause:**
- SMTP not configured
- Email credentials incorrect
- Firewall blocking port 25/587
- Report generation failed

**Diagnosis Steps:**

1. **Check email config:**
```bash
# View Metabase logs
docker logs cmdb-metabase | grep -i smtp
```

2. **Test SMTP:**
```bash
# Test SMTP connection
telnet smtp.gmail.com 587
```

3. **Check scheduled reports:**
```bash
# Admin → Settings → Email
```

**Solution:**

**1. Configure SMTP:**
```bash
# Metabase environment variables
MB_EMAIL_SMTP_HOST=smtp.gmail.com
MB_EMAIL_SMTP_PORT=587
MB_EMAIL_SMTP_USERNAME=user@example.com
MB_EMAIL_SMTP_PASSWORD=app_password
MB_EMAIL_SMTP_SECURITY=tls
```

**2. Test email:**
```bash
# Send test email
# Admin → Settings → Email → Send Test Email
```

**3. Re-enable reports:**
```bash
# Edit pulse/subscription
# Set new schedule
# Save
```

**Prevention:**
- Configure SMTP during initial setup
- Use app passwords (not account password)
- Test email before creating reports
- Monitor report delivery

---

## Performance Issues

### Slow API Responses

**Symptoms:**
- API endpoints take >5 seconds to respond
- Timeouts on complex queries
- High response times in metrics
- Users complain about slowness

**Root Cause:**
- Missing database indexes
- N+1 query problem
- No caching
- Large payload size

**Diagnosis Steps:**

1. **Check API metrics:**
```bash
# View response times
curl http://localhost:9090/metrics | grep http_request_duration

# Check slow endpoints
curl http://localhost:3000/api/v1/metrics | grep -A 5 "slowest_endpoints"
```

2. **Check database queries:**
```sql
-- PostgreSQL slow queries
SELECT query, total_time, calls, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

3. **Profile request:**
```bash
# Use curl with timing
curl -w "@curl-format.txt" -o /dev/null http://localhost:3000/api/v1/cis

# curl-format.txt:
# time_total: %{time_total}\n
# time_connect: %{time_connect}\n
# time_starttransfer: %{time_starttransfer}\n
```

**Solution:**

**1. Add indexes:**
```sql
-- Analyze queries
EXPLAIN ANALYZE SELECT * FROM cis WHERE ci_status = 'active';

-- Add indexes
CREATE INDEX idx_ci_status ON cis(ci_status);
CREATE INDEX idx_ci_type_status ON cis(ci_type, ci_status);
```

**2. Enable caching:**
```bash
# .env
REDIS_CACHE_ENABLED=true
REDIS_CACHE_TTL=300  # 5 minutes

# Restart
docker-compose -f infrastructure/docker/docker-compose.yml restart api-server
```

**3. Optimize queries:**
```typescript
// Bad: N+1 query
for (const ci of cis) {
  ci.relationships = await getRelationships(ci.id);
}

// Good: Single query
const ciIds = cis.map(c => c.id);
const relationships = await getRelationships(ciIds);
```

**4. Use pagination:**
```typescript
// Add pagination
app.get('/api/v1/cis', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;
  const offset = (page - 1) * limit;

  const cis = await db.query(`
    SELECT * FROM cis
    ORDER BY updated_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  res.json({ data: cis, page, limit });
});
```

**Prevention:**
- Create indexes for common query patterns
- Enable Redis caching
- Use pagination for large datasets
- Monitor API response times

---

### High Memory Usage

**Symptoms:**
- Container using >90% of allocated memory
- Out of memory (OOM) kills
- Swap usage high
- Application crashes

**Root Cause:**
- Memory leak
- Large in-memory cache
- Connection pool leaks
- Large payload processing

**Diagnosis Steps:**

1. **Check memory usage:**
```bash
# Docker stats
docker stats --no-stream

# Process memory
docker exec cmdb-api-server ps aux | sort -nrk 4 | head
```

2. **Check for leaks:**
```bash
# Enable heap profiling
# Add to package.json
"scripts": {
  "start:profile": "node --inspect --max-old-space-size=4096 dist/index.js"
}

# Connect Chrome DevTools
# chrome://inspect
```

3. **Check connections:**
```bash
# Neo4j connections
docker exec cmdb-neo4j cypher-shell "CALL dbms.listConnections()"

# PostgreSQL connections
docker exec cmdb-postgres psql -U cmdb_user -d cmdb -c \
  "SELECT count(*) FROM pg_stat_activity;"
```

**Solution:**

**1. Increase memory limit:**
```yaml
# docker-compose.yml
services:
  api-server:
    deploy:
      resources:
        limits:
          memory: 4G  # Increase from 2G
```

**2. Fix connection leaks:**
```typescript
// Bad: Connection not closed
async function query() {
  const session = neo4j.session();
  const result = await session.run('MATCH (n) RETURN n');
  return result;  // Session leaked!
}

// Good: Always close
async function query() {
  const session = neo4j.session();
  try {
    const result = await session.run('MATCH (n) RETURN n');
    return result;
  } finally {
    await session.close();
  }
}
```

**3. Limit cache size:**
```bash
# .env
REDIS_MAX_MEMORY=2gb
REDIS_MAX_MEMORY_POLICY=allkeys-lru

# Restart
docker-compose -f infrastructure/docker/docker-compose.yml restart redis
```

**4. Use streaming:**
```typescript
// Bad: Load all in memory
const allCIs = await db.query('SELECT * FROM cis');  // 1M rows!
res.json(allCIs);

// Good: Stream results
const stream = db.stream('SELECT * FROM cis');
stream.pipe(res);
```

**Prevention:**
- Close database sessions properly
- Limit in-memory cache size
- Use streaming for large datasets
- Monitor memory usage with alerts

---

### Database Query Performance

**Symptoms:**
- Queries take >10 seconds
- Database CPU at 100%
- Query queue building up
- Locks and deadlocks

**Root Cause:**
- Missing indexes
- Full table scans
- Complex joins
- Lock contention

**Diagnosis Steps:**

1. **Identify slow queries:**
```sql
-- PostgreSQL
SELECT query, total_time, calls, mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;

-- Neo4j
CALL dbms.listQueries() YIELD query, elapsedTimeMillis
WHERE elapsedTimeMillis > 1000
RETURN query, elapsedTimeMillis
ORDER BY elapsedTimeMillis DESC;
```

2. **Explain query:**
```sql
-- PostgreSQL
EXPLAIN ANALYZE
SELECT * FROM cis
WHERE ci_status = 'active'
  AND ci_type = 'server';

-- Look for "Seq Scan" (bad) vs "Index Scan" (good)
```

3. **Check indexes:**
```sql
-- List indexes
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE tablename = 'cis';
```

**Solution:**

**1. Add indexes:**
```sql
-- Composite index for common filters
CREATE INDEX idx_ci_status_type ON cis(ci_status, ci_type);

-- Partial index for active CIs
CREATE INDEX idx_active_cis ON cis(ci_type) WHERE ci_status = 'active';

-- Index for relationships
CREATE INDEX idx_relationships_source ON relationships(source_ci_id);
CREATE INDEX idx_relationships_target ON relationships(target_ci_id);
```

**2. Optimize Neo4j queries:**
```cypher
// Bad: No constraints
MATCH (c:CI {id: 'ci_12345'})-[:DEPENDS_ON*1..5]->(d:CI)
RETURN d

// Good: Use constraints and indexes
CREATE CONSTRAINT ci_id_unique IF NOT EXISTS FOR (c:CI) REQUIRE c.id IS UNIQUE;
CREATE INDEX ci_type_index IF NOT EXISTS FOR (c:CI) ON (c.ci_type);

// Use indexed property
MATCH (c:CI {id: 'ci_12345'})-[:DEPENDS_ON*1..3]->(d:CI)
WHERE d.ci_status = 'active'
RETURN d
LIMIT 100
```

**3. Use query caching:**
```typescript
// Cache query results
const cacheKey = `cis:active:${ciType}`;
let result = await redis.get(cacheKey);

if (!result) {
  result = await db.query(`
    SELECT * FROM cis
    WHERE ci_status = 'active' AND ci_type = $1
  `, [ciType]);

  await redis.setex(cacheKey, 300, JSON.stringify(result));
}
```

**4. Vacuum and analyze:**
```sql
-- PostgreSQL maintenance
VACUUM ANALYZE cis;
VACUUM ANALYZE relationships;

-- Update statistics
ANALYZE;
```

**Prevention:**
- Create indexes for all foreign keys
- Use composite indexes for multi-column filters
- Run VACUUM ANALYZE weekly
- Monitor query performance continuously

---

### Neo4j Graph Traversal Timeout

**Symptoms:**
- Graph queries timeout after 5 minutes
- "Transaction timeout" errors
- Blast radius calculation fails
- Relationship queries incomplete

**Root Cause:**
- Graph too large (millions of nodes)
- No depth limit on traversal
- Missing indexes
- Inefficient Cypher query

**Diagnosis Steps:**

1. **Check graph size:**
```cypher
// Count nodes and relationships
MATCH (n) RETURN count(n) as node_count;
MATCH ()-[r]->() RETURN count(r) as relationship_count;
```

2. **Profile query:**
```cypher
// Profile query to find bottlenecks
PROFILE
MATCH (c:CI {id: 'ci_12345'})-[*1..5]-(related:CI)
RETURN count(related);
```

3. **Check indexes:**
```cypher
// List indexes
CALL db.indexes();
```

**Solution:**

**1. Add depth limit:**
```cypher
// Bad: No limit
MATCH (c:CI {id: 'ci_12345'})-[*]-(related:CI)
RETURN related

// Good: Limit depth
MATCH (c:CI {id: 'ci_12345'})-[*1..3]-(related:CI)
RETURN related
LIMIT 1000
```

**2. Create indexes:**
```cypher
// Create constraints (also creates index)
CREATE CONSTRAINT ci_id_unique IF NOT EXISTS
FOR (c:CI) REQUIRE c.id IS UNIQUE;

// Create indexes
CREATE INDEX ci_type_index IF NOT EXISTS
FOR (c:CI) ON (c.ci_type);

CREATE INDEX ci_status_index IF NOT EXISTS
FOR (c:CI) ON (c.ci_status);
```

**3. Increase timeout:**
```bash
# .env
NEO4J_TRANSACTION_TIMEOUT=300s  # 5 minutes

# neo4j.conf
dbms.transaction.timeout=5m
```

**4. Use APOC procedures:**
```cypher
// Install APOC plugin
// Use optimized path finding
CALL apoc.path.expandConfig('ci_12345', {
  relationshipFilter: "DEPENDS_ON|CONNECTS_TO",
  minLevel: 1,
  maxLevel: 3,
  limit: 1000
})
YIELD path
RETURN path;
```

**Prevention:**
- Always use depth limits (max: 3-5)
- Create indexes on frequently queried properties
- Use APOC for complex graph operations
- Monitor Neo4j query performance

---

**End of Troubleshooting Guide**

For additional help:
- [Operations Documentation](/operations/daily-operations)
- [Quick Reference Card](/operations/QUICK_REFERENCE_CARD)
- [Monitoring Setup](/operations/MONITORING_SETUP_SUMMARY)
- [Backup & Recovery](/operations/backup/strategy)
