---
title: Environment Variables
description: Complete reference for all ConfigBuddy environment variables
---

# Environment Variables

Complete reference for configuring ConfigBuddy CMDB platform through environment variables.

## Core Application Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `development` | Application environment (`development`, `staging`, `production`) |
| `API_PORT` | No | `3000` | API server port |
| `LOG_LEVEL` | No | `info` | Logging level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`) |
| `LOG_FORMAT` | No | `json` | Log format (`json`, `pretty`) |
| `TZ` | No | `UTC` | Timezone for timestamps |

**Example:**

```bash
NODE_ENV=production
API_PORT=3000
LOG_LEVEL=info
LOG_FORMAT=json
TZ=UTC
```

## Neo4j Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEO4J_URI` | Yes | - | Neo4j connection URI (`bolt://hostname:7687`) |
| `NEO4J_USERNAME` | Yes | `neo4j` | Neo4j username |
| `NEO4J_PASSWORD` | Yes | - | Neo4j password (use secrets management) |
| `NEO4J_DATABASE` | No | `neo4j` | Database name |
| `NEO4J_MAX_CONNECTION_POOL_SIZE` | No | `50` | Maximum connection pool size |
| `NEO4J_ACQUISITION_TIMEOUT` | No | `60000` | Connection acquisition timeout (ms) |
| `NEO4J_MAX_TRANSACTION_RETRY_TIME` | No | `30000` | Max transaction retry time (ms) |
| `NEO4J_ENCRYPTED` | No | `false` | Enable SSL/TLS for Neo4j connection |

**Example:**

```bash
NEO4J_URI=bolt://neo4j.internal:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=${NEO4J_PASSWORD}  # From secrets
NEO4J_DATABASE=neo4j
NEO4J_MAX_CONNECTION_POOL_SIZE=100
NEO4J_ENCRYPTED=true
```

## PostgreSQL Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `POSTGRES_HOST` | Yes | `localhost` | PostgreSQL hostname |
| `POSTGRES_PORT` | No | `5433` | PostgreSQL port (Docker default: 5433) |
| `POSTGRES_DB` | Yes | `cmdb_datamart` | Database name |
| `POSTGRES_USER` | Yes | - | PostgreSQL username |
| `POSTGRES_PASSWORD` | Yes | - | PostgreSQL password (use secrets management) |
| `POSTGRES_MAX_CONNECTIONS` | No | `20` | Maximum connection pool size |
| `POSTGRES_IDLE_TIMEOUT` | No | `30000` | Idle connection timeout (ms) |
| `POSTGRES_CONNECTION_TIMEOUT` | No | `5000` | Connection timeout (ms) |
| `POSTGRES_SSL` | No | `false` | Enable SSL/TLS |
| `POSTGRES_SSL_CA` | No | - | Path to CA certificate for SSL |

**Example:**

```bash
POSTGRES_HOST=postgresql.internal
POSTGRES_PORT=5433
POSTGRES_DB=cmdb_datamart
POSTGRES_USER=cmdb_user
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}  # From secrets
POSTGRES_MAX_CONNECTIONS=50
POSTGRES_SSL=true
POSTGRES_SSL_CA=/certs/ca.crt
```

## Redis Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_HOST` | Yes | `localhost` | Redis hostname |
| `REDIS_PORT` | No | `6379` | Redis port |
| `REDIS_PASSWORD` | No | - | Redis password (if authentication enabled) |
| `REDIS_DB` | No | `0` | Redis database number |
| `REDIS_MAX_RETRIES` | No | `3` | Maximum connection retry attempts |
| `REDIS_RETRY_DELAY` | No | `1000` | Delay between retries (ms) |
| `REDIS_TLS` | No | `false` | Enable TLS |

**Example:**

```bash
REDIS_HOST=redis.internal
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}  # From secrets
REDIS_DB=0
REDIS_MAX_RETRIES=5
REDIS_TLS=true
```

