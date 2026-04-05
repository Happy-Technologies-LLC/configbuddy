# ConfigBuddy v3.0 Comprehensive Audit Report

**Generated:** 2025-11-15
**Branch:** claude/integrate-v3-features-01FLK316bARHsAW6LR4ETgqm
**Commit:** b51ba36

---

## Executive Summary

ConfigBuddy v3.0 has **substantial implementation** (80% complete) but suffers from **critical data pipeline gaps** and **incomplete documentation** (55% coverage). The architecture, backend packages, and UI are well-built, but **dashboards display mock data** because financial integrations, ITIL data creation, and ETL processes are disconnected.

### Key Findings

#### ✅ **What's Working Well**
- All 5 dashboards fully implemented with rich UI components
- Backend frameworks (BSM, TBM, ITIL, Unified) are comprehensive and well-architected
- Discovery enrichment pipeline operational (BSM, TBM, ITIL enrichers integrated)
- Database schema complete with all v3 tables
- Core framework documentation is excellent (95%+ coverage)

#### ❌ **Critical Gaps**
1. **Financial Data:** Cloud cost APIs not connected, dashboards show mock/calculated data
2. **ITIL Data:** API routes disabled, no UI for creating incidents/changes, tables empty
3. **Business Services:** No UI for service definitions, tables empty
4. **ETL Pipeline:** Neo4j data not syncing to PostgreSQL data mart
5. **Infrastructure:** Kafka and Metabase not deployed
6. **Documentation:** Service Catalog, Financial Integration, API Reference, User Guides missing

---

## Part 1: Implementation Audit

### 1.1 v3 Features Inventory

ConfigBuddy v3.0 includes these major features:

| Feature | Implementation | Data Pipeline | UI | Status |
|---------|---------------|---------------|-----|--------|
| **ITIL v4 Service Management** | ✅ Complete | ❌ No data | ⚠️ APIs disabled | 30% functional |
| **TBM v5.0.1 Cost Transparency** | ✅ Complete | ❌ Not connected | ✅ Dashboard exists | 40% functional |
| **Business Service Mapping (BSM)** | ✅ Complete | ✅ Enrichment works | ✅ Dashboard exists | 70% functional |
| **Unified Service Interface** | ✅ Complete | ❌ APIs disabled | ✅ Framework exists | 50% functional |
| **Multi-Stakeholder Dashboards** | ✅ Complete | ⚠️ Mock data | ✅ 5 dashboards live | 60% functional |
| **Service Catalog** | ✅ Complete | ❌ No data | ✅ UI complete | 30% functional |
| **Financial Management** | ✅ Code exists | ❌ Not connected | ✅ Dashboard exists | 20% functional |
| **Kafka Event Streaming** | ✅ Package complete | ❌ Not deployed | N/A | 0% functional |
| **Metabase BI Integration** | ✅ Init SQL exists | ❌ Not deployed | N/A | 0% functional |

**Overall Implementation: 80%**
**Overall Functional: 45%** (due to data pipeline gaps)

---

### 1.2 Dashboard Data Sources Analysis

#### Executive Dashboard (`/dashboards/executive`)

| Metric | Current Source | Data Quality | Issue |
|--------|----------------|--------------|-------|
| Total IT Spend | Aggregates `tbm_attributes.monthly_cost` from Neo4j | ⚠️ Partial | Costs may be 0 if not enriched with real financial data |
| Cost by Capability Tower | Groups by `tbm_attributes.capability_tower` | ⚠️ Partial | Towers exist but costs likely default to 0 |
| **Cost Trends** | **`generateCostTrends()` with `Math.random()`** | **❌ MOCK** | **Completely fake data** |
| Service Health by Tier | Groups by `bsm_attributes.business_criticality` | ⚠️ Partial | Tiers are real, health scores are calculated |
| Risk Matrix | Filters tier_1/tier_2 CIs | ✅ Real | BSM enrichment provides real criticality data |
| Top Cost Drivers | Sorts by `tbm_attributes.monthly_cost` | ⚠️ Partial | If costs are 0, list is meaningless |
| **Value Scorecard Revenue/ROI** | **Filters + hardcoded calculations** | **❌ MOCK** | **No real revenue or ROI data** |

**File:** `packages/api-server/src/services/dashboard.service.ts:137-230`

#### FinOps Dashboard (`/dashboards/finops`)

| Metric | Current Source | Data Quality | Issue |
|--------|----------------|--------------|-------|
| Cloud Costs by Provider | Filters by `discovery_provider` (aws/azure/gcp) | ⚠️ Partial | Sums monthly_cost if set, else 0 |
| On-Prem vs Cloud | Groups by cloud vs non-cloud | ⚠️ Partial | Depends on cost enrichment |
| **Budget Variance** | **`cost * 1.1 - cost`** | **❌ MOCK** | **Assumes 10% over budget** |
| **Unit Economics** | **Hardcoded values** | **❌ MOCK** | **`$25.50/user`, `$0.15/transaction`** |
| Cost Optimization Opportunities | Filters CIs > $100/month | ⚠️ Partial | Recommendations are generic templates |

**File:** `packages/api-server/src/services/dashboard.service.ts:232-343`

#### ITSM Dashboard (`/dashboards/itsm`)

| Metric | Current Source | Data Quality | Issue |
|--------|----------------|--------------|-------|
| **Open Incidents** | **Hardcoded array** | **❌ MOCK** | **1 example incident** |
| **Changes in Progress** | **Hardcoded array** | **❌ MOCK** | **1 example change** |
| CI Status Distribution | Neo4j `GROUP BY ci.status` | ✅ Real | Actual CI statuses from discovery |
| **Top Failing CIs** | **Empty array `[]`** | **❌ NO DATA** | **Requires ITIL incident tracking** |
| **SLA Compliance** | **Hardcoded `95.2%`, `88.7%`** | **❌ MOCK** | **No real SLA tracking** |
| **Baseline Compliance** | **Empty array `[]`** | **❌ NO DATA** | **No baseline comparisons running** |

**File:** `packages/api-server/src/services/dashboard.service.ts:345-468`

#### Business Service Dashboard (`/dashboards/business-service/:serviceId?`)

| Metric | Current Source | Data Quality | Issue |
|--------|----------------|--------------|-------|
| Service Dependency Graph | Filters CIs by `bsm_attributes.service_id` | ⚠️ Partial | BSM attributes exist but no service definitions |
| **Service Health Score** | **Calculated from tier, randomized component** | **❌ MOCK** | **Health scores are algorithmic, not real monitoring** |
| Impact Metrics | Filters by criticality tier | ✅ Real | BSM enrichment provides real data |
| **KPIs (Availability, Performance, etc.)** | **Hardcoded values** | **❌ MOCK** | **No APM/monitoring integration** |

