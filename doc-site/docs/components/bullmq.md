---
title: BullMQ Queue Management
description: Queue management, job orchestration, and worker configuration
---

# BullMQ Queue Management

Queue management system for job orchestration using BullMQ with Redis backend.

## Queue Names

### Discovery Queues
- `discovery:aws` - AWS resource discovery
- `discovery:azure` - Azure resource discovery
- `discovery:gcp` - GCP resource discovery
- `discovery:ssh` - SSH-based server discovery
- `discovery:nmap` - Network mapping

### ETL Queues
- `etl:sync` - Incremental Neo4j → PostgreSQL sync
- `etl:change-detection` - CI change detection
- `etl:reconciliation` - Data reconciliation
- `etl:full-refresh` - Full data refresh

## CLI Commands

### Worker Management

```bash
# Start all workers with schedulers
cmdb worker start all -s

# Start discovery workers only
cmdb worker start discovery

# Start ETL workers only
cmdb worker start etl

# Stop workers
cmdb worker stop all

# Check worker status
cmdb worker status

# Pause a worker
cmdb worker pause aws-discovery-worker

# Resume a worker
cmdb worker resume aws-discovery-worker
```

### Job Management

```bash
# List jobs in a queue
cmdb jobs list discovery:aws
cmdb jobs list discovery:aws -s failed -l 50

# Run discovery job
cmdb jobs run:discovery aws
cmdb jobs run:discovery azure -c '{"regions":["eastus"]}'

# Run ETL job
cmdb jobs run:etl sync
cmdb jobs run:etl full-refresh

# Check job status
cmdb jobs status discovery:aws <job-id>

# Retry failed job
cmdb jobs retry discovery:aws <job-id>

# Cancel job
cmdb jobs cancel discovery:aws <job-id>

# Get queue statistics
cmdb jobs stats
cmdb jobs stats discovery:aws
```

## API Endpoints

### Trigger Jobs

**Discovery Job:**
```bash
POST /api/v1/jobs/discovery/:provider

curl -X POST http://localhost:3000/api/v1/jobs/discovery/aws \
  -H "Content-Type: application/json" \
  -d '{"config": {"regions": ["us-east-1"]}, "triggeredBy": "admin"}'
```

**ETL Job:**
```bash
POST /api/v1/jobs/etl/:type

curl -X POST http://localhost:3000/api/v1/jobs/etl/sync \
  -H "Content-Type: application/json" \
  -d '{"config": {"batchSize": 1000}, "triggeredBy": "admin"}'
```

### Job Status

**Get Job Status:**
```bash
GET /api/v1/jobs/:queueName/:jobId

curl http://localhost:3000/api/v1/jobs/discovery:aws/12345
```

**List Jobs:**
```bash
GET /api/v1/jobs/:queueName?state=waiting&start=0&end=99

curl http://localhost:3000/api/v1/jobs/discovery:aws?state=failed
```

### Job Management

**Retry Job:**
```bash
POST /api/v1/jobs/:queueName/:jobId/retry

curl -X POST http://localhost:3000/api/v1/jobs/discovery:aws/12345/retry
```

**Cancel Job:**
```bash
DELETE /api/v1/jobs/:queueName/:jobId

curl -X DELETE http://localhost:3000/api/v1/jobs/discovery:aws/12345
```

**Clean Queue:**
```bash
POST /api/v1/jobs/:queueName/clean

curl -X POST http://localhost:3000/api/v1/jobs/discovery:aws/clean \
  -H "Content-Type: application/json" \
  -d '{"grace": 3600000, "limit": 1000, "type": "completed"}'
```

### Queue Monitoring

**Get All Queue Stats:**
```bash
GET /api/v1/queues/stats

curl http://localhost:3000/api/v1/queues/stats
```

**Get Queue Metrics:**
```bash
GET /api/v1/queues/:queueName/metrics

curl http://localhost:3000/api/v1/queues/discovery:aws/metrics
```

**Get Worker Status:**
```bash
GET /api/v1/queues/workers/status

curl http://localhost:3000/api/v1/queues/workers/status
```

**Pause/Resume Queue:**
```bash
# Pause
POST /api/v1/queues/:queueName/pause
curl -X POST http://localhost:3000/api/v1/queues/discovery:aws/pause

# Resume
POST /api/v1/queues/:queueName/resume
curl -X POST http://localhost:3000/api/v1/queues/discovery:aws/resume
```

### Schedule Management

**Get Discovery Schedules:**
```bash
GET /api/v1/jobs/schedules/discovery

curl http://localhost:3000/api/v1/jobs/schedules/discovery
```

**Update Discovery Schedule:**
```bash
PUT /api/v1/jobs/schedules/discovery/:provider

curl -X PUT http://localhost:3000/api/v1/jobs/schedules/discovery/aws \
  -H "Content-Type: application/json" \
  -d '{"cronPattern": "*/30 * * * *"}'
```

## Programmatic Usage

### TypeScript/JavaScript

**Get Queue Manager:**
```typescript
import { getQueueManager, QUEUE_NAMES } from '@cmdb/common';

const queueManager = getQueueManager();
const queue = queueManager.getQueue(QUEUE_NAMES.DISCOVERY_AWS);
```

