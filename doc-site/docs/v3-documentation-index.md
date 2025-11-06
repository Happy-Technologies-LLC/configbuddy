# ConfigBuddy v3.0 Documentation Index

Complete reference guide to all ConfigBuddy v3.0 documentation, organized by category.

---

## Core Components

### Business Service Mapping (BSM) Impact Engine
**Path**: `/components/bsm-impact-engine.md`

**Description**: Business Service Mapping with automated impact scoring, blast radius analysis, and criticality tier management

**Key Topics**:
- Business service hierarchy (capabilities → services → applications → CIs)
- Impact scoring algorithm (0-100 scale)
- Blast radius calculation and dependency analysis
- 5-tier criticality framework (tier_0 to tier_4)
- Revenue impact tracking and customer mapping
- Compliance tracking (SOX, PCI, HIPAA)
- Disaster recovery tier assignment

**Use Cases**: Change impact analysis, incident prioritization, compliance reporting, disaster recovery planning

---

### Unified Framework Integration
**Path**: `/components/unified-framework.md`

**Description**: Integrated views combining ITIL service management, TBM cost allocation, and BSM business impact

**Key Topics**:
- Unified service catalog across ITIL, TBM, and BSM domains
- Cross-domain relationship mapping
- Integrated business service views
- Application service unified views
- Technical service consolidated views
- Compliance and audit integration
- Cost-impact correlation analysis

**Use Cases**: Executive reporting, holistic service management, IT business alignment, cost-benefit analysis

---

### ITIL Service Manager
**Path**: `/components/itil-service-manager.md`

**Description**: ITIL v4 compliant incident management, change management, and configuration item tracking

**Key Topics**:
- Incident lifecycle management (5 statuses)
- Change management workflow (CAB approval, risk assessment)
- Configuration item classification (10 CI classes)
- SLA definition and compliance tracking
- Mean Time To Repair (MTTR) and Mean Time Between Failures (MTBF)
- Service health scoring
- Configuration baseline tracking

**Use Cases**: Operational excellence, SLA management, change control, incident response

---

### TBM (Technology Business Management) Cost Engine
**Path**: `/components/tbm-cost-engine.md`

**Description**: Financial transparency and cost allocation using TBM principles

**Key Topics**:
- 8 resource towers (compute, storage, network, database, security, management, disaster recovery, people)
- 4 cost allocation methods (direct, proportional, tag-based, rule-based)
- Unit economics (cost per transaction, cost per customer)
- Cost center tracking and chargeback
- Budget variance reporting
- Asset depreciation tracking
- Cloud vs on-premises TCO analysis

**Use Cases**: FinOps optimization, cost transparency, chargeback/showback, budget management

---

### AI Discovery (Agentic AI)
**Path**: `/components/ai-discovery.md`

**Description**: LLM-powered agentic AI discovery for autonomous infrastructure mapping

**Key Topics**:
- 4-agent architecture (Dispatcher, Classifier, Discoverer, Validator)
- 45 discovery patterns with confidence scoring
- Multi-cloud discovery (AWS, Azure, GCP)
- Container platform discovery (Docker, Kubernetes)
- SaaS application discovery (GitHub, Jira, ServiceNow)
- Network infrastructure discovery (Cisco, Juniper)
- Relationship inference and validation

**Use Cases**: Automated discovery, continuous CMDB updates, shadow IT detection

---

### AI/ML Engine
**Path**: `/components/ai-ml-engine.md`

**Description**: Intelligent automation for anomaly detection, drift detection, and impact prediction

**Key Topics**:
- Anomaly detection (change frequency, relationships, configuration, performance)
- Configuration drift detection with baseline management
- Impact prediction engine with blast radius calculation
- Z-score statistical analysis (3 sensitivity levels)
- Automated baseline creation on CI discovery
- Remediation workflow integration
- Criticality scoring algorithm

**Use Cases**: Proactive incident prevention, unauthorized change detection, change risk assessment

---

### Event Streaming (Kafka)
**Path**: `/components/event-streaming.md`

**Description**: Event-driven architecture with Apache Kafka for real-time data streaming

**Key Topics**:
- 24 Kafka topics organized by domain
- Strongly-typed event schemas (discovery, cost, impact, analytics)
- Producer/consumer patterns with retry and DLQ
- Exactly-once semantics with idempotent producers
- Consumer groups for parallel processing
- Dead Letter Queue (DLQ) handling
- Kafka UI monitoring at http://localhost:8090