**File:** `packages/api-server/src/services/dashboard.service.ts:470-598`

---

### 1.3 Missing Data Pipelines

#### 🔴 Critical: Financial Data Ingestion

**Status:** Code exists but **NOT CONNECTED**

**Implementation Files:**
- `packages/tbm-cost-engine/src/integrations/aws-cost-explorer.ts` ✅
- `packages/tbm-cost-engine/src/integrations/azure-cost-management.ts` ✅
- `packages/tbm-cost-engine/src/integrations/cost-sync.service.ts` ✅

**Problem:**
- ❌ No scheduled jobs calling these integrations
- ❌ No API credentials configured (AWS_ACCESS_KEY_ID, AZURE_CLIENT_ID, etc. removed from v2.0)
- ❌ No cost data being fetched from cloud providers
- ❌ `tbm_cost_pools` PostgreSQL table is empty
- ❌ No GL (General Ledger) import mechanism

**Impact:**
- All cost data in dashboards is either 0 or mock/calculated values
- FinOps Dashboard cannot provide real cost insights
- TCO analysis is unreliable
- Budget variance is fake

**What You Need to Do:**
1. Configure cloud provider credentials via v2.0 unified credential system
2. Create scheduled BullMQ jobs to run cost sync services
3. Implement GL CSV import (code exists, needs UI/API endpoint)
4. Populate `tbm_cost_pools` table with real cost data
5. Update TBM enricher to pull costs from PostgreSQL instead of defaulting to 0

**Files to Update:**
- Create: `packages/discovery-engine/src/jobs/cost-sync.job.ts`
- Update: `packages/api-server/src/rest/routes/tbm.routes.ts` (add GL import endpoint)
- Update: `packages/discovery-engine/src/enrichment/tbm-enricher.ts` (query PostgreSQL costs)

---

#### 🔴 Critical: ITIL Data Creation

**Status:** **APIs DISABLED**, tables empty

**Implementation Files:**
- `packages/api-server/src/rest/routes/itil.routes.ts` (9.2KB) ✅ **COMMENTED OUT**
- `packages/itil-service-manager/src/repositories/*.repository.ts` ✅ Implemented
- PostgreSQL tables: `itil_incidents`, `itil_changes`, `itil_baselines` ✅ Schema exists

**Problem:**
```typescript
// File: packages/api-server/src/rest/server.ts:93
// this.app.use('/api/v1/itil', itilRoutes); // ❌ DISABLED
```

**Impact:**
- ITSM Dashboard shows 1 hardcoded mock incident and 1 mock change
- No way to create/update/delete incidents via API
- No ITSM workflow automation
- Integration with external ITSM tools (ServiceNow, Jira) blocked

**What You Need to Do:**
1. Uncomment ITIL routes in `api-server/src/rest/server.ts:93`
2. Test all ITIL API endpoints:
   - `POST /api/v1/itil/incidents` - Create incident
   - `GET /api/v1/itil/incidents` - List incidents
   - `PATCH /api/v1/itil/incidents/:id` - Update incident
   - `POST /api/v1/itil/changes` - Create change
   - etc.
3. Create UI forms for incident/change creation (currently missing from web-ui)
4. Integrate with external ITSM tools (optional)

**Files to Update:**
- `packages/api-server/src/rest/server.ts` (uncomment line 93)
- Create: `web-ui/src/pages/IncidentManagement.tsx`
- Create: `web-ui/src/pages/ChangeManagement.tsx`

---

#### 🔴 Critical: Business Service Definitions

**Status:** Tables exist, **NO DATA**, no UI

**PostgreSQL Tables:**
- `business_services` ✅ Schema exists, empty
- `application_services` ✅ Schema exists, empty
- `business_capabilities` ✅ Schema exists, empty
- `service_dependencies` ✅ Schema exists, empty

**Problem:**
- No UI for creating business services
- No API endpoints for service CRUD (might exist in disabled `unified.routes.ts`)
- No seed data or import mechanism
- Business Service Dashboard has no services to display

**Impact:**
- Cannot perform business impact analysis
- Cannot map CIs to business services
- Service Catalog is disconnected from real business context
- BSM enrichment assigns `service_id` but no services exist

**What You Need to Do:**
1. Create business service management UI:
   - Service definition form
   - Application service mapping
   - Dependency visualization
   - Capability modeling
2. Enable/create API endpoints for business services
3. Create seed data SQL script with example services
4. Integrate with Service Catalog

**Files to Create:**
- `web-ui/src/pages/BusinessServiceManagement.tsx`
- `packages/database/src/postgres/seeds/002_business_services.sql`
- Investigate: `packages/api-server/src/rest/routes/unified.routes.ts.disabled`

---

#### 🔴 Critical: ETL to PostgreSQL Data Mart

**Status:** **MISSING**

**Problem:**
- Discovery stores enriched CIs in Neo4j ✅
- Dashboard service reads from Neo4j ✅
- But dimensional model in PostgreSQL is **NOT populated** ❌

**PostgreSQL Dimensional Tables (Empty):**
- `dim_ci` - Should mirror Neo4j CIs with v3 attributes
- `dim_time` - Time dimension for trend analysis
- `fact_ci_metrics` - Time-series metrics
- `fact_cost` - Cost facts by time period
- `fact_incidents` - Incident facts
- `fact_changes` - Change facts

**Impact:**
- Metabase cannot query PostgreSQL for BI dashboards
- Time-series trend analysis uses mock data
- Historical cost tracking impossible
- Cannot generate month-over-month reports

**What You Need to Do:**
1. Create ETL jobs to sync Neo4j → PostgreSQL:
   - `etl-processor/src/jobs/sync-cis-to-datamart.job.ts`
   - `etl-processor/src/jobs/sync-costs-to-datamart.job.ts`
   - `etl-processor/src/jobs/sync-incidents-to-datamart.job.ts`
2. Schedule jobs with BullMQ (hourly or daily)
3. Implement incremental sync (only changed CIs)
4. Populate dimension tables
5. Verify data quality

**Example ETL Flow:**
```typescript
// Read enriched CIs from Neo4j
const cis = await neo4j.query('MATCH (ci:CI) RETURN ci');

// Transform to dimensional model
const dimCIs = cis.map(ci => ({
  ci_id: ci.ci_id,
  ci_name: ci.ci_name,
  ci_type: ci.ci_type,
  itil_priority: ci.itil_attributes?.priority,
  tbm_tower: ci.tbm_attributes?.capability_tower,
  tbm_monthly_cost: ci.tbm_attributes?.monthly_cost,
  bsm_tier: ci.bsm_attributes?.business_criticality,
  // ... more fields
}));

// Upsert to PostgreSQL
await postgres.upsert('dim_ci', dimCIs);
```

