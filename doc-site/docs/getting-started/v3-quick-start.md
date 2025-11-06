# v3.0 Quick Start Guide

Get started with ConfigBuddy v3.0 + Agentic AI, including the Unified Enterprise Framework (ITIL + TBM + BSM) and multi-stakeholder dashboards.

## Prerequisites

Before you begin, ensure you have:

- **Docker** 20.10+ installed
- **Docker Compose** 2.0+ installed
- **Node.js** 20.0+ (for local development)
- **At least 8GB RAM** available (v3.0 requires more resources for Kafka, Metabase, Prometheus, Grafana)
- **Available ports**:
  - 80 (Web UI)
  - 3000 (API Server)
  - 3001 (Metabase)
  - 7474 (Neo4j Browser)
  - 7687 (Neo4j Bolt)
  - 5432 (PostgreSQL)
  - 6379 (Redis)
  - 9092 (Kafka)
  - 9090 (Prometheus)
  - 3002 (Grafana)
  - 8080 (Documentation)

## Step 1: Clone and Deploy

### Clone Repository

```bash
git clone https://github.com/configbuddy/configbuddy.git
cd configbuddy
```

### Configure Environment

Copy the example environment file and update values:

```bash
cp .env.example .env
```

Key v3.0 environment variables to configure:

```bash
# Agentic AI Discovery (v3.0)
AI_DISCOVERY_ENABLED=true
AI_DISCOVERY_PROVIDER=anthropic                 # or openai
ANTHROPIC_API_KEY=your-api-key-here            # Get from https://console.anthropic.com

# Pattern Learning
AI_PATTERN_LEARNING_ENABLED=true
AI_PATTERN_AUTO_APPROVAL_ENABLED=false         # Require CAB approval

# Cost Controls
AI_DISCOVERY_MONTHLY_BUDGET=100.00
AI_DISCOVERY_MAX_COST_PER_SESSION=0.50

# ITIL Service Manager (v3.0)
ITIL_ENABLED=true
ITIL_DEFAULT_SLA_PRIORITY_1=4h
ITIL_CAB_APPROVAL_REQUIRED=true

# TBM Cost Engine (v3.0)
TBM_ENABLED=true
TBM_DEFAULT_ALLOCATION_METHOD=usage-based
TBM_CLOUD_COST_SYNC_ENABLED=true

# BSM Impact Engine (v3.0)
BSM_ENABLED=true
BSM_AUTO_CRITICALITY_ENABLED=true
BSM_REVENUE_TRACKING_ENABLED=true

# Event Streaming (v3.0)
KAFKA_ENABLED=true

# Metabase BI (v3.0)
METABASE_ENABLED=true
```

### Deploy All Services

Use the deployment script to build and start all services:

```bash
# Full deployment (recommended for first run)
./deploy.sh --clean --seed

# Quick deployment (uses existing builds)
./deploy.sh
```

This will start:
- Neo4j graph database
- PostgreSQL with TimescaleDB
- Redis cache and queue
- Apache Kafka event streaming
- API Server with v3.0 endpoints
- Discovery Engine with AI capabilities
- ETL Processor
- Event Processor
- Web UI with 5 stakeholder dashboards
- Metabase BI
- Prometheus monitoring
- Grafana dashboards
- Documentation site

### Verify Deployment

Check that all services are running:

```bash
docker-compose -f infrastructure/docker/docker-compose.yml ps
```

All services should show as "Up" or "healthy".

## Step 2: Access the Platform

### Web UI (Multi-Stakeholder Dashboards)

Open your browser to access the main dashboard:

```
http://localhost:3001
```

Default credentials (with --seed):
- Username: `admin@configbuddy.local`
- Password: `Admin123!`

Available dashboards:
1. **Executive Dashboard** - High-level KPIs, business impact, cost trends
2. **CIO Dashboard** - IT operations, service health, technology roadmap
3. **ITSM Manager Dashboard** - Incidents, changes, SLA compliance
4. **FinOps Dashboard** - Cost allocation, budget tracking, optimization opportunities
5. **Business Service Owner Dashboard** - Service performance, dependencies, criticality

