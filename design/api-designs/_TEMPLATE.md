# [API Name] API Design

**Status:** Draft
**Created:** YYYY-MM-DD
**Updated:** YYYY-MM-DD
**Owner:** Your Name
**Target Version:** v2.x / v3.0

## Overview

Brief description of the API being designed (REST, GraphQL, WebSocket, etc.)

## Goals

- Goal 1: Provide CRUD operations for X
- Goal 2: Enable real-time updates for Y
- Goal 3: Support bulk operations for performance

## API Type

- [ ] REST API
- [ ] GraphQL API
- [ ] WebSocket API
- [ ] gRPC
- [ ] Webhook

## REST API Design

### Base URL

```
https://api.configbuddy.com/api/v2
```

### Authentication

```http
Authorization: Bearer <jwt_token>
X-API-Key: <api_key>
```

### Endpoints

#### 1. List Resources

```http
GET /api/v2/resources
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Items per page (default: 20, max: 100) |
| `filter` | string | No | Filter expression (e.g., `status:active`) |
| `sort` | string | No | Sort field (e.g., `created_at:desc`) |

**Request Example:**
```bash
curl -X GET "https://api.configbuddy.com/api/v2/resources?page=1&limit=20&filter=status:active" \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Accept: application/json"
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "res_123abc",
      "name": "Production Server",
      "type": "server",
      "status": "active",
      "created_at": "2025-10-12T10:30:00Z",
      "updated_at": "2025-10-12T15:45:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 157,
    "total_pages": 8
  },
  "links": {
    "self": "/api/v2/resources?page=1&limit=20",
    "next": "/api/v2/resources?page=2&limit=20",
    "prev": null,
    "first": "/api/v2/resources?page=1&limit=20",
    "last": "/api/v2/resources?page=8&limit=20"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing authentication
- `403 Forbidden`: Insufficient permissions
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

#### 2. Get Single Resource

```http
GET /api/v2/resources/:id
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Resource ID (e.g., `res_123abc`) |

**Request Example:**
```bash
curl -X GET "https://api.configbuddy.com/api/v2/resources/res_123abc" \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Accept: application/json"
```

**Response (200 OK):**
```json
{
  "id": "res_123abc",
  "name": "Production Server",
  "type": "server",
  "status": "active",
  "metadata": {
    "cpu_cores": 8,
    "memory_gb": 32,
    "os": "Ubuntu 22.04"
  },
  "relationships": {
    "applications": [
      { "id": "app_456def", "name": "API Server" }
    ],
    "databases": [
      { "id": "db_789ghi", "name": "PostgreSQL" }
    ]
  },
  "created_at": "2025-10-12T10:30:00Z",
  "updated_at": "2025-10-12T15:45:00Z"
}
```

**Error Responses:**
- `404 Not Found`: Resource does not exist
- `410 Gone`: Resource has been deleted

#### 3. Create Resource

```http
POST /api/v2/resources
```

**Request Body:**
```json
{
  "name": "Production Server",
  "type": "server",
  "status": "active",
  "metadata": {
    "cpu_cores": 8,
    "memory_gb": 32
  }
}
```

**Request Example:**
```bash
curl -X POST "https://api.configbuddy.com/api/v2/resources" \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Server",
    "type": "server",
    "status": "active"
  }'
```

**Response (201 Created):**
```json
{
  "id": "res_123abc",
  "name": "Production Server",
  "type": "server",
  "status": "active",
  "metadata": {
    "cpu_cores": 8,
    "memory_gb": 32
  },
  "created_at": "2025-10-12T16:00:00Z",
  "updated_at": "2025-10-12T16:00:00Z"
}
```

**Validation Rules:**
- `name`: Required, 1-255 characters
- `type`: Required, one of: `server`, `application`, `database`, `network-device`
- `status`: Optional, one of: `active`, `inactive`, `maintenance`

**Error Responses:**
- `400 Bad Request`: Invalid request body or validation failed
- `409 Conflict`: Resource with same name already exists

#### 4. Update Resource

```http
PUT /api/v2/resources/:id
PATCH /api/v2/resources/:id
```

**PUT**: Replace entire resource (all fields required)
**PATCH**: Update specific fields (partial update)

**Request Body (PATCH):**
```json
{
  "status": "maintenance",
  "metadata": {
    "maintenance_window": "2025-10-15T02:00:00Z"
  }
}
```

**Response (200 OK):**
```json
{
  "id": "res_123abc",
  "name": "Production Server",
  "type": "server",
  "status": "maintenance",
  "metadata": {
    "cpu_cores": 8,
    "memory_gb": 32,
    "maintenance_window": "2025-10-15T02:00:00Z"
  },
  "updated_at": "2025-10-12T16:30:00Z"
}
```

**Error Responses:**
- `404 Not Found`: Resource does not exist
- `422 Unprocessable Entity`: Invalid update data

#### 5. Delete Resource

```http
DELETE /api/v2/resources/:id
```

**Request Example:**
```bash
curl -X DELETE "https://api.configbuddy.com/api/v2/resources/res_123abc" \
  -H "Authorization: Bearer eyJhbGc..."