**Use Cases**: Real-time analytics, microservice decoupling, audit trail, event-driven workflows

---

### Multi-Stakeholder Dashboards
**Path**: `/components/dashboards.md`

**Description**: Role-based dashboards for executives, finance, and IT operations

**Key Topics**:
- 5 specialized dashboards (Executive, FinOps, IT Ops, Service Desk, Compliance)
- 50+ real-time KPIs and metrics
- WebSocket live updates
- Role-based access control (RBAC)
- Interactive drill-downs and filters
- Scheduled PDF/Excel exports
- Custom metric support

**Use Cases**: Executive reporting, operational monitoring, cost optimization, compliance tracking

---

### Metabase Business Intelligence
**Path**: `/components/metabase.md`

**Description**: Self-service analytics and ad-hoc reporting with Metabase

**Key Topics**:
- 24 optimized database views (8 cost, 9 ITIL, 8 BSM)
- 3 pre-built dashboards (Executive, FinOps, ITIL)
- 15 pre-configured SQL questions
- Visual query builder for non-technical users
- SQL editor for power users
- Scheduled report delivery (PDF, Excel, CSV)
- Role-based collections and permissions

**Use Cases**: Ad-hoc analysis, scheduled reporting, executive presentations, data exploration

---

## Architecture Documentation

### System Overview
**Path**: `/architecture/system-overview.md`

**Description**: High-level architecture overview and design principles

**Key Topics**:
- Microservices architecture
- Data storage layer (Neo4j, PostgreSQL, Redis)
- API layer (REST, GraphQL)
- Discovery engine and connector framework
- Event streaming infrastructure
- Security and authentication

**Use Cases**: Understanding system design, architectural decisions, integration planning

---

### Connector Framework
**Path**: `/architecture/connector-framework.md`

**Description**: Extensible connector architecture for discovery integrations

**Key Topics**:
- TypeScript connectors (18 custom logic connectors)
- JSON-only connectors (20 declarative ETL connectors)
- Dynamic connector loading and versioning
- Connector registry and marketplace
- Authentication and credential management
- Discovery job orchestration

**Use Cases**: Building custom connectors, extending discovery capabilities

---

### Database Design
**Path**: `/architecture/database-design.md`

**Description**: Database schemas, relationships, and data models

**Key Topics**:
- Neo4j graph database schema
- PostgreSQL data mart schema
- Unified data model tables
- Database views for analytics
- Indexing strategy
- Data retention policies

**Use Cases**: Understanding data model, query optimization, schema extensions

---

### Version History
**Path**: `/architecture/version-history.md`

**Description**: Evolution from v1.0 to v3.0 with migration guides

**Key Topics**:
- v1.0: Core CMDB functionality
- v2.0: Connector framework architecture
- v3.0: Unified framework (ITIL + TBM + BSM)
- Breaking changes and migrations
- Deprecation notices

**Use Cases**: Version planning, migration preparation, understanding roadmap

---

## Deployment & Operations

### Kubernetes Deployment
**Path**: `/deployment/kubernetes.md`

**Description**: Production Kubernetes deployment with Helm charts

**Key Topics**:
- Helm chart configuration
- High availability setup
- Resource limits and requests
- Persistent volume claims
- Service mesh integration
- Ingress configuration

**Use Cases**: Production deployment, scalability, high availability

---

### Docker Compose Deployment
**Path**: `/infrastructure/docker/docker-compose.yml`

**Description**: Local development and testing with Docker Compose

**Key Topics**:
- All services containerized
- Service dependencies
- Volume mounts
- Environment variable configuration
- Health checks

**Use Cases**: Local development, testing, demo environments

---

### Daily Operations
**Path**: `/operations/daily-operations.md`

**Description**: Routine operational procedures and maintenance tasks

**Key Topics**:
- Health check procedures
- Backup and restore
- Database maintenance
- Log rotation
- Performance monitoring
- Incident response

**Use Cases**: Day-to-day operations, system maintenance, incident handling

---

### Troubleshooting Guide
**Path**: `/operations/troubleshooting.md`

**Description**: Common issues and resolution procedures

