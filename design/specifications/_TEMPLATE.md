# [Feature Name]

**Status:** Draft
**Created:** YYYY-MM-DD
**Updated:** YYYY-MM-DD
**Owner:** Your Name
**Target Version:** v2.x / v3.0

## Overview

Brief 2-3 sentence description of what this feature does and why it's needed.

## User Story

As a [type of user], I want [goal] so that [benefit].

**Example:**
> As a CMDB administrator, I want to configure custom retention policies for discovery data so that I can comply with data governance requirements while optimizing storage costs.

## Problem Statement

What problem does this solve? What pain points exist today?

- Problem 1: Description
- Problem 2: Description
- Problem 3: Description

## Requirements

### Functional Requirements

What must the feature do?

1. **Requirement 1**: Description
   - Acceptance criteria 1
   - Acceptance criteria 2

2. **Requirement 2**: Description
   - Acceptance criteria 1
   - Acceptance criteria 2

3. **Requirement 3**: Description
   - Acceptance criteria 1
   - Acceptance criteria 2

### Non-Functional Requirements

Performance, security, scalability, etc.

- **Performance**: Response time < 200ms for API calls
- **Scalability**: Support 10,000+ concurrent users
- **Security**: Encrypt sensitive data at rest and in transit
- **Availability**: 99.9% uptime SLA
- **Maintainability**: Code coverage > 80%

## Use Cases

### Use Case 1: [Title]

**Actor:** Who performs this action?
**Preconditions:** What must be true before this happens?
**Steps:**
1. User does X
2. System responds with Y
3. User confirms Z

**Expected Outcome:** What should happen?
**Alternative Flows:** What if something goes wrong?

### Use Case 2: [Title]

(Repeat format above)

## Design Constraints

What limitations or constraints exist?

- Must integrate with existing connector framework
- Cannot break backward compatibility with v2.0 APIs
- Must use PostgreSQL (no new database dependencies)
- Performance budget: Add < 50ms to request latency

## Dependencies

What other features, systems, or packages does this depend on?

- Requires: `@cmdb/database` v2.0+
- Integrates with: Discovery Engine, Credential System
- Depends on: PostgreSQL 15+, Neo4j 5+

## Out of Scope

What will NOT be included in this feature?

- Real-time notifications (will be added in v3.1)
- Mobile app support (future consideration)
- Legacy v1.0 connector support

## Success Criteria

How do we know this feature is successful?

- [ ] All functional requirements met
- [ ] Performance benchmarks passed
- [ ] 80%+ test coverage
- [ ] Documentation complete
- [ ] User acceptance testing passed
- [ ] No P1/P0 bugs in production for 2 weeks

## Implementation Notes

Any specific technical guidance for Claude Code?

- Use TypeScript strict mode
- Follow existing connector pattern in `/packages/connectors/`
- Add integration tests using test containers
- Update GraphQL schema in `/packages/api-server/src/graphql/schema/`
- Follow SPARC methodology (Specification → Pseudocode → Architecture → Refinement → Completion)

## Examples

Provide concrete examples of how this feature works.

### Example 1: API Request

```bash
curl -X POST http://localhost:3000/api/v1/feature \
  -H "Content-Type: application/json" \
  -d '{
    "param1": "value1",
    "param2": "value2"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "status": "completed"
  }
}
```

### Example 2: UI Interaction

Description of user interaction with screenshots/wireframes if available.

### Example 3: Configuration

```yaml
# config.yml
feature:
  enabled: true
  options:
    - option1: value1
    - option2: value2
```

## Testing Strategy

How should this feature be tested?

### Unit Tests
- Test business logic in isolation
- Mock external dependencies
- Target: 80%+ coverage

### Integration Tests
- Test API endpoints
- Test database operations
- Test connector integration

### E2E Tests
- Test complete user workflows
- Test UI interactions
- Test error handling

## Documentation Requirements

What documentation is needed?

- [ ] User guide in `/doc-site/docs/components/`
- [ ] API reference in `/doc-site/docs/api/`
- [ ] Code comments and JSDoc
- [ ] README updates if needed
- [ ] CLAUDE.md updates if new patterns introduced

## Migration Plan

If this changes existing functionality, how do we migrate?

1. Add new feature alongside existing (feature flag)
2. Migrate existing data/config
3. Test both old and new paths
4. Remove old implementation
5. Update documentation

## Rollout Plan

How should this be deployed?

- Phase 1: Internal testing (dev environment)
- Phase 2: Beta testing (staging environment)
- Phase 3: Production rollout (canary deployment)
- Phase 4: Full availability

## Related Documents

Links to related design docs, RFCs, or documentation.

- Architecture doc: `/design/architecture/related-doc.md`
- API design: `/design/api-designs/related-api.md`
- User documentation: `/doc-site/docs/components/related-feature.md`

## Open Questions

What needs to be decided?

1. **Question 1**: Should we use polling or webhooks?
   - Options: A, B, C
   - Recommendation: B because...

2. **Question 2**: What's the data retention period?
   - Options: 30 days, 90 days, 1 year
   - Recommendation: 90 days because...

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| YYYY-MM-DD | Your Name | Initial draft |
| YYYY-MM-DD | Your Name | Updated requirements based on feedback |
| YYYY-MM-DD | Your Name | Implementation complete - moved to /doc-site/ |
