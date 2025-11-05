---
title: Troubleshooting
description: Comprehensive guide for diagnosing and resolving common issues
---

# Troubleshooting

Comprehensive guide for diagnosing and resolving common issues in ConfigBuddy CMDB platform.

## Quick Diagnosis

### System Health Check

Run this comprehensive health check first:

```bash
#!/bin/bash
# Quick health check script

echo "=== Pod Status ==="
kubectl get pods -n cmdb

echo -e "\n=== Service Endpoints ==="
kubectl get endpoints -n cmdb

echo -e "\n=== Recent Events ==="
kubectl get events -n cmdb --sort-by='.lastTimestamp' | tail -20

echo -e "\n=== API Health ==="
curl -f https://cmdb.example.com/health || echo "API UNHEALTHY"

echo -e "\n=== Database Connectivity ==="
kubectl exec -n cmdb neo4j-0 -- cypher-shell -u neo4j -p <password> "RETURN 1" 2>&1 | grep -q "1" && echo "Neo4j: OK" || echo "Neo4j: FAILED"
kubectl exec -n cmdb postgresql-0 -- psql -U cmdb_user -d cmdb_datamart -c "SELECT 1" 2>&1 | grep -q "1 row" && echo "PostgreSQL: OK" || echo "PostgreSQL: FAILED"
kubectl exec -n cmdb redis-0 -- redis-cli -a <password> PING 2>&1 | grep -q "PONG" && echo "Redis: OK" || echo "Redis: FAILED"

echo -e "\n=== Queue Status ==="
kubectl exec -n cmdb redis-0 -- redis-cli -a <password> LLEN bullmq:discovery:aws:wait

echo -e "\n=== Recent Errors ==="
kubectl logs -n cmdb -l app=api-server --since=10m | grep -i error | tail -10
```

### Decision Tree

```
Is the API responding?
├─ NO → Check API Server Issues
└─ YES
    ├─ Are discovery jobs failing?
    │  ├─ YES → Check Discovery Job Failures
    │  └─ NO
    │      ├─ Is ETL lagging?
    │      │  ├─ YES → Check ETL Sync Issues
    │      │  └─ NO
    │      │      ├─ Are database queries slow?
    │      │      │  ├─ YES → Check Performance Problems
    │      │      │  └─ NO → Check application logs
```

## API Server Issues

### Issue 1: API Server Not Responding

**Symptoms:**
- `curl https://cmdb.example.com/health` returns error
- No response or timeout
- 502 Bad Gateway errors

**Diagnosis:**

```bash
# Check pod status
kubectl get pods -n cmdb -l app=api-server

# Check pod logs
kubectl logs -n cmdb -l app=api-server --tail=100

# Check service
kubectl get service api-server -n cmdb
kubectl describe service api-server -n cmdb

# Check ingress
kubectl get ingress -n cmdb
kubectl describe ingress cmdb-ingress -n cmdb
```

**Common Causes & Solutions:**

**Cause 1: Pods not running**

```bash
# Check why pods are not starting
kubectl describe pod <api-server-pod> -n cmdb

# Common issues:
# - ImagePullBackOff: Check image name and registry credentials
# - CrashLoopBackOff: Check application logs for startup errors
# - Pending: Check resource availability

# Solution: Delete pod to restart
kubectl delete pod <api-server-pod> -n cmdb
```

**Cause 2: Database connection failure**

```bash
# Check database connectivity from pod
kubectl exec -n cmdb <api-server-pod> -- nc -zv neo4j 7687
kubectl exec -n cmdb <api-server-pod> -- nc -zv postgresql 5433

# Check environment variables
kubectl exec -n cmdb <api-server-pod> -- env | grep -E 'NEO4J|POSTGRES|REDIS'

# Solution: Verify secrets and restart pod
kubectl delete pod <api-server-pod> -n cmdb
```

**Cause 3: Ingress misconfiguration**

```bash
# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

# Check ingress configuration
kubectl get ingress cmdb-ingress -n cmdb -o yaml

# Solution: Update ingress rules
kubectl edit ingress cmdb-ingress -n cmdb
```