## Queue Configuration (BullMQ)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `QUEUE_CONCURRENCY` | No | `5` | Number of concurrent workers per queue |
| `QUEUE_MAX_JOBS_PER_WORKER` | No | `1` | Max jobs per worker |
| `QUEUE_JOB_TIMEOUT` | No | `300000` | Job timeout (ms) - 5 minutes |
| `QUEUE_RETRY_ATTEMPTS` | No | `3` | Number of retry attempts for failed jobs |
| `QUEUE_RETRY_DELAY` | No | `2000` | Delay between retries (ms) |
| `QUEUE_BACKOFF_TYPE` | No | `exponential` | Backoff strategy (`exponential`, `fixed`) |
| `QUEUE_REMOVE_ON_COMPLETE` | No | `100` | Keep last N completed jobs |
| `QUEUE_REMOVE_ON_FAIL` | No | `1000` | Keep last N failed jobs |

**Example:**

```bash
QUEUE_CONCURRENCY=10
QUEUE_JOB_TIMEOUT=600000  # 10 minutes
QUEUE_RETRY_ATTEMPTS=5
QUEUE_RETRY_DELAY=5000
QUEUE_BACKOFF_TYPE=exponential
```

## Discovery Engine Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DISCOVERY_ENABLED` | No | `true` | Enable/disable discovery engine |
| `DISCOVERY_CONCURRENCY` | No | `5` | Concurrent discovery jobs |
| `DISCOVERY_INTERVAL` | No | `3600000` | Discovery interval (ms) - 1 hour |
| `DISCOVERY_TIMEOUT` | No | `1800000` | Discovery job timeout (ms) - 30 minutes |
| `DISCOVERY_BATCH_SIZE` | No | `100` | Batch size for CI creation |
| `DISCOVERY_PROVIDERS` | No | `aws,azure,gcp` | Comma-separated list of enabled providers |

**Example:**

```bash
DISCOVERY_ENABLED=true
DISCOVERY_CONCURRENCY=10
DISCOVERY_INTERVAL=1800000  # 30 minutes
DISCOVERY_TIMEOUT=3600000   # 1 hour
DISCOVERY_BATCH_SIZE=500
DISCOVERY_PROVIDERS=aws,azure,gcp,ssh
```

## ETL Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ETL_ENABLED` | No | `true` | Enable/disable ETL processor |
| `ETL_SYNC_INTERVAL` | No | `300000` | ETL sync interval (ms) - 5 minutes |
| `ETL_BATCH_SIZE` | No | `1000` | Number of CIs to process per batch |
| `ETL_CONCURRENCY` | No | `3` | Concurrent ETL jobs |
| `ETL_TIMEOUT` | No | `600000` | ETL job timeout (ms) - 10 minutes |
| `ETL_FULL_SYNC_SCHEDULE` | No | `0 2 * * *` | Cron expression for full sync (2 AM daily) |

**Example:**

```bash
ETL_ENABLED=true
ETL_SYNC_INTERVAL=600000    # 10 minutes
ETL_BATCH_SIZE=2000
ETL_CONCURRENCY=5
ETL_FULL_SYNC_SCHEDULE="0 3 * * *"  # 3 AM daily
```

## Authentication & Security

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | - | Secret key for JWT token signing (use secrets management) |
| `JWT_EXPIRES_IN` | No | `3600` | JWT token expiration (seconds) - 1 hour |
| `API_KEY` | No | - | Static API key (for backward compatibility) |
| `API_KEY_HEADER` | No | `X-API-Key` | Header name for API key |
| `SESSION_SECRET` | No | - | Session secret for cookie-based auth |
| `CORS_ORIGIN` | No | `*` | CORS allowed origins (comma-separated) |
| `RATE_LIMIT_WINDOW` | No | `60000` | Rate limit window (ms) - 1 minute |
| `RATE_LIMIT_MAX` | No | `1000` | Max requests per window |
| `BCRYPT_ROUNDS` | No | `10` | Bcrypt hashing rounds |

**Example:**