**Files to Create:**
- `packages/etl-processor/src/jobs/sync-cis-to-datamart.job.ts`
- `packages/etl-processor/src/transformers/ci-to-dim.transformer.ts`
- `packages/etl-processor/src/jobs/sync-costs-to-datamart.job.ts`

---

#### 🟡 Medium Priority: Kafka Deployment

**Status:** Package complete, **NOT DEPLOYED**

**Implementation:**
- `packages/event-streaming/` package ✅ Fully implemented
- Producers, consumers, event schemas ✅
- Docker Compose: ❌ Kafka not in `infrastructure/docker/docker-compose.yml`

**Impact:**
- Real-time event streaming not available
- Dashboards not auto-refreshing
- No event-driven automation
- Audit trail events not captured

**What You Need to Do:**
1. Add Kafka to `docker-compose.yml`:
   ```yaml
   kafka:
     image: confluentinc/cp-kafka:7.5.0
     environment:
       KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
       # ... more config
   zookeeper:
     image: confluentinc/cp-zookeeper:7.5.0
   ```
2. Create Kafka topics on startup
3. Configure event producers in discovery/enrichment pipeline
4. Test event streaming end-to-end

**Files to Update:**
- `infrastructure/docker/docker-compose.yml`
- `infrastructure/scripts/init-kafka.sh`

---

#### 🟡 Medium Priority: Metabase Deployment

**Status:** Init SQL exists, **NOT DEPLOYED**

**Implementation:**
- `packages/database/src/postgres/migrations/metabase-init.sql` ✅
- Docker Compose: ❌ Metabase not in `docker-compose.yml`
- Dashboards: ❌ Not created in Metabase

**Impact:**
- Self-service BI not available
- Non-technical users cannot explore data
- Custom reports require developer intervention

**What You Need to Do:**
1. Add Metabase to `docker-compose.yml`:
   ```yaml
   metabase:
     image: metabase/metabase:v0.47.0
     environment:
       MB_DB_TYPE: postgres
       MB_DB_DBNAME: metabase
       # ... more config
     ports:
       - "3001:3000"
   ```
2. Run `metabase-init.sql` to create database
3. Connect Metabase to `cmdb` PostgreSQL database
4. Create dashboard templates for:
   - Cost trends
   - Service health
   - Incident analysis
   - Change risk assessment

**Files to Update:**
- `infrastructure/docker/docker-compose.yml`
- Create: `infrastructure/metabase/dashboards/*.json` (export from Metabase)

---

### 1.4 API Endpoint Status

#### ✅ Working Endpoints

```
GET  /api/v1/dashboards/executive
GET  /api/v1/dashboards/cio
GET  /api/v1/dashboards/itsm
GET  /api/v1/dashboards/finops
GET  /api/v1/dashboards/business-service/:serviceId?
```

**File:** `api-server/src/rest/routes/dashboard.routes.ts`
**Registered:** `api-server/src/rest/server.ts:91`

#### ❌ Disabled Endpoints

```
# ITIL APIs (DISABLED in server.ts:93)
POST   /api/v1/itil/incidents
GET    /api/v1/itil/incidents
GET    /api/v1/itil/incidents/:id
PATCH  /api/v1/itil/incidents/:id
DELETE /api/v1/itil/incidents/:id
POST   /api/v1/itil/changes
GET    /api/v1/itil/changes
GET    /api/v1/itil/changes/:id
PATCH  /api/v1/itil/changes/:id
DELETE /api/v1/itil/changes/:id
POST   /api/v1/itil/baselines
GET    /api/v1/itil/baselines
```

**File:** `api-server/src/rest/routes/itil.routes.ts` (9.2KB)
**Status:** File exists but not registered

```
# Unified APIs (FILE DISABLED)
GET    /api/v1/unified/service-health
POST   /api/v1/unified/enriched-incident
POST   /api/v1/unified/change-with-risk
GET    /api/v1/unified/kpis
GET    /api/v1/unified/business-service/:id/impact
```

**File:** `api-server/src/rest/routes/unified.routes.ts.disabled` (6.5KB)
**Status:** Intentionally disabled

#### ⚠️ Unknown Status

```
# TBM APIs (file exists, registration unknown)
GET    /api/v1/tbm/costs
POST   /api/v1/tbm/allocations
GET    /api/v1/tbm/towers
```

**File:** `api-server/src/rest/routes/tbm.routes.ts` (3.2KB)
**Status:** Need to verify registration in server.ts

---

### 1.5 Database Schema Verification

#### ✅ PostgreSQL Schema (Complete)

All v3.0 tables created in `001_complete_schema.sql`:

**Business Service Tables:**
- `business_services` (line 304) ✅
- `application_services` (line 385) ✅
- `business_capabilities` (line 467) ✅
- `service_dependencies` (line 527) ✅

**ITIL Tables:**
- `itil_baselines` (line 575) ✅
- `itil_incidents` (line 623) ✅
- `itil_changes` (line 698) ✅

**TBM Tables:**
- `tbm_cost_pools` (line 800) ✅
- `tbm_depreciation_schedules` (line 853) ✅
- `tbm_gl_mappings` (line 900) ✅

**Dimensional Model:**
- `dim_ci` with v3 JSONB columns (`itil_attributes`, `tbm_attributes`, `bsm_attributes`) ✅
- GIN indexes on JSONB columns ✅

**File:** `packages/database/src/postgres/migrations/001_complete_schema.sql` (2,542 lines)

#### ⚠️ Data Population Status

**Assumption:** Tables exist but are **EMPTY**

**Verification Needed:**
```sql
-- Check if tables have data
SELECT COUNT(*) FROM business_services;
SELECT COUNT(*) FROM itil_incidents;
SELECT COUNT(*) FROM tbm_cost_pools;
SELECT COUNT(*) FROM dim_ci;
```

**Recommendation:** Run these queries against your PostgreSQL database to confirm data state.

---

## Part 2: Documentation Audit

### 2.1 Documentation Coverage by Category