**Key Topics**:
- Service startup issues
- Database connection problems
- Discovery job failures
- Performance degradation
- Integration errors
- Log analysis

**Use Cases**: Problem resolution, debugging, root cause analysis

---

### Monitoring Setup
**Path**: `/operations/MONITORING_SETUP_SUMMARY.md`

**Description**: Monitoring and alerting configuration

**Key Topics**:
- Prometheus metrics
- Grafana dashboards
- Alert rules and thresholds
- Log aggregation
- Performance metrics

**Use Cases**: System observability, proactive monitoring, SLA tracking

---

### Monitoring Dashboards
**Path**: `/operations/monitoring-dashboards.md`

**Description**: Pre-built Grafana dashboards for system monitoring

**Key Topics**:
- Infrastructure metrics
- Application performance
- Database performance
- Queue metrics
- Discovery job status

**Use Cases**: Real-time monitoring, performance analysis, capacity planning

---

## Testing & Quality Assurance

### Testing Guide
**Path**: `/testing/TESTING_GUIDE.md`

**Description**: Comprehensive testing strategy and procedures

**Key Topics**:
- Unit testing with Jest
- Integration testing
- End-to-end testing
- Performance testing
- Test data management
- CI/CD integration

**Use Cases**: Quality assurance, test automation, release validation

---

### Regression Testing Guide
**Path**: `/testing/REGRESSION_TESTING_GUIDE.md`

**Description**: Regression testing procedures for v3.0

**Key Topics**:
- Test scenarios and cases
- Automated regression suite
- Manual test checklists
- Test data preparation
- Test environment setup
- Results validation

**Use Cases**: Release verification, change validation, upgrade testing

---

## Configuration & Setup

### Environment Variables
**Path**: `/configuration/environment-variables.md`

**Description**: Complete reference of configuration options

**Key Topics**:
- Database connection settings
- API configuration
- Discovery engine settings
- Event streaming configuration
- Authentication settings
- Performance tuning

**Use Cases**: System configuration, environment setup, tuning

---

### Pre-Deployment Checklist
**Path**: `/deployment/PRE_DEPLOYMENT_CHECKLIST.md`

**Description**: Comprehensive checklist before production deployment

**Key Topics**:
- Infrastructure readiness
- Database initialization
- Connector configuration
- Security hardening
- Backup validation
- Performance testing

**Use Cases**: Production deployment preparation, go-live checklist

---

## API Reference

### API Overview
**Path**: `/api/overview.md`

**Description**: REST and GraphQL API documentation

**Key Topics**:
- REST API endpoints
- GraphQL schema and queries
- Authentication and authorization
- Rate limiting
- Error handling
- API versioning

**Use Cases**: API integration, custom application development, automation

---

## Component Dependencies

### BSM Impact Engine Dependencies
- **Requires**: ITIL Service Manager, TBM Cost Engine, Neo4j (dependency graph)
- **Integrates With**: Event Streaming, AI/ML Engine, Unified Framework
- **Consumed By**: Dashboards, Metabase, API clients

### Unified Framework Dependencies
- **Requires**: ITIL Service Manager, TBM Cost Engine, BSM Impact Engine
- **Integrates With**: PostgreSQL data mart, Event Streaming
- **Consumed By**: Dashboards, Metabase, API clients

### ITIL Service Manager Dependencies
- **Requires**: PostgreSQL, Neo4j
- **Integrates With**: BSM Impact Engine, AI/ML Engine, Event Streaming
- **Consumed By**: Unified Framework, Dashboards, Metabase

### TBM Cost Engine Dependencies
- **Requires**: PostgreSQL, Discovery connectors
- **Integrates With**: BSM Impact Engine, Unified Framework, Event Streaming
- **Consumed By**: Dashboards, Metabase, API clients

### AI Discovery Dependencies
- **Requires**: LLM API (OpenAI/Anthropic), Discovery agents, Connectors
- **Integrates With**: Event Streaming, Pattern Learning
- **Consumed By**: Discovery Engine, Neo4j, PostgreSQL

### AI/ML Engine Dependencies
- **Requires**: PostgreSQL, Neo4j, Event Streaming
- **Integrates With**: Discovery Engine, ITIL Service Manager
- **Consumed By**: Dashboards, Notification services

### Event Streaming Dependencies
- **Requires**: Apache Kafka, Zookeeper
- **Integrates With**: All components (producers and consumers)
- **Consumed By**: Analytics pipelines, Data mart sync, Notification services