```bash
JWT_SECRET=${JWT_SECRET}  # From secrets - minimum 32 characters
JWT_EXPIRES_IN=7200       # 2 hours
API_KEY=${API_KEY}        # From secrets
CORS_ORIGIN=https://dashboard.example.com,https://admin.example.com
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=1000
BCRYPT_ROUNDS=12
```

## Monitoring & Telemetry

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PROMETHEUS_ENABLED` | No | `true` | Enable Prometheus metrics endpoint |
| `PROMETHEUS_PORT` | No | `9090` | Prometheus metrics port |
| `GRAFANA_ENABLED` | No | `true` | Enable Grafana integration |
| `JAEGER_ENABLED` | No | `false` | Enable Jaeger distributed tracing |
| `JAEGER_AGENT_HOST` | No | `localhost` | Jaeger agent hostname |
| `JAEGER_AGENT_PORT` | No | `6831` | Jaeger agent port |
| `METRICS_INTERVAL` | No | `10000` | Metrics collection interval (ms) |
| `HEALTH_CHECK_INTERVAL` | No | `30000` | Health check interval (ms) |

**Example:**

```bash
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090
GRAFANA_ENABLED=true
JAEGER_ENABLED=true
JAEGER_AGENT_HOST=jaeger.internal
METRICS_INTERVAL=15000
```

---

## v3.0 Configuration

ConfigBuddy v3.0 introduces comprehensive ITIL, TBM, and BSM frameworks with unified integration. The following sections document v3.0-specific environment variables.

### Unified Framework Integration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `V3_UNIFIED_FRAMEWORK_ENABLED` | No | `true` | Enable v3.0 unified framework (ITIL+TBM+BSM) |
| `ITIL_ENABLED` | No | `true` | Enable ITIL v4 service management |
| `TBM_ENABLED` | No | `true` | Enable TBM v5.0.1 cost transparency |
| `BSM_ENABLED` | No | `true` | Enable Business Service Mapping |
| `UNIFIED_VIEW_CACHE_TTL` | No | `300` | Cache duration for complete service views (seconds) |

**Example:**

```bash
V3_UNIFIED_FRAMEWORK_ENABLED=true
ITIL_ENABLED=true
TBM_ENABLED=true
BSM_ENABLED=true
UNIFIED_VIEW_CACHE_TTL=300
```

**Impact**: Disabling any framework reduces functionality but may improve performance in resource-constrained environments.

---

### ITIL Service Manager Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ITIL_PRIORITY_CALCULATION_ENABLED` | No | `true` | Enable automatic incident priority calculation |
| `ITIL_CHANGE_RISK_ENABLED` | No | `true` | Enable 5-factor change risk assessment |
| `ITIL_BASELINE_MANAGEMENT_ENABLED` | No | `true` | Enable configuration baseline tracking |
| `ITIL_CAB_APPROVAL_THRESHOLD` | No | `50` | Risk score threshold requiring CAB approval (0-100) |
| `ITIL_EXECUTIVE_APPROVAL_THRESHOLD` | No | `75` | Risk score requiring executive approval (0-100) |
| `ITIL_P1_RESPONSE_MINUTES` | No | `15` | P1 incident response time target (minutes) |
| `ITIL_P1_RESOLUTION_MINUTES` | No | `240` | P1 incident resolution time target (minutes) |
| `ITIL_DRIFT_CHECK_ENABLED` | No | `true` | Enable configuration drift detection |
| `ITIL_DRIFT_SEVERITY_THRESHOLD` | No | `30` | Drift score threshold for alerts (0-100) |

**Example:**

```bash
ITIL_PRIORITY_CALCULATION_ENABLED=true
ITIL_CHANGE_RISK_ENABLED=true
ITIL_CAB_APPROVAL_THRESHOLD=50
ITIL_EXECUTIVE_APPROVAL_THRESHOLD=75
ITIL_P1_RESPONSE_MINUTES=15
ITIL_P1_RESOLUTION_MINUTES=240
ITIL_DRIFT_CHECK_ENABLED=true
ITIL_DRIFT_SEVERITY_THRESHOLD=30
```

