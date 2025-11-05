# AppDynamics APM Connector

Multi-resource integration connector for AppDynamics Application Performance Monitoring, enabling automatic discovery of applications, tiers, nodes, and backend dependencies.

## Features

- **Multi-Resource Support**: Discover applications, tiers, nodes, and backends
- **Relationship Inference**: Automatically infers relationships between discovered entities
- **Flexible Filtering**: Filter by tier types, backend types, and activity status
- **High Confidence**: 85-95% confidence scores based on APM data quality
- **Batch Processing**: Efficient extraction across multiple applications

## Resources

### Applications (`applications`)
Business applications monitored by AppDynamics.

**CI Type**: `application`

**Configuration**:
- `include_inactive` (boolean): Include inactive applications (default: false)

**Extracted Data**:
- Application ID, name, description
- Active/inactive status

### Tiers (`tiers`)
Logical tiers within applications (web, business logic, database layers).

**CI Type**: `service`

**Configuration**:
- `tier_types` (array): Filter by tier types (e.g., ["Application Server", "Database"])

**Extracted Data**:
- Tier ID, name, description
- Tier type, agent type
- Number of nodes in tier
- Associated application

### Nodes (`nodes`)
Runtime nodes (JVMs, .NET processes, etc.) running application components.

**CI Type**: `server`

**Configuration**:
- `include_historical` (boolean): Include historical (disconnected) nodes (default: false)

**Extracted Data**:
- Node ID, name, type
- Associated tier and application
- Machine information (name, OS type, machine ID)
- Agent versions
- IP addresses
- Host details

### Backends (`backends`)
External dependencies discovered by AppDynamics (databases, web services, message queues).

**CI Type**: `service`

**Configuration**:
- `backend_types` (array): Filter by backend types (e.g., ["DB", "HTTP", "CACHE"])

**Extracted Data**:
- Backend ID, name
- Exit point type (DB, HTTP, CACHE, MESSAGING, etc.)
- Backend properties (host, port, etc.)
- Associated tier and application

**Backend Type Mapping**:
- `DB` → database
- `HTTP`, `WEB_SERVICE` → web_service
- `CACHE` → cache
- `MESSAGING`, `JMS`, `RABBITMQ`, `KAFKA` → message_queue
- `CASSANDRA`, `MONGODB` → database
- Unknown types → external

## Relationships

The connector automatically infers the following relationships:

1. **Nodes → Tiers** (`BELONGS_TO`)
   - Links runtime nodes to their parent tier

2. **Tiers → Applications** (`BELONGS_TO`)
   - Links tiers to their parent application

## Configuration

### Connection Schema

```json
{
  "controller_url": "https://company.saas.appdynamics.com",
  "account_name": "customer1",
  "username": "apiuser",
  "password": "your-password"
}
```

**Authentication**: Uses HTTP Basic Auth with `username@account_name` format.

### Example Configuration

```typescript
{
  name: "Production AppDynamics",
  type: "appdynamics",
  enabled: true,
  connection: {
    controller_url: "https://acme.saas.appdynamics.com",
    account_name: "acme",
    username: "api-user",
    password: "secret-password"
  },
  enabled_resources: ["applications", "tiers", "nodes", "backends"],
  resource_configs: {
    applications: {
      include_inactive: false
    },
    tiers: {
      tier_types: ["Application Server", "Database"]
    },
    nodes: {
      include_historical: false
    },
    backends: {
      backend_types: ["DB", "HTTP", "CACHE"]
    }
  }
}
```

## API Endpoints Used

- `GET /controller/rest/applications` - List applications
- `GET /controller/rest/applications/{appId}/tiers` - List tiers
- `GET /controller/rest/applications/{appId}/nodes` - List nodes
- `GET /controller/rest/applications/{appId}/backends` - List backends

## Identification Attributes

### Applications
- External ID: `app-{id}`
- Custom identifiers: `appdynamics_app_id`, `appdynamics_app_name`

### Tiers
- External ID: `tier-{appId}-{id}`
- Custom identifiers: `appdynamics_tier_id`, `appdynamics_app_id`, `tier_name`

### Nodes
- External ID: `node-{appId}-{id}`
- Hostname: Node name
- IP addresses: Extracted from node metadata
- Custom identifiers: `appdynamics_node_id`, `appdynamics_machine_id`, `appdynamics_app_id`

### Backends
- External ID: `backend-{appId}-{id}`
- Custom identifiers: `appdynamics_backend_id`, `appdynamics_app_id`, `backend_type`

## Usage Example

```typescript
import AppDynamicsConnector from '@cmdb/connector-appdynamics';

const connector = new AppDynamicsConnector({
  name: 'AppDynamics Production',
  type: 'appdynamics',
  enabled: true,
  connection: {
    controller_url: 'https://acme.saas.appdynamics.com',
    account_name: 'acme',
    username: 'api-user',
    password: 'secret',
  },
  enabled_resources: ['applications', 'nodes'],
});

// Initialize
await connector.initialize();

// Test connection
const testResult = await connector.testConnection();
console.log(testResult); // { success: true, ... }

// Extract applications
const apps = await connector.extractResource('applications');
console.log(`Found ${apps.length} applications`);

// Extract nodes
const nodes = await connector.extractResource('nodes');
console.log(`Found ${nodes.length} nodes`);

// Extract relationships
const relationships = await connector.extractRelationships();
console.log(`Found ${relationships.length} relationships`);

// Run full pipeline
await connector.run();
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode
npm run dev
```

## Testing

The connector includes comprehensive tests covering:
- Connection testing
- Resource extraction (all 4 resources)
- Filtering and configuration options
- Relationship inference
- Transformation logic
- Error handling
- Backend type mapping

Run tests with:
```bash
npm test
```

## Confidence Scores

- Applications: 95% (authoritative APM data)
- Tiers: 95% (authoritative APM data)
- Nodes: 90% (includes runtime metadata)
- Backends: 85% (inferred from traffic patterns)

## Limitations

1. **Environment Detection**: AppDynamics doesn't provide environment information, so all CIs default to "production"
2. **Historical Nodes**: Nodes that have disconnected may lack complete metadata
3. **Backend Details**: Backend information is limited to what AppDynamics can infer from traffic patterns
4. **Rate Limiting**: AppDynamics Controller has rate limits; use appropriate batch sizes

## Version

**Version**: 1.0.0

**Integration Framework**: 3.0 (multi-resource architecture)

## License

MIT