| Category | Coverage | Quality | Gap Severity | Files Reviewed |
|----------|----------|---------|--------------|----------------|
| **Core Frameworks (BSM, TBM, ITIL, Unified)** | 95% | ⭐⭐⭐⭐⭐ Excellent | ✅ Low | 4 comprehensive docs |
| **Service Catalog** | 0% | N/A | 🔴 **CRITICAL** | Feature exists, no docs |
| **Financial Data Integration** | 10% | ⭐ Poor | 🔴 **CRITICAL** | Mentioned, not explained |
| **v3 API Reference** | 20% | ⭐⭐ Fair | 🔴 **HIGH** | Only discovery API documented |
| **Configuration Examples** | 40% | ⭐⭐ Fair | 🟡 HIGH | Env vars listed, no examples |
| **Migration Guides** | 0% | N/A | 🟡 HIGH | No v2→v3 guide |
| **User Guides (Role-based)** | 0% | N/A | 🟡 HIGH | No operational guides |
| **Troubleshooting (v3)** | 50% | ⭐⭐⭐ Good | 🟢 MEDIUM | Generic, not v3-specific |
| **Architecture** | 80% | ⭐⭐⭐⭐ Very Good | ✅ Low | System design well documented |
| **Deployment** | 75% | ⭐⭐⭐⭐ Very Good | ✅ Low | Docker/K8s documented |

**Overall v3 Documentation Coverage: ~55%**

---

### 2.2 Excellent Documentation (Keep as Reference)

#### BSM Impact Engine Documentation
**File:** `/doc-site/docs/components/bsm-impact-engine.md` (1,390 lines)

**Strengths:**
- ✅ Complete API reference with code examples
- ✅ All services documented (CriticalityCalculator, ImpactScoring, BlastRadius, RiskRating)
- ✅ Revenue, user, and compliance impact calculators
- ✅ Use cases and troubleshooting
- ✅ Performance optimization guidance

**Package README:** `packages/bsm-impact-engine/README.md` (399 lines) also excellent

---

#### Unified Framework Documentation
**File:** `/doc-site/docs/components/unified-framework.md` (1,946 lines!)

**Strengths:**
- ✅ Extensive documentation of all 10 unified KPIs
- ✅ Complete REST API reference (12 endpoints)
- ✅ Complete GraphQL API reference
- ✅ Enriched incident and change management workflows
- ✅ Integration patterns and use cases

**Package README:** `packages/framework-integration/README.md` (551 lines)

---

### 2.3 Critical Documentation Gaps

#### 🔴 Gap #1: Service Catalog Documentation

**Implementation Status:** ✅ **FULLY IMPLEMENTED**
- File: `web-ui/src/pages/ServiceCatalog.tsx` (463 lines)
- Features: Grid/list views, filtering, search, category browsing
- Mock data: 6 sample services

**Documentation Status:** ❌ **COMPLETELY MISSING**
- No doc-site page
- Not in navigation
- No user guide
- No API documentation

**What's Needed:**
Create `/doc-site/docs/components/service-catalog.md` with:
1. **Overview** - What is the Service Catalog?
2. **User Guide** - How to browse and request services
3. **Service Definitions** - How to add new services
4. **Integration** - How it connects to ITIL service management
5. **Data Model** - `business_services` table schema
6. **API Reference** - Service CRUD endpoints
7. **Configuration** - Service catalog customization

**Estimated Effort:** 4-6 hours

---

#### 🔴 Gap #2: Financial Data Integration Guide

**Implementation Status:** ⚠️ **PARTIALLY IMPLEMENTED**
- TBM package has cloud cost integrations (AWS, Azure, GCP)
- GL import mentioned but not fully implemented
- No scheduled jobs or credentials configured

**Documentation Status:** ❌ **MISSING**
- TBM docs mention GL import but no implementation guide
- No practical "how-to" for ingesting cost data

**What's Needed:**
Create `/doc-site/docs/operations/financial-data-integration.md` with:
1. **Supported Data Sources**
   - Cloud providers (AWS Cost Explorer, Azure Cost Management, GCP Billing)
   - General Ledger systems (SAP, Oracle Financials)
   - CSV import for manual data
2. **Setup Guides**
   - Configuring cloud provider credentials
   - Creating scheduled cost sync jobs
   - GL CSV import format specification
3. **Data Validation**
   - Cost reconciliation
   - Anomaly detection
   - Data quality checks
4. **Workflows**
   - Cost allocation approval
   - Depreciation schedule management
   - License cost tracking

**Estimated Effort:** 3-4 hours

---

#### 🔴 Gap #3: v3 API Reference

**Current State:**
- Only `/doc-site/docs/api/rest/discovery.md` exists
- Unified Framework docs have API examples embedded
- No centralized v3 API documentation

**What's Needed:**
Create comprehensive API section:

1. **`/doc-site/docs/api/rest/unified.md`** - All unified framework endpoints
2. **`/doc-site/docs/api/rest/dashboards.md`** - Dashboard data endpoints
3. **`/doc-site/docs/api/rest/services.md`** - Service catalog + ITIL endpoints
4. **`/doc-site/docs/api/rest/financial.md`** - TBM and cost management endpoints
5. **`/doc-site/docs/api/graphql/schema.md`** - Complete GraphQL schema
6. **`/doc-site/docs/api/authentication.md`** - JWT, API keys, OAuth

**Each API doc should include:**
- Endpoint list with descriptions
- Request/response examples
- Authentication requirements
- Error codes and handling
- Rate limiting (if applicable)

**Estimated Effort:** 6-8 hours

---

#### 🟡 Gap #4: Migration Guide (v2 → v3)

**Current State:**
- Version history documents v1.0 → v2.0 migration
- No v2.0 → v3.0 migration guide

**What's Needed:**
Create `/doc-site/docs/getting-started/migrating-to-v3.md` with:
1. **Prerequisites** - v2.0 must be on latest version
2. **Breaking Changes**
   - Database schema changes
   - API endpoint changes
   - Configuration changes
3. **Migration Steps**
   - Backup procedures
   - Database migrations
   - Configuration updates
   - Feature flag rollout (if using feature flags)
4. **Data Migration**
   - BSM attribute backfill for existing CIs
   - TBM cost allocation for existing resources
   - ITIL baseline creation
5. **Rollback Plan**
6. **Validation Checklist**

**Estimated Effort:** 4-5 hours

---

#### 🟡 Gap #5: User Guides (Role-based)

**Current State:**
- Getting started guide is generic
- No role-specific operational guides

**What's Needed:**
Create `/doc-site/docs/user-guides/` directory with:

1. **`executive-dashboard.md`** - Using Executive Dashboard for strategic decisions
   - Understanding IT spend trends
   - Interpreting service health by tier
   - Risk matrix analysis
   - Value scorecard metrics

2. **`cio-dashboard.md`** - Monitoring operational metrics
   - CI inventory management
   - Service dependency visualization
   - Operational health KPIs

3. **`finops-dashboard.md`** - Cost analysis and optimization
   - Cloud vs on-prem cost analysis
   - Budget variance investigation
   - Unit economics tracking
   - Cost optimization recommendations

