# Runbook: Discovery Jobs Failing

**Alert Name**: `HighDiscoveryJobFailureRate`, `CriticalDiscoveryJobFailures`, `DiscoveryJobStuck`, `HighConnectorErrorRate`, `ConnectorCredentialFailure`
**Severity**: Warning / Critical
**Component**: discovery-engine, connectors, agents
**Initial Response Time**: 15 minutes (warning), 10 minutes (critical)

## Symptoms

- Discovery jobs failing at high rate (>5 failures/min warning, >20/min critical)
- Jobs stuck in "running" state for >2 hours
- Connector authentication failures
- No new CI data being discovered
- Discovery job queue growing without processing

## Impact

- **Data Freshness**: CI data becomes stale, outdated
- **Coverage Gaps**: Missing resources, incomplete inventory
- **Compliance Risk**: Inaccurate asset tracking
- **Operations Impact**: Change management decisions based on stale data

## Diagnosis

### 1. Check Discovery Engine Status

```bash
# Check if discovery engine is running
docker ps | grep cmdb-discovery-engine
docker logs cmdb-discovery-engine --tail=100

# Check discovery job metrics
curl -s http://localhost:9090/api/v1/query?query=discovery_jobs_failed_total | jq
curl -s http://localhost:9090/api/v1/query?query=discovery_jobs_running | jq
```

### 2. Check Recent Job Failures

```bash
# Query failed jobs from database
docker exec cmdb-postgres psql -U cmdb_user -d cmdb -c \
  "SELECT id, connector_id, status, error_message, created_at
   FROM discovery_jobs
   WHERE status = 'failed'
   AND created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC
   LIMIT 20;"

# Check job queue status
docker exec cmdb-redis redis-cli llen "bull:discovery:*:wait"
docker exec cmdb-redis redis-cli llen "bull:discovery:*:failed"
```

### 3. Check Connector-Specific Errors

```bash
# View connector logs
docker logs cmdb-discovery-engine 2>&1 | grep -i "connector\|error\|failed"

# Check connector status by type
curl -s http://localhost:3000/api/v1/connectors/status | jq

# Check recent connector errors by type
docker exec cmdb-postgres psql -U cmdb_user -d cmdb -c \
  "SELECT connector_id, COUNT(*) as failure_count,
          array_agg(DISTINCT error_message) as error_messages
   FROM discovery_jobs
   WHERE status = 'failed'
   AND created_at > NOW() - INTERVAL '1 hour'
   GROUP BY connector_id
   ORDER BY failure_count DESC;"
```

### 4. Check Credentials

```bash
# Verify credentials exist and are not expired
docker exec cmdb-postgres psql -U cmdb_user -d cmdb -c \
  "SELECT c.id, c.name, cr.protocol, cr.expires_at,
          CASE WHEN cr.expires_at < NOW() THEN 'EXPIRED' ELSE 'VALID' END as status
   FROM connectors c
   JOIN credentials cr ON c.credential_id = cr.id
   WHERE c.enabled = true;"

# Check for recent authentication failures
docker logs cmdb-discovery-engine 2>&1 | grep -i "auth\|credential\|permission\|unauthorized"
```

### 5. Check Rate Limiting

```bash
# Check for rate limiting errors
docker logs cmdb-discovery-engine 2>&1 | grep -i "rate limit\|throttle\|429"

# Check rate limit violations metric
curl -s http://localhost:9090/api/v1/query?query=connector_rate_limited_total | jq
```

### 6. Check Agent Health (for network-based discovery)

```bash
# Check agent connectivity
docker exec cmdb-postgres psql -U cmdb_user -d cmdb -c \
  "SELECT agent_id, last_heartbeat_at,
          EXTRACT(EPOCH FROM (NOW() - last_heartbeat_at)) as seconds_since_heartbeat
   FROM discovery_agents
   WHERE active = true
   ORDER BY last_heartbeat_at DESC;"

# Check agent logs
docker logs cmdb-discovery-agent --tail=100
```

## Resolution Steps

### Step 1: Restart Discovery Engine

```bash
# Quick restart attempt
docker restart cmdb-discovery-engine

# Monitor startup and job processing
docker logs cmdb-discovery-engine --follow
```