### Issue 2: High Latency / Slow Responses

**Symptoms:**
- API responses taking > 2 seconds
- Timeouts on complex queries
- p95 latency > 5 seconds

**Diagnosis:**

```bash
# Check API metrics
curl https://cmdb.example.com/metrics | grep http_request_duration

# Check database query performance
kubectl exec -n cmdb neo4j-0 -- cypher-shell -u neo4j -p <password> "
  CALL dbms.listQueries()
  YIELD queryId, query, elapsedTimeMillis
  WHERE elapsedTimeMillis > 1000
  RETURN queryId, query, elapsedTimeMillis;
"

# Check resource usage
kubectl top pods -n cmdb -l app=api-server
```

**Solutions:**

```bash
# Solution 1: Scale API server
kubectl scale deployment/api-server --replicas=5 -n cmdb

# Solution 2: Increase resource limits
kubectl edit deployment/api-server -n cmdb
# Update resources.limits.cpu and resources.limits.memory

# Solution 3: Clear cache
kubectl exec -n cmdb redis-0 -- redis-cli -a <password> FLUSHDB
```

### Issue 3: 401 Unauthorized Errors

**Symptoms:**
- API returns 401 for valid credentials
- Authentication failures

**Diagnosis:**

```bash
# Check API logs for auth errors
kubectl logs -n cmdb -l app=api-server | grep -i "unauthorized\|401"

# Verify JWT secret is configured
kubectl get secret cmdb-secrets -n cmdb -o jsonpath='{.data.jwt-secret}' | base64 -d

# Test authentication
curl -X POST https://cmdb.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

**Solutions:**

```bash
# Solution 1: Regenerate JWT secret
kubectl create secret generic cmdb-secrets \
  --from-literal=jwt-secret=$(openssl rand -hex 32) \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart API server
kubectl rollout restart deployment/api-server -n cmdb
```

### Issue 4: Rate Limiting Errors (429)

**Symptoms:**
- API returns 429 Too Many Requests
- Legitimate users being rate limited

**Solutions:**

```bash
# Solution 1: Increase rate limits
kubectl set env deployment/api-server -n cmdb \
  API_RATE_LIMIT_WINDOW=60000 \
  API_RATE_LIMIT_MAX=1000

# Solution 2: Add more API server replicas
kubectl scale deployment/api-server --replicas=5 -n cmdb
```

## Discovery Job Failures

### Issue 1: AWS Discovery Failing

**Symptoms:**
- Discovery jobs status = "failed"
- Error: "AWS credentials not found"
- Error: "Access denied" for AWS services

**Diagnosis:**

```bash
# Check discovery job details
curl -X GET https://cmdb.example.com/api/v1/discovery/jobs/<job-id> \
  -H "Authorization: Bearer <api-key>"

# Check discovery engine logs
kubectl logs -n cmdb -l app=discovery-engine,provider=aws --tail=100

# Verify AWS credentials
kubectl exec -n cmdb <discovery-engine-pod> -- env | grep AWS

# Test AWS connectivity
kubectl exec -n cmdb <discovery-engine-pod> -- \
  aws ec2 describe-regions --output text
```

**Solutions:**

**Solution 1: Update AWS credentials**

```bash
# Update secret with valid credentials
kubectl create secret generic aws-credentials \
  --from-literal=AWS_ACCESS_KEY_ID=<key> \
  --from-literal=AWS_SECRET_ACCESS_KEY=<secret> \
  --from-literal=AWS_REGION=us-east-1 \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart discovery engine
kubectl rollout restart deployment/discovery-engine -n cmdb
```

**Solution 2: Fix IAM permissions**

Required IAM policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:Describe*",
        "rds:Describe*",
        "s3:ListAllMyBuckets",
        "s3:GetBucketLocation",
        "elasticloadbalancing:Describe*",
        "lambda:List*",
        "ecs:Describe*",
        "ecs:List*"
      ],
      "Resource": "*"
    }
  ]
}
```

**Solution 3: Check AWS rate limits**