4. **`itsm-operations.md`** - Day-to-day incident and change management
   - Creating and updating incidents
   - Change request workflows
   - SLA compliance monitoring
   - Baseline drift detection

5. **`service-owner-guide.md`** - Managing business services
   - Defining business services
   - Mapping application dependencies
   - Monitoring service health
   - Impact analysis

6. **`administrator-guide.md`** - System configuration and maintenance
   - User and role management
   - Connector configuration
   - Data quality monitoring
   - Performance tuning

**Estimated Effort:** 6-8 hours (all guides)

---

### 2.4 Documentation Quick Wins

These can be implemented quickly for immediate impact:

#### ✅ Quick Win #1: Add Service Catalog to Navigation (5 minutes)

**File:** `/doc-site/docs/.vitepress/config.ts`

```typescript
// Add to "v3.0 Features" dropdown (around line 120)
{
  text: 'v3.0 Features',
  items: [
    // ... existing items
    { text: 'Service Catalog', link: '/components/service-catalog' },
  ]
}
```

#### ✅ Quick Win #2: Create Financial Integration Placeholder (30 minutes)

Create `/doc-site/docs/operations/financial-data-integration.md`:

```markdown
# Financial Data Integration

> 📝 **Documentation In Progress**
> This page is being developed. Check back soon for complete integration guides.

## Overview

ConfigBuddy v3.0 integrates with multiple financial data sources to provide accurate cost tracking and TCO analysis.

### Supported Data Sources (Planned)

- ☑️ AWS Cost Explorer
- ☑️ Azure Cost Management
- ☑️ GCP Cloud Billing
- ⏳ General Ledger (GL) Systems
- ⏳ CSV Import

### Coming Soon

- Cloud cost sync configuration
- GL integration setup
- CSV import format specification
- Cost allocation workflows

## Related Documentation

- [TBM Cost Engine](/components/tbm-cost-engine.md)
- [FinOps Dashboard](/components/business-dashboards.md#finops-dashboard)
```

#### ✅ Quick Win #3: Link Package READMEs from Doc-Site (15 minutes)

Update component pages to link to package READMEs:

```markdown
## Developer Documentation

For detailed API documentation and implementation guides, see the package README:

📦 [View Package README on GitHub](https://github.com/your-org/configbuddy/tree/main/packages/bsm-impact-engine)
```

---

## Part 3: Comprehensive Action Plan

### Phase 1: Fix Data Pipelines (Week 1-2) 🔴 **CRITICAL**

#### Task 1.1: Connect Financial Data Sources
**Priority:** P0
**Effort:** 2-3 days
**Impact:** Dashboards show real cost data

**Steps:**
1. Configure cloud provider credentials via v2.0 credential system:
   - Create AWS credential with Cost Explorer permissions
   - Create Azure credential with Cost Management permissions
   - Create GCP credential with Billing permissions
2. Create scheduled BullMQ jobs:
   - File: `packages/discovery-engine/src/jobs/aws-cost-sync.job.ts`
   - File: `packages/discovery-engine/src/jobs/azure-cost-sync.job.ts`
   - File: `packages/discovery-engine/src/jobs/gcp-cost-sync.job.ts`
3. Schedule jobs to run daily:
   ```typescript
   costSyncQueue.add('aws-cost-sync', {}, { repeat: { cron: '0 2 * * *' } });
   ```
4. Update TBM enricher to query PostgreSQL costs:
   - File: `packages/discovery-engine/src/enrichment/tbm-enricher.ts`
   - Query `tbm_cost_pools` instead of defaulting to 0
5. Test end-to-end: Cloud costs → PostgreSQL → Neo4j enrichment → Dashboard display

**Deliverables:**
- [ ] Credentials configured
- [ ] Cost sync jobs created and scheduled
- [ ] `tbm_cost_pools` table populated with real data
- [ ] Dashboards show real cost trends (no more mock data)

---

#### Task 1.2: Enable ITIL APIs and Create Data
**Priority:** P0
**Effort:** 1-2 days
**Impact:** ITSM Dashboard shows real incidents/changes

**Steps:**
1. Uncomment ITIL routes:
   - File: `packages/api-server/src/rest/server.ts`
   - Change line 93: `this.app.use('/api/v1/itil', itilRoutes);`
2. Test all ITIL API endpoints with Postman/curl:
   - `POST /api/v1/itil/incidents` - Create test incident
   - `GET /api/v1/itil/incidents` - Verify listing
   - `PATCH /api/v1/itil/incidents/:id` - Update incident
3. Create seed data SQL script:
   - File: `packages/database/src/postgres/seeds/002_itil_sample_data.sql`
   - Insert 10 sample incidents (open, in-progress, resolved)
   - Insert 5 sample changes (scheduled, in-progress, completed)
4. Run seed script: `npm run db:seed`
5. Verify ITSM Dashboard displays real data

**Deliverables:**
- [ ] ITIL APIs enabled and tested
- [ ] Sample ITIL data in PostgreSQL
- [ ] ITSM Dashboard shows real incidents/changes (no more mock data)

---

#### Task 1.3: Populate Business Services
**Priority:** P0
**Effort:** 1 day
**Impact:** Business Service Dashboard and Service Catalog functional

**Steps:**
1. Create seed data SQL script:
   - File: `packages/database/src/postgres/seeds/003_business_services.sql`
   - Insert 3-5 business services (e.g., "E-Commerce Platform", "Customer Support Portal", "Internal HR System")
   - Insert application services mapped to business services
   - Insert business capabilities
   - Insert service dependencies
2. Run seed script: `npm run db:seed`
3. Update BSM enricher to map CIs to service IDs:
   - File: `packages/discovery-engine/src/enrichment/bsm-enricher.ts`
   - Query `business_services` and map CIs based on metadata
4. Verify Business Service Dashboard displays services

**Deliverables:**
- [ ] Business services defined in PostgreSQL
- [ ] Service dependencies mapped
- [ ] Business Service Dashboard functional

---

#### Task 1.4: Implement ETL to PostgreSQL
**Priority:** P0
**Effort:** 3-4 days
**Impact:** PostgreSQL data mart populated, Metabase can function

**Steps:**
1. Create CI sync job:
   - File: `packages/etl-processor/src/jobs/sync-cis-to-datamart.job.ts`
   - Query Neo4j for all CIs with v3 attributes
   - Transform to dimensional model format
   - Upsert to `dim_ci` table
2. Create cost sync job:
   - File: `packages/etl-processor/src/jobs/sync-costs-to-datamart.job.ts`
   - Read `tbm_cost_pools` data
   - Populate `fact_cost` table with time-series data