### Step 2: Fix Credential Issues

```bash
# Identify expired or invalid credentials
docker exec cmdb-postgres psql -U cmdb_user -d cmdb -c \
  "SELECT id, name, protocol, expires_at
   FROM credentials
   WHERE expires_at < NOW() OR expires_at < NOW() + INTERVAL '7 days';"

# Update credentials via API or directly in database
curl -X PUT http://localhost:3000/api/v1/credentials/{id} \
  -H "Content-Type: application/json" \
  -d '{
    "auth_data": {
      "access_key": "NEW_KEY",
      "secret_key": "NEW_SECRET"
    }
  }'

# Disable connectors with invalid credentials temporarily
docker exec cmdb-postgres psql -U cmdb_user -d cmdb -c \
  "UPDATE connectors SET enabled = false
   WHERE credential_id IN (
     SELECT id FROM credentials WHERE expires_at < NOW()
   );"
```

### Step 3: Handle Rate Limiting

```bash
# Increase retry delays for rate-limited connectors
docker exec cmdb-postgres psql -U cmdb_user -d cmdb -c \
  "UPDATE discovery_definitions
   SET schedule_interval = schedule_interval * 2
   WHERE connector_id IN (
     SELECT DISTINCT connector_id
     FROM discovery_jobs
     WHERE error_message LIKE '%rate limit%'
     OR error_message LIKE '%429%'
   );"

# Manually pause aggressive connectors
curl -X POST http://localhost:3000/api/v1/connectors/{id}/pause

# Check connector rate limit settings
cat packages/connectors/*/connector.json | jq '.rateLimits'
```

### Step 4: Retry Failed Jobs

```bash
# Retry recently failed jobs
docker exec cmdb-redis redis-cli eval "
  local failed = redis.call('lrange', KEYS[1], 0, -1)
  for i, job in ipairs(failed) do
    redis.call('lpush', KEYS[2], job)
  end
  redis.call('del', KEYS[1])
" 2 "bull:discovery:aws:failed" "bull:discovery:aws:wait"

# Or via API
curl -X POST http://localhost:3000/api/v1/discovery/jobs/retry \
  -H "Content-Type: application/json" \
  -d '{"status": "failed", "hours": 1}'
```

### Step 5: Clear Stuck Jobs

```bash
# Identify stuck jobs
docker exec cmdb-postgres psql -U cmdb_user -d cmdb -c \
  "SELECT id, connector_id, status, started_at,
          EXTRACT(EPOCH FROM (NOW() - started_at))/3600 as hours_running
   FROM discovery_jobs
   WHERE status = 'running'
   AND started_at < NOW() - INTERVAL '2 hours';"

# Mark stuck jobs as failed
docker exec cmdb-postgres psql -U cmdb_user -d cmdb -c \
  "UPDATE discovery_jobs
   SET status = 'failed',
       error_message = 'Job timeout - exceeded 2 hour limit',
       completed_at = NOW()
   WHERE status = 'running'
   AND started_at < NOW() - INTERVAL '2 hours';"

# Kill stuck jobs in queue
docker exec cmdb-redis redis-cli keys "bull:discovery:*:active" | xargs -I {} docker exec cmdb-redis redis-cli del {}
```

### Step 6: Fix Connector-Specific Issues

**AWS Connector Issues**:
```bash
# Check IAM permissions
aws sts get-caller-identity
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::ACCOUNT:user/cmdb \
  --action-names ec2:DescribeInstances

# Update AWS credentials
docker exec cmdb-postgres psql -U cmdb_user -d cmdb -c \
  "UPDATE credentials
   SET auth_data = jsonb_set(auth_data, '{access_key}', '\"NEW_KEY\"')
   WHERE protocol = 'aws';"
```

**Azure Connector Issues**:
```bash
# Check service principal permissions
az login --service-principal -u CLIENT_ID -p CLIENT_SECRET --tenant TENANT_ID
az account show

# Test Azure API access
az vm list --query "[0]"
```