### API Server

REST and GraphQL APIs available at:

```
http://localhost:3000/api/v1          # REST API
http://localhost:3000/graphql         # GraphQL Playground
```

### Metabase BI

Self-service analytics and custom reporting:

```
http://localhost:3001
```

Default credentials:
- Email: `admin@configbuddy.local`
- Password: `Metabase123!`

### Monitoring

Access infrastructure monitoring:

**Prometheus**:
```
http://localhost:9090
```

**Grafana**:
```
http://localhost:3002
```

Default credentials:
- Username: `admin`
- Password: `admin`

### Documentation

Comprehensive documentation site:

```
http://localhost:8080
```

## Step 3: Initial Configuration

### Configure ITIL Service Management

1. Navigate to **Settings > ITIL Configuration**
2. Set SLA targets for each priority:
   - Priority 1 (Critical): 4 hours
   - Priority 2 (High): 8 hours
   - Priority 3 (Medium): 24 hours
   - Priority 4 (Low): 72 hours
3. Enable CAB approval for high-risk changes
4. Configure baseline creation schedule

### Configure TBM Cost Engine

1. Navigate to **Settings > TBM Configuration**
2. Set default cost allocation method:
   - Direct (for dedicated resources)
   - Usage-based (for shared resources)
   - Equal split (for common services)
3. Configure GL code mappings for each tower
4. Enable cloud cost synchronization:
   - AWS Cost Explorer API
   - Azure Cost Management API
   - GCP Cloud Billing API

### Configure BSM Impact Engine

1. Navigate to **Settings > BSM Configuration**
2. Define business criticality tiers:
   - Tier 0: Mission-critical (e.g., payment processing)
   - Tier 1: Business-critical (e.g., customer portal)
   - Tier 2: Important (e.g., reporting systems)
   - Tier 3: Standard (e.g., internal tools)
   - Tier 4: Low impact (e.g., dev environments)
3. Set revenue impact thresholds
4. Enable auto-criticality calculation based on dependencies

## Step 4: Run Your First AI Discovery

### Option 1: Using the Web UI

1. Navigate to **Discovery > New Discovery Session**
2. Select discovery type:
   - **Pattern-based** (fast, no LLM cost) - Use for known infrastructure
   - **Hybrid** (pattern + AI fallback) - Recommended for most cases
   - **AI-only** (full LLM analysis) - Use for unknown/complex infrastructure
3. Enter target information (IP, hostname, or cloud resource)
4. Configure enrichment options:
   - ✓ ITIL service classification
   - ✓ TBM cost allocation
   - ✓ BSM criticality scoring
5. Start discovery session
6. Monitor progress in real-time (WebSocket updates)

### Option 2: Using the CLI

```bash
# AI-powered discovery with full enrichment
npx @cmdb/cli discovery run \\
  --provider anthropic \\
  --target "prod-web-server-01" \\
  --enrich-itil \\
  --enrich-tbm \\
  --enrich-bsm

# Pattern-based discovery (zero cost)
npx @cmdb/cli discovery run \\
  --mode pattern \\
  --target "10.0.1.0/24" \\
  --enrich-all
```

### Option 3: Using the REST API

```bash
curl -X POST http://localhost:3000/api/v1/discovery/sessions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '{
    "provider": "anthropic",
    "mode": "hybrid",
    "target": {
      "type": "server",
      "identifier": "prod-web-server-01"
    },
    "enrichment": {
      "itil": true,
      "tbm": true,
      "bsm": true
    },
    "costControls": {
      "maxCostPerSession": 0.50
    }
  }'
```

## Step 5: View Discovery Results

### Web UI

1. Navigate to **Discovery > Sessions**
2. Click on completed session to view:
   - Discovered CIs with full details
   - ITIL service classification (CI type, configuration baseline)
   - TBM cost allocation (tower, cost center, allocation method)
   - BSM criticality (tier, business impact, blast radius)
   - AI insights and recommendations
