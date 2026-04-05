# Pre-Publication Review Items

**Generated**: 2026-04-05
**Purpose**: Items flagged during open-source audit that require owner decision before public release.

---

## Category 1: Branding — "HappyConfig" References

These files contain the old "HappyConfig" product name and should be updated to "ConfigBuddy" before release.

| # | File | Line(s) | Content | Action Needed |
|---|------|---------|---------|---------------|
| 1 | `web-ui/.env.example` | 1, 9 | `# HappyConfig CMDB Web UI`, `VITE_APP_NAME=HappyConfig CMDB` | Rename to ConfigBuddy |
| 2 | `scripts/start-full-stack.sh` | 4, 58, 243 | Script headers and output referencing HappyConfig | Rename to ConfigBuddy |
| 3 | `infrastructure/terraform/main.tf` | 12, 25 | Terraform state bucket `happyconfig-terraform-state`, tags | Rename to ConfigBuddy |
| 4 | `infrastructure/terraform/modules/elasticache/main.tf` | 59 | Resource naming with HappyConfig | Rename to ConfigBuddy |
| 5 | `infrastructure/terraform/modules/ec2/main.tf` | — | Resource naming with HappyConfig | Rename to ConfigBuddy |
| 6 | `infrastructure/terraform/modules/iam/main.tf` | — | Resource naming with HappyConfig | Rename to ConfigBuddy |
| 7 | `infrastructure/terraform/modules/msk/main.tf` | — | Resource naming with HappyConfig | Rename to ConfigBuddy |
| 8 | `infrastructure/terraform/modules/rds/main.tf` | — | Resource naming with HappyConfig | Rename to ConfigBuddy |
| 9 | `infrastructure/terraform/modules/s3/main.tf` | — | Resource naming with HappyConfig | Rename to ConfigBuddy |
| 10 | `infrastructure/terraform/modules/vpc/main.tf` | — | Resource naming with HappyConfig | Rename to ConfigBuddy |
| 11 | `infrastructure/scripts/init-kafka-topics.sh` | 3 | Script header | Rename to ConfigBuddy |
| 6 | `infrastructure/scripts/init-neo4j-cluster.sh` | 61 | Reference in script | Rename to ConfigBuddy |
| 7 | `infrastructure/scripts/init-neo4j.cypher` | 393, 413 | Sample CMDB seed data with HappyConfig hostnames | Rename to ConfigBuddy |
| 8 | `infrastructure/nginx/nginx.conf` | 54 | Comment referencing HappyConfig | Rename to ConfigBuddy |

**Additional**: `scripts/start-full-stack.sh:255` and `infrastructure/scripts/init-neo4j.cypher:134` use `admin@happyconfig.local` — should become `admin@configbuddy.local`.

---

## Category 2: Trademark Attribution Needed

The following vendor names appear in user-facing text (README, UI, docs, connector metadata) and may benefit from trademark attribution. **Recommendation**: Add a single trademark disclaimer to README and NOTICE file rather than adding (R) symbols everywhere.

### High Priority (Connector Names in UI/Docs)
| Vendor | Key Locations |
|--------|--------------|
| ServiceNow | README.md (lines 18, 451, 508), ConnectorMarketplace.tsx (line 31), connector.json, 87+ total refs |
| Jira / Atlassian | README.md (lines 18, 451, 508), ConnectorMarketplace.tsx (line 45), connector.json |
| VMware | connector.json (`VMware vSphere`), documentation |
| Datadog | ConnectorMarketplace.tsx (line 71), connector.json, README.md |
| Oracle | connector.json (`Oracle Cloud Infrastructure`) |

### Lower Priority (Common Industry Usage)
| Vendor | Notes |
|--------|-------|
| AWS / Amazon Web Services | Technical context, widely used without attribution in OSS |
| Microsoft Azure | Technical context |
| Google Cloud Platform | Technical context |
| Kubernetes | CNCF trademark, technical context |
| Docker | Technical context |
| PagerDuty | Operations docs, alerting config |
| Salesforce | Documentation references |

---

## Category 3: Development Default Credentials

These are fallback defaults in scripts — not secrets, but worth reviewing for appropriateness in a public repo.