**Network Discovery Issues**:
```bash
# Test SSH connectivity
docker exec cmdb-discovery-agent ssh -o ConnectTimeout=5 user@target-host "echo OK"

# Test SNMP
docker exec cmdb-discovery-agent snmpwalk -v2c -c public target-host system
```

### Step 7: Scale Discovery Workers (if backlog growing)

```bash
# Check queue depth
docker exec cmdb-redis redis-cli llen "bull:discovery:*:wait"

# Increase worker concurrency (edit docker-compose.yml)
# Or temporarily:
docker exec cmdb-discovery-engine node -e "
  process.env.DISCOVERY_WORKER_CONCURRENCY = '10';  // Increase from 5
"

# Add more discovery engine instances
docker-compose -f infrastructure/docker/docker-compose.yml up -d --scale discovery-engine=3
```

## Verification

After resolution:

1. **Job Success Rate**: >95% of jobs succeeding
2. **No Stuck Jobs**: All jobs completing within expected time
3. **Credentials Valid**: All credentials authenticated successfully
4. **Queue Healthy**: Queue depth stable or decreasing
5. **CIs Updated**: Recent CI discovery timestamps
6. **No Errors**: Discovery engine logs show no errors

## Escalation

If issue persists after 1 hour:

1. **Escalate to**: Senior DevOps Engineer / Cloud Platform Team
2. **Provide**:
   - Failed job details (connector type, error messages)
   - Credential status
   - Rate limiting errors
   - Recent connector changes
   - Queue depth trends
3. **Consider**:
   - Temporarily disable problematic connectors
   - Contact cloud provider support (if API issues)
   - Rollback recent connector updates

## Post-Incident Actions

1. **Review connector configurations** - Validate all settings
2. **Credential rotation policy** - Implement automated rotation
3. **Rate limit monitoring** - Add alerts for rate limit approaches
4. **Load testing** - Test discovery at scale
5. **Documentation** - Update connector troubleshooting guides
6. **Credential expiration tracking** - Automate expiration alerts

## Common Causes

| Cause | Frequency | Prevention |
|-------|-----------|------------|
| Expired credentials | High | Automated credential rotation, expiration alerts |
| Rate limiting by cloud provider | High | Implement backoff, reduce discovery frequency |
| Network connectivity issues | Medium | Agent health monitoring, network redundancy |
| Insufficient API permissions | Medium | Permission validation on credential creation |
| Connector code bugs | Low | Thorough testing, staged rollouts |
| Database connection issues | Low | Connection pool monitoring |
| Queue worker crashes | Low | Worker health checks, auto-restart |

## Related Runbooks

- [Database Connection Issues](./database-connection-issues.md)
- [Rate Limiting Issues](./rate-limiting-issues.md)
- [Performance Degradation](./performance-degradation.md)

## Useful Commands

```bash
# Discovery job summary
docker exec cmdb-postgres psql -U cmdb_user -d cmdb -c \
  "SELECT status, COUNT(*) as count
   FROM discovery_jobs
   WHERE created_at > NOW() - INTERVAL '1 hour'
   GROUP BY status;"

# Retry all failed jobs from last hour
curl -X POST http://localhost:3000/api/v1/discovery/jobs/retry-failed

# View connector health dashboard
curl -s http://localhost:3000/api/v1/connectors/health | jq

# Check queue stats
docker exec cmdb-redis redis-cli --scan --pattern "bull:discovery:*" | wc -l

# Clear failed job queue
docker exec cmdb-redis redis-cli keys "bull:discovery:*:failed" | xargs docker exec cmdb-redis redis-cli del

# Pause all discovery
curl -X POST http://localhost:3000/api/v1/discovery/pause

# Resume all discovery
curl -X POST http://localhost:3000/api/v1/discovery/resume
```

## Monitoring Queries

```promql
# Discovery job failure rate
rate(discovery_jobs_failed_total[5m])

# Jobs by status
discovery_jobs_running
discovery_jobs_pending

# Connector error rate
rate(connector_errors_total[5m])

# Authentication failures
increase(connector_auth_failures_total[5m])

# Rate limit violations
rate(connector_rate_limited_total[5m])

# Job completion time (p95)
histogram_quantile(0.95, rate(discovery_job_duration_seconds_bucket[5m]))
```