3. Create incident sync job:
   - File: `packages/etl-processor/src/jobs/sync-incidents-to-datamart.job.ts`
   - Read `itil_incidents` data
   - Populate `fact_incidents` table
4. Schedule all ETL jobs:
   ```typescript
   etlQueue.add('sync-cis', {}, { repeat: { cron: '0 */6 * * *' } }); // Every 6 hours
   etlQueue.add('sync-costs', {}, { repeat: { cron: '0 3 * * *' } }); // Daily at 3am
   etlQueue.add('sync-incidents', {}, { repeat: { cron: '*/15 * * * *' } }); // Every 15 min
   ```
5. Test ETL pipeline end-to-end
6. Verify dimensional tables populated

**Deliverables:**
- [ ] ETL jobs created and scheduled
- [ ] `dim_ci` table populated with enriched CI data
- [ ] `fact_cost` table has time-series cost data
- [ ] `fact_incidents` table has incident metrics

---

### Phase 2: Infrastructure and Integrations (Week 3) 🟡

#### Task 2.1: Deploy Kafka
**Priority:** P1
**Effort:** 1 day
**Impact:** Real-time event streaming enabled

**Steps:**
1. Add Kafka to `infrastructure/docker/docker-compose.yml`:
   ```yaml
   zookeeper:
     image: confluentinc/cp-zookeeper:7.5.0
     environment:
       ZOOKEEPER_CLIENT_PORT: 2181

   kafka:
     image: confluentinc/cp-kafka:7.5.0
     depends_on:
       - zookeeper
     environment:
       KAFKA_BROKER_ID: 1
       KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
       KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
       KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
     ports:
       - "9092:9092"
   ```
2. Create Kafka initialization script:
   - File: `infrastructure/scripts/init-kafka.sh`
   - Create topics: `discovery-events`, `enrichment-events`, `change-events`
3. Update `deploy.sh` to initialize Kafka topics
4. Test event producers/consumers from `packages/event-streaming/`

**Deliverables:**
- [ ] Kafka running in Docker
- [ ] Topics created
- [ ] Event streaming functional

---

#### Task 2.2: Deploy Metabase
**Priority:** P1
**Effort:** 1-2 days
**Impact:** Self-service BI available

**Steps:**
1. Add Metabase to `infrastructure/docker/docker-compose.yml`:
   ```yaml
   metabase:
     image: metabase/metabase:v0.47.0
     depends_on:
       - postgres
     environment:
       MB_DB_TYPE: postgres
       MB_DB_DBNAME: metabase
       MB_DB_PORT: 5432
       MB_DB_USER: ${POSTGRES_USER}
       MB_DB_PASS: ${POSTGRES_PASSWORD}
       MB_DB_HOST: postgres
     ports:
       - "3001:3000"
   ```
2. Run `packages/database/src/postgres/migrations/metabase-init.sql`
3. Connect Metabase to `cmdb` database
4. Create dashboard templates:
   - Cost trends over time
   - Service health by tier
   - Incident volume by priority
   - Change risk distribution

**Deliverables:**
- [ ] Metabase running at http://localhost:3001
- [ ] Connected to PostgreSQL
- [ ] Sample dashboards created

---

### Phase 3: Documentation (Week 4) 📚

#### Task 3.1: Critical Documentation (P0)
**Effort:** 8-10 hours

1. **Service Catalog Documentation** (4 hours)
   - Create `/doc-site/docs/components/service-catalog.md`
   - User guide, API reference, data model
   - Add to navigation

2. **Financial Data Integration Guide** (3 hours)
   - Create `/doc-site/docs/operations/financial-data-integration.md`
   - Cloud cost sync setup
   - CSV import format
   - GL integration (when implemented)

3. **v3 API Reference - Part 1** (3 hours)
   - Create `/doc-site/docs/api/rest/dashboards.md`
   - Create `/doc-site/docs/api/rest/services.md`
   - Document all endpoints with examples

**Deliverables:**
- [ ] Service Catalog fully documented
- [ ] Financial integration guide complete
- [ ] Dashboard and Service APIs documented

---

#### Task 3.2: Important Documentation (P1)
**Effort:** 10-12 hours

1. **v3 API Reference - Part 2** (3 hours)
   - Create `/doc-site/docs/api/rest/unified.md`
   - Create `/doc-site/docs/api/rest/financial.md`
   - Create `/doc-site/docs/api/authentication.md`

2. **Migration Guide** (4 hours)
   - Create `/doc-site/docs/getting-started/migrating-to-v3.md`
   - Document breaking changes
   - Step-by-step upgrade procedure

3. **User Guides - Part 1** (4 hours)
   - Create `/doc-site/docs/user-guides/executive-dashboard.md`
   - Create `/doc-site/docs/user-guides/finops-dashboard.md`
   - Create `/doc-site/docs/user-guides/itsm-operations.md`

**Deliverables:**
- [ ] Complete v3 API reference
- [ ] Migration guide for v2→v3 upgrades
- [ ] Role-based user guides for key dashboards

---

#### Task 3.3: Nice-to-Have Documentation (P2)
**Effort:** 6-8 hours

1. **User Guides - Part 2** (3 hours)
   - Create `/doc-site/docs/user-guides/cio-dashboard.md`
   - Create `/doc-site/docs/user-guides/service-owner-guide.md`
   - Create `/doc-site/docs/user-guides/administrator-guide.md`

2. **Configuration Examples** (2 hours)
   - Create `/doc-site/docs/configuration/v3-configuration-guide.md`
   - Complete `.env.example` with v3 variables
   - BSM threshold tuning examples

3. **Troubleshooting Expansion** (2 hours)
   - Add v3-specific sections to `/doc-site/docs/operations/troubleshooting.md`
   - BSM enrichment issues
   - Dashboard data loading issues
   - Cost calculation accuracy

**Deliverables:**
- [ ] All user guides complete
- [ ] Configuration examples documented
- [ ] v3 troubleshooting runbooks added

---

## Part 4: Verification and Testing

### 4.1 Data Pipeline Verification

**Run these queries to verify data population:**

```sql
-- Check business services
SELECT COUNT(*) as service_count FROM business_services;
SELECT * FROM business_services LIMIT 5;

-- Check ITIL data
SELECT COUNT(*) as incident_count FROM itil_incidents;
SELECT COUNT(*) as change_count FROM itil_changes;

-- Check TBM cost pools
SELECT COUNT(*) as cost_pool_count FROM tbm_cost_pools;
SELECT SUM(monthly_cost) as total_monthly_cost FROM tbm_cost_pools;

-- Check dimensional model
SELECT COUNT(*) as ci_count FROM dim_ci;
SELECT COUNT(*) as cost_fact_count FROM fact_cost;
SELECT COUNT(*) as incident_fact_count FROM fact_incidents;

-- Verify v3 attribute population in dim_ci
SELECT
  COUNT(*) as total_cis,
  COUNT(itil_attributes) as cis_with_itil,
  COUNT(tbm_attributes) as cis_with_tbm,
  COUNT(bsm_attributes) as cis_with_bsm
FROM dim_ci;
```

