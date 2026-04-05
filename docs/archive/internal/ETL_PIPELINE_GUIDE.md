# ETL Pipeline Guide - Populating Dashboards with Real Data

## Overview

ConfigBuddy v3.0 includes a comprehensive ETL pipeline that syncs data from Neo4j (graph database) to PostgreSQL (data mart) for reporting and dashboards. This guide explains how to use the ETL pipeline to replace mock data with real data.

## ETL Architecture

```
Neo4j (Graph DB) ──> ETL Jobs ──> PostgreSQL (Data Mart) ──> Metabase Dashboards
                         │
                         ├─ CI Sync (dim_ci)
                         ├─ Cost Sync (tbm_cost_pools)
                         └─ ITIL Sync (fact_incidents, fact_changes)
```

## Components

### 1. ETL Jobs

**CI Sync Job** (`sync-cis-to-datamart`)
- **What**: Syncs Configuration Items from Neo4j to PostgreSQL `dim_ci` table
- **Includes**: ITIL attributes, TBM attributes, BSM attributes
- **Schedule**: Every 6 hours (`0 */6 * * *`)
- **Pattern**: Type 2 Slowly Changing Dimension (SCD) - maintains history
- **Location**: `packages/etl-processor/src/jobs/sync-cis-to-datamart.job.ts`

**Cost Sync Job** (`sync-costs-to-datamart`)
- **What**: Validates and enriches TBM cost data in `tbm_cost_pools` table
- **Includes**: Cost allocation, CI mappings, TBM tower classification
- **Schedule**: Daily at 4:00 AM UTC (`0 4 * * *`)
- **Location**: `packages/etl-processor/src/jobs/sync-costs-to-datamart.job.ts`

**Incident Sync Job** (`sync-incidents-to-datamart`)
- **What**: Validates ITIL incidents and changes, calculates SLA compliance
- **Includes**: Incident metrics, change metrics, SLA violations
- **Schedule**: Every 15 minutes (`*/15 * * * *`)
- **Location**: `packages/etl-processor/src/jobs/sync-incidents-to-datamart.job.ts`

### 2. Scheduler

**V3 ETL Scheduler** (`v3-etl-scheduler.ts`)
- Orchestrates all ETL jobs with cron schedules
- Provides manual trigger methods
- Monitors queue health
- Location: `packages/etl-processor/src/schedulers/v3-etl-scheduler.ts`

### 3. Workers

**BullMQ Workers** (`v3-etl.worker.ts`)
- Process jobs from Redis queues
- Handle retries with exponential backoff
- Emit metrics and logs
- Location: `packages/etl-processor/src/workers/v3-etl.worker.ts`

## Quick Start

### Option 1: Automatic (Scheduled ETL)

Start the ETL processor service and let it run automatically:

```bash
# Start ETL processor (includes v3 ETL pipeline)
cd packages/etl-processor
npm run start

# Or run from Docker
docker-compose -f infrastructure/docker/docker-compose.yml up -d etl-processor
```

The ETL scheduler will automatically run:
- CI sync every 6 hours
- Cost sync daily at 4:00 AM
- Incident sync every 15 minutes

### Option 2: Manual Trigger (On-Demand)

Trigger ETL jobs manually via API or CLI:

**Via API Server:**

```typescript
import { getV3ETLScheduler } from '@cmdb/etl-processor';

// Trigger CI sync
const scheduler = getV3ETLScheduler();
const jobId = await scheduler.triggerCISync({
  batchSize: 100,
  fullRefresh: false, // Set to true for full refresh
  ciTypes: ['server', 'virtual-machine'], // Optional: specific types only
});

// Trigger cost validation
await scheduler.triggerCostValidation({
  fiscalPeriod: '2025-11', // YYYY-MM format
  monthsToProcess: 3, // Backfill 3 months
  validateAllocations: true,
});

// Trigger incident sync
await scheduler.triggerIncidentSync({
  includeChanges: true,
  calculateSLAs: true,
});
```

**Via CLI (if CLI tool exists):**

```bash
# Trigger CI sync
npm run etl:sync-cis

# Trigger cost validation
npm run etl:sync-costs -- --fiscal-period=2025-11

# Trigger incident sync
npm run etl:sync-incidents
```

### Option 3: Direct Database Seed

Load TBM business service templates directly:

```bash
cd packages/database/seed-data
npx ts-node load-business-services.ts
```

## Data Flow by Dashboard

### CIO Dashboard
**Data Sources:**
- `dim_ci` - Total CI count, CI by type
- `tbm_cost_pools` - Monthly/annual IT spend, cost by TBM tower
- `fact_incidents` - Incident counts, SLA compliance, MTTR
- `fact_changes` - Change success rate, change volume
- `v_business_service_health` - Service health status

**ETL Jobs Required:**
1. CI Sync (for CI metrics)
2. Cost Sync (for financial metrics)
3. Incident Sync (for ITIL metrics)
4. Business Service Seed Data (for service catalog)

### Service Owner Dashboard
**Data Sources:**
- `dim_business_services` - Service details
- `ci_business_service_mappings` - CIs supporting each service
- `fact_business_service_incidents` - Service-specific incident metrics
- `fact_business_service_changes` - Service-specific change metrics

**ETL Jobs Required:**
1. CI Sync (to populate service-CI mappings)
2. Incident Sync (to aggregate service-level metrics)
3. Business Service Seed Data

