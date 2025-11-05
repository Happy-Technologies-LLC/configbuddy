# Design Documentation

This directory contains technical design documents, specifications, and implementation plans for ConfigBuddy CMDB features.

## Directory Structure

```
design/
├── specifications/     # Feature specifications and requirements
├── architecture/       # Architecture design documents
├── api-designs/        # API design specifications
└── implementations/    # Implementation plans and guides
```

## Document Lifecycle

### 1. Design Phase (Documents live here)
- Create design documents in appropriate subdirectory
- Iterate on design with team/Claude
- Documents remain in `/design/` during implementation

### 2. Implementation Phase
- Claude Code reads design documents from `/design/`
- Implementation happens in `/packages/`, `/web-ui/`, etc.
- Design documents stay in `/design/` as reference

### 3. Documentation Phase (After implementation)
- Create user-facing documentation in `/doc-site/docs/`
- Original design document remains in `/design/` for historical reference
- Update design document status to "Implemented - See /doc-site/docs/..."

## Document Types

### Feature Specifications (`/specifications/`)
High-level feature requirements and user stories.

**Use for:**
- New feature proposals
- User requirements
- Business logic specifications
- Functional requirements

**Template:** See `specifications/_TEMPLATE.md`

### Architecture Documents (`/architecture/`)
System design, data models, and architectural decisions.

**Use for:**
- System architecture proposals
- Database schema designs
- Integration patterns
- Performance optimizations
- Scalability designs

**Template:** See `architecture/_TEMPLATE.md`

### API Designs (`/api-designs/`)
REST API, GraphQL, and integration interface specifications.

**Use for:**
- REST endpoint designs
- GraphQL schema changes
- Webhook specifications
- Integration APIs
- Protocol designs

**Template:** See `api-designs/_TEMPLATE.md`

### Implementation Plans (`/implementations/`)
Detailed technical implementation guides.

**Use for:**
- Step-by-step implementation guides
- Migration plans
- Refactoring strategies
- Technical how-tos
- Connector development guides

**Template:** See `implementations/_TEMPLATE.md`

## Design Document Best Practices

### Writing Effective Design Documents

1. **Clear Objective**: State what you want to build in the first paragraph
2. **User Story**: Include why this feature is needed
3. **Requirements**: List functional and non-functional requirements
4. **Constraints**: Note any limitations or constraints
5. **Examples**: Provide concrete examples and use cases
6. **Success Criteria**: Define what "done" looks like

### For Claude Code Implementation

When asking Claude to implement a design, include:
- Path to the design document (e.g., `/design/specifications/real-time-sync.md`)
- Priority features (MVP vs. nice-to-have)
- Any specific technologies or patterns to use
- Testing requirements

**Example:**
```
Please implement the real-time sync feature described in
/design/specifications/real-time-sync.md. Focus on the MVP
features first (WebSocket connection and basic message sync).
Use Socket.io and include integration tests.
```

### Document Status Tags

Add status to document headers to track progress:

```markdown
# Feature Name

**Status:** Draft | Review | Approved | In Progress | Implemented | Archived
**Created:** YYYY-MM-DD
**Updated:** YYYY-MM-DD
**Owner:** Your Name
```

## Design Document Template

See `_TEMPLATE.md` in each subdirectory for a starting point.

### Quick Start

```bash
# Copy template for new feature
cp design/specifications/_TEMPLATE.md design/specifications/my-feature.md

# Edit your design
vim design/specifications/my-feature.md

# Ask Claude to implement
# Provide the path and any specific instructions
```

## Examples

Real examples from ConfigBuddy v2.0 development:

- **v2.0 Connector Framework**: Original design would have been in `/design/architecture/`
- **Unified Credential System**: Would have been in `/design/specifications/`
- **Discovery Agent Routing**: Would have been in `/design/implementations/`

## After Implementation

Once a feature is implemented:

1. ✅ Update design document status to "Implemented"
2. ✅ Add link to user-facing documentation in `/doc-site/docs/`
3. ✅ Keep design document in `/design/` for historical reference
4. ✅ Do NOT move or delete design documents

Design documents serve as:
- Historical record of decision-making
- Reference for future enhancements
- Onboarding material for new contributors

## Integration with CLAUDE.md

The `/design/` directory is referenced in `CLAUDE.md` as the location for:
- Feature specifications that Claude should implement
- Architecture proposals for system changes
- Technical designs for new components

Claude Code is instructed to:
- Read design documents from `/design/`
- Implement according to specifications
- Ask clarifying questions before starting
- Update design document status after completion

## Questions?

- For user-facing docs: See `/doc-site/docs/`
- For development guides: See `CLAUDE.md`
- For contribution guidelines: See `/doc-site/docs/development/contributing.md`

---

**Remember**: Design documents are for planning and implementation reference.
User-facing documentation belongs in `/doc-site/docs/`.