**Security Considerations**:
- Lower CAB thresholds increase change scrutiny but may slow deployments
- P1 response times should align with SLA commitments

---

### TBM Cost Engine Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TBM_COST_ALLOCATION_ENABLED` | No | `true` | Enable automated cost allocation |
| `TBM_DEPRECIATION_METHOD` | No | `straight_line` | Depreciation method (`straight_line`, `declining_balance`) |
| `TBM_DEFAULT_DEPRECIATION_YEARS` | No | `3` | Default asset depreciation period (years) |
| `TBM_CLOUD_SYNC_ENABLED` | No | `true` | Enable automated cloud cost sync |
| `TBM_CLOUD_SYNC_INTERVAL` | No | `86400000` | Cloud cost sync interval (ms) - 24 hours |
| `TBM_AWS_COST_EXPLORER_ENABLED` | No | `true` | Enable AWS Cost Explorer integration |
| `TBM_AZURE_COST_MGMT_ENABLED` | No | `true` | Enable Azure Cost Management integration |
| `TBM_GCP_BILLING_ENABLED` | No | `true` | Enable GCP Billing integration |
| `TBM_LICENSE_TRACKING_ENABLED` | No | `true` | Enable software license tracking |
| `TBM_LICENSE_RENEWAL_ALERT_DAYS` | No | `30` | Alert threshold for license renewal (days) |
| `TBM_BUDGET_VARIANCE_THRESHOLD` | No | `10` | Budget variance alert threshold (%) |
| `TBM_COST_ANOMALY_ENABLED` | No | `true` | Enable AI-powered cost anomaly detection |

**Example:**

```bash
TBM_COST_ALLOCATION_ENABLED=true
TBM_DEPRECIATION_METHOD=straight_line
TBM_DEFAULT_DEPRECIATION_YEARS=3
TBM_CLOUD_SYNC_ENABLED=true
TBM_CLOUD_SYNC_INTERVAL=86400000
TBM_AWS_COST_EXPLORER_ENABLED=true
TBM_AZURE_COST_MGMT_ENABLED=true
TBM_GCP_BILLING_ENABLED=true
TBM_LICENSE_TRACKING_ENABLED=true
TBM_LICENSE_RENEWAL_ALERT_DAYS=30
TBM_BUDGET_VARIANCE_THRESHOLD=10
TBM_COST_ANOMALY_ENABLED=true
```

**Cloud Credential Management**: TBM uses the unified credential system. Configure cloud provider credentials via Web UI or API, not environment variables.

---

### BSM Impact Engine Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BSM_ENABLED` | No | `true` | Enable Business Service Mapping engine |
| `BSM_BATCH_SIZE` | No | `100` | Batch size for impact calculations |
| `BSM_MAX_BLAST_RADIUS_HOPS` | No | `10` | Maximum graph traversal depth for blast radius |
| `BSM_TIER_0_THRESHOLD` | No | `1000000` | Tier 0 (mission-critical) annual revenue threshold (USD) |
| `BSM_TIER_1_THRESHOLD` | No | `500000` | Tier 1 (business-critical) annual revenue threshold (USD) |
| `BSM_TIER_2_THRESHOLD` | No | `100000` | Tier 2 (important) annual revenue threshold (USD) |
| `BSM_TIER_3_THRESHOLD` | No | `10000` | Tier 3 (standard) annual revenue threshold (USD) |
| `BSM_WEIGHT_REVENUE` | No | `0.40` | Revenue weight in impact scoring (0-1) |
| `BSM_WEIGHT_CUSTOMERS` | No | `0.25` | Customer count weight in impact scoring (0-1) |
| `BSM_WEIGHT_TRANSACTIONS` | No | `0.15` | Transaction volume weight in impact scoring (0-1) |
| `BSM_WEIGHT_COMPLIANCE` | No | `0.10` | Compliance weight in impact scoring (0-1) |
| `BSM_WEIGHT_USERS` | No | `0.10` | User count weight in impact scoring (0-1) |
| `BSM_RISK_INCIDENT_WEIGHT` | No | `0.30` | Incident frequency weight in risk assessment (0-1) |
| `BSM_RISK_CHANGE_WEIGHT` | No | `0.25` | Change management weight in risk assessment (0-1) |
| `BSM_RISK_AVAILABILITY_WEIGHT` | No | `0.25` | Availability weight in risk assessment (0-1) |
| `BSM_RISK_COMPLIANCE_WEIGHT` | No | `0.10` | Compliance weight in risk assessment (0-1) |
| `BSM_RISK_AUDIT_WEIGHT` | No | `0.10` | Audit status weight in risk assessment (0-1) |
| `BSM_BLAST_RADIUS_TIMEOUT` | No | `300000` | Blast radius analysis timeout (ms) - 5 minutes |
| `BSM_GRAPH_TRAVERSAL_CACHE_TTL` | No | `300` | Graph traversal cache TTL (seconds) |