```bash
# AWS may throttle API calls
# Reduce discovery concurrency
kubectl edit deployment/discovery-engine -n cmdb
# Update DISCOVERY_CONCURRENCY environment variable to lower value (e.g., 5)
```

### Issue 2: Azure Discovery Failing

**Symptoms:**
- Error: "Azure authentication failed"
- Error: "Subscription not found"

**Solutions:**

```bash
# Update Azure credentials
kubectl create secret generic azure-credentials \
  --from-literal=AZURE_SUBSCRIPTION_ID=<subscription-id> \
  --from-literal=AZURE_TENANT_ID=<tenant-id> \
  --from-literal=AZURE_CLIENT_ID=<client-id> \
  --from-literal=AZURE_CLIENT_SECRET=<client-secret> \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart discovery engine
kubectl rollout restart deployment/discovery-engine -n cmdb
```

### Issue 3: Discovery Jobs Stuck in "Running"

**Symptoms:**
- Jobs never complete
- Job running for hours with no progress

**Diagnosis:**

```bash
# Check job status
curl -X GET https://cmdb.example.com/api/v1/discovery/jobs?status=running \
  -H "Authorization: Bearer <api-key>"

# Check worker logs
kubectl logs -n cmdb -l app=discovery-engine -f

# Check queue status
kubectl exec -n cmdb redis-0 -- redis-cli -a <password> \
  LLEN bullmq:discovery:aws:active
```

**Solutions:**

```bash
# Solution 1: Restart discovery engine
kubectl rollout restart deployment/discovery-engine -n cmdb

# Solution 2: Clear stuck jobs from queue
kubectl exec -n cmdb redis-0 -- redis-cli -a <password> \
  DEL bullmq:discovery:aws:active

# Solution 3: Increase job timeout
kubectl set env deployment/discovery-engine -n cmdb \
  DISCOVERY_JOB_TIMEOUT=3600000
```

### Issue 4: Duplicate CIs Being Created

**Symptoms:**
- Same CI appearing multiple times in database
- CI IDs not matching expected format

**Diagnosis:**

```bash
# Check for duplicate CIs
kubectl exec -n cmdb neo4j-0 -- cypher-shell -u neo4j -p <password> "
  MATCH (n:CI)
  WITH n.name as name, COUNT(*) as count
  WHERE count > 1
  RETURN name, count
  ORDER BY count DESC;
"

# Check discovery logs for ID generation
kubectl logs -n cmdb -l app=discovery-engine | grep "Creating CI"
```

**Solutions:**

```bash
# Solution 2: De-duplicate existing CIs
kubectl exec -n cmdb neo4j-0 -- cypher-shell -u neo4j -p <password> "
  MATCH (n:CI)
  WITH n.name as name, COLLECT(n) as nodes
  WHERE SIZE(nodes) > 1
  FOREACH (n IN TAIL(nodes) | DETACH DELETE n);
"

# Solution 3: Add unique constraint
kubectl exec -n cmdb neo4j-0 -- cypher-shell -u neo4j -p <password> "
  CREATE CONSTRAINT ci_id_unique IF NOT EXISTS
  FOR (n:CI) REQUIRE n.id IS UNIQUE;
"
```

## ETL Sync Issues

### Issue 1: ETL Sync Lag

**Symptoms:**
- Data in PostgreSQL is stale (> 15 minutes old)
- Metrics show high ETL sync lag

**Diagnosis:**

```bash
# Check last sync time
kubectl exec -n cmdb postgresql-0 -- \
  psql -U cmdb_user -d cmdb_datamart -c "
    SELECT MAX(last_updated) as last_sync FROM dim_ci;
  "

# Check ETL processor logs
kubectl logs -n cmdb -l app=etl-processor --tail=100

# Check ETL job queue
kubectl exec -n cmdb redis-0 -- redis-cli -a <password> \
  LLEN bullmq:etl:sync:wait
```

**Solutions:**

```bash
# Solution 1: Trigger manual sync
curl -X POST https://cmdb.example.com/api/v1/etl/sync \
  -H "Authorization: Bearer <api-key>"

# Solution 2: Increase ETL processor resources
kubectl edit deployment/etl-processor -n cmdb
# Update resources

# Solution 3: Reduce sync interval
kubectl set env deployment/etl-processor -n cmdb \
  ETL_SYNC_INTERVAL=300000  # 5 minutes
```

