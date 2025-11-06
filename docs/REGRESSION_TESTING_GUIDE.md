# ConfigBuddy v3.0 Regression Testing Guide

**Version**: 3.0.0
**Last Updated**: November 2025
**Status**: Production-Ready
**Test Cycle Duration**: 4-6 hours (full suite)

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Testing Checklist](#pre-testing-checklist)
3. [Test Execution Strategy](#test-execution-strategy)
4. [Test Suites](#test-suites)
   - [A. Unit Tests](#a-unit-tests)
   - [B. Integration Tests](#b-integration-tests)
   - [C. End-to-End Workflows](#c-end-to-end-workflows)
   - [D. Performance Tests](#d-performance-tests)
   - [E. Monitoring & Alerting Tests](#e-monitoring--alerting-tests)
   - [F. Data Validation Tests](#f-data-validation-tests)
5. [Regression Test Matrix](#regression-test-matrix)
6. [Issue Tracking](#issue-tracking)
7. [Sign-Off Criteria](#sign-off-criteria)
8. [Appendix](#appendix)

---

## Overview

### Purpose

This guide provides a comprehensive regression testing strategy for ConfigBuddy v3.0, ensuring that:

- All v3.0 features (ITIL, TBM, BSM, AI/ML, AI Discovery) function correctly
- Existing v2.0 functionality remains intact
- Integration points between frameworks work seamlessly
- Performance targets are met under realistic load
- Data quality and accuracy are maintained

### Scope

**Included in Regression Testing:**

- ✅ All v3.0 packages (BSM Impact Engine, TBM Cost Engine, ITIL Service Manager, Framework Integration, AI/ML Engine, AI Discovery)
- ✅ v2.0 packages (Discovery Engine, Connectors, API Server, ETL Processor, Database layer)
- ✅ Database operations (Neo4j, PostgreSQL, Redis)
- ✅ Event streaming (Kafka topics and consumers)
- ✅ API endpoints (REST + GraphQL)
- ✅ Web UI dashboards
- ✅ Monitoring and alerting (Prometheus, Grafana)
- ✅ Data accuracy (enrichment, cost allocation, impact scoring)

**Excluded from Regression Testing:**

- ❌ Third-party service behavior (AWS, Azure, GCP APIs)
- ❌ External integrations not part of core CMDB (e.g., Slack, email notifications)
- ❌ Infrastructure-level testing (Kubernetes, Docker daemon)

### Test Environments

| Environment | Purpose | Data | Access |
|-------------|---------|------|--------|
| **Local Dev** | Developer testing | Mock/minimal data | Developer workstation |
| **Staging** | Pre-production validation | Anonymized production data | `staging.configbuddy.local` |
| **Performance** | Load testing | Synthetic large-scale data | `perf.configbuddy.local` |
| **Production** | Smoke tests only | Live data | `app.configbuddy.com` |

**Recommended Environment for Full Regression**: **Staging**

---

## Pre-Testing Checklist

### 1. Environment Setup

- [ ] All services running (API, Discovery, ETL, Agents, Web UI)
- [ ] Databases accessible (Neo4j, PostgreSQL, Redis)
- [ ] Kafka cluster operational
- [ ] Monitoring stack running (Prometheus, Grafana)
- [ ] Test credentials configured for cloud providers (AWS, Azure, GCP)

**Verification Commands:**

```bash
# Check all Docker containers
docker ps | grep cmdb

# Verify Neo4j
docker exec cmdb-neo4j cypher-shell -u neo4j -p <password> "MATCH (n) RETURN count(n) LIMIT 1;"

# Verify PostgreSQL
docker exec cmdb-postgres psql -U cmdb_user -d cmdb -c "SELECT 1;"

# Verify Redis
docker exec cmdb-redis redis-cli PING

# Verify Kafka
docker exec cmdb-kafka kafka-topics --list --bootstrap-server localhost:9092

# Check API health
curl http://localhost:3000/health

# Check Web UI
curl http://localhost:3001/
```

### 2. Data Preparation

- [ ] Staging database contains representative test data (see [Test Data Generator](#test-data-generator))
- [ ] At least 1,000 CIs across different types (servers, applications, databases, cloud resources)
- [ ] At least 50 business services with ITIL/TBM/BSM attributes
- [ ] At least 100 relationships between CIs
- [ ] Test cost data for last 90 days
- [ ] Test incidents and change requests

**Seed Test Data:**

```bash
# Generate test data
cd packages/common
npm run test:seed

# Or use SQL scripts
docker exec -i cmdb-postgres psql -U cmdb_user -d cmdb < test/seed/test-data.sql

# Verify data
docker exec cmdb-neo4j cypher-shell -u neo4j -p <password> \
  "MATCH (n:CI) RETURN n.ci_type, count(n) ORDER BY count(n) DESC;"
```

### 3. Configuration Verification

- [ ] Environment variables set correctly (`.env` file)
- [ ] Feature flags enabled for v3.0 features
- [ ] Log level set appropriately (`LOG_LEVEL=info` for staging)
- [ ] Test connector credentials valid
- [ ] AI/ML features enabled (`AI_ANOMALY_DETECTION_ENABLED=true`)

**Configuration Check:**

```bash
# Verify environment variables
grep -E "NODE_ENV|AI_.*_ENABLED|FEATURE_.*" .env

# Check feature flags
curl http://localhost:3000/api/v1/system/features
```

### 4. Build Verification

- [ ] All packages built successfully (`npm run build`)
- [ ] No TypeScript compilation errors
- [ ] All dependencies installed (`npm install`)
- [ ] Docker images up-to-date

**Build Check:**

```bash
# Clean build
npm run clean
npm install
npm run build

# Check for errors
echo $?  # Should return 0
```

---

## Test Execution Strategy

### Phases

Regression testing is executed in **6 phases** to catch issues early and minimize test execution time:

| Phase | Description | Duration | Gating |
|-------|-------------|----------|--------|
| **1. Unit Tests** | Test individual functions/methods | 10-15 min | Must pass 100% |
| **2. Integration Tests** | Test component interactions | 20-30 min | Must pass 95%+ |
| **3. E2E Workflows** | Test complete user flows | 60-90 min | Must pass 100% |
| **4. Performance Tests** | Load/stress testing | 60-120 min | Must meet targets |
| **5. Monitoring Tests** | Verify observability | 15-20 min | Must pass 100% |
| **6. Data Validation** | Verify accuracy | 30-45 min | Must pass 100% |

**Total Estimated Time**: 4-6 hours

### Test Order

Tests MUST be run in the following order due to dependencies:

```
Unit Tests → Integration Tests → E2E Workflows → Performance Tests → Monitoring Tests → Data Validation
```

**Rationale**: Each phase validates prerequisites for the next phase.

### Parallel Execution

Tests within each phase CAN be run in parallel to reduce execution time:

```bash
# Run all unit tests in parallel (4 workers)
npm test -- --ci --coverage --maxWorkers=4

# Run integration tests in parallel
npm run test:integration -- --maxWorkers=2
```

### Failure Handling

**Stop-on-Failure Policy:**

- **Unit Tests**: STOP if any test fails. Fix before proceeding.
- **Integration Tests**: STOP if >5% of tests fail.
- **E2E Tests**: STOP if any critical workflow fails.
- **Performance Tests**: Continue but flag failures.
- **Monitoring Tests**: Continue but flag failures.
- **Data Validation**: STOP if accuracy <95%.

---

## Test Suites

### A. Unit Tests

Unit tests validate individual functions, methods, and classes in isolation.

#### BSM Impact Engine Tests

**Package**: `@cmdb/bsm-impact-engine`
**Test Location**: `/packages/bsm-impact-engine/__tests__/unit/`
**Coverage Target**: 80%+

**Test Files:**

| Test File | Description | Critical? |
|-----------|-------------|-----------|
| `criticality-calculator.service.test.ts` | Tests tier calculation logic (tier_0 to tier_4) | ✅ Yes |
| `blast-radius.service.test.ts` | Tests impact propagation algorithms | ✅ Yes |
| `risk-assessor.service.test.ts` | Tests change risk scoring | ✅ Yes |
| `impact-score.service.test.ts` | Tests business impact scoring | ✅ Yes |
| `bsm-enricher.service.test.ts` | Tests BSM attribute enrichment | ⚠️ Medium |

**Run Commands:**

```bash
cd packages/bsm-impact-engine
npm test
npm run test:coverage
```

**Expected Results:**

- All tests pass (100%)
- Code coverage ≥ 80%
- No console errors or warnings
- Test execution time < 30 seconds

**Key Validations:**

- ✅ Tier 0 services correctly identified (revenue > $50M, users > 1M)
- ✅ Tier 4 services correctly identified (revenue < $100K, users < 1K)
- ✅ Blast radius algorithm finds all downstream dependencies
- ✅ Risk scores calculated correctly (critical=9-10, high=7-8, medium=4-6, low=1-3)

#### TBM Cost Engine Tests

**Package**: `@cmdb/tbm-cost-engine`
**Test Location**: `/packages/tbm-cost-engine/__tests__/unit/`
**Coverage Target**: 80%+

**Test Files:**

| Test File | Description | Critical? |
|-----------|-------------|-----------|
| `cost-calculator.service.test.ts` | Tests cost allocation methods | ✅ Yes |
| `depreciation.service.test.ts` | Tests depreciation schedules | ✅ Yes |
| `cost-allocation.service.test.ts` | Tests direct/usage/equal-split allocation | ✅ Yes |
| `aws-cost-sync.service.test.ts` | Tests AWS Cost Explorer integration | ⚠️ Medium |
| `azure-cost-sync.service.test.ts` | Tests Azure Cost Management integration | ⚠️ Medium |
| `gcp-cost-sync.service.test.ts` | Tests GCP Cloud Billing integration | ⚠️ Medium |

**Run Commands:**

```bash
cd packages/tbm-cost-engine
npm test
npm run test:coverage
```

**Expected Results:**

- All tests pass (100%)
- Code coverage ≥ 80%
- Cost calculations accurate to 2 decimal places

**Key Validations:**

- ✅ Direct allocation: 100% cost to single CI
- ✅ Usage-based allocation: Cost split proportional to usage metrics
- ✅ Equal-split allocation: Cost divided equally among CIs
- ✅ Depreciation: Straight-line, declining balance, units of production
- ✅ Cost roll-up: Child costs aggregated to parent business service

#### ITIL Service Manager Tests

**Package**: `@cmdb/itil-service-manager`
**Test Location**: `/packages/itil-service-manager/__tests__/unit/`
**Coverage Target**: 80%+

**Test Files:**

| Test File | Description | Critical? |
|-----------|-------------|-----------|
| `incident.service.test.ts` | Tests incident lifecycle | ✅ Yes |
| `change.service.test.ts` | Tests change request workflow | ✅ Yes |
| `problem.service.test.ts` | Tests problem management | ⚠️ Medium |
| `service-catalog.service.test.ts` | Tests service catalog operations | ⚠️ Medium |
| `itil-enricher.service.test.ts` | Tests ITIL attribute enrichment | ✅ Yes |

**Run Commands:**

```bash
cd packages/itil-service-manager
npm test
npm run test:coverage
```

**Expected Results:**

- All tests pass (100%)
- Code coverage ≥ 80%
- State transitions follow ITIL v4 practices

**Key Validations:**

- ✅ Incident states: New → In Progress → Resolved → Closed
- ✅ Change states: Requested → Approved → Scheduled → Implemented → Closed
- ✅ Priority calculation: Impact × Urgency = Priority
- ✅ SLA tracking: Target resolution time based on priority
- ✅ CI relationships: Incidents/changes linked to affected CIs

#### Framework Integration Tests

**Package**: `@cmdb/framework-integration`
**Test Location**: `/packages/framework-integration/tests/unit/`
**Coverage Target**: 75%+

**Test Files:**

| Test File | Description | Critical? |
|-----------|-------------|-----------|
| `unified-ci.service.test.ts` | Tests unified CI model | ✅ Yes |
| `framework-orchestrator.service.test.ts` | Tests cross-framework orchestration | ✅ Yes |
| `enrichment-pipeline.test.ts` | Tests ITIL+TBM+BSM enrichment | ✅ Yes |

**Run Commands:**

```bash
cd packages/framework-integration
npm test
npm run test:coverage
```

**Expected Results:**

- All tests pass (100%)
- Code coverage ≥ 75%
- Unified CI contains attributes from all 3 frameworks

**Key Validations:**

- ✅ Unified CI merges ITIL + TBM + BSM attributes
- ✅ Enrichment pipeline runs in correct order
- ✅ Missing attributes handled gracefully

#### AI/ML Engine Tests

**Package**: `@cmdb/ai-ml-engine`
**Test Location**: `/packages/ai-ml-engine/__tests__/`
**Coverage Target**: 70%+

**Test Files:**

| Test File | Description | Critical? |
|-----------|-------------|-----------|
| `anomaly-detector.test.ts` | Tests anomaly detection algorithms | ⚠️ Medium |
| `impact-predictor.test.ts` | Tests ML-based impact prediction | ⚠️ Medium |
| `drift-detector.test.ts` | Tests configuration drift detection | ⚠️ Medium |

**Run Commands:**

```bash
cd packages/ai-ml-engine
npm test
npm run test:coverage
```

**Expected Results:**

- All tests pass (100%)
- Code coverage ≥ 70%
- ML models produce consistent predictions

#### AI Discovery Tests

**Package**: `@cmdb/ai-discovery`
**Test Location**: `/packages/ai-discovery/__tests__/`
**Coverage Target**: 70%+

**Test Files:**

| Test File | Description | Critical? |
|-----------|-------------|-----------|
| `ai-discovery-engine.test.ts` | Tests LLM-based discovery | ⚠️ Medium |
| `prompt-builder.test.ts` | Tests prompt construction | ⚠️ Medium |
| `response-parser.test.ts` | Tests LLM response parsing | ⚠️ Medium |

**Run Commands:**

```bash
cd packages/ai-discovery
npm test
npm run test:coverage
```

**Expected Results:**

- All tests pass (100%)
- Code coverage ≥ 70%
- LLM responses parsed correctly

---

### B. Integration Tests

Integration tests validate interactions between components, databases, and external services.

#### Database Integration

**Test Scope**: Neo4j, PostgreSQL, Redis connectivity and operations

**Test Files:**

| Test | Package | Description |
|------|---------|-------------|
| Neo4j CRUD | `@cmdb/database` | Create, read, update, delete CIs |
| Neo4j Relationships | `@cmdb/database` | Create, query relationships |
| PostgreSQL CRUD | `@cmdb/database` | Insert, select, update, delete records |
| Redis Cache | `@cmdb/database` | Set, get, expire cache entries |
| Connection Pooling | `@cmdb/database` | Verify connection pool behavior |

**Run Commands:**

```bash
cd packages/database
npm run test:integration
```

**Expected Results:**

- All tests pass (100%)
- No connection leaks
- Transactions committed/rolled back correctly

**Key Validations:**

- ✅ Neo4j session cleanup after queries
- ✅ PostgreSQL transactions rollback on error
- ✅ Redis keys expire as configured
- ✅ Connection pool size limits respected

#### Event Streaming Integration

**Test Scope**: Kafka producers, consumers, topic management

**Test Files:**

| Test | Package | Description |
|------|---------|-------------|
| Event Publishing | `@cmdb/event-streaming` | Publish events to topics |
| Event Consumption | `@cmdb/event-streaming` | Consume events from topics |
| Dead Letter Queue | `@cmdb/event-streaming` | Failed events routed to DLQ |
| Event Ordering | `@cmdb/event-streaming` | Events processed in order |

**Run Commands:**

```bash
cd packages/event-streaming
npm run test:integration
```

**Expected Results:**

- All tests pass (100%)
- Events published successfully
- Consumers process events without errors

**Key Validations:**

- ✅ CI discovery events published to `ci.discovered` topic
- ✅ CI enrichment events published to `ci.enriched` topic
- ✅ Cost events published to `cost.updated` topic
- ✅ Incident events published to `incident.created` topic
- ✅ Change events published to `change.created` topic

#### Framework Integration Tests

**Test Scope**: ITIL + TBM + BSM integration

**Test Files:**

| Test | Package | Description |
|------|---------|-------------|
| Unified CI Creation | `@cmdb/framework-integration` | Create CI with all framework attributes |
| Cross-Framework Query | `@cmdb/framework-integration` | Query CI with ITIL+TBM+BSM filters |
| Enrichment Pipeline | `@cmdb/framework-integration` | Run full enrichment pipeline |

**Run Commands:**

```bash
cd packages/framework-integration
npm run test:integration
```

**Expected Results:**

- All tests pass (100%)
- Unified CI contains all framework attributes
- Queries return correct results

**Key Validations:**

- ✅ CI enriched with ITIL attributes (service_tier, priority)
- ✅ CI enriched with TBM attributes (total_cost, monthly_cost)
- ✅ CI enriched with BSM attributes (criticality, impact_score)

#### API Integration Tests

**Test Scope**: REST + GraphQL endpoints

**Test Files:**

| Test | Package | Description |
|------|---------|-------------|
| REST API CRUD | `@cmdb/api-server` | Test all REST endpoints |
| GraphQL Queries | `@cmdb/api-server` | Test GraphQL queries |
| GraphQL Mutations | `@cmdb/api-server` | Test GraphQL mutations |
| Authentication | `@cmdb/api-server` | Test JWT authentication |
| Authorization | `@cmdb/api-server` | Test role-based access control |

**Run Commands:**

```bash
cd packages/api-server
npm run test:integration
```

**Expected Results:**

- All tests pass (100%)
- API responses match OpenAPI spec
- GraphQL schema validates correctly

**Key Validations:**

- ✅ GET `/api/v1/cis` returns paginated CI list
- ✅ GET `/api/v1/cis/:id` returns single CI with all attributes
- ✅ POST `/api/v1/cis` creates new CI
- ✅ PUT `/api/v1/cis/:id` updates existing CI
- ✅ DELETE `/api/v1/cis/:id` soft-deletes CI
- ✅ GraphQL query `ci(id: "...")` returns unified CI
- ✅ GraphQL mutation `createIncident(...)` creates incident with ITIL+TBM+BSM context

#### Cloud Cost Integration Tests

**Test Scope**: AWS, Azure, GCP cost ingestion

**Test Files:**

| Test | Package | Description |
|------|---------|-------------|
| AWS Cost Explorer | `@cmdb/tbm-cost-engine` | Fetch costs from AWS |
| Azure Cost Management | `@cmdb/tbm-cost-engine` | Fetch costs from Azure |
| GCP Cloud Billing | `@cmdb/tbm-cost-engine` | Fetch costs from GCP |
| Cost Normalization | `@cmdb/tbm-cost-engine` | Normalize costs to USD |

**Run Commands:**

```bash
cd packages/tbm-cost-engine
npm run test:integration -- --testNamePattern="cloud cost"
```

**Expected Results:**

- All tests pass (100%)
- Costs fetched without API errors
- Costs stored in PostgreSQL correctly

**Key Validations:**

- ✅ AWS costs for last 30 days fetched
- ✅ Azure costs for last 30 days fetched
- ✅ GCP costs for last 30 days fetched
- ✅ Costs mapped to correct CIs by tags/labels
- ✅ Currency conversion applied (if applicable)

---

### C. End-to-End Workflows

E2E tests validate complete user workflows from start to finish.

#### Workflow 1: Complete Discovery Workflow

**Description**: Discover cloud resources, enrich with frameworks, store in graph

**Steps:**

1. Trigger discovery job for AWS EC2 instances
2. Discovery engine fetches instances via connector
3. Framework integration enriches CIs with ITIL+TBM+BSM attributes
4. CIs stored in Neo4j graph database
5. Events published to Kafka topics
6. ETL processor syncs to PostgreSQL data mart
7. Verify CIs visible in Web UI

**Test Script:**

```bash
# 1. Trigger discovery
curl -X POST http://localhost:3000/api/v1/discovery/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "connector_id": "aws-ec2",
    "scope": {
      "regions": ["us-east-1"],
      "filters": { "tag:Environment": "staging" }
    }
  }'

# 2. Wait for job completion (poll status)
JOB_ID=$(curl -s http://localhost:3000/api/v1/discovery/jobs | jq -r '.jobs[0].id')
while true; do
  STATUS=$(curl -s http://localhost:3000/api/v1/discovery/jobs/$JOB_ID | jq -r '.status')
  echo "Job status: $STATUS"
  [[ "$STATUS" == "completed" ]] && break
  sleep 5
done

# 3. Verify CIs created
curl -s http://localhost:3000/api/v1/cis?ci_type=ec2-instance | jq '.total_count'

# 4. Verify enrichment
curl -s http://localhost:3000/api/v1/cis/<CI_ID> | jq '.itil_attributes, .tbm_attributes, .bsm_attributes'

# 5. Verify events published
docker exec cmdb-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic ci.discovered \
  --from-beginning \
  --max-messages 10
```

**Expected Results:**

- ✅ Discovery job completes successfully
- ✅ CIs created in Neo4j (verify count)
- ✅ CIs enriched with ITIL+TBM+BSM attributes
- ✅ Events published to `ci.discovered`, `ci.enriched` topics
- ✅ CIs synced to PostgreSQL data mart
- ✅ CIs visible in Web UI dashboard

**Success Criteria:**

- Job status = `completed`
- No errors in logs
- CI count matches expected (within 5% tolerance)
- All CIs have criticality, cost, service_tier attributes

#### Workflow 2: Incident Creation with Enrichment

**Description**: Create incident, enrich with ITIL+TBM+BSM context, track resolution

**Steps:**

1. Create incident via API
2. ITIL Service Manager assigns priority and SLA
3. TBM Cost Engine calculates downtime cost
4. BSM Impact Engine calculates blast radius and impact score
5. Incident dashboard shows enriched incident
6. Resolve incident
7. Verify incident closed with metrics

**Test Script:**

```bash
# 1. Create incident
curl -X POST http://localhost:3000/api/v1/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Database connection timeouts",
    "description": "Production DB experiencing intermittent connection timeouts",
    "affected_ci_id": "<DATABASE_CI_ID>",
    "reported_by": "test-user@example.com",
    "urgency": "high",
    "impact": "high"
  }'

# 2. Get incident details
INCIDENT_ID=$(curl -s http://localhost:3000/api/v1/incidents | jq -r '.incidents[0].id')
curl -s http://localhost:3000/api/v1/incidents/$INCIDENT_ID | jq '.'

# 3. Verify enrichment
curl -s http://localhost:3000/api/v1/incidents/$INCIDENT_ID | jq '{
  priority: .priority,
  sla_target: .sla_breach_time,
  estimated_cost: .tbm_attributes.estimated_downtime_cost,
  blast_radius_count: .bsm_attributes.affected_ci_count,
  impact_score: .bsm_attributes.impact_score
}'

# 4. Resolve incident
curl -X PUT http://localhost:3000/api/v1/incidents/$INCIDENT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "status": "resolved",
    "resolution": "Database connection pool increased from 50 to 100"
  }'

# 5. Verify closure
curl -s http://localhost:3000/api/v1/incidents/$INCIDENT_ID | jq '.status, .resolved_at'
```

**Expected Results:**

- ✅ Incident created successfully
- ✅ Priority calculated correctly (high impact × high urgency = P1)
- ✅ SLA target set (P1 = 4 hours)
- ✅ Estimated downtime cost calculated (based on affected business service)
- ✅ Blast radius calculated (all dependent CIs identified)
- ✅ Impact score calculated (based on criticality)
- ✅ Incident visible in Web UI dashboard
- ✅ Incident resolved and closed with metrics

**Success Criteria:**

- Incident status = `resolved`
- Priority = `P1`
- SLA breach time set
- Estimated cost > $0
- Blast radius count > 0
- Impact score > 0

#### Workflow 3: Change Risk Assessment

**Description**: Create change request, assess risk using unified frameworks

**Steps:**

1. Create change request via API
2. ITIL Service Manager assigns change type and approval workflow
3. BSM Impact Engine calculates risk score based on affected CIs
4. TBM Cost Engine estimates implementation cost
5. Change dashboard shows risk assessment
6. Approve change
7. Verify change scheduled

**Test Script:**

```bash
# 1. Create change request
curl -X POST http://localhost:3000/api/v1/changes \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Upgrade database to v15.2",
    "description": "Upgrade PostgreSQL from v14.5 to v15.2 for performance improvements",
    "affected_ci_ids": ["<DATABASE_CI_ID>"],
    "requested_by": "test-user@example.com",
    "change_type": "normal",
    "planned_start": "2025-11-10T02:00:00Z",
    "planned_end": "2025-11-10T04:00:00Z"
  }'

# 2. Get change details
CHANGE_ID=$(curl -s http://localhost:3000/api/v1/changes | jq -r '.changes[0].id')
curl -s http://localhost:3000/api/v1/changes/$CHANGE_ID | jq '.'

# 3. Verify risk assessment
curl -s http://localhost:3000/api/v1/changes/$CHANGE_ID | jq '{
  risk_score: .bsm_attributes.risk_score,
  risk_level: .bsm_attributes.risk_level,
  affected_services_count: .bsm_attributes.affected_services_count,
  estimated_cost: .tbm_attributes.estimated_implementation_cost,
  approval_required: .itil_attributes.requires_cab_approval
}'

# 4. Approve change
curl -X PUT http://localhost:3000/api/v1/changes/$CHANGE_ID/approve \
  -H "Content-Type: application/json" \
  -d '{
    "approver": "change-manager@example.com",
    "comments": "Approved - low risk upgrade during maintenance window"
  }'

# 5. Verify scheduled
curl -s http://localhost:3000/api/v1/changes/$CHANGE_ID | jq '.status, .approval_status'
```

**Expected Results:**

- ✅ Change request created successfully
- ✅ Change type assigned correctly
- ✅ Risk score calculated (0-10 scale)
- ✅ Risk level assigned (low, medium, high, critical)
- ✅ Affected services identified
- ✅ Implementation cost estimated
- ✅ CAB approval required (if risk > medium)
- ✅ Change approved and scheduled

**Success Criteria:**

- Change status = `scheduled`
- Approval status = `approved`
- Risk score calculated
- Implementation cost > $0
- Affected services count > 0

#### Workflow 4: Cost Allocation

**Description**: Allocate cloud costs to business services

**Steps:**

1. Trigger cost sync for AWS
2. Cost engine fetches costs from AWS Cost Explorer
3. Costs normalized and stored in PostgreSQL
4. Costs allocated to CIs using allocation rules
5. Costs rolled up to business services
6. Dashboard shows cost breakdown

**Test Script:**

```bash
# 1. Trigger cost sync
curl -X POST http://localhost:3000/api/v1/costs/sync \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "aws",
    "start_date": "2025-10-01",
    "end_date": "2025-10-31"
  }'

# 2. Wait for sync completion
JOB_ID=$(curl -s http://localhost:3000/api/v1/costs/jobs | jq -r '.jobs[0].id')
while true; do
  STATUS=$(curl -s http://localhost:3000/api/v1/costs/jobs/$JOB_ID | jq -r '.status')
  echo "Cost sync status: $STATUS"
  [[ "$STATUS" == "completed" ]] && break
  sleep 5
done

# 3. Verify costs fetched
curl -s "http://localhost:3000/api/v1/costs?provider=aws&start_date=2025-10-01&end_date=2025-10-31" | jq '.total_cost'

# 4. Verify allocation
curl -s "http://localhost:3000/api/v1/costs/allocations?business_service_id=<SERVICE_ID>" | jq '{
  direct_costs: .allocations[] | select(.method=="direct") | .amount,
  usage_costs: .allocations[] | select(.method=="usage") | .amount,
  equal_split_costs: .allocations[] | select(.method=="equal_split") | .amount,
  total_cost: .total_cost
}'

# 5. Verify roll-up
curl -s "http://localhost:3000/api/v1/business-services/<SERVICE_ID>" | jq '.tbm_attributes.total_cost'
```

**Expected Results:**

- ✅ Cost sync completes successfully
- ✅ Costs fetched from AWS Cost Explorer
- ✅ Costs stored in PostgreSQL
- ✅ Costs allocated to CIs
- ✅ Costs rolled up to business services
- ✅ Dashboard shows cost breakdown

**Success Criteria:**

- Cost sync status = `completed`
- Total cost > $0
- At least 1 allocation per method (direct, usage, equal_split)
- Business service total_cost matches sum of allocations

#### Workflow 5: Blast Radius Analysis

**Description**: Calculate blast radius for critical CI

**Steps:**

1. Select critical CI (tier_0 or tier_1)
2. Trigger blast radius calculation
3. BSM Impact Engine traverses dependency graph
4. All downstream dependencies identified
5. Impact scores calculated for each dependency
6. Dashboard visualizes blast radius

**Test Script:**

```bash
# 1. Get critical CI
CI_ID=$(curl -s "http://localhost:3000/api/v1/cis?criticality=tier_0&limit=1" | jq -r '.cis[0].id')

# 2. Calculate blast radius
curl -X POST "http://localhost:3000/api/v1/bsm/blast-radius" \
  -H "Content-Type: application/json" \
  -d "{
    \"ci_id\": \"$CI_ID\",
    \"max_depth\": 5
  }"

# 3. Get blast radius results
ANALYSIS_ID=$(curl -s "http://localhost:3000/api/v1/bsm/blast-radius?ci_id=$CI_ID" | jq -r '.analyses[0].id')
curl -s "http://localhost:3000/api/v1/bsm/blast-radius/$ANALYSIS_ID" | jq '{
  total_affected: .total_affected_cis,
  by_type: .affected_cis_by_type,
  by_criticality: .affected_cis_by_criticality,
  estimated_impact: .estimated_business_impact
}'

# 4. Verify graph traversal
curl -s "http://localhost:3000/api/v1/bsm/blast-radius/$ANALYSIS_ID/graph" | jq '.nodes | length, .edges | length'
```

**Expected Results:**

- ✅ Blast radius calculated successfully
- ✅ All downstream dependencies identified
- ✅ Impact scores calculated
- ✅ Affected CIs grouped by type and criticality
- ✅ Estimated business impact calculated
- ✅ Graph visualization data available

**Success Criteria:**

- Blast radius calculation completes in <5 minutes (for 100K+ CIs)
- All downstream dependencies identified (verify manually for sample CI)
- Impact scores > 0 for all affected CIs
- Estimated business impact > $0

#### Workflow 6: Dashboard Data Loading

**Description**: Load data into Web UI dashboards

**Steps:**

1. Navigate to ITIL Dashboard
2. Navigate to TBM Dashboard
3. Navigate to BSM Dashboard
4. Navigate to Unified Dashboard
5. Verify all charts load
6. Verify data accuracy

**Manual Test (Browser):**

1. Open http://localhost:3001
2. Login with test credentials
3. Click "ITIL Dashboard"
   - Verify incident trend chart loads
   - Verify change calendar loads
   - Verify SLA compliance chart loads
4. Click "TBM Dashboard"
   - Verify cost trend chart loads
   - Verify cost allocation pie chart loads
   - Verify top cost drivers table loads
5. Click "BSM Dashboard"
   - Verify criticality distribution chart loads
   - Verify blast radius visualization loads
   - Verify risk heat map loads
6. Click "Unified Dashboard"
   - Verify complete service view table loads
   - Verify all ITIL+TBM+BSM attributes displayed
   - Verify pagination and filtering work

**Automated Test:**

```bash
# Check dashboard API endpoints
curl -s "http://localhost:3000/api/v1/dashboards/itil" | jq '.incidents_by_status, .changes_by_type'
curl -s "http://localhost:3000/api/v1/dashboards/tbm" | jq '.cost_trend, .cost_by_service'
curl -s "http://localhost:3000/api/v1/dashboards/bsm" | jq '.criticality_distribution, .risk_heatmap'
curl -s "http://localhost:3000/api/v1/dashboards/unified" | jq '.services[] | {id, name, criticality, cost, incidents_count}'
```

**Expected Results:**

- ✅ All dashboards load without errors
- ✅ All charts render correctly
- ✅ Data displayed matches database queries
- ✅ No console errors in browser dev tools

**Success Criteria:**

- Dashboard load time < 2 seconds
- All charts visible
- Data accuracy 100%

#### Workflow 7: Metabase Query Execution

**Description**: Execute Metabase queries against PostgreSQL data mart

**Steps:**

1. Login to Metabase
2. Navigate to ConfigBuddy database
3. Run pre-built queries
4. Verify results

**Manual Test (Browser):**

1. Open http://localhost:3002 (Metabase)
2. Login with admin credentials
3. Navigate to "ConfigBuddy" database
4. Run queries:
   - "Top 10 Most Expensive Services"
   - "Incidents by Priority (Last 30 Days)"
   - "Change Success Rate"
   - "Critical CIs with Recent Incidents"
   - "Cost Trend (Last 90 Days)"
5. Verify results match expected data

**SQL Queries:**

```sql
-- Top 10 Most Expensive Services
SELECT
  bs.service_name,
  SUM(c.amount) as total_cost
FROM business_services bs
JOIN cost_allocations c ON c.business_service_id = bs.id
WHERE c.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY bs.id, bs.service_name
ORDER BY total_cost DESC
LIMIT 10;

-- Incidents by Priority (Last 30 Days)
SELECT
  priority,
  COUNT(*) as incident_count,
  AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_resolution_hours
FROM incidents
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY priority
ORDER BY priority;

-- Change Success Rate
SELECT
  COUNT(*) FILTER (WHERE status = 'completed' AND outcome = 'successful') * 100.0 / COUNT(*) as success_rate
FROM changes
WHERE completed_at >= CURRENT_DATE - INTERVAL '30 days';
```

**Expected Results:**

- ✅ All queries execute without errors
- ✅ Results match database data
- ✅ Query execution time < 5 seconds

**Success Criteria:**

- All queries return results
- No SQL errors
- Query performance acceptable

---

### D. Performance Tests

Performance tests validate that the system meets performance targets under load.

#### Test 1: Blast Radius for 100K+ CIs

**Objective**: Verify blast radius calculation completes in <5 minutes for large graphs

**Test Setup:**

```bash
# Generate 100K test CIs
cd packages/common
npm run test:seed -- --count=100000

# Verify CI count
docker exec cmdb-neo4j cypher-shell -u neo4j -p <password> \
  "MATCH (n:CI) RETURN count(n);"
```

**Test Execution:**

```bash
# Start timer
START_TIME=$(date +%s)

# Trigger blast radius calculation for tier_0 CI
CI_ID=$(curl -s "http://localhost:3000/api/v1/cis?criticality=tier_0&limit=1" | jq -r '.cis[0].id')
curl -X POST "http://localhost:3000/api/v1/bsm/blast-radius" \
  -H "Content-Type: application/json" \
  -d "{\"ci_id\": \"$CI_ID\", \"max_depth\": 5}"

# Wait for completion
ANALYSIS_ID=$(curl -s "http://localhost:3000/api/v1/bsm/blast-radius?ci_id=$CI_ID" | jq -r '.analyses[0].id')
while true; do
  STATUS=$(curl -s "http://localhost:3000/api/v1/bsm/blast-radius/$ANALYSIS_ID" | jq -r '.status')
  [[ "$STATUS" == "completed" ]] && break
  sleep 5
done

# End timer
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
echo "Blast radius calculation completed in $DURATION seconds"
```

**Performance Target**: <300 seconds (5 minutes)

**Expected Results:**

- ✅ Calculation completes in <300 seconds
- ✅ No timeout errors
- ✅ All downstream CIs identified
- ✅ Memory usage stable (no leaks)

#### Test 2: Cost Roll-up for 1000 CIs

**Objective**: Verify cost roll-up completes in <5 seconds

**Test Setup:**

```bash
# Generate cost data for 1000 CIs
cd packages/tbm-cost-engine
npm run test:seed -- --ci-count=1000 --days=90
```

**Test Execution:**

```bash
# Start timer
START_TIME=$(date +%s)

# Trigger cost roll-up
curl -X POST "http://localhost:3000/api/v1/costs/rollup" \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2025-10-01",
    "end_date": "2025-10-31"
  }'

# Wait for completion
JOB_ID=$(curl -s "http://localhost:3000/api/v1/costs/jobs" | jq -r '.jobs[0].id')
while true; do
  STATUS=$(curl -s "http://localhost:3000/api/v1/costs/jobs/$JOB_ID" | jq -r '.status')
  [[ "$STATUS" == "completed" ]] && break
  sleep 1
done

# End timer
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
echo "Cost roll-up completed in $DURATION seconds"
```

**Performance Target**: <5 seconds

**Expected Results:**

- ✅ Roll-up completes in <5 seconds
- ✅ All costs aggregated correctly
- ✅ No database deadlocks

#### Test 3: Complete Service View Load

**Objective**: Verify complete service view loads in <2 seconds

**Test Execution:**

```bash
# Measure API response time
curl -o /dev/null -s -w "Time: %{time_total}s\n" \
  "http://localhost:3000/api/v1/business-services/complete"
```

**Performance Target**: <2 seconds

**Expected Results:**

- ✅ API responds in <2 seconds
- ✅ All ITIL+TBM+BSM attributes included
- ✅ No N+1 query issues

#### Test 4: Dashboard Load Time

**Objective**: Verify dashboards load in <2 seconds

**Test Execution:**

```bash
# Measure dashboard API response times
echo "ITIL Dashboard:"
curl -o /dev/null -s -w "Time: %{time_total}s\n" \
  "http://localhost:3000/api/v1/dashboards/itil"

echo "TBM Dashboard:"
curl -o /dev/null -s -w "Time: %{time_total}s\n" \
  "http://localhost:3000/api/v1/dashboards/tbm"

echo "BSM Dashboard:"
curl -o /dev/null -s -w "Time: %{time_total}s\n" \
  "http://localhost:3000/api/v1/dashboards/bsm"

echo "Unified Dashboard:"
curl -o /dev/null -s -w "Time: %{time_total}s\n" \
  "http://localhost:3000/api/v1/dashboards/unified"
```

**Performance Target**: <2 seconds per dashboard

**Expected Results:**

- ✅ All dashboards respond in <2 seconds
- ✅ No slow queries logged
- ✅ Redis cache hit rate >80%

#### Test 5: Concurrent Users

**Objective**: Verify system handles 100+ concurrent users

**Test Setup:**

```bash
# Install Apache Bench or use Artillery
npm install -g artillery
```

**Test Execution:**

```bash
# Create Artillery config
cat > load-test.yml <<EOF
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 300
      arrivalRate: 20
      name: "Sustained load"
scenarios:
  - name: "API Load Test"
    flow:
      - get:
          url: "/api/v1/cis?page=1&limit=50"
      - get:
          url: "/api/v1/business-services"
      - get:
          url: "/api/v1/incidents"
      - get:
          url: "/api/v1/dashboards/unified"
EOF

# Run load test
artillery run load-test.yml
```

**Performance Targets:**

- **Throughput**: ≥100 requests/second
- **Response Time (p95)**: <500ms
- **Error Rate**: <1%

**Expected Results:**

- ✅ System handles 100+ concurrent users
- ✅ No HTTP 5xx errors
- ✅ Response times within targets
- ✅ CPU usage <80%
- ✅ Memory usage stable

---

### E. Monitoring & Alerting Tests

Verify that observability stack correctly monitors the system.

#### Test 1: Metrics Collection

**Objective**: Verify Prometheus collects all expected metrics

**Test Execution:**

```bash
# Query Prometheus
curl -s "http://localhost:9090/api/v1/query?query=up" | jq '.data.result'

# Check for ConfigBuddy metrics
curl -s "http://localhost:9090/api/v1/label/__name__/values" | jq '.data[] | select(startswith("cmdb_"))'
```

**Expected Metrics:**

- ✅ `cmdb_api_requests_total`
- ✅ `cmdb_api_response_time_seconds`
- ✅ `cmdb_discovery_jobs_total`
- ✅ `cmdb_discovery_jobs_duration_seconds`
- ✅ `cmdb_neo4j_query_duration_seconds`
- ✅ `cmdb_postgres_query_duration_seconds`
- ✅ `cmdb_kafka_messages_produced_total`
- ✅ `cmdb_kafka_messages_consumed_total`

**Expected Results:**

- ✅ All metrics present
- ✅ Metric values updating
- ✅ No stale metrics

#### Test 2: Alert Rule Firing

**Objective**: Verify Prometheus alert rules fire correctly

**Test Execution:**

```bash
# Check alert rules
curl -s "http://localhost:9090/api/v1/rules" | jq '.data.groups[].rules[] | select(.type=="alerting")'

# Trigger alert condition (e.g., high error rate)
for i in {1..100}; do
  curl -X POST "http://localhost:3000/api/v1/invalid-endpoint"
done

# Check alerts firing
curl -s "http://localhost:9090/api/v1/alerts" | jq '.data.alerts[] | select(.state=="firing")'
```

**Expected Alerts:**

- ✅ `HighErrorRate` (>5% error rate)
- ✅ `SlowAPIResponse` (p95 >1s)
- ✅ `DiscoveryJobFailed` (job failure)
- ✅ `Neo4jConnectionFailure` (database down)
- ✅ `KafkaConsumerLag` (>1000 messages)

**Expected Results:**

- ✅ Alerts fire when conditions met
- ✅ Alerts resolve when conditions clear
- ✅ Alert labels correct

#### Test 3: Grafana Dashboards

**Objective**: Verify Grafana dashboards load and display data

**Manual Test (Browser):**

1. Open http://localhost:3003 (Grafana)
2. Login with admin credentials
3. Navigate to "ConfigBuddy" folder
4. Open dashboards:
   - "ConfigBuddy Overview"
   - "API Performance"
   - "Discovery Jobs"
   - "Database Performance"
   - "Kafka Metrics"
5. Verify all panels load without errors
6. Verify data displayed matches Prometheus queries

**Expected Results:**

- ✅ All dashboards load
- ✅ All panels display data
- ✅ No "No data" errors (except for expected empty metrics)

#### Test 4: Prometheus Targets

**Objective**: Verify Prometheus scrapes all configured targets

**Test Execution:**

```bash
# Check target status
curl -s "http://localhost:9090/api/v1/targets" | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'
```

**Expected Targets:**

- ✅ `cmdb-api-server` (UP)
- ✅ `cmdb-discovery-engine` (UP)
- ✅ `cmdb-neo4j` (UP)
- ✅ `cmdb-postgres` (UP)
- ✅ `cmdb-redis` (UP)
- ✅ `cmdb-kafka` (UP)

**Expected Results:**

- ✅ All targets UP
- ✅ No scrape errors
- ✅ Last scrape <30s ago

---

### F. Data Validation Tests

Verify data accuracy and consistency across frameworks.

#### Test 1: ITIL Enrichment Accuracy

**Objective**: Verify CIs enriched with correct ITIL attributes

**Test Execution:**

```bash
# Get sample CI with ITIL attributes
curl -s "http://localhost:3000/api/v1/cis?limit=10" | jq '.cis[] | {
  id,
  name,
  service_tier: .itil_attributes.service_tier,
  priority: .itil_attributes.priority,
  sla_target: .itil_attributes.sla_target_hours
}'
```

**Validation Rules:**

| Attribute | Expected Values | Validation |
|-----------|----------------|------------|
| `service_tier` | `tier_1`, `tier_2`, `tier_3`, `tier_4` | Must be valid tier |
| `priority` | `P1`, `P2`, `P3`, `P4`, `P5` | Must be valid priority |
| `sla_target_hours` | >0 | Must be positive number |

**Expected Results:**

- ✅ All CIs have `service_tier` attribute
- ✅ All CIs have `priority` attribute (if applicable)
- ✅ SLA targets set correctly based on priority
- ✅ No null/undefined values

#### Test 2: TBM Cost Allocation Accuracy

**Objective**: Verify costs allocated correctly to CIs

**Test Execution:**

```bash
# Get business service with cost breakdown
curl -s "http://localhost:3000/api/v1/business-services/<SERVICE_ID>/costs" | jq '{
  total_cost: .total_cost,
  direct_costs: [.allocations[] | select(.method=="direct") | .amount] | add,
  usage_costs: [.allocations[] | select(.method=="usage") | .amount] | add,
  equal_split_costs: [.allocations[] | select(.method=="equal_split") | .amount] | add
}'

# Verify total equals sum of allocations
```

**Validation Rules:**

- ✅ Total cost = sum of all allocations (within $0.01 tolerance)
- ✅ Direct allocation = 100% of cost to single CI
- ✅ Usage allocation = proportional to usage metrics
- ✅ Equal-split allocation = cost / number of CIs

**Expected Results:**

- ✅ Cost allocations sum to total cost
- ✅ No negative costs
- ✅ Allocation methods applied correctly

#### Test 3: BSM Impact Scoring Accuracy

**Objective**: Verify impact scores calculated correctly

**Test Execution:**

```bash
# Get CIs with impact scores
curl -s "http://localhost:3000/api/v1/cis?has_bsm=true&limit=10" | jq '.cis[] | {
  id,
  name,
  criticality: .bsm_attributes.criticality,
  impact_score: .bsm_attributes.impact_score,
  revenue: .bsm_attributes.annual_revenue_supported,
  users: .bsm_attributes.customer_count
}'
```

**Validation Rules:**

| Criticality | Revenue | Users | Impact Score |
|-------------|---------|-------|--------------|
| `tier_0` | >$50M | >1M | 90-100 |
| `tier_1` | $10M-$50M | 250K-1M | 70-89 |
| `tier_2` | $1M-$10M | 10K-250K | 50-69 |
| `tier_3` | $100K-$1M | 1K-10K | 30-49 |
| `tier_4` | <$100K | <1K | 1-29 |

**Expected Results:**

- ✅ Impact scores match criticality tier
- ✅ Tier_0 services have highest impact scores
- ✅ Tier_4 services have lowest impact scores

#### Test 4: Relationship Mapping Accuracy

**Objective**: Verify CI relationships mapped correctly

**Test Execution:**

```bash
# Get CI with relationships
curl -s "http://localhost:3000/api/v1/cis/<CI_ID>/relationships" | jq '{
  total: .total_count,
  by_type: .relationships | group_by(.relationship_type) | map({type: .[0].relationship_type, count: length})
}'
```

**Validation Rules:**

- ✅ All relationships have valid types (`DEPENDS_ON`, `HOSTS`, `CONNECTS_TO`, `USES`, `OWNED_BY`)
- ✅ Relationships are bidirectional (if A→B exists, B→A should exist)
- ✅ No self-referencing relationships
- ✅ No duplicate relationships

**Expected Results:**

- ✅ Relationship count > 0 (for non-isolated CIs)
- ✅ All relationships have valid types
- ✅ No orphaned relationships

#### Test 5: Event Streaming Completeness

**Objective**: Verify all CI lifecycle events published

**Test Execution:**

```bash
# Count events by topic
docker exec cmdb-kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group test-consumer \
  --describe

# Verify event counts
echo "CI Discovery Events:"
docker exec cmdb-kafka kafka-run-class kafka.tools.GetOffsetShell \
  --broker-list localhost:9092 \
  --topic ci.discovered | awk -F: '{sum+=$3} END {print sum}'

echo "CI Enrichment Events:"
docker exec cmdb-kafka kafka-run-class kafka.tools.GetOffsetShell \
  --broker-list localhost:9092 \
  --topic ci.enriched | awk -F: '{sum+=$3} END {print sum}'

echo "Cost Update Events:"
docker exec cmdb-kafka kafka-run-class kafka.tools.GetOffsetShell \
  --broker-list localhost:9092 \
  --topic cost.updated | awk -F: '{sum+=$3} END {print sum}'
```

**Validation Rules:**

- ✅ Event count = CI count (for `ci.discovered` topic)
- ✅ Event count = CI count (for `ci.enriched` topic)
- ✅ No events in dead letter queue (DLQ)

**Expected Results:**

- ✅ All events published successfully
- ✅ Event counts match expectations
- ✅ No events lost

---

## Regression Test Matrix

Track test execution status and results.

| Test ID | Test Name | Priority | Type | Expected Result | Actual Result | Status | Notes |
|---------|-----------|----------|------|----------------|---------------|--------|-------|
| **UNIT-001** | BSM Criticality Calculator | P0 | Unit | All tiers calculated correctly | | ⏳ Pending | |
| **UNIT-002** | BSM Blast Radius Algorithm | P0 | Unit | All dependencies found | | ⏳ Pending | |
| **UNIT-003** | BSM Risk Assessor | P0 | Unit | Risk scores accurate | | ⏳ Pending | |
| **UNIT-004** | TBM Cost Calculator | P0 | Unit | Costs calculated to 2 decimal places | | ⏳ Pending | |
| **UNIT-005** | TBM Depreciation | P0 | Unit | All schedules accurate | | ⏳ Pending | |
| **UNIT-006** | TBM Cost Allocation | P0 | Unit | All allocation methods work | | ⏳ Pending | |
| **UNIT-007** | ITIL Incident Lifecycle | P0 | Unit | State transitions correct | | ⏳ Pending | |
| **UNIT-008** | ITIL Change Workflow | P0 | Unit | Approval workflow correct | | ⏳ Pending | |
| **UNIT-009** | ITIL Priority Calculation | P0 | Unit | Impact × Urgency = Priority | | ⏳ Pending | |
| **UNIT-010** | Framework Integration | P0 | Unit | Unified CI merges all attributes | | ⏳ Pending | |
| **INT-001** | Neo4j CRUD Operations | P1 | Integration | CIs created/read/updated/deleted | | ⏳ Pending | |
| **INT-002** | PostgreSQL Transactions | P1 | Integration | Rollback on error | | ⏳ Pending | |
| **INT-003** | Kafka Event Publishing | P1 | Integration | Events published successfully | | ⏳ Pending | |
| **INT-004** | Kafka Event Consumption | P1 | Integration | Events consumed without errors | | ⏳ Pending | |
| **INT-005** | Framework Enrichment Pipeline | P0 | Integration | ITIL+TBM+BSM attributes added | | ⏳ Pending | |
| **INT-006** | REST API CRUD | P1 | Integration | All endpoints work | | ⏳ Pending | |
| **INT-007** | GraphQL Queries | P1 | Integration | Queries return correct data | | ⏳ Pending | |
| **INT-008** | AWS Cost Sync | P1 | Integration | Costs fetched from AWS | | ⏳ Pending | |
| **INT-009** | Azure Cost Sync | P1 | Integration | Costs fetched from Azure | | ⏳ Pending | |
| **INT-010** | GCP Cost Sync | P1 | Integration | Costs fetched from GCP | | ⏳ Pending | |
| **E2E-001** | Complete Discovery Workflow | P0 | E2E | CIs discovered and enriched | | ⏳ Pending | |
| **E2E-002** | Incident Creation with Enrichment | P0 | E2E | Incident enriched with all frameworks | | ⏳ Pending | |
| **E2E-003** | Change Risk Assessment | P0 | E2E | Risk assessed using BSM+TBM | | ⏳ Pending | |
| **E2E-004** | Cost Allocation | P0 | E2E | Costs allocated and rolled up | | ⏳ Pending | |
| **E2E-005** | Blast Radius Analysis | P0 | E2E | All dependencies identified | | ⏳ Pending | |
| **E2E-006** | Dashboard Data Loading | P1 | E2E | All dashboards load | | ⏳ Pending | |
| **E2E-007** | Metabase Query Execution | P2 | E2E | Queries execute successfully | | ⏳ Pending | |
| **PERF-001** | Blast Radius 100K CIs | P0 | Performance | <5 min | | ⏳ Pending | |
| **PERF-002** | Cost Roll-up 1000 CIs | P0 | Performance | <5 sec | | ⏳ Pending | |
| **PERF-003** | Complete Service View | P1 | Performance | <2 sec | | ⏳ Pending | |
| **PERF-004** | Dashboard Load Time | P1 | Performance | <2 sec | | ⏳ Pending | |
| **PERF-005** | Concurrent Users 100+ | P1 | Performance | <500ms p95 | | ⏳ Pending | |
| **MON-001** | Metrics Collection | P1 | Monitoring | All metrics present | | ⏳ Pending | |
| **MON-002** | Alert Rule Firing | P1 | Monitoring | Alerts fire correctly | | ⏳ Pending | |
| **MON-003** | Grafana Dashboards | P2 | Monitoring | Dashboards load | | ⏳ Pending | |
| **MON-004** | Prometheus Targets | P1 | Monitoring | All targets UP | | ⏳ Pending | |
| **DATA-001** | ITIL Enrichment Accuracy | P0 | Data Validation | All attributes valid | | ⏳ Pending | |
| **DATA-002** | TBM Cost Accuracy | P0 | Data Validation | Costs sum correctly | | ⏳ Pending | |
| **DATA-003** | BSM Impact Scoring | P0 | Data Validation | Impact scores match tiers | | ⏳ Pending | |
| **DATA-004** | Relationship Mapping | P1 | Data Validation | All relationships valid | | ⏳ Pending | |
| **DATA-005** | Event Streaming Completeness | P1 | Data Validation | All events published | | ⏳ Pending | |

**Status Legend:**
- ⏳ **Pending**: Not yet executed
- ▶️ **In Progress**: Currently executing
- ✅ **Passed**: Test passed successfully
- ❌ **Failed**: Test failed (see notes)
- ⚠️ **Blocked**: Test blocked by prerequisite failure
- 🔄 **Retest**: Test needs to be re-executed after fix

---

## Issue Tracking

### Reporting Bugs

When a test fails, report the issue using the following template:

**Bug Report Template:**

```
**Test ID**: [e.g., UNIT-001]
**Test Name**: [e.g., BSM Criticality Calculator]
**Severity**: [Critical / High / Medium / Low]
**Environment**: [e.g., Staging]
**Build Version**: [e.g., v3.0.0]

**Description**:
[Clear description of the issue]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result**:
[What should happen]

**Actual Result**:
[What actually happened]

**Logs/Screenshots**:
[Attach relevant logs or screenshots]

**Impact**:
[How does this affect users/system?]

**Workaround**:
[Is there a workaround?]
```

### Severity Levels

| Severity | Description | Response Time | Examples |
|----------|-------------|---------------|----------|
| **Critical** | System unusable, data loss | 1 hour | Database corruption, security vulnerability |
| **High** | Major functionality broken | 4 hours | API endpoint 500 errors, discovery jobs failing |
| **Medium** | Functionality degraded | 1 business day | Slow dashboard load, incorrect cost calculation |
| **Low** | Minor issue, cosmetic | 1 week | UI alignment issue, typo in logs |

### Issue Workflow

```
New → Triaged → In Progress → Fixed → Retest → Verified → Closed
                      ↓
                   Won't Fix
```

**Triage Criteria:**

- **Critical/High**: Fix immediately, block release
- **Medium**: Fix before release (or document as known issue)
- **Low**: Fix in next release or backlog

---

## Sign-Off Criteria

Regression testing is considered **complete and successful** when:

### A. Test Execution

- ✅ All **P0 tests** executed with 100% pass rate
- ✅ All **P1 tests** executed with ≥95% pass rate
- ✅ All **P2 tests** executed with ≥90% pass rate
- ✅ All failing tests have documented issues with severity assigned

### B. Coverage

- ✅ Unit test coverage ≥70% for all v3.0 packages
- ✅ All critical business logic has unit tests
- ✅ All API endpoints have integration tests
- ✅ All E2E workflows validated

### C. Performance

- ✅ Blast radius calculation: <5 minutes for 100K+ CIs
- ✅ Cost roll-up: <5 seconds for 1000 CIs
- ✅ Dashboard load time: <2 seconds
- ✅ API response time (p95): <500ms under 100 concurrent users

### D. Data Quality

- ✅ ITIL enrichment accuracy: 100%
- ✅ TBM cost allocation accuracy: 100% (within $0.01)
- ✅ BSM impact scoring accuracy: ≥95%
- ✅ Relationship mapping accuracy: 100%
- ✅ Event streaming completeness: 100%

### E. Monitoring

- ✅ All Prometheus targets UP
- ✅ All expected metrics collected
- ✅ Alert rules fire correctly
- ✅ Grafana dashboards load without errors

### F. Documentation

- ✅ All test results documented in test matrix
- ✅ All bugs reported in issue tracker
- ✅ Test summary report created
- ✅ Known issues documented (if any)

### Sign-Off Template

```
ConfigBuddy v3.0 Regression Testing Sign-Off

Test Cycle: [Cycle ID]
Start Date: [Date]
End Date: [Date]
Test Lead: [Name]

Summary:
- Total Tests: [Number]
- Tests Passed: [Number] ([Percentage]%)
- Tests Failed: [Number] ([Percentage]%)
- Tests Blocked: [Number] ([Percentage]%)

Critical Issues: [Number]
High Issues: [Number]
Medium Issues: [Number]
Low Issues: [Number]

Performance Targets:
- Blast Radius (100K CIs): [Duration] / 5 min target
- Cost Roll-up (1000 CIs): [Duration] / 5 sec target
- Dashboard Load: [Duration] / 2 sec target
- API p95 Response Time: [Duration] / 500ms target

Recommendation:
[ ] APPROVED - Ready for production release
[ ] APPROVED WITH CONDITIONS - Release with documented known issues
[ ] NOT APPROVED - Critical issues must be fixed before release

Conditions (if applicable):
[List any conditions or known issues]

Sign-Off:
- Test Lead: [Name] [Date]
- Engineering Manager: [Name] [Date]
- Product Manager: [Name] [Date]
```

---

## Appendix

### A. Test Data Generator

See `/packages/common/src/test-utils/data-generator.ts` for test data generation utilities.

**Usage:**

```typescript
import { generateTestCIs, generateTestBusinessService } from '@cmdb/common/test-utils';

// Generate 1000 test CIs
const cis = generateTestCIs({ count: 1000 });

// Generate business service with specific attributes
const service = generateTestBusinessService({
  criticality: 'tier_0',
  annual_revenue_supported: 100_000_000,
  customer_count: 2_000_000,
});
```

### B. Useful Commands

**Docker Commands:**

```bash
# View all container logs
docker-compose -f infrastructure/docker/docker-compose.yml logs -f

# View specific service logs
docker logs -f cmdb-api-server

# Restart service
docker restart cmdb-api-server

# Execute command in container
docker exec -it cmdb-api-server bash
```

**Database Commands:**

```bash
# Neo4j
docker exec cmdb-neo4j cypher-shell -u neo4j -p <password> "MATCH (n:CI) RETURN count(n);"

# PostgreSQL
docker exec cmdb-postgres psql -U cmdb_user -d cmdb -c "SELECT COUNT(*) FROM configuration_items;"

# Redis
docker exec cmdb-redis redis-cli KEYS "*"
```

**Kafka Commands:**

```bash
# List topics
docker exec cmdb-kafka kafka-topics --list --bootstrap-server localhost:9092

# Consume messages
docker exec cmdb-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic ci.discovered \
  --from-beginning \
  --max-messages 10
```

### C. Test Execution Checklist

Use this checklist during test execution:

**Pre-Execution:**
- [ ] Environment setup complete
- [ ] Test data seeded
- [ ] All services running
- [ ] Configuration verified
- [ ] Build successful

**During Execution:**
- [ ] Phase 1: Unit Tests - COMPLETED
- [ ] Phase 2: Integration Tests - COMPLETED
- [ ] Phase 3: E2E Workflows - COMPLETED
- [ ] Phase 4: Performance Tests - COMPLETED
- [ ] Phase 5: Monitoring Tests - COMPLETED
- [ ] Phase 6: Data Validation Tests - COMPLETED

**Post-Execution:**
- [ ] All test results recorded in matrix
- [ ] All bugs reported
- [ ] Test summary created
- [ ] Sign-off obtained
- [ ] Test environment cleaned up

### D. Troubleshooting

**Common Issues:**

1. **Tests fail with database connection errors**
   - **Cause**: Database not running or credentials incorrect
   - **Solution**: Verify databases running with `docker ps`, check `.env` file

2. **Tests timeout**
   - **Cause**: Slow database queries or network issues
   - **Solution**: Increase test timeout in `jest.config.js`

3. **Coverage below threshold**
   - **Cause**: Missing tests for new code
   - **Solution**: Add tests to cover uncovered code paths

4. **Performance tests fail**
   - **Cause**: Insufficient resources or inefficient queries
   - **Solution**: Check CPU/memory usage, review slow queries in logs

5. **Events not consumed**
   - **Cause**: Kafka consumer group lag
   - **Solution**: Check consumer logs, reset consumer offset if needed

### E. Reference Documentation

- **Testing Guide**: `/docs/TESTING_GUIDE.md`
- **Architecture Docs**: `/doc-site/docs/architecture/`
- **API Documentation**: `/doc-site/docs/api/`
- **Deployment Guide**: `/doc-site/docs/deployment/`

---

**For questions or issues, contact the ConfigBuddy team or open an issue on GitHub.**