**Example:**

```bash
BSM_ENABLED=true
BSM_BATCH_SIZE=100
BSM_MAX_BLAST_RADIUS_HOPS=10
BSM_TIER_0_THRESHOLD=1000000
BSM_TIER_1_THRESHOLD=500000
BSM_TIER_2_THRESHOLD=100000
BSM_TIER_3_THRESHOLD=10000
BSM_WEIGHT_REVENUE=0.40
BSM_WEIGHT_CUSTOMERS=0.25
BSM_WEIGHT_TRANSACTIONS=0.15
BSM_WEIGHT_COMPLIANCE=0.10
BSM_WEIGHT_USERS=0.10
BSM_BLAST_RADIUS_TIMEOUT=300000
```

**Tuning Guidance**:
- Adjust tier thresholds based on your organization's revenue scale
- Weights must sum to 1.0 (normalized automatically if not)
- Increase `BSM_MAX_BLAST_RADIUS_HOPS` for deeper analysis (slower performance)
- Reduce timeout for faster results (may incomplete analysis for large graphs)

---

### AI/ML Engine Configuration (Enhanced)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AI_ANOMALY_DETECTION_ENABLED` | No | `true` | Enable anomaly detection engine |
| `AI_ANOMALY_SENSITIVITY` | No | `medium` | Anomaly detection sensitivity (`low`, `medium`, `high`) |
| `AI_ANOMALY_MIN_CONFIDENCE` | No | `70` | Minimum confidence score for anomaly alerts (0-100) |
| `AI_ANOMALY_CHECK_INTERVAL` | No | `60` | Anomaly detection interval (minutes) |
| `AI_ANOMALY_LOOKBACK_DAYS` | No | `30` | Historical lookback period for baseline (days) |
| `AI_DRIFT_DETECTION_ENABLED` | No | `true` | Enable configuration drift detection |
| `AI_DRIFT_SEVERITY_THRESHOLD` | No | `30` | Drift score threshold for alerts (0-100) |
| `AI_DRIFT_AUTO_BASELINE_ENABLED` | No | `true` | Automatically create baselines for new CIs |
| `AI_IMPACT_PREDICTION_ENABLED` | No | `true` | Enable change impact prediction |
| `AI_IMPACT_MAX_BLAST_RADIUS` | No | `200` | Maximum CIs to analyze in blast radius |
| `AI_IMPACT_CRITICALITY_CACHE_TTL` | No | `604800` | Criticality score cache duration (seconds) - 7 days |

**Example:**

```bash
AI_ANOMALY_DETECTION_ENABLED=true
AI_ANOMALY_SENSITIVITY=medium
AI_ANOMALY_MIN_CONFIDENCE=70
AI_ANOMALY_CHECK_INTERVAL=60
AI_ANOMALY_LOOKBACK_DAYS=30
AI_DRIFT_DETECTION_ENABLED=true
AI_DRIFT_SEVERITY_THRESHOLD=30
AI_DRIFT_AUTO_BASELINE_ENABLED=true
AI_IMPACT_PREDICTION_ENABLED=true
AI_IMPACT_MAX_BLAST_RADIUS=200
```