3. If pattern was compiled, view pattern details:
   - Pattern success rate
   - Cost savings vs AI-only
   - CAB approval status

### API

Query discovered CIs with enriched data:

```bash
curl http://localhost:3000/api/v1/cis?enriched=true \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response includes:

```json
{
  "cis": [
    {
      "id": "ci-12345",
      "name": "prod-web-server-01",
      "type": "virtual-machine",
      "itil": {
        "serviceType": "application-server",
        "configurationBaseline": "baseline-001",
        "changeApprovalRequired": true
      },
      "tbm": {
        "tower": "compute",
        "costCenter": "CC-ECOM-001",
        "allocationMethod": "usage-based",
        "monthlyCost": 450.00
      },
      "bsm": {
        "criticalityTier": 1,
        "businessImpactScore": 95,
        "revenueAtRisk": 50000.00,
        "userImpact": 10000,
        "blastRadius": 15
      }
    }
  ]
}
```

## Step 6: Access Stakeholder Dashboards

### Executive Dashboard

Key metrics:
- Total IT spend (monthly/quarterly/annual)
- Business services at risk
- Cost optimization opportunities
- MTTR trends
- Change success rate

Navigate to: **Dashboards > Executive**

### CIO Dashboard

Key metrics:
- Service health score
- Infrastructure capacity utilization
- Technology debt
- Innovation vs maintenance ratio
- Vendor consolidation opportunities

Navigate to: **Dashboards > CIO**

### ITSM Manager Dashboard

Key metrics:
- Open incidents by priority
- SLA compliance rate
- Change approval backlog
- Mean time to resolve (MTTR)
- Recurring incidents

Navigate to: **Dashboards > ITSM Manager**

### FinOps Dashboard

Key metrics:
- Cost per business service
- Cost trends by tower
- Budget variance
- Waste identification
- Cost allocation accuracy

Navigate to: **Dashboards > FinOps**

### Business Service Owner Dashboard

Key metrics:
- Service availability
- Dependency health
- Business criticality score
- Revenue at risk
- Upstream/downstream impacts

Navigate to: **Dashboards > Business Service Owner**

## Step 7: Configure Metabase BI

### Connect to CMDB Database

1. Open Metabase at http://localhost:3001
2. Navigate to **Admin > Databases > Add Database**
3. Configure PostgreSQL connection:
   - Database type: PostgreSQL
   - Host: `cmdb-postgres`
   - Port: `5432`
   - Database name: `cmdb`
   - Username: `cmdb_user`
   - Password: (from .env file)
4. Test connection and save

### Create Custom Reports

Example: Cost by Business Service

1. Navigate to **New > Question**
2. Select **Custom Question**
3. Choose data source: `cmdb` database
4. Build query:

```sql
SELECT
  bs.name AS business_service,
  SUM(ci.tbm_monthly_cost) AS total_cost,
  bs.bsm_criticality_tier,
  bs.bsm_revenue_at_risk
