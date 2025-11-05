# Dynatrace APM Connector

Multi-resource integration connector for Dynatrace Application Performance Monitoring.

## Overview

This connector extracts infrastructure and application monitoring data from Dynatrace using the Entities API v2. It supports four resource types with automatic relationship inference.

## Resources

### Hosts (enabled by default)
- **CI Type**: `server`
- **Entity Type**: `HOST`
- **Attributes**: OS type, version, CPU cores, memory, hypervisor, cloud type, monitoring mode
- **Relationships**: Hosts processes (via `runs` relationship)

### Processes (enabled by default)
- **CI Type**: `process`
- **Entity Type**: `PROCESS_GROUP_INSTANCE`
- **Attributes**: Process type, software technologies, listening ports, metadata
- **Relationships**: Runs on hosts (via `runsOn` relationship)

### Services (enabled by default)
- **CI Type**: `service`
- **Entity Type**: `SERVICE`
- **Attributes**: Service type, technology types, web service name/namespace, database info
- **Relationships**: Runs on processes (via `runs` relationship), calls other services (via `calls` relationship)

### Applications (enabled by default)
- **CI Type**: `application`
- **Entity Type**: `APPLICATION`
- **Attributes**: Application type, name, public domains, RUM enabled status
- **Relationships**: None

## Configuration

### Connection Settings

```json
{
  "environment_url": "https://abc12345.live.dynatrace.com",
  "api_token": "dt0c01.ABC123..."
}
```

**Required Permissions:**
- `entities.read` - Read entities
- `relationships.read` - Read relationships

### Resource Configuration

Each resource can be configured independently:

```json
{
  "enabled_resources": ["hosts", "processes", "services"],
  "resource_configs": {
    "hosts": {
      "pageSize": 500,
      "fields": "+properties,+tags,+toRelationships"
    },
    "processes": {
      "pageSize": 200,
      "fields": "+properties"
    }
  }
}
```

## API Details

### Endpoints Used

- `GET /api/v2/entities/types` - Test connection
- `GET /api/v2/entities` - Extract entities with entity selector

### Entity Selectors

- Hosts: `type("HOST")`
- Processes: `type("PROCESS_GROUP_INSTANCE")`
- Services: `type("SERVICE")`
- Applications: `type("APPLICATION")`

### Pagination

The connector handles pagination automatically using `nextPageKey` from responses. Maximum page size is 500 entities per request.

## Relationship Inference

Relationships are extracted from the `toRelationships` property of each entity:

| Dynatrace Type | CMDB Type | Description |
|----------------|-----------|-------------|
| `runsOn` | `RUNS_ON` | Process runs on host |
| `runs` | `HOSTS` | Host hosts process |
| `calls` | `CONNECTS_TO` | Service calls another service |
| `isInstanceOf` | `INSTANCE_OF` | Instance relationship |

## Environment Detection

The connector attempts to detect environment from:

1. **Tags**: `environment:production`, `env:staging`
2. **Properties**: `environment` property value
3. **Default**: Falls back to `production`

Supported environments: `production`, `staging`, `development`, `test`

## Status Determination

Entities are marked as `inactive` if `lastSeenTms` is older than 24 hours. Otherwise marked as `active`.

## Identification Attributes

Extracted identifiers for reconciliation:

- **external_id**: Dynatrace entity ID
- **hostname**: From `hostname` or `hostName` property
- **ip_address**: From `ipAddress` or `ipAddresses` property
- **fqdn**: From `fqdn` property
- **custom_identifiers**: Dynatrace ID and entity name

## Example Usage

```typescript
import DynatraceConnector from '@cmdb/connector-dynatrace';

const connector = new DynatraceConnector({
  name: 'Production Dynatrace',
  type: 'dynatrace',
  enabled: true,
  connection: {
    environment_url: 'https://abc12345.live.dynatrace.com',
    api_token: process.env.DYNATRACE_API_TOKEN,
  },
  enabled_resources: ['hosts', 'processes', 'services'],
});

// Initialize
await connector.initialize();

// Test connection
const testResult = await connector.testConnection();
console.log(testResult);

// Extract hosts
const hosts = await connector.extractResource('hosts');
console.log(`Extracted ${hosts.length} hosts`);

// Transform host data
for (const host of hosts) {
  const ci = await connector.transformResource('hosts', host.data);
  console.log(ci);
}

// Extract relationships
const relationships = await connector.extractRelationships();
console.log(`Found ${relationships.length} relationships`);
```

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch
```

## Notes

- Confidence score: 95 (high confidence from APM monitoring)
- Incremental sync: Not supported (full sync only)
- Bi-directional: Not supported (read-only)
- Rate limiting: 10 requests/second default
- Entity cache: Used for relationship inference across resources

## References

- [Dynatrace Entities API v2](https://www.dynatrace.com/support/help/dynatrace-api/environment-api/entity-v2)
- [Entity Selector](https://www.dynatrace.com/support/help/dynatrace-api/basics/dynatrace-api-authentication)
