# Companion Repository Extractions

These directories contain staged file copies for two planned companion repositories.
Files are **copies** of sources from the main monorepo — the originals are untouched.
Review before creating the separate repos.

---

## 1. Connector SDK (`extract-connector-sdk/`)

**Target repo**: `configbuddy-connector-sdk`
**Purpose**: Standalone SDK for building ConfigBuddy integration connectors (TypeScript + JSON-only)

### Contents

```
extract-connector-sdk/README.md
extract-connector-sdk/common-types/ci.types.ts
extract-connector-sdk/common-types/discovery.types.ts
extract-connector-sdk/common-types/unified-credential.types.ts
extract-connector-sdk/data-mapper/src/engine/expression-evaluator.ts
extract-connector-sdk/data-mapper/src/engine/transformation-engine.ts
extract-connector-sdk/data-mapper/src/index.ts
extract-connector-sdk/data-mapper/src/types/transformation.types.ts
extract-connector-sdk/examples/datadog-typescript/connector.json
extract-connector-sdk/examples/datadog-typescript/package.json
extract-connector-sdk/examples/datadog-typescript/src/index.test.ts
extract-connector-sdk/examples/datadog-typescript/src/index.ts
extract-connector-sdk/examples/datadog-typescript/tsconfig.json
extract-connector-sdk/examples/zendesk-json-only/connector.json
extract-connector-sdk/integration-framework/src/core/base-connector.ts
extract-connector-sdk/integration-framework/src/core/integration-manager.ts
extract-connector-sdk/integration-framework/src/executor/connector-executor.ts
extract-connector-sdk/integration-framework/src/index.ts
extract-connector-sdk/integration-framework/src/installer/connector-installer.ts
extract-connector-sdk/integration-framework/src/registry/connector-registry.ts
extract-connector-sdk/integration-framework/src/types/connector.types.ts
extract-connector-sdk/package.json
```

### Source Packages
- `packages/integration-framework/` — Base connector framework, auth adapters, registry, installer
- `packages/data-mapper/` — Field mapping and transformation engine
- `packages/common/src/types/` — Shared type definitions (CI, discovery, credential)
- `packages/connectors/zendesk/` — JSON-only connector example
- `packages/connectors/datadog/` — TypeScript connector example

### Next Steps
1. Review staged files in `extract-connector-sdk/`
2. Create new GitHub repo: `nickzitzer/configbuddy-connector-sdk`
3. Copy files, initialize git, push
4. Update import paths to be self-contained (remove `@cmdb/*` internal refs)
5. Publish to npm as `@configbuddy/connector-sdk`

---

## 2. AI Discovery Module (`extract-ai-discovery/`)

**Target repo**: `configbuddy-ai-discovery`
**Purpose**: Standalone AI-powered infrastructure discovery with LLM pattern learning

### Contents

```
extract-ai-discovery/README.md
extract-ai-discovery/package.json
extract-ai-discovery/packages/ai-discovery/src/ai-agent-coordinator.ts
extract-ai-discovery/packages/ai-discovery/src/hybrid-discovery-orchestrator.ts
extract-ai-discovery/packages/ai-discovery/src/index.ts
extract-ai-discovery/packages/ai-discovery/src/pattern-analyzer.ts
extract-ai-discovery/packages/ai-discovery/src/pattern-cache.service.ts
extract-ai-discovery/packages/ai-discovery/src/pattern-compiler.ts
extract-ai-discovery/packages/ai-discovery/src/pattern-matcher.ts
extract-ai-discovery/packages/ai-discovery/src/pattern-storage.ts
extract-ai-discovery/packages/ai-discovery/src/pattern-validator.ts
extract-ai-discovery/packages/ai-discovery/src/pattern-workflow.ts
extract-ai-discovery/packages/ai-discovery/src/providers/anthropic-provider.ts
extract-ai-discovery/packages/ai-discovery/src/providers/base-provider.ts
extract-ai-discovery/packages/ai-discovery/src/providers/custom-provider.ts
extract-ai-discovery/packages/ai-discovery/src/providers/index.ts
extract-ai-discovery/packages/ai-discovery/src/providers/openai-provider.ts
extract-ai-discovery/packages/ai-discovery/src/tools/http-tool.ts
extract-ai-discovery/packages/ai-discovery/src/tools/index.ts
extract-ai-discovery/packages/ai-discovery/src/tools/nmap-tool.ts
extract-ai-discovery/packages/ai-discovery/src/tools/ssh-tool.ts
extract-ai-discovery/packages/ai-discovery/src/types.ts
extract-ai-discovery/packages/ai-ml-engine/src/engines/anomaly-detection-engine.ts
extract-ai-discovery/packages/ai-ml-engine/src/engines/architecture-optimization-engine.ts
extract-ai-discovery/packages/ai-ml-engine/src/engines/configuration-drift-detector.ts
extract-ai-discovery/packages/ai-ml-engine/src/engines/impact-prediction-engine.ts
extract-ai-discovery/packages/ai-ml-engine/src/index.ts
extract-ai-discovery/packages/ai-ml-engine/src/types/anomaly.types.ts
extract-ai-discovery/packages/ai-ml-engine/src/types/architecture.types.ts
extract-ai-discovery/packages/ai-ml-engine/src/types/impact.types.ts
extract-ai-discovery/packages/common/src/types/audit.types.ts
extract-ai-discovery/packages/common/src/types/ci.types.ts
extract-ai-discovery/packages/common/src/types/datamart.types.ts
extract-ai-discovery/packages/common/src/types/discovery.types.ts
extract-ai-discovery/packages/common/src/types/index.ts
extract-ai-discovery/packages/common/src/types/job.types.ts
extract-ai-discovery/packages/common/src/types/relationship.types.ts
extract-ai-discovery/packages/common/src/types/unified-credential.types.ts
```

### Source Packages
- `packages/ai-discovery/` — LLM-based discovery, pattern compiler/matcher/validator, hybrid orchestrator
- `packages/ai-ml-engine/` — Anomaly detection, drift detection, impact prediction engines
- `packages/common/src/types/` — Shared type definitions

### Key Feature: Pattern Learning Pipeline
1. AI discovers infrastructure using LLM (Anthropic/OpenAI)
2. Successful discoveries are compiled into deterministic patterns
3. Patterns replay at 10x speed with zero LLM cost
4. System falls back to AI only for unknown infrastructure

### Next Steps
1. Review staged files in `extract-ai-discovery/`
2. Create new GitHub repo: `nickzitzer/configbuddy-ai-discovery`
3. Copy files, initialize git, push
4. Update import paths to be self-contained
5. Publish to npm as `@configbuddy/ai-discovery`

---

## Notes

- These extractions are **staging copies only** — git history is not split
- Internal `@cmdb/*` imports will need to be updated to standalone paths before publishing
- Both packages should reference the main ConfigBuddy repo in their README
- Consider using `git filter-branch` or `git subtree split` if you want to preserve commit history
