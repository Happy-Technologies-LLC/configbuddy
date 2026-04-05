# ConfigBuddy Open-Source Release Checklist

**Generated**: 2026-04-05
**Status**: Pre-release

---

## Automated (Done by this PR)

- [x] LICENSE file created (Apache 2.0)
- [x] NOTICE file created (third-party attribution + trademark notices)
- [x] Apache 2.0 license headers added to 747 source files
- [x] All 44 package.json files updated with `"license": "Apache-2.0"`
- [x] SECURITY.md created
- [x] CODE_OF_CONDUCT.md created (Contributor Covenant v2.1)
- [x] CONTRIBUTING.md created
- [x] CLA.md created (Individual CLA)
- [x] CLA GitHub Actions workflow created (`.github/workflows/cla.yml`)
- [x] GitHub issue templates created (bug report, feature request)
- [x] GitHub PR template created
- [x] README.md rewritten for open-source audience
- [x] REVIEW.md created with all flagged items for owner decision
- [x] Connector SDK extraction staged (`extract-connector-sdk/`)
- [x] AI Discovery extraction staged (`extract-ai-discovery/`)
- [x] EXTRACTIONS.md created with manifests
- [x] Pre-publish audit completed (no secrets, no customer names, no private registries)

---

## Manual Steps Required Before Going Public

### Critical (Must Do)

- [ ] **Review REVIEW.md** — Decide on each flagged item (branding, trademarks, dev passwords)
- [ ] **Rename HappyConfig -> ConfigBuddy** in 14 files listed in REVIEW.md Category 1
  - Scripts, Terraform modules, nginx.conf, .env.example, neo4j seed data
- [ ] **Run `npm install` and `npm run test:unit`** — Verify tests pass with license headers
- [ ] **Run `npm audit`** — Review and address dependency vulnerabilities
  - Upgrade `@kubernetes/client-node` to ^1.4.0 if not already resolved
  - Replace deprecated `vm2` with `node:vm` in `packages/ai-discovery/`
  - Consider npm `overrides` for transitive issues (xml2js, tough-cookie)
- [ ] **Set up CLA token** — Create GitHub Personal Access Token for CLA bot
  - Add as repo secret: `CLA_TOKEN`
  - See: https://github.com/contributor-assistant/github-action#setting-up

### GitHub Repository Settings

- [ ] **Repository visibility**: Change from private to public
- [ ] **Branch protection** on `main`:
  - Require pull request reviews (1+ reviewer)
  - Require status checks to pass (test.yml)
  - Require CLA check to pass
  - Require branches to be up to date
- [ ] **Enable GitHub Security Advisories** (Settings > Security)
- [ ] **Enable Dependabot** alerts and security updates
- [ ] **Set repository topics**: `cmdb`, `configuration-management`, `neo4j`, `typescript`, `itsm`, `infrastructure`, `discovery`, `ai`
- [ ] **Add repository description**: "Open-source CMDB with graph-based relationships, AI discovery, and 43 integration connectors"
- [ ] **Set default branch** to `main`
- [ ] **Enable GitHub Discussions** if you want community Q&A

### DNS / External

- [ ] **Verify email addresses** referenced in docs:
  - `security@happy-tech.biz` (SECURITY.md)
  - `conduct@happy-tech.biz` (CODE_OF_CONDUCT.md)
  - `commercial@happy-tech.biz` (README.md)
  - `community@happy-tech.biz` (CONTRIBUTING.md)
- [ ] **Set up happy-tech.biz email routing** if not already done

### Cleanup (Recommended)

- [ ] **Archive internal status files** — Move to `docs/archive/` or delete:
  - AGENT_9_DELIVERY_SUMMARY.md
  - CLEANUP_NOTES.md
  - COMPREHENSIVE_AUDIT_REPORT.md
  - CRITICAL_ITEMS_COMPLETED.md
  - ETL_PIPELINE_GUIDE.md (or move to doc-site)
  - REMAINING_TASKS.md
  - V3_COMPREHENSIVE_AUDIT.md
  - V3_CRITICAL_ITEMS_SUMMARY.md
  - V3_P0_COMPLETION_STATUS.md
  - vulnerability-report.json
- [ ] **Remove this file** (RELEASE_CHECKLIST.md) after completing all items
- [ ] **Remove REVIEW.md** after acting on all items
- [ ] **Remove EXTRACTIONS.md** after creating companion repos (or keep for reference)

### Companion Repositories (After Main Release)

- [ ] **Create `configbuddy-connector-sdk` repo** from `extract-connector-sdk/`
  - Update internal `@cmdb/*` imports to standalone paths
  - Add LICENSE, README (already staged)
  - Push to GitHub
  - Publish to npm as `@configbuddy/connector-sdk`
- [ ] **Create `configbuddy-ai-discovery` repo** from `extract-ai-discovery/`
  - Update internal `@cmdb/*` imports to standalone paths
  - Add LICENSE, README (already staged)
  - Push to GitHub
  - Publish to npm as `@configbuddy/ai-discovery`
- [ ] **Update main README** links to companion repos once they exist

### Post-Release

- [ ] **Create GitHub Release** (v3.0.0) with release notes
- [ ] **Create CHANGELOG.md** documenting v1.0 -> v2.0 -> v3.0 changes
- [ ] **Announce** on relevant channels (Hacker News, Reddit r/devops, Twitter/X)
- [ ] **Monitor** issues and PRs for first 2 weeks
- [ ] **Set up Husky pre-commit hooks** (`npx husky install`, add lint-staged)