FROM business_services bs
JOIN ci_business_service_mapping map ON bs.id = map.business_service_id
JOIN configuration_items ci ON map.ci_id = ci.id
WHERE bs.status = 'active'
GROUP BY bs.id, bs.name, bs.bsm_criticality_tier, bs.bsm_revenue_at_risk
ORDER BY total_cost DESC
LIMIT 20;
```

5. Visualize as bar chart or table
6. Save to dashboard

## Step 8: Set Up Monitoring

### Prometheus Metrics

Verify metrics are being collected:

```
http://localhost:9090/graph
```

Query examples:
- `cmdb_discovery_sessions_total` - Total discovery sessions
- `cmdb_ai_discovery_cost_usd` - AI discovery costs
- `cmdb_pattern_compilation_success_rate` - Pattern learning success rate
- `cmdb_kafka_consumer_lag` - Event streaming lag
- `cmdb_api_request_duration_seconds` - API performance

### Grafana Dashboards

Pre-configured dashboards available:

1. **CMDB Platform Overview**
   - Service health
   - Discovery metrics
   - Database performance
   - Queue status

2. **AI Discovery Performance**
   - Discovery session metrics
   - Pattern compilation stats
   - Cost tracking
   - LLM provider performance

3. **Event Streaming Health**
   - Kafka broker status
   - Topic throughput
   - Consumer lag
   - DLQ messages

4. **Business Metrics**
   - Total CIs by type
   - Service criticality distribution
   - Cost trends
   - Change success rate

Access at: http://localhost:3002

## Next Steps

### 1. Configure Connectors

Add credentials for cloud providers and external systems:

- [AWS Integration](/integration/aws)
- [Azure Integration](/integration/azure)
- [GCP Integration](/integration/gcp)
- [ServiceNow Integration](/integration/servicenow)
- [Jira Integration](/integration/jira)

### 2. Set Up Scheduled Discovery

Configure recurring discovery jobs:

```bash
npx @cmdb/cli discovery schedule \\
  --provider anthropic \\
  --mode hybrid \\
  --target-group "production-servers" \\
  --cron "0 2 * * *" \\
  --enrich-all
```

### 3. Configure Alerts

Set up alerting rules in Prometheus for:
- High AI discovery costs
- SLA breaches
- Configuration drift detection
- Service health degradation
- Budget overruns

See: [Monitoring Setup](/operations/MONITORING_SETUP_SUMMARY)

### 4. Customize Dashboards

Add custom widgets to stakeholder dashboards:

1. Navigate to **Dashboards > [Dashboard Name] > Edit**
2. Add widget from library or create custom query
3. Configure visualization type and data source
4. Save changes

### 5. Enable Pattern Auto-Approval (Optional)

Once you're confident in pattern quality:

```bash
# Update .env
AI_PATTERN_AUTO_APPROVAL_ENABLED=true
AI_PATTERN_MIN_SESSIONS=5  # Require 5 successful sessions before auto-approval

# Restart API server
docker-compose -f infrastructure/docker/docker-compose.yml restart api-server
```

### 6. Explore Advanced Features

- [AI/ML Engine](/components/ai-ml-engine) - Anomaly detection, drift detection
- [Unified Framework](/components/unified-framework) - Cross-framework KPIs
- [Event Streaming](/components/event-streaming) - Real-time event processing
- [Multi-Stakeholder Dashboards](/components/dashboards) - Dashboard customization

## Troubleshooting

### Services Not Starting

Check Docker logs:

```bash
docker-compose -f infrastructure/docker/docker-compose.yml logs -f [service-name]
```

### AI Discovery Failing

1. Verify API key is set correctly in `.env`
2. Check cost limits haven't been exceeded
3. View discovery logs:

```bash
docker logs cmdb-api-server | grep "AI Discovery"
```

### Pattern Compilation Issues

1. Ensure at least 3 successful sessions exist for the target type
2. Check pattern approval status in Web UI
3. Review pattern validation errors:

```bash
curl http://localhost:3000/api/v1/patterns?status=failed
```

### Dashboard Data Missing

1. Verify discovery has completed successfully
2. Check ETL processor logs:

```bash
docker logs cmdb-etl-processor
```

3. Ensure enrichment was enabled during discovery

### Kafka Connection Issues

1. Verify Kafka is running:

```bash
docker-compose -f infrastructure/docker/docker-compose.yml ps kafka
```

2. Check Kafka broker logs:

```bash
docker logs cmdb-kafka
```

## Support

- **Documentation**: http://localhost:8080
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Quick Reference**: [Operations Quick Reference Card](/operations/QUICK_REFERENCE_CARD)

---

**Congratulations!** You've successfully deployed ConfigBuddy v3.0 with the Unified Enterprise Framework. Start discovering your infrastructure and leverage ITIL, TBM, and BSM capabilities to gain comprehensive visibility and control.