**Performance Impact**: High sensitivity and frequent checks increase CPU usage. Tune based on infrastructure size and criticality.

---

### Event Streaming (Kafka) Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `KAFKA_ENABLED` | No | `false` | Enable Kafka event streaming |
| `KAFKA_BROKERS` | Yes* | `localhost:9092` | Comma-separated list of Kafka brokers (*required if enabled) |
| `KAFKA_CLIENT_ID` | No | `cmdb-platform` | Kafka client identifier |
| `KAFKA_GROUP_ID` | No | `cmdb-consumers` | Default consumer group ID |
| `KAFKA_CONNECTION_TIMEOUT` | No | `30000` | Connection timeout (ms) |
| `KAFKA_REQUEST_TIMEOUT` | No | `30000` | Request timeout (ms) |
| `KAFKA_SSL_ENABLED` | No | `false` | Enable SSL/TLS encryption |
| `KAFKA_SSL_CA_PATH` | No | - | Path to CA certificate |
| `KAFKA_SSL_CERT_PATH` | No | - | Path to client certificate |
| `KAFKA_SSL_KEY_PATH` | No | - | Path to client private key |
| `KAFKA_SASL_ENABLED` | No | `false` | Enable SASL authentication |
| `KAFKA_SASL_MECHANISM` | No | `plain` | SASL mechanism (`plain`, `scram-sha-256`, `scram-sha-512`) |
| `KAFKA_SASL_USERNAME` | No | - | SASL username |
| `KAFKA_SASL_PASSWORD` | No | - | SASL password |
| `KAFKA_AUTO_CREATE_TOPICS` | No | `true` | Automatically create topics on startup |
| `KAFKA_REPLICATION_FACTOR` | No | `1` | Topic replication factor (increase to 3 for production) |
| `KAFKA_PARTITIONS_DEFAULT` | No | `6` | Default partition count for new topics |
| `KAFKA_RETENTION_HOURS` | No | `168` | Default message retention (hours) - 7 days |
| `KAFKA_COMPRESSION_TYPE` | No | `snappy` | Message compression (`none`, `gzip`, `snappy`, `lz4`, `zstd`) |

**Example (Development)**:

```bash
KAFKA_ENABLED=true
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=cmdb-platform
KAFKA_GROUP_ID=cmdb-consumers
KAFKA_AUTO_CREATE_TOPICS=true
KAFKA_REPLICATION_FACTOR=1
```

**Example (Production)**:

```bash
KAFKA_ENABLED=true
KAFKA_BROKERS=kafka-1.internal:9092,kafka-2.internal:9092,kafka-3.internal:9092
KAFKA_CLIENT_ID=cmdb-platform
KAFKA_SSL_ENABLED=true
KAFKA_SSL_CA_PATH=/certs/ca.crt
KAFKA_SSL_CERT_PATH=/certs/client.crt
KAFKA_SSL_KEY_PATH=/certs/client.key
KAFKA_SASL_ENABLED=true
KAFKA_SASL_MECHANISM=scram-sha-512
KAFKA_SASL_USERNAME=${KAFKA_USERNAME}
KAFKA_SASL_PASSWORD=${KAFKA_PASSWORD}
KAFKA_REPLICATION_FACTOR=3
KAFKA_PARTITIONS_DEFAULT=12
KAFKA_RETENTION_HOURS=168
KAFKA_COMPRESSION_TYPE=snappy
```

**Production Requirements**:
- Use at least 3 Kafka brokers for high availability
- Set replication factor to 3 for data durability
- Enable SSL/TLS and SASL for security
- Store credentials in Kubernetes secrets or vault

---