| # | File | Content | Risk |
|---|------|---------|------|
| 1 | `scripts/start-full-stack.sh:147` | `NEO4J_PASSWORD:-cmdb_password_dev` | Low — dev default |
| 2 | `scripts/start-full-stack.sh:156` | `JWT_SECRET:-dev-secret-key-change-in-production` | Low — labeled as dev |
| 3 | `deploy.sh:354` | `NEO4J_PASSWORD:-cmdb_password_dev` | Low — dev default |
| 4 | `infrastructure/scripts/init-redis-cluster.sh:7` | `REDIS_PASSWORD:-redis_prod_password` | **Medium** — says "prod" |
| 5 | `infrastructure/scripts/init-neo4j-cluster.sh:9` | `NEO4J_PASSWORD:-cmdb_prod_password` | **Medium** — says "prod" |
| 6 | `README.md:75-76` | `neo4j / cmdb_password_dev`, `Admin123!` | Low — documented dev creds |

**Recommendation**: Items 4-5 should have their defaults changed from `*_prod_password` to `*_dev_password` to avoid confusion.

---

## Category 4: Internal Status Files to Remove/Archive

These files are internal development artifacts that add noise for open-source consumers.

| # | File | Recommendation |
|---|------|----------------|
| 1 | `AGENT_9_DELIVERY_SUMMARY.md` | Delete or move to `docs/archive/` |
| 2 | `CLEANUP_NOTES.md` | Delete or move to `docs/archive/` |
| 3 | `COMPREHENSIVE_AUDIT_REPORT.md` | Delete or move to `docs/archive/` |
| 4 | `CRITICAL_ITEMS_COMPLETED.md` | Delete or move to `docs/archive/` |
| 5 | `ETL_PIPELINE_GUIDE.md` | Move to `doc-site/` if useful, otherwise archive |
| 6 | `REMAINING_TASKS.md` | Delete or move to `docs/archive/` |
| 7 | `V3_COMPREHENSIVE_AUDIT.md` | Delete or move to `docs/archive/` |
| 8 | `V3_CRITICAL_ITEMS_SUMMARY.md` | Delete or move to `docs/archive/` |
| 9 | `V3_P0_COMPLETION_STATUS.md` | Delete or move to `docs/archive/` |
| 10 | `vulnerability-report.json` | Delete (regenerate with `npm audit --json`) |

---

## Category 5: Package.json Issues

### Missing License Field (22 packages)
The following packages need `"license": "Apache-2.0"` added:

- Root `package.json`
- `packages/api-server`
- `packages/ai-discovery`
- `packages/ai-ml-engine`
- `packages/data-mapper`
- `packages/database`
- `packages/discovery-engine`
- `packages/event-processor`
- `packages/integration-framework`
- `packages/integration-hub`
- `packages/identity-resolution`
- `packages/connectors/veeam`
- `packages/connectors/prometheus`
- `packages/connectors/infoblox`
- `packages/connectors/dynatrace`
- `packages/connectors/datadog`
- `packages/connectors/jira`
- `packages/connectors/servicenow`
- `packages/connectors/appdynamics`
- `packages/connectors/cisco-meraki`
- `packages/connectors/jamf`
- `packages/connectors/defender`
- `web-ui`

### Missing Repository Field (All 41 packages)
All package.json files need a `repository` field pointing to the public GitHub repo.

### Inconsistent Internal Dependency Styles
- 14 packages use `file:` path references (works in monorepo, breaks if published to npm)
- 20 packages use `*` wildcard (standard npm workspace convention)
- **Recommendation**: Leave as-is for now since this is a monorepo app, not a library. Document in CONTRIBUTING.md.

---

## Category 6: Clean Audit Results (No Action Needed)

The following categories were scanned and found clean:

- **Real customer names**: None found (no Cleveland Clinic, no hospital names, no client identifiers)
- **Hardcoded API keys/secrets**: None found (all placeholders)
- **Committed .env files**: None (only .env.example files in git)
- **Private npm registry references**: None found
- **Internal Slack/Jira/Confluence links**: None found (only placeholder webhook URLs)
- **Private IP addresses**: Only in test fixtures and documentation examples (expected)
- **RSA/private keys**: Only documentation format examples with `\n...` truncation

---

## Decision Log

Use this section to record your decisions on each item:

| Item | Decision | Date |
|------|----------|------|
| HappyConfig branding | | |
| Trademark disclaimers | | |
| Dev default passwords | | |
| Internal status files | | |
| Package.json license fields | | |