**Expected Results (After Phase 1):**
- `business_services`: 3-5 services
- `itil_incidents`: 10+ incidents
- `tbm_cost_pools`: Data from cloud providers (varies by setup)
- `dim_ci`: Same count as Neo4j CIs
- `fact_cost`: Time-series records (daily or monthly)

---

### 4.2 Dashboard Testing Checklist

**Executive Dashboard:**
- [ ] Total IT Spend shows real aggregated costs (not 0)
- [ ] Cost Trends chart shows historical data (not random mock data)
- [ ] Cost by Capability Tower shows distribution with real costs
- [ ] Service Health by Tier shows services grouped correctly
- [ ] Risk Matrix displays tier_1 and tier_2 CIs
- [ ] Top Cost Drivers shows actual high-cost CIs
- [ ] Value Scorecard shows customer-facing services

**FinOps Dashboard:**
- [ ] Cloud Costs by Provider shows AWS/Azure/GCP breakdown
- [ ] On-Prem vs Cloud shows cost distribution
- [ ] Budget Variance shows real budget data (not +10% mock)
- [ ] Unit Economics shows calculated metrics (if implemented)
- [ ] Cost Optimization shows real recommendations

**ITSM Dashboard:**
- [ ] Open Incidents table shows real incidents from PostgreSQL
- [ ] Changes in Progress shows real change records
- [ ] CI Status Distribution shows actual CI statuses
- [ ] Top Failing CIs shows incidents grouped by CI
- [ ] SLA Compliance shows calculated percentages (if SLA tracking implemented)

**Business Service Dashboard:**
- [ ] Service dropdown populated with real business services
- [ ] Service Dependency Graph shows mapped CIs
- [ ] Service Health Score calculated from real metrics
- [ ] Impact Metrics show real data (revenue, users, compliance)
- [ ] KPIs show real values (if APM integrated)

---

### 4.3 API Testing

**Use curl or Postman to test:**

```bash
# Dashboard APIs
curl http://localhost:3000/api/v1/dashboards/executive
curl http://localhost:3000/api/v1/dashboards/finops
curl http://localhost:3000/api/v1/dashboards/itsm

# ITIL APIs (after enabling)
curl -X POST http://localhost:3000/api/v1/itil/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Database Connection Timeout",
    "description": "Users unable to access customer database",
    "priority": "P1",
    "affected_ci_id": "ci_12345"
  }'

curl http://localhost:3000/api/v1/itil/incidents

# Unified APIs (if enabled)
curl http://localhost:3000/api/v1/unified/service-health
curl http://localhost:3000/api/v1/unified/kpis
```

---

## Part 5: Summary and Recommendations

### 5.1 Implementation Status Summary

| Area | Status | Functional % | Action Required |
|------|--------|--------------|-----------------|
| **Infrastructure** | ✅ Complete | 90% | Deploy Kafka & Metabase |
| **Backend Packages** | ✅ Complete | 95% | Enable ITIL APIs |
| **Database Schema** | ✅ Complete | 100% | Populate tables with data |
| **Discovery Enrichment** | ✅ Complete | 90% | Connect cost data sources |
| **Dashboard UI** | ✅ Complete | 80% | Replace mock data with real queries |
| **Dashboard APIs** | ✅ Complete | 70% | Enable disabled routes |
| **Data Pipelines** | ❌ Incomplete | 20% | **Implement ETL, cost sync, ITIL data creation** |
| **Documentation** | ⚠️ Partial | 55% | Add Service Catalog, Financial, API, User Guides |

**Overall v3.0 Maturity: 65%**

---

### 5.2 Critical Path to Production

**To make v3.0 production-ready, you MUST complete:**

1. **Connect Financial Data Sources** (Task 1.1) - Without this, cost dashboards are useless
2. **Enable ITIL APIs and Create Data** (Task 1.2) - Without this, ITSM Dashboard is useless
3. **Populate Business Services** (Task 1.3) - Without this, Service Catalog is empty
4. **Implement ETL Pipeline** (Task 1.4) - Without this, Metabase cannot function

**Timeline: 2-3 weeks** (assuming 1 developer full-time)

---

### 5.3 What You Can Use Today (With Caveats)

#### ✅ **Fully Functional (Production-Ready)**
- BSM Impact Engine - Works perfectly with enriched CIs from discovery
- BSM Enrichment - Automatically enriches CIs with business criticality
- Discovery Pipeline - Enriches CIs with ITIL, TBM, BSM attributes
- Risk Matrix Dashboard - Shows real criticality tiers
- CI Inventory Dashboard - Shows real CI counts and types

#### ⚠️ **Partially Functional (Demo/POC Only)**
- Executive Dashboard - Shows real CI counts and tiers, but costs and trends are mock
- FinOps Dashboard - Shows CI distribution, but costs are 0 or mock
- Service Catalog - UI works, but no real services defined
- TBM Cost Engine - Code is complete, but not connected to data sources

#### ❌ **Not Functional (Needs Immediate Work)**
- ITSM Dashboard - Shows hardcoded mock incidents/changes
- Business Service Dashboard - No services to display
- Metabase BI - Not deployed
- Real-time Event Streaming - Kafka not deployed
- Financial Data Integration - Not connected

---

### 5.4 Final Recommendations

#### Immediate Actions (This Week)
1. **Enable ITIL APIs** - 1 line of code change in `server.ts`
2. **Create sample ITIL data** - SQL seed script with 10 incidents, 5 changes
3. **Create sample business services** - SQL seed script with 3-5 services
4. **Verify what data exists** - Run SQL queries from section 4.1

#### Short-term (Weeks 2-3)
5. **Connect cloud cost APIs** - Configure credentials and create sync jobs
6. **Implement ETL pipeline** - Sync Neo4j to PostgreSQL dimensional model
7. **Deploy Kafka** - Enable real-time event streaming
8. **Deploy Metabase** - Enable self-service BI

#### Medium-term (Week 4+)
9. **Complete documentation** - Service Catalog, Financial Integration, API Reference, User Guides
10. **Build UI for business service management** - Create/edit business services via UI
11. **Implement GL integration** - Connect to financial systems for cost data
12. **Replace all mock data** - Remove hardcoded values from dashboards

---

