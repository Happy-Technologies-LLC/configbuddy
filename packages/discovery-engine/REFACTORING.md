# Discovery Engine API Refactoring

## Overview

The discovery engine has been refactored to use the API server instead of making direct Neo4j database calls. This ensures all CI changes flow through the audit middleware for proper logging and tracking.

## Changes Made

### 1. Created Internal API Client (`src/api/internal-api-client.ts`)

A new `InternalAPIClient` class was created to handle communication between the discovery engine and the API server:

- **Purpose**: Abstracts API calls for CI operations (create, update, get)
- **Features**:
  - Automatic retry handling via axios
  - Error logging and transformation
  - Audit trail support via `x-actor` header
  - Singleton pattern for instance management

### 2. Updated Discovery Orchestrator (`src/orchestrator/discovery-orchestrator.ts`)

**Before:**
```typescript
import { getNeo4jClient } from '@cmdb/database';

export class DiscoveryOrchestrator {
  private neo4jClient = getNeo4jClient();

  private async persistCIs(cis: DiscoveredCI[]): Promise<void> {
    // Direct Neo4j calls - bypasses audit middleware
    const existing = await this.neo4jClient.getCI(ci._id);
    if (existing) {
      await this.neo4jClient.updateCI(ci._id, { ... });
    } else {
      await this.neo4jClient.createCI(ci);
    }
  }
}
```

**After:**
```typescript
import { getInternalAPIClient } from '../api/internal-api-client';

export class DiscoveryOrchestrator {
  private apiClient = getInternalAPIClient();

  private async persistCIs(cis: DiscoveredCI[]): Promise<void> {
    // API calls - flows through audit middleware
    const existing = await this.apiClient.getCI(ci._id);
    if (existing) {
      await this.apiClient.updateCI(ci._id, ci);
    } else {
      await this.apiClient.createCI(ci);
    }
  }
}
```

### 3. Added Dependencies

Added `axios` to `package.json`:
```json
"dependencies": {
  ...
  "axios": "^1.6.0"
}
```

### 4. Updated Package Exports

Added API client to `src/index.ts` exports:
```typescript
export { InternalAPIClient, getInternalAPIClient } from './api/internal-api-client';
```

## Configuration

### Environment Variables

**`CMDB_API_URL`** (optional)
- **Description**: Base URL for the CMDB API server
- **Default**: `http://localhost:3000`
- **Example**: `CMDB_API_URL=https://cmdb-api.company.com`

### API Endpoints Used

The internal API client calls these endpoints:

1. **Create CI**: `POST /api/v1/cis`
2. **Update CI**: `PUT /api/v1/cis/:id`
3. **Get CI**: `GET /api/v1/cis/:id`

All requests include the header `x-actor: discovery-engine` to identify the source in audit logs.

## Audit Trail

With this refactoring, all CI changes made by the discovery engine now flow through the audit middleware:

### Actor Identification

The audit middleware extracts the actor from:
```typescript
const actor = req.user?.username || req.headers['x-actor'] || 'system';
const actorType = req.user ? 'user' : 'system';
```

For discovery engine operations:
- **actor**: `"discovery-engine"`
- **actorType**: `"system"`

### Audit Log Entries

Discovery operations will now create audit log entries in PostgreSQL:

```sql
SELECT * FROM audit_log
WHERE actor = 'discovery-engine'
ORDER BY created_at DESC;
```

Example audit entry:
```json
{
  "id": "audit-123",
  "entity_type": "ci",
  "entity_id": "aws-i-123456789",
  "action": "create",
  "actor": "discovery-engine",
  "actor_type": "system",
  "before_state": null,
  "after_state": {
    "id": "aws-i-123456789",
    "name": "prod-web-01",
    "type": "virtual-machine",
    "metadata": {
      "discovery_job_id": "job-456",
      "discovery_provider": "aws",
      "confidence_score": 0.95
    }
  },
  "created_at": "2025-10-03T10:30:00Z"
}
```

## Benefits

1. **Audit Trail**: All discovery operations are now logged with proper audit entries
2. **Consistency**: Discovery engine uses the same code path as API consumers
3. **Validation**: API validation middleware ensures data integrity
4. **Error Handling**: Centralized error handling through API layer
5. **Monitoring**: API metrics now include discovery engine operations
6. **Security**: Follows established authentication/authorization patterns

## Testing

### Unit Tests

Run the test suite:
```bash
npm test src/api/__tests__/internal-api-client.test.ts
```

Tests cover:
- CI creation with discovery metadata
- CI updates with last_discovered_at timestamp
- Error handling (404, 500, network errors)
- Configuration (default URL, custom URL)
- Header inclusion (x-actor)

### Integration Testing

To test the full flow:

1. Start the API server:
   ```bash
   cd packages/api-server
   npm run dev
   ```

2. Trigger a discovery job:
   ```bash
   curl -X POST http://localhost:3000/api/v1/discovery/trigger \
     -H "Content-Type: application/json" \
     -d '{"provider": "aws", "config": {...}}'
   ```

3. Check audit logs:
   ```bash
   curl http://localhost:3000/api/v1/cis/{ci_id}/audit
   ```

## Backwards Compatibility

This refactoring maintains backwards compatibility:

- All public APIs of `DiscoveryOrchestrator` remain unchanged
- Discovery workers continue to work without modification
- Queue processing logic is unchanged

## Migration Notes

### For Developers

No changes required for existing code that uses the discovery engine. The refactoring is internal to the `discovery-engine` package.

### For Operations

1. **Update environment variables** (if using custom API URL):
   ```bash
   export CMDB_API_URL=http://your-api-server:3000
   ```

2. **Install dependencies**:
   ```bash
   npm install  # or pnpm install
   ```

3. **Rebuild the package**:
   ```bash
   npm run build
   ```

## Future Improvements

Potential enhancements:

1. **Batch Operations**: Add bulk create/update API endpoints for better performance
2. **Retry Logic**: Implement exponential backoff for failed API calls
3. **Circuit Breaker**: Add circuit breaker pattern for API resilience
4. **Caching**: Cache GET requests to reduce API load
5. **Health Checks**: Implement periodic health checks of API server
