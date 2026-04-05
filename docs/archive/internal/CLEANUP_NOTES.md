# Code Cleanup Notes - v3.0 Dashboard Migration

## ✅ Completed Cleanup

### Removed Files
- `web-ui/src/graphql/queries/dashboard.queries.ts` - GraphQL dashboard queries (replaced with REST)

### Modified Files
- `web-ui/package.json` - Re-added `@apollo/client` and `graphql` (still needed for connectors)
- `web-ui/src/main.tsx` - Removed `ApolloProvider` wrapper (dashboards no longer use GraphQL)
- `web-ui/src/hooks/useDashboardData.ts` - Replaced GraphQL hooks with React Query/REST
- `web-ui/src/services/dashboard.service.ts` - NEW: REST API client for dashboards
- Dashboard components - Fixed TypeScript type assertions for strict null checks

### Backend Implementation
- `packages/api-server/src/services/dashboard.service.ts` - NEW: Data aggregation from Neo4j
- `packages/api-server/src/rest/controllers/dashboard.controller.ts` - NEW: REST endpoints
- `packages/api-server/src/rest/routes/dashboard.routes.ts` - NEW: Route definitions
- `packages/api-server/src/rest/server.ts` - Registered dashboard routes

## ⚠️ Remaining GraphQL Code (Future Cleanup)

### Files Still Using GraphQL

**1. `web-ui/src/services/graphql.ts` (300 lines)**
- Apollo Client setup
- Common GraphQL queries for CIs, relationships, discovery jobs
- **Status**: Used by connector.service.ts
- **Action Needed**: Convert to REST or remove entirely

**2. `web-ui/src/services/connector.service.ts` (863 lines)**
- Uses GraphQL for connector registry and installation
- Imported by 8 component files:
  - `ConnectorInstallWizard.tsx`
  - `ConnectorDetailModal.tsx`
  - `ConnectorCard.tsx`
  - `ConnectorCatalog.tsx` (2 files)
  - `ConnectorConfigDetail.tsx`
  - `InstalledConnectors.tsx`
  - `ResourceSelector.tsx`

**Status**: REST API endpoints already exist:
- `/api/v1/connectors`
- `/api/v1/connector-configs`

**Recommendation**: Refactor connector.service.ts to use REST API instead of GraphQL. This would allow complete removal of Apollo Client.

### Impact Analysis

**If we remove graphql.ts without refactoring connector.service.ts:**
- ❌ Connector catalog will break
- ❌ Connector installation will break
- ❌ 8 component files affected

**If we refactor connector.service.ts to REST:**
- ✅ Can remove graphql.ts completely
- ✅ Can remove `web-ui/src/graphql/` directory entirely
- ✅ Consistent API pattern across entire frontend
- ✅ No Apollo Client dependency needed

## Recommended Next Steps

1. **Create REST-based connector service**:
   ```typescript
   // web-ui/src/services/connector.service.ts (new REST version)
   import apiClient from './api.client';

   class ConnectorService {
     async getRegistry() {
       return apiClient.get('/connectors/registry');
     }

     async install(connectorType: string, version: string) {
       return apiClient.post('/connectors/install', { connectorType, version });
     }

     // ... etc
   }
   ```

2. **Update 8 component files** to use new REST service (no breaking changes to component interfaces)

3. **Remove GraphQL infrastructure**:
   - Delete `web-ui/src/graphql/` directory
   - Delete `web-ui/src/services/graphql.ts`
   - Verify no remaining `@apollo/client` imports

4. **Test connector functionality**:
   - Connector catalog browsing
   - Connector installation
   - Connector configuration

## Decision Points

### Keep GraphQL for Connectors?
**Pros:**
- Already working
- No refactor needed
- Minimal risk

**Cons:**
- Dual API architecture (REST + GraphQL)
- Apollo Client dependency for one feature
- Inconsistent with rest of application

### Migrate to REST?
**Pros:**
- Single API pattern
- Remove Apollo Client entirely
- Consistent with dashboard migration
- Easier to maintain

**Cons:**
- Requires refactoring 1 service + 8 components
- Testing effort
- Short-term risk

**Recommendation:** Migrate to REST for architectural consistency, but can be done as a separate task after v3.0 dashboard release.