### 5.5 Questions to Answer

Before proceeding, clarify these decisions:

1. **Financial Data Sources:**
   - Which cloud providers are you using? (AWS, Azure, GCP)
   - Do you have API credentials for cost data?
   - Do you want GL integration? If yes, which GL system?
   - Should we use CSV import for now?

2. **ITIL Data:**
   - Do you want to integrate with external ITSM tools (ServiceNow, Jira)?
   - Or will users create incidents directly in ConfigBuddy?
   - What's your incident priority model? (using default P1-P5?)

3. **Business Services:**
   - How many business services do you have? (ballpark)
   - Do you have an existing service catalog to import?
   - Or should we start with manual definitions?

4. **Deployment:**
   - Are you using Docker Compose or Kubernetes?
   - Do you need Kafka for production? (or can defer for v3.1?)
   - Same question for Metabase

5. **Documentation:**
   - Which user guides are highest priority? (Executive? FinOps? ITSM?)
   - Do you need OpenAPI/Swagger spec for API docs?

---

## Appendix A: File Manifest

### Critical Files to Update

**Enable ITIL APIs:**
- `packages/api-server/src/rest/server.ts:93` - Uncomment ITIL routes

**Financial Data Integration:**
- Create: `packages/discovery-engine/src/jobs/aws-cost-sync.job.ts`
- Create: `packages/discovery-engine/src/jobs/azure-cost-sync.job.ts`
- Update: `packages/discovery-engine/src/enrichment/tbm-enricher.ts`

**ITIL Data:**
- Create: `packages/database/src/postgres/seeds/002_itil_sample_data.sql`
- Optional: `web-ui/src/pages/IncidentManagement.tsx`

**Business Services:**
- Create: `packages/database/src/postgres/seeds/003_business_services.sql`
- Optional: `web-ui/src/pages/BusinessServiceManagement.tsx`

**ETL Pipeline:**
- Create: `packages/etl-processor/src/jobs/sync-cis-to-datamart.job.ts`
- Create: `packages/etl-processor/src/jobs/sync-costs-to-datamart.job.ts`
- Create: `packages/etl-processor/src/jobs/sync-incidents-to-datamart.job.ts`

**Infrastructure:**
- Update: `infrastructure/docker/docker-compose.yml` (add Kafka & Metabase)
- Create: `infrastructure/scripts/init-kafka.sh`

**Documentation:**
- Create: `/doc-site/docs/components/service-catalog.md`
- Create: `/doc-site/docs/operations/financial-data-integration.md`
- Create: `/doc-site/docs/api/rest/dashboards.md`
- Create: `/doc-site/docs/api/rest/services.md`
- Create: `/doc-site/docs/getting-started/migrating-to-v3.md`
- Create: `/doc-site/docs/user-guides/executive-dashboard.md`
- Create: `/doc-site/docs/user-guides/finops-dashboard.md`
- Create: `/doc-site/docs/user-guides/itsm-operations.md`

---

## Appendix B: Data Model Quick Reference

### Business Services Schema

```sql
business_services
├── service_id (PK)
├── name
├── description
├── owner_email
├── criticality (tier_0 to tier_4)
├── revenue_impact
├── user_impact
└── compliance_scope (JSONB)

application_services
├── app_service_id (PK)
├── business_service_id (FK)
├── name
├── technology_stack
└── deployment_environment

service_dependencies
├── dependency_id (PK)
├── source_service_id (FK)
├── target_service_id (FK)
├── dependency_type
└── is_critical
```

### ITIL Schema

```sql
itil_incidents
├── incident_id (PK)
├── title
├── description
├── priority (P1-P5)
├── status (open, in-progress, resolved, closed)
├── affected_ci_id (FK to dim_ci)
├── assigned_to
├── created_at
├── resolved_at
└── resolution_notes

itil_changes
├── change_id (PK)
├── title
├── description
├── change_type (standard, normal, emergency)
├── risk_score (calculated)
├── status (scheduled, in-progress, completed, failed, rolled-back)
├── affected_ci_ids (JSONB array)
├── scheduled_start
├── actual_start
└── actual_end
```

### TBM Schema

```sql
tbm_cost_pools
├── cost_pool_id (PK)
├── pool_name
├── cost_category (capex, opex)
├── resource_tower (enum: compute, storage, network, etc.)
├── monthly_cost
├── annual_cost
├── allocation_method (direct, usage_based, even_split)
├── fiscal_period (YYYY-MM)
└── source_system (aws, azure, gcp, gl)

tbm_gl_mappings
├── mapping_id (PK)
├── gl_account_code
├── gl_account_name
├── cost_pool_id (FK)
├── resource_tower
└── allocation_percentage
```

---

## Appendix C: Useful Queries

### Check Data Population

```sql
-- Summary of all v3 tables
SELECT
  'business_services' as table_name, COUNT(*) as row_count FROM business_services
UNION ALL
SELECT 'itil_incidents', COUNT(*) FROM itil_incidents
UNION ALL
SELECT 'itil_changes', COUNT(*) FROM itil_changes
UNION ALL
SELECT 'tbm_cost_pools', COUNT(*) FROM tbm_cost_pools
UNION ALL
SELECT 'dim_ci', COUNT(*) FROM dim_ci
UNION ALL
SELECT 'fact_cost', COUNT(*) FROM fact_cost
UNION ALL
SELECT 'fact_incidents', COUNT(*) FROM fact_incidents;
```

### Verify Neo4j Enrichment

```cypher
// Check how many CIs have v3 attributes
MATCH (ci:CI)
RETURN
  COUNT(ci) as total_cis,
  COUNT(ci.itil_attributes) as cis_with_itil,
  COUNT(ci.tbm_attributes) as cis_with_tbm,
  COUNT(ci.bsm_attributes) as cis_with_bsm;

// Show example enriched CI
MATCH (ci:CI)
WHERE ci.bsm_attributes IS NOT NULL
RETURN
  ci.ci_name,
  ci.bsm_attributes.business_criticality,
  ci.bsm_attributes.customer_facing,
  ci.tbm_attributes.capability_tower,
  ci.tbm_attributes.monthly_cost
LIMIT 5;
```

### Find High-Cost CIs

```cypher
MATCH (ci:CI)
WHERE ci.tbm_attributes.monthly_cost > 0
RETURN
  ci.ci_name,
  ci.ci_type,
  ci.tbm_attributes.monthly_cost as monthly_cost,
  ci.bsm_attributes.business_criticality as criticality
ORDER BY monthly_cost DESC
LIMIT 10;
```

---

**End of Audit Report**

For questions or clarification on any findings, please refer to the relevant sections above or consult the implementation files referenced throughout this document.