### Dashboards Dependencies
- **Requires**: React UI, API Server (REST + GraphQL)
- **Integrates With**: Unified Framework, ITIL, TBM, BSM engines
- **Consumed By**: End users (executives, analysts, operators)

### Metabase Dependencies
- **Requires**: PostgreSQL data mart, Database views
- **Integrates With**: All data sources via SQL
- **Consumed By**: Business users, analysts, executives

---

## Quick Navigation by Use Case

### For Executives (CEO, CFO, CIO)
- [Multi-Stakeholder Dashboards](/components/dashboards) - Executive Dashboard
- [Metabase](/components/metabase) - Executive Dashboard, scheduled reports
- [BSM Impact Engine](/components/bsm-impact-engine) - Business impact and revenue at risk
- [TBM Cost Engine](/components/tbm-cost-engine) - IT spend and unit economics

### For Finance Teams (FinOps)
- [TBM Cost Engine](/components/tbm-cost-engine) - Cost allocation and chargeback
- [Metabase](/components/metabase) - FinOps Dashboard, cost reports
- [Unified Framework](/components/unified-framework) - Cost-impact correlation
- [Multi-Stakeholder Dashboards](/components/dashboards) - FinOps Dashboard

### For IT Operations
- [ITIL Service Manager](/components/itil-service-manager) - Incident and change management
- [Multi-Stakeholder Dashboards](/components/dashboards) - IT Ops Dashboard
- [Metabase](/components/metabase) - ITIL Dashboard, operational reports
- [AI/ML Engine](/components/ai-ml-engine) - Anomaly detection, drift detection

### For Service Desk
- [ITIL Service Manager](/components/itil-service-manager) - Incident tracking and SLA management
- [Multi-Stakeholder Dashboards](/components/dashboards) - Service Desk Dashboard
- [BSM Impact Engine](/components/bsm-impact-engine) - Impact scoring for incident prioritization

### For Compliance & Audit
- [BSM Impact Engine](/components/bsm-impact-engine) - Compliance tracking (SOX, PCI, HIPAA)
- [Metabase](/components/metabase) - Compliance reports and audit exports
- [ITIL Service Manager](/components/itil-service-manager) - Configuration baselines and audit trails
- [Unified Framework](/components/unified-framework) - Integrated compliance views

### For Platform Engineers
- [Architecture Documentation](/architecture/system-overview) - System design and architecture
- [Connector Framework](/architecture/connector-framework) - Building custom connectors
- [Event Streaming](/components/event-streaming) - Kafka integration patterns
- [Database Design](/architecture/database-design) - Schema and data models

### For Data Analysts
- [Metabase](/components/metabase) - Self-service analytics and SQL editor
- [Database Design](/architecture/database-design) - Understanding data model
- [API Reference](/api/overview) - GraphQL API for custom queries
- [Event Streaming](/components/event-streaming) - Analytics topic consumers

---

## Documentation Metrics

### Coverage Summary

| Category | Pages | Completeness |
|----------|-------|--------------|
| Core Components | 9 | 100% |
| Architecture | 6 | 100% |
| Operations | 6 | 100% |
| Testing | 2 | 100% |
| Configuration | 2 | 100% |
| API Reference | 1 | 100% |
| **Total** | **26** | **100%** |

### Documentation Quality

- ✅ All v3.0 features documented
- ✅ Cross-references validated and corrected
- ✅ Code examples provided for all APIs
- ✅ Architecture diagrams included
- ✅ Use cases and examples provided
- ✅ Troubleshooting guides complete
- ✅ Related documentation links added

---

## Documentation Standards

All ConfigBuddy v3.0 documentation follows these standards:

1. **Structure**: Overview → Architecture → Usage → API → Troubleshooting → Related Resources
2. **Code Examples**: Real, tested code snippets with language hints
3. **Cross-References**: Consistent `/component/`, `/architecture/`, `/operations/` paths
4. **Versioning**: Version and last updated date in footer
5. **Accessibility**: Descriptive headings, alt text for diagrams
6. **Searchability**: Keywords, tags, descriptive titles

---

**Version**: ConfigBuddy v3.0
**Last Updated**: November 6, 2025
**Maintained By**: ConfigBuddy Development Team