### Issue 2: ETL Job Failing

**Symptoms:**
- ETL processor crashes
- Error: "Out of memory"
- Error: "Query timeout"

**Diagnosis:**

```bash
# Check ETL processor logs
kubectl logs -n cmdb -l app=etl-processor --tail=200

# Check memory usage
kubectl top pod -n cmdb -l app=etl-processor

# Check PostgreSQL connection pool
kubectl exec -n cmdb postgresql-0 -- \
  psql -U cmdb_user -d cmdb_datamart -c "
    SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';
  "
```

**Solutions:**

```bash
# Solution 1: Increase memory limits
kubectl edit deployment/etl-processor -n cmdb
# Update resources.limits.memory to 8Gi

# Solution 2: Process in batches
kubectl set env deployment/etl-processor -n cmdb \
  ETL_BATCH_SIZE=1000

# Solution 3: Increase PostgreSQL query timeout
kubectl exec -n cmdb postgresql-0 -- \
  psql -U postgres -c "ALTER DATABASE cmdb_datamart SET statement_timeout = '300s';"
```

### Issue 3: Data Inconsistency

**Symptoms:**
- CI count in Neo4j != CI count in PostgreSQL
- Missing relationships in data mart

**Diagnosis:**

```bash
# Compare CI counts
echo "Neo4j:"
kubectl exec -n cmdb neo4j-0 -- cypher-shell -u neo4j -p <password> \
  "MATCH (n:CI) RETURN COUNT(n) as count;"

echo "PostgreSQL:"
kubectl exec -n cmdb postgresql-0 -- \
  psql -U cmdb_user -d cmdb_datamart -c "SELECT COUNT(*) FROM dim_ci;"

# Check for failed ETL records
kubectl logs -n cmdb -l app=etl-processor | grep -i "failed to sync"
```

**Solutions:**

```bash
# Solution 2: Sync specific CIs
curl -X POST https://cmdb.example.com/api/v1/etl/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <api-key>" \
  -d '{"ciIds": ["vm-001", "vm-002"]}'
```

## Database Connection Errors

### Issue 1: Neo4j Connection Refused

**Symptoms:**
- Error: "Failed to connect to Neo4j"
- Error: "Connection refused bolt://neo4j:7687"

**Diagnosis:**

```bash
# Check Neo4j pod status
kubectl get pod neo4j-0 -n cmdb

# Check Neo4j logs
kubectl logs neo4j-0 -n cmdb

# Test Neo4j connectivity
kubectl exec -n cmdb neo4j-0 -- nc -zv localhost 7687

# Check service
kubectl get service neo4j -n cmdb
kubectl get endpoints neo4j -n cmdb
```

**Solutions:**

```bash
# Solution 1: Restart Neo4j
kubectl delete pod neo4j-0 -n cmdb
kubectl wait --for=condition=ready pod/neo4j-0 -n cmdb --timeout=300s

# Solution 2: Check Neo4j configuration
kubectl exec -n cmdb neo4j-0 -- cat /conf/neo4j.conf | grep bolt

# Solution 3: Verify network policies
kubectl get networkpolicy -n cmdb
# Ensure Neo4j port 7687 is allowed
```

### Issue 2: PostgreSQL Connection Pool Exhausted

**Symptoms:**
- Error: "remaining connection slots are reserved"
- API requests timing out

**Diagnosis:**

```bash
# Check active connections
kubectl exec -n cmdb postgresql-0 -- \
  psql -U cmdb_user -d cmdb_datamart -c "
    SELECT COUNT(*) as active,
           max_conn,
           max_conn - COUNT(*) as remaining
    FROM pg_stat_activity
    CROSS JOIN (SELECT setting::int as max_conn FROM pg_settings WHERE name = 'max_connections') mc
    GROUP BY max_conn;
  "

# Check long-running queries
kubectl exec -n cmdb postgresql-0 -- \
  psql -U cmdb_user -d cmdb_datamart -c "
    SELECT pid, now() - pg_stat_activity.query_start AS duration, query
    FROM pg_stat_activity
    WHERE state = 'active'
    ORDER BY duration DESC;
  "
```