```

**Response (204 No Content):**
(Empty response body)

**Error Responses:**
- `404 Not Found`: Resource does not exist
- `409 Conflict`: Resource cannot be deleted (has dependencies)

#### 6. Bulk Operations

```http
POST /api/v2/resources/bulk
```

**Request Body:**
```json
{
  "operation": "update",
  "filters": {
    "type": "server",
    "status": "active"
  },
  "changes": {
    "metadata.patched": true,
    "metadata.patch_date": "2025-10-12"
  }
}
```

**Response (202 Accepted):**
```json
{
  "job_id": "job_abc123",
  "status": "processing",
  "estimated_duration": "30s",
  "resources_affected": 45,
  "links": {
    "status": "/api/v2/jobs/job_abc123"
  }
}
```

### Error Handling

#### Standard Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "name",
        "message": "Name is required"
      },
      {
        "field": "type",
        "message": "Type must be one of: server, application, database"
      }
    ],
    "request_id": "req_xyz789",
    "timestamp": "2025-10-12T16:45:00Z"
  }
}
```

#### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTHENTICATION_REQUIRED` | 401 | Missing or invalid authentication |
| `PERMISSION_DENIED` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `CONFLICT` | 409 | Resource conflict |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### Rate Limiting

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 985
X-RateLimit-Reset: 1634056800
```

**Limits:**
- Authenticated: 1000 requests/hour
- Unauthenticated: 100 requests/hour
- Bulk operations: 10 requests/hour

### Pagination

All list endpoints support pagination:

```
GET /api/v2/resources?page=2&limit=50
```

**Response Headers:**
```http
Link: </api/v2/resources?page=3&limit=50>; rel="next",
      </api/v2/resources?page=1&limit=50>; rel="prev",
      </api/v2/resources?page=1&limit=50>; rel="first",
      </api/v2/resources?page=10&limit=50>; rel="last"
```

### Filtering

```
GET /api/v2/resources?filter=status:active,type:server
```

**Supported Operators:**
- `:` - Equals
- `!:` - Not equals
- `>` - Greater than
- `<` - Less than
- `~` - Contains (fuzzy match)

### Sorting

```
GET /api/v2/resources?sort=created_at:desc,name:asc
```

## GraphQL API Design

### Schema

```graphql
type Query {
  resources(
    page: Int = 1
    limit: Int = 20
    filter: ResourceFilter
    sort: ResourceSort
  ): ResourceConnection!

  resource(id: ID!): Resource
}

type Mutation {
  createResource(input: CreateResourceInput!): Resource!
  updateResource(id: ID!, input: UpdateResourceInput!): Resource!
  deleteResource(id: ID!): DeleteResourcePayload!
}

type Subscription {
  resourceUpdated(id: ID): Resource!
}

