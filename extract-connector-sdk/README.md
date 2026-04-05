# @configbuddy/connector-sdk

SDK for building ConfigBuddy integration connectors. This package provides the core framework, data mapping engine, and shared types needed to create connectors that integrate external systems with ConfigBuddy's Configuration Management Database.

## Contents

| Directory | Description |
|-----------|-------------|
| `integration-framework/src/` | Core connector framework: auth adapters, registry, installer, executor, and type definitions |
| `data-mapper/src/` | Field mapping and transformation engine used by connectors to convert external data into ConfigBuddy CI format |
| `common-types/` | Shared TypeScript type definitions for CIs, discovery jobs, and credentials |
| `examples/` | Example connectors (JSON-only and TypeScript) |

## Connector Types

ConfigBuddy supports two connector styles:

### JSON-Only Connectors

For straightforward REST API integrations with standard authentication. Define a single `connector.json` with endpoint URLs, auth config, pagination, and field mappings. No code required.

See `examples/zendesk-json-only/connector.json` for a working example.

### TypeScript Connectors

For complex integrations requiring custom logic such as OAuth2 flows, advanced data transformations, incremental sync, or vendor SDK usage. Implement the `IConnector` interface and return `DiscoveredCI[]` objects.

See `examples/datadog-typescript/` for a working example.

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Build the SDK:

```bash
npm run build
```

3. Create a new connector:
   - **JSON-only**: Create a directory with a `connector.json` file following the schema in the zendesk example.
   - **TypeScript**: Create a directory with `connector.json`, `package.json`, `tsconfig.json`, and a `src/` directory implementing the `IConnector` interface from `integration-framework/src/types/`.

## Key Interfaces

- **IConnector** (`integration-framework/src/types/`) - Main connector interface to implement for TypeScript connectors
- **DiscoveredCI** (`common-types/ci.types.ts`) - Configuration Item type returned by discovery
- **UnifiedCredential** (`common-types/unified-credential.types.ts`) - Credential types for authentication

## License

Apache-2.0