**Solutions:**

```bash
# Solution 1: Increase max_connections
kubectl exec -n cmdb postgresql-0 -- \
  psql -U postgres -c "ALTER SYSTEM SET max_connections = 300;"
kubectl delete pod postgresql-0 -n cmdb

# Solution 2: Kill long-running queries
kubectl exec -n cmdb postgresql-0 -- \
  psql -U cmdb_user -d cmdb_datamart -c "
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE state = 'active' AND now() - query_start > interval '10 minutes';
  "

# Solution 3: Optimize connection pooling in application
kubectl set env deployment/api-server -n cmdb \
  DB_POOL_SIZE=20 \
  DB_POOL_IDLE_TIMEOUT=30000
```

### Issue 3: Redis Connection Timeout

**Symptoms:**
- Error: "Redis connection timeout"
- Queue operations failing

**Diagnosis:**

```bash
# Check Redis status
kubectl get pod redis-0 -n cmdb
kubectl logs redis-0 -n cmdb

# Test Redis connectivity
kubectl exec -n cmdb redis-0 -- redis-cli -a <password> PING

# Check connected clients
kubectl exec -n cmdb redis-0 -- redis-cli -a <password> CLIENT LIST
```

**Solutions:**

```bash
# Solution 1: Restart Redis
kubectl delete pod redis-0 -n cmdb

# Solution 2: Increase timeout
kubectl exec -n cmdb redis-0 -- redis-cli -a <password> \
  CONFIG SET timeout 300

# Solution 3: Check network latency
kubectl exec -n cmdb <api-server-pod> -- ping redis
```

## Queue Backlog Issues

### Issue 1: Queue Depth Growing

**Symptoms:**
- Queue depth continuously increasing
- Jobs not being processed

**Diagnosis:**

```bash
# Check queue depths
kubectl exec -n cmdb redis-0 -- redis-cli -a <password> <<EOF
LLEN bullmq:discovery:aws:wait
LLEN bullmq:discovery:azure:wait
LLEN bullmq:discovery:gcp:wait
LLEN bullmq:etl:sync:wait
EOF

# Check worker status
kubectl get pods -n cmdb -l app=discovery-engine
kubectl logs -n cmdb -l app=discovery-engine --tail=50
```

**Solutions:**

```bash
# Solution 1: Scale workers
kubectl scale deployment/discovery-engine --replicas=5 -n cmdb

# Solution 2: Increase concurrency
kubectl set env deployment/discovery-engine -n cmdb \
  DISCOVERY_CONCURRENCY=10

# Solution 3: Clear failed jobs
kubectl exec -n cmdb redis-0 -- redis-cli -a <password> \
  DEL bullmq:discovery:aws:failed
```

### Issue 2: Jobs Stuck in "Active" State

**Symptoms:**
- Jobs in active queue but not processing
- Worker logs show no activity

**Diagnosis:**

```bash
# Check active jobs
kubectl exec -n cmdb redis-0 -- redis-cli -a <password> \
  LRANGE bullmq:discovery:aws:active 0 -1

# Check worker logs
kubectl logs -n cmdb -l app=discovery-engine -f
```

**Solutions:**

```bash
# Solution 1: Move stuck jobs back to waiting queue
kubectl exec -n cmdb redis-0 -- redis-cli -a <password> <<EOF
RPOPLPUSH bullmq:discovery:aws:active bullmq:discovery:aws:wait
EOF

# Solution 2: Restart workers
kubectl rollout restart deployment/discovery-engine -n cmdb

# Solution 3: Clear all active jobs (use with caution)
kubectl exec -n cmdb redis-0 -- redis-cli -a <password> \
  DEL bullmq:discovery:aws:active
```

## Performance Problems

### Issue 1: High Memory Usage

**Symptoms:**
- Pods being OOMKilled
- Memory usage > 90%

**Diagnosis:**