**Add Job:**
```typescript
import { getQueueManager, QUEUE_NAMES } from '@cmdb/common';
import type { DiscoveryJobData } from '@cmdb/common';

const queueManager = getQueueManager();

const jobData: DiscoveryJobData = {
  jobId: 'uuid-here',
  provider: 'aws',
  config: {
    regions: ['us-east-1'],
  },
  createdAt: new Date().toISOString(),
  triggeredBy: 'system',
};

const job = await queueManager.addJob(
  QUEUE_NAMES.DISCOVERY_AWS,
  'discovery-aws',
  jobData
);

console.log(`Job ${job.id} queued`);
```

**Get Job Status:**
```typescript
const job = await queueManager.getJob(QUEUE_NAMES.DISCOVERY_AWS, 'job-id');
const state = await job.getState();
const progress = job.progress;

console.log(`Job state: ${state}`);
console.log(`Progress: ${JSON.stringify(progress)}`);
```

**Start Workers:**
```typescript
import { getDiscoveryWorkerManager } from '@cmdb/discovery-engine';
import { getDiscoveryScheduler } from '@cmdb/discovery-engine';

const workerManager = getDiscoveryWorkerManager();
await workerManager.start();

const scheduler = getDiscoveryScheduler();
await scheduler.start();

console.log('Discovery workers and schedulers started');
```

## Cron Patterns

Common cron patterns for scheduling:

```
*/5 * * * *     - Every 5 minutes
*/15 * * * *    - Every 15 minutes
*/30 * * * *    - Every 30 minutes
0 * * * *       - Every hour
0 */2 * * *     - Every 2 hours
0 0 * * *       - Daily at midnight
0 2 * * *       - Daily at 2 AM
0 0 * * 0       - Weekly (Sunday midnight)
0 0 1 * *       - Monthly (1st at midnight)
```

## Job States

- `waiting` - Job queued, waiting to be processed
- `active` - Job currently being processed
- `completed` - Job finished successfully
- `failed` - Job failed (may retry)
- `delayed` - Job delayed (scheduled for future)
- `paused` - Queue/job paused

## Error Categories

### Transient Errors
- Network timeouts
- Temporary service unavailability
- **Action**: Retry with exponential backoff

### Permanent Errors
- Validation failures
- Authentication errors
- Resource not found
- **Action**: No retry, notify admin

### Resource Errors
- Rate limit exceeded
- Quota exceeded
- **Action**: Retry with longer backoff

### System Errors
- Database connection failures
- Service down
- **Action**: Retry, notify admin

## Monitoring Queries

### PostgreSQL

**Job success rate:**
```sql
SELECT
  queue_name,
  COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*) as success_rate
FROM job_results
WHERE completed_at >= NOW() - INTERVAL '24 hours'
GROUP BY queue_name;
```

**Job performance:**
```sql
SELECT
  queue_name,
  AVG(duration_ms) as avg_duration,
  MIN(duration_ms) as min_duration,
  MAX(duration_ms) as max_duration
FROM job_results
WHERE completed_at >= NOW() - INTERVAL '24 hours'
GROUP BY queue_name;
```

**Failed jobs:**
```sql
SELECT
  job_id, queue_name, error, completed_at
FROM job_results
WHERE status = 'failed'
ORDER BY completed_at DESC
LIMIT 50;
```

### Redis (via redis-cli)

**Check queue length:**
```bash
redis-cli llen bull:discovery:aws:wait
```

**List active jobs:**
```bash
redis-cli lrange bull:discovery:aws:active 0 -1
```

**Get job data:**
```bash
redis-cli hgetall bull:discovery:aws:12345
```

## Troubleshooting

### Workers not starting
```bash
# Check Redis connection
redis-cli ping

# Check logs
tail -f /var/log/cmdb/worker.log

# Verify worker status
cmdb worker status
```

### Jobs stuck in waiting
```bash
# Check worker status
cmdb worker status

# Check queue stats
cmdb jobs stats discovery:aws

# Resume paused queue
curl -X POST http://localhost:3000/api/v1/queues/discovery:aws/resume
```

### High failure rate
```bash
# Get failed jobs
cmdb jobs list discovery:aws -s failed

# Check error patterns
curl http://localhost:3000/api/v1/jobs/discovery:aws/failed | jq '.data.failedJobs[].failedReason'

# Review job logs
cmdb jobs status discovery:aws <job-id>
```

### Memory issues
```bash
# Clean completed jobs
curl -X POST http://localhost:3000/api/v1/jobs/discovery:aws/clean

# Check queue depth
cmdb jobs stats

# Adjust concurrency (in worker config)
```

## Best Practices

1. **Always use schedulers in production** to ensure consistent job execution
2. **Monitor queue depths** to detect processing bottlenecks
3. **Set appropriate timeouts** based on job complexity
4. **Use rate limiting** to avoid overwhelming external services
5. **Clean old jobs regularly** to prevent memory issues
6. **Track job metrics** for performance optimization
7. **Set up alerts** for high failure rates
8. **Use job priorities** for critical jobs
9. **Implement idempotent jobs** for safe retries
10. **Log comprehensive job metadata** for debugging

## See Also

- [CLI Commands Reference](/quick-reference/cli-commands)
- [Troubleshooting Guide](/operations/troubleshooting)
- [Operations Guide](/operations/daily-operations)