### Metabase Business Intelligence Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `METABASE_ENABLED` | No | `true` | Enable Metabase integration |
| `METABASE_PORT` | No | `3002` | Metabase web interface port |
| `METABASE_DATABASE` | No | `metabase` | Metabase application database name |
| `METABASE_DB_USER` | Yes* | `metabase_user` | Metabase database user (*required if enabled) |
| `METABASE_DB_PASSWORD` | Yes* | - | Metabase database password (*required if enabled) |
| `METABASE_ENCRYPTION_KEY` | Yes* | - | Metabase encryption key (min 32 chars) (*required if enabled) |
| `METABASE_SITE_URL` | No | `http://localhost:3002` | Metabase public URL |
| `METABASE_READONLY_USER` | Yes* | `metabase_readonly` | Read-only user for CMDB data mart access |
| `METABASE_READONLY_PASSWORD` | Yes* | - | Read-only user password |
| `METABASE_AUTO_SYNC_ENABLED` | No | `true` | Enable automatic database schema sync |
| `METABASE_AUTO_SYNC_SCHEDULE` | No | `0 3 * * *` | Schema sync cron schedule (3 AM daily) |

**Example:**

```bash
METABASE_ENABLED=true
METABASE_PORT=3002
METABASE_DATABASE=metabase
METABASE_DB_USER=metabase_user
METABASE_DB_PASSWORD=${METABASE_DB_PASSWORD}
METABASE_ENCRYPTION_KEY=${METABASE_ENCRYPTION_KEY}
METABASE_SITE_URL=https://bi.configbuddy.internal
METABASE_READONLY_USER=metabase_readonly
METABASE_READONLY_PASSWORD=${METABASE_READONLY_PASSWORD}
METABASE_AUTO_SYNC_ENABLED=true
```

**Security Best Practices**:
- Generate strong encryption key: `openssl rand -base64 32`
- Use read-only database credentials for Metabase
- Restrict Metabase port to internal network only
- Enable HTTPS for production deployments

---

## Legacy v1.0 Configuration (Deprecated)

::: warning DEPRECATED
The following sections are for ConfigBuddy v1.0 only and are **deprecated** in v2.0.

**v2.0 uses a unified credential system** stored in PostgreSQL. Do NOT use environment variables for connector credentials. See [Credentials Management](/components/credentials) for v2.0 configuration.
:::

## AWS Configuration (v1.0 Only - DEPRECATED)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AWS_REGION` | Yes | `us-east-1` | Default AWS region |
| `AWS_ACCESS_KEY_ID` | Yes* | - | AWS access key (*or use IAM role) |
| `AWS_SECRET_ACCESS_KEY` | Yes* | - | AWS secret key (*or use IAM role) |
| `AWS_SESSION_TOKEN` | No | - | AWS session token (for temporary credentials) |
| `AWS_DISCOVERY_REGIONS` | No | `all` | Comma-separated regions or `all` |
| `AWS_DISCOVERY_SERVICES` | No | `all` | Comma-separated services or `all` |
| `AWS_MAX_RETRIES` | No | `3` | Max API retry attempts |
| `AWS_TIMEOUT` | No | `30000` | API timeout (ms) |

**Example:**

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}  # From secrets or IAM role
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}  # From secrets or IAM role
AWS_DISCOVERY_REGIONS=us-east-1,us-west-2,eu-west-1
AWS_DISCOVERY_SERVICES=ec2,rds,s3,lambda,ecs
AWS_MAX_RETRIES=5
```

## Azure Configuration (v1.0 Only - DEPRECATED)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AZURE_SUBSCRIPTION_ID` | Yes | - | Azure subscription ID |
| `AZURE_TENANT_ID` | Yes | - | Azure tenant ID |
| `AZURE_CLIENT_ID` | Yes | - | Service principal client ID |
| `AZURE_CLIENT_SECRET` | Yes | - | Service principal client secret |
| `AZURE_DISCOVERY_RESOURCE_GROUPS` | No | `all` | Comma-separated resource groups or `all` |
| `AZURE_DISCOVERY_REGIONS` | No | `all` | Comma-separated regions or `all` |