```bash
# Check memory usage
kubectl top pods -n cmdb

# Check pod events
kubectl describe pod <pod-name> -n cmdb | grep -A 10 Events
```

**Solutions:**

```bash
# Solution 1: Increase memory limits
kubectl edit deployment/api-server -n cmdb
# Update resources.limits.memory

# Solution 2: Add memory limits to prevent OOM
kubectl set resources deployment/api-server -n cmdb \
  --limits=memory=8Gi \
  --requests=memory=4Gi
```

### Issue 2: High CPU Usage

**Symptoms:**
- CPU throttling
- Slow response times
- CPU usage consistently > 80%

**Solutions:**

```bash
# Solution 1: Increase CPU limits
kubectl set resources deployment/api-server -n cmdb \
  --limits=cpu=4 \
  --requests=cpu=2

# Solution 2: Scale horizontally
kubectl scale deployment/api-server --replicas=5 -n cmdb
```

### Issue 3: Slow Database Queries

**Symptoms:**
- Query times > 1 second
- Database CPU at 100%

**Diagnosis:**

```bash
# Neo4j slow queries
kubectl exec -n cmdb neo4j-0 -- cypher-shell -u neo4j -p <password> "
  CALL dbms.listQueries()
  YIELD queryId, query, elapsedTimeMillis
  WHERE elapsedTimeMillis > 1000
  RETURN queryId, query, elapsedTimeMillis
  ORDER BY elapsedTimeMillis DESC;
"

# PostgreSQL slow queries
kubectl exec -n cmdb postgresql-0 -- \
  psql -U cmdb_user -d cmdb_datamart -c "
    SELECT query, calls, total_time, mean_time
    FROM pg_stat_statements
    ORDER BY mean_time DESC
    LIMIT 10;
  "
```

**Solutions:**

```bash
# Solution 1: Add indexes
kubectl exec -n cmdb neo4j-0 -- cypher-shell -u neo4j -p <password> "
  CREATE INDEX ci_type_index IF NOT EXISTS FOR (n:CI) ON (n.type);
"

kubectl exec -n cmdb postgresql-0 -- \
  psql -U cmdb_user -d cmdb_datamart -c "
    CREATE INDEX idx_dim_ci_type ON dim_ci(ci_type);
  "
```

## Diagnostic Commands

### General Diagnostics

```bash
# Get all resources in namespace
kubectl get all -n cmdb

# Describe all pods
kubectl describe pods -n cmdb

# Get recent events
kubectl get events -n cmdb --sort-by='.lastTimestamp' | tail -50

# Check resource usage
kubectl top nodes
kubectl top pods -n cmdb
```

### Network Diagnostics

```bash
# Test service connectivity
kubectl run -it --rm debug --image=nicolaka/netshoot --restart=Never -- /bin/bash
# From inside pod:
nslookup neo4j
curl http://api-server:3000/health
nc -zv postgresql 5433

# Check DNS resolution
kubectl exec -n cmdb <pod-name> -- nslookup neo4j

# Check network policies
kubectl get networkpolicies -n cmdb
kubectl describe networkpolicy <policy-name> -n cmdb
```

### Database Diagnostics

```bash
# Neo4j diagnostics
kubectl exec -n cmdb neo4j-0 -- cypher-shell -u neo4j -p <password> "
  CALL dbms.queryJmx('org.neo4j:*')
  YIELD attributes
  RETURN attributes;
"

# PostgreSQL diagnostics
kubectl exec -n cmdb postgresql-0 -- \
  psql -U cmdb_user -d cmdb_datamart -c "\l+"

kubectl exec -n cmdb postgresql-0 -- \
  psql -U cmdb_user -d cmdb_datamart -c "
    SELECT * FROM pg_stat_database WHERE datname = 'cmdb_datamart';
  "

# Redis diagnostics
kubectl exec -n cmdb redis-0 -- redis-cli -a <password> INFO all
```

## See Also

- [Daily Operations Guide](/operations/daily-operations)
- [CLI Commands Reference](/quick-reference/cli-commands)
- [Performance Tuning](/guides/performance)
- [Monitoring Guide](/guides/monitoring)