### Admin Dashboard
**Data Sources:**
- `dim_ci` - CI inventory
- `connector_run_history` - Connector execution metrics
- `discovery_agents` - Agent health and coverage
- `anomalies`, `drift_detection_results` - AI insights

**ETL Jobs Required:**
1. CI Sync (for inventory tracking)
2. Connector/Discovery data (already in PostgreSQL)

## Monitoring ETL Pipeline

### Check Queue Status

```typescript
import { getV3ETLScheduler } from '@cmdb/etl-processor';

const scheduler = getV3ETLScheduler();
const stats = await scheduler.getStats();

console.log('CI Queue:', stats.cis);
console.log('Cost Queue:', stats.costs);
console.log('Incident Queue:', stats.incidents);
```

### Check Worker Health

```typescript
import { getV3ETLWorkerManager } from '@cmdb/etl-processor';

const workerManager = getV3ETLWorkerManager();
const workers = workerManager.getWorkers();

// Workers are running if initialized
console.log('CI Sync Worker:', workers.ciSync);
console.log('Cost Validation Worker:', workers.costValidation);
console.log('Incident Sync Worker:', workers.incidentSync);
```

### View Job Logs

ETL jobs log to the standard logger with `[SyncCIsToDatamart]`, `[SyncCostsToDatamart]`, `[SyncIncidentsToDatamart]` prefixes.

```bash
# View ETL logs
docker logs cmdb-etl-processor | grep "SyncCIs"
docker logs cmdb-etl-processor | grep "SyncCosts"
docker logs cmdb-etl-processor | grep "SyncIncidents"
```

## Troubleshooting

### Dashboards Show Mock Data

**Cause**: ETL pipeline hasn't run yet or data sources are empty

**Solution**:
1. Check if CIs exist in Neo4j:
   ```cypher
   MATCH (ci:CI) RETURN count(ci) AS total_cis
   ```

2. Manually trigger CI sync:
   ```typescript
   await scheduler.triggerCISync({ fullRefresh: true });
   ```

3. Check PostgreSQL data mart:
   ```sql
   SELECT count(*) FROM cmdb.dim_ci;
   SELECT count(*) FROM tbm_cost_pools;
   SELECT count(*) FROM dim_business_services;
   ```

### ETL Jobs Failing

**Common Issues**:
- Neo4j connection failure → Check `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`
- PostgreSQL connection failure → Check `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DATABASE`
- Redis connection failure → Check `REDIS_HOST`, `REDIS_PORT`
- Schema mismatch → Run database migrations: `npm run db:migrate`

**Check Logs**:
```bash
# View worker errors
docker logs cmdb-etl-processor --tail 100

# View BullMQ queue status in Redis
redis-cli
> LLEN bull:etl:cis:wait
> LLEN bull:etl:cis:failed
```

### Incremental vs Full Refresh

**Incremental Sync** (default):
- Only syncs CIs updated since last run
- Fast and efficient
- Use for regular scheduled runs

**Full Refresh**:
- Syncs ALL CIs regardless of update time
- Slower but guarantees completeness
- Use after major changes or data corrections

```typescript
// Full refresh
await scheduler.triggerCISync({
  fullRefresh: true,
  batchSize: 50, // Lower batch size for large datasets
});
```

## Production Recommendations

1. **Run ETL as Separate Service**
   - Deploy ETL processor independently from API server
   - Scale workers based on data volume
   - Use separate Redis instance for job queues (optional)

2. **Tune Schedules Based on Data Volume**
   ```typescript
   // High-volume environments (millions of CIs)
   // CI sync: Every 12 hours instead of 6
   // Cost sync: Weekly instead of daily
   // Incident sync: Every 30 minutes instead of 15
   ```

3. **Monitor Resource Usage**
   - CI sync can be memory-intensive for large datasets
   - Use batching (`batchSize: 100`)
   - Monitor PostgreSQL connection pool

4. **Set Up Alerts**
   - Alert if ETL jobs fail 3+ times in a row
   - Alert if queue depth exceeds threshold
   - Monitor SLA violations from incident sync

5. **Data Retention**
   - Configure BullMQ job retention:
     ```typescript
     removeOnComplete: 100, // Keep last 100 successful jobs
     removeOnFail: 500,     // Keep last 500 failed jobs
     ```

## Next Steps

1. **Populate Neo4j with CIs**
   - Run discovery jobs (NMAP, SSH, Active Directory)
   - Import from connectors (AWS, Azure, GCP, ServiceNow)

2. **Load Business Service Templates**
   ```bash
   cd packages/database/seed-data
   npx ts-node load-business-services.ts
   ```

3. **Trigger Initial ETL Sync**
   ```typescript
   await scheduler.triggerCISync({ fullRefresh: true });
   await scheduler.triggerCostValidation({ monthsToProcess: 12 });
   await scheduler.triggerIncidentSync();
   ```

4. **Verify Dashboard Data**
   - Check Metabase dashboards at http://localhost:3001
   - Verify data is no longer mock data
   - Validate metrics match expectations

5. **Enable Scheduled ETL**
   - Let ETL scheduler run automatically
   - Monitor logs and queue health
   - Adjust schedules as needed

## References

- ETL Jobs: `packages/etl-processor/src/jobs/`
- ETL Scheduler: `packages/etl-processor/src/schedulers/v3-etl-scheduler.ts`
- ETL Workers: `packages/etl-processor/src/workers/v3-etl.worker.ts`
- Business Service Seed Data: `packages/database/seed-data/business-services-tbm.json`
- Database Schema: `packages/database/src/postgres/migrations/001_complete_schema.sql`