**Example:**

```bash
AZURE_SUBSCRIPTION_ID=${AZURE_SUBSCRIPTION_ID}
AZURE_TENANT_ID=${AZURE_TENANT_ID}
AZURE_CLIENT_ID=${AZURE_CLIENT_ID}
AZURE_CLIENT_SECRET=${AZURE_CLIENT_SECRET}
AZURE_DISCOVERY_RESOURCE_GROUPS=production-rg,staging-rg
AZURE_DISCOVERY_REGIONS=eastus,westus2,westeurope
```

## GCP Configuration (v1.0 Only - DEPRECATED)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GCP_PROJECT_ID` | Yes | - | GCP project ID |
| `GCP_CREDENTIALS_JSON` | No | - | Path to service account JSON file |
| `GOOGLE_APPLICATION_CREDENTIALS` | No | - | Path to service account JSON (alternative) |
| `GCP_DISCOVERY_ZONES` | No | `all` | Comma-separated zones or `all` |
| `GCP_DISCOVERY_REGIONS` | No | `all` | Comma-separated regions or `all` |

**Example:**

```bash
GCP_PROJECT_ID=my-project-123
GOOGLE_APPLICATION_CREDENTIALS=/secrets/gcp-service-account.json
GCP_DISCOVERY_ZONES=us-central1-a,us-central1-b,europe-west1-b
```

## Performance Tuning

### High-Traffic Configuration

```bash
# API Server
API_PORT=3000
CLUSTER_WORKERS=4  # Number of Node.js cluster workers

# Databases
NEO4J_MAX_CONNECTION_POOL_SIZE=200
POSTGRES_MAX_CONNECTIONS=100

# Queue
QUEUE_CONCURRENCY=20
QUEUE_MAX_JOBS_PER_WORKER=3

# Discovery
DISCOVERY_CONCURRENCY=20
DISCOVERY_BATCH_SIZE=1000

# ETL
ETL_BATCH_SIZE=5000
ETL_CONCURRENCY=10

# Caching
REDIS_MAX_MEMORY=8gb
REDIS_EVICTION_POLICY=allkeys-lru
```

### Low-Resource Configuration

```bash
# API Server
CLUSTER_WORKERS=1

# Databases
NEO4J_MAX_CONNECTION_POOL_SIZE=10
POSTGRES_MAX_CONNECTIONS=10

# Queue
QUEUE_CONCURRENCY=2

# Discovery
DISCOVERY_CONCURRENCY=2
DISCOVERY_BATCH_SIZE=100

# ETL
ETL_BATCH_SIZE=500
ETL_CONCURRENCY=1
```

## Secrets Management

### Development (.env file)

```bash
# .env.development (DO NOT COMMIT)
NEO4J_PASSWORD=dev-password
POSTGRES_PASSWORD=dev-password
REDIS_PASSWORD=dev-password
JWT_SECRET=dev-jwt-secret-min-32-chars-long
```

### Production (Kubernetes Secrets)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cmdb-secrets
  namespace: cmdb
type: Opaque
stringData:
  neo4j-password: <secure-password>
  postgres-password: <secure-password>
  redis-password: <secure-password>
  jwt-secret: <secure-secret-min-32-chars>
  aws-access-key-id: <aws-key>
  aws-secret-access-key: <aws-secret>
  azure-client-secret: <azure-secret>
```

**Reference in Deployment:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  template:
    spec:
      containers:
      - name: api-server
        env:
        - name: NEO4J_PASSWORD
          valueFrom:
            secretKeyRef:
              name: cmdb-secrets
              key: neo4j-password
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: cmdb-secrets
              key: jwt-secret
```

## See Also

- [Configuration Guide](/guides/configuration)
- [Security Best Practices](/guides/security)
- [Deployment Guide](/deployment/overview)
- [Troubleshooting](/operations/troubleshooting)