type Resource {
  id: ID!
  name: String!
  type: ResourceType!
  status: ResourceStatus!
  metadata: JSON
  relationships: ResourceRelationships
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum ResourceType {
  SERVER
  APPLICATION
  DATABASE
  NETWORK_DEVICE
}

enum ResourceStatus {
  ACTIVE
  INACTIVE
  MAINTENANCE
}

input ResourceFilter {
  type: ResourceType
  status: ResourceStatus
  createdAfter: DateTime
  search: String
}

input ResourceSort {
  field: String!
  direction: SortDirection!
}

enum SortDirection {
  ASC
  DESC
}

type ResourceConnection {
  edges: [ResourceEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type ResourceEdge {
  node: Resource!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

### Example Queries

#### Query Resources

```graphql
query GetResources($filter: ResourceFilter, $page: Int) {
  resources(filter: $filter, page: $page, limit: 20) {
    edges {
      node {
        id
        name
        type
        status
        createdAt
      }
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
    }
    totalCount
  }
}
```

**Variables:**
```json
{
  "filter": {
    "type": "SERVER",
    "status": "ACTIVE"
  },
  "page": 1
}
```

#### Create Resource

```graphql
mutation CreateResource($input: CreateResourceInput!) {
  createResource(input: $input) {
    id
    name
    type
    status
    createdAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "name": "Production Server",
    "type": "SERVER",
    "status": "ACTIVE",
    "metadata": {
      "cpu_cores": 8,
      "memory_gb": 32
    }
  }
}
```

#### Subscribe to Updates

```graphql
subscription OnResourceUpdated($id: ID) {
  resourceUpdated(id: $id) {
    id
    name
    status
    updatedAt
  }
}
```

## WebSocket API Design

### Connection

```javascript
const ws = new WebSocket('wss://api.configbuddy.com/ws');

// Authentication
ws.send(JSON.stringify({
  type: 'auth',
  token: 'Bearer eyJhbGc...'
}));
```

### Message Format

```json
{
  "type": "message_type",
  "id": "unique_message_id",
  "timestamp": "2025-10-12T16:45:00Z",
  "data": {}
}
```

### Events

#### Resource Updated

```json
{
  "type": "resource.updated",
  "id": "msg_123",
  "timestamp": "2025-10-12T16:45:00Z",
  "data": {
    "resource_id": "res_123abc",
    "changes": {
      "status": { "old": "active", "new": "maintenance" }
    }
  }
}
```

## Webhook Design

### Configuration

```json
{
  "url": "https://your-app.com/webhooks/configbuddy",
  "events": ["resource.created", "resource.updated", "resource.deleted"],
  "secret": "whsec_abc123..."
}
```

### Payload

```json
{
  "id": "evt_123abc",
  "type": "resource.updated",
  "created": "2025-10-12T16:45:00Z",
  "data": {
    "object": {
      "id": "res_123abc",
      "name": "Production Server",
      "status": "maintenance"
    }
  }
}
```

### Signature Verification

```
X-ConfigBuddy-Signature: t=1634056800,v1=abc123...
```

## Request/Response Examples

### TypeScript Client Example

```typescript
import { ConfigBuddyClient } from '@configbuddy/sdk';

const client = new ConfigBuddyClient({
  apiKey: process.env.CONFIGBUDDY_API_KEY,
  baseUrl: 'https://api.configbuddy.com/api/v2'
});

// List resources
const resources = await client.resources.list({
  filter: { type: 'server', status: 'active' },
  page: 1,
  limit: 20
});

// Create resource
const resource = await client.resources.create({
  name: 'Production Server',
  type: 'server',
  status: 'active'
});

// Update resource
await client.resources.update('res_123abc', {
  status: 'maintenance'
});

// Delete resource
await client.resources.delete('res_123abc');
```

## Implementation Notes

### Package Location

- REST API: `/packages/api-server/src/routes/v2/`
- GraphQL: `/packages/api-server/src/graphql/schema/`
- Controllers: `/packages/api-server/src/controllers/v2/`
- Validators: `/packages/api-server/src/validators/v2/`

### Dependencies

- Express.js for REST API
- Apollo Server for GraphQL
- Socket.io for WebSocket
- Joi or Zod for validation
- JWT for authentication

### Testing Requirements

- [ ] Unit tests for all endpoints
- [ ] Integration tests with database
- [ ] API contract tests (Pact)
- [ ] Load testing (1000+ concurrent users)
- [ ] Security testing (OWASP Top 10)

## Security Considerations

- Rate limiting per user/API key
- Input validation and sanitization
- SQL injection prevention (parameterized queries)
- XSS prevention
- CORS configuration
- API key rotation
- Audit logging for all mutations

## Performance Requirements

- P50 latency < 50ms
- P95 latency < 200ms
- P99 latency < 500ms
- Throughput: 1000+ requests/second
- Uptime: 99.9%

## Versioning Strategy

- URI versioning: `/api/v2/resources`
- Backward compatibility for 2 major versions
- Deprecation warnings 6 months before removal
- Changelog documentation

## Documentation

- OpenAPI/Swagger spec: `/packages/api-server/openapi.yml`
- User guide: `/doc-site/docs/api/resources-api.md`
- Interactive API explorer: https://api.configbuddy.com/docs

## Related Documents

- Architecture: `/design/architecture/api-server.md`
- Specification: `/design/specifications/resource-management.md`

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| YYYY-MM-DD | Your Name | Initial API design |
| YYYY-MM-DD | Your Name | Added GraphQL schema |
| YYYY-MM-DD | Your Name | Implementation complete |
