# AI-Powered Discovery Architecture - Implementation Plan

**Date**: November 5, 2025
**Status**: Proposal
**Author**: Claude Code Agent

## Executive Summary

This document outlines a **pragmatic implementation approach** for adding AI-powered discovery capabilities to ConfigBuddy v2.0 while maintaining the existing TypeScript/Node.js stack and backward compatibility with current discovery workers.

### Key Findings

1. **Two Architectures Exist**:
   - **Vision**: Python/FastAPI + LangChain/LangGraph (from technical design)
   - **Reality**: TypeScript/Node.js + BullMQ (current implementation)

2. **Gap Analysis**:
   - Technical design (1900+ lines) describes a complete AI platform in Python
   - Current implementation uses deterministic workers (SSH, NMAP, Active Directory)
   - No LLM integration exists today
   - No pattern learning or compilation system

3. **Recommendation**: Implement AI discovery **within the existing TypeScript stack** using a hybrid approach that supports both legacy and AI-powered discovery methods.

---

## Architecture Overview

### Current Architecture (v2.0)

```
┌─────────────────────────────────────────────────────────┐
│              Discovery Orchestrator                     │
│  (Routes jobs to appropriate workers)                   │
└─────────────────────────────────────────────────────────┘
                         ↓
    ┌────────────────────┴────────────────────┐
    ↓                                         ↓
┌──────────────────┐              ┌──────────────────────┐
│ Legacy Workers   │              │ Connector Framework  │
│ - SSH            │              │ - AWS (17 services)  │
│ - NMAP           │              │ - Azure (12)         │
│ - Active Dir     │              │ - GCP (10)           │
│ - SNMP           │              │ - 38 connectors      │
└──────────────────┘              └──────────────────────┘
```

### Proposed Hybrid Architecture (v2.1)

```
┌──────────────────────────────────────────────────────────────────┐
│           Enhanced Discovery Orchestrator                        │
│  (Intelligent routing: patterns → AI → workers)                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓
         ┌────────────────────┴────────────────────┐
         ↓                    ↓                     ↓
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Pattern Matcher │  │  AI Discovery   │  │ Legacy Workers  │
│ (Fast Path)     │  │  Engine         │  │ (Unchanged)     │
│                 │  │                 │  │                 │
│ - Precompiled   │  │ - Claude API    │  │ - SSH           │
│   patterns      │  │ - Tool calling  │  │ - NMAP          │
│ - <1 second     │  │ - Learning      │  │ - Active Dir    │
│ - High conf.    │  │ - 10-60 sec     │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         ↓                    ↓                     ↓
         └────────────────────┴─────────────────────┘
                              ↓
                   ┌──────────────────────┐
                   │  Pattern Compiler    │
                   │ (Learn from AI)      │
                   └──────────────────────┘
```

### Decision Flow

```
Discovery Job Arrives
       ↓
1. Try Pattern Matcher
   - Check precompiled patterns
   - Confidence > 0.9 → Execute pattern (FAST PATH)
       ↓
2. If confidence < 0.9 → AI Discovery Engine
   - Use Claude API with tool calling
   - Execute discovery with LLM reasoning
   - Trace all steps
       ↓
3. Pattern Compiler
   - Analyze AI trace
   - Generate TypeScript pattern code
   - Store in pattern registry
       ↓
4. Fallback to Legacy Workers (if needed)
   - SSH, NMAP, etc. (existing behavior)
```

---

## Key Design Decisions

### 1. Stay with TypeScript/Node.js

**Rationale**:
- Entire codebase is TypeScript (35+ packages)
- Production-ready infrastructure exists
- Team expertise and tooling in place
- No need for polyglot architecture

**Implementation**:
- Use Anthropic SDK for TypeScript (`@anthropic-ai/sdk`)
- Implement AI agents using Claude's tool calling feature
- Store patterns as TypeScript code (not Python)

### 2. Hybrid Discovery Approach

**Three Tiers**:

1. **Tier 1: Pattern Matcher (Fast Path)**
   - Pre-compiled TypeScript patterns
   - Execution time: <1 second
   - Confidence threshold: >0.9
   - Use when: Service signature is known

2. **Tier 2: AI Discovery (Intelligent Path)**
   - Claude API with tool calling
   - Execution time: 10-60 seconds
   - Use when: Unknown service or low confidence
   - Traces actions for learning

3. **Tier 3: Legacy Workers (Fallback Path)**
   - Existing SSH/NMAP workers
   - Use when: Manual trigger or pattern/AI fails
   - Unchanged behavior

### 3. Pattern System Architecture

**Pattern Storage**:
- PostgreSQL table: `ai_discovery_patterns`
- Fields: pattern code, detection logic, metadata, usage stats
- Versioned patterns (semantic versioning)

**Pattern Format**:
```typescript
interface DiscoveryPattern {
  id: string;
  version: string;
  name: string;
  category: string;

  // Detection function (returns confidence 0-1)
  detect: (scanResult: ScanResult) => {
    matches: boolean;
    confidence: number;
    indicators: string[];
  };

  // Discovery function (returns CIs)
  discover: (context: DiscoveryContext) => Promise<DiscoveredCI[]>;

  // Metadata
  metadata: {
    author: string;
    created: Date;
    usageCount: number;
    successRate: number;
    avgExecutionTime: number;
  };
}
```

### 4. AI Agent Implementation

**Use Claude's Tool Calling**:
- Define tools: `nmap_scan`, `http_probe`, `ssh_execute`, `read_config`
- Claude decides which tools to use and in what order
- Each tool call is logged for pattern learning

**Example Tool Definition**:
```typescript
const tools = [
  {
    name: 'nmap_scan',
    description: 'Scan network ports and services',
    input_schema: {
      type: 'object',
      properties: {
        host: { type: 'string', description: 'Target host' },
        ports: { type: 'string', description: 'Port range (e.g., 1-1000)' }
      },
      required: ['host']
    }
  },
  // ... more tools
];
```

### 5. Pattern Compilation Strategy

**After Successful AI Discovery**:
1. Capture AI's reasoning and tool sequence
2. Identify repeating patterns (threshold: 3 similar discoveries)
3. Generate TypeScript detection + discovery functions
4. Test against validation cases
5. Store in pattern registry
6. Enable for future fast-path matching

**Code Generation**:
- Use template-based generation (not LLM-generated code initially)
- Validate generated code in sandbox
- Require manual review before production deployment

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

**Scope**: Database schema, basic AI integration, pattern storage

**Deliverables**:
1. Database migrations:
   - `ai_discovery_patterns` table
   - `ai_discovery_sessions` table (trace storage)
   - `ai_pattern_usage` table (metrics)

2. Basic AI integration:
   - Anthropic SDK setup
   - Simple Claude API call from orchestrator
   - Tool definitions for discovery actions

3. Pattern storage:
   - Pattern loader (load from database)
   - Pattern validator
   - CRUD API endpoints

**Files to Create**:
```
packages/ai-discovery/
├── src/
│   ├── index.ts
│   ├── ai-agent.ts              # Claude API integration
│   ├── pattern-matcher.ts       # Fast path matching
│   ├── pattern-compiler.ts      # Learn from traces
│   ├── tools/
│   │   ├── nmap-tool.ts
│   │   ├── http-tool.ts
│   │   ├── ssh-tool.ts
│   │   └── index.ts
│   └── types.ts
└── package.json
```

**Success Criteria**:
- [ ] Claude API successfully called from TypeScript
- [ ] At least 3 tools working (nmap, http, ssh)
- [ ] Patterns stored and loaded from PostgreSQL
- [ ] Discovery session traces saved to database

---

### Phase 2: Orchestrator Integration (Weeks 3-4)

**Scope**: Integrate AI discovery into existing orchestrator, implement decision logic

**Deliverables**:
1. Enhanced `DiscoveryOrchestrator`:
   - Add pattern matching tier
   - Add AI discovery tier
   - Implement confidence-based routing
   - Maintain backward compatibility

2. Pattern matcher implementation:
   - Load patterns at startup
   - Execute detection functions
   - Calculate confidence scores

3. AI discovery engine:
   - Full Claude tool calling integration
   - Trace all AI actions
   - Return discovered CIs

**Modified Files**:
```
packages/discovery-engine/src/orchestrator/
└── discovery-orchestrator.ts    # Add AI tiers

packages/discovery-engine/src/
├── ai-orchestrator.ts           # NEW: AI-specific routing
└── pattern-executor.ts          # NEW: Execute patterns
```

**Decision Logic**:
```typescript
async discover(job: DiscoveryJob): Promise<DiscoveryResult> {
  // 1. Try pattern matching first
  const patternResult = await this.patternMatcher.match(job);

  if (patternResult.confidence > 0.9) {
    return await this.executePattern(patternResult);
  }

  // 2. Fall back to AI discovery
  if (this.isAIDiscoveryEnabled && patternResult.confidence < 0.7) {
    return await this.aiDiscoveryEngine.discover(job);
  }

  // 3. Fall back to legacy workers
  return await this.executeLegacyWorker(job);
}
```

**Success Criteria**:
- [ ] Pattern-based discovery works for at least 1 pattern
- [ ] AI discovery successfully identifies unknown service
- [ ] Legacy workers still function unchanged
- [ ] Proper metrics collected (execution time, confidence, etc.)

---

### Phase 3: Pattern Learning (Weeks 5-6)

**Scope**: Automatic pattern generation from AI traces

**Deliverables**:
1. Pattern compiler:
   - Analyze AI discovery traces
   - Detect repeating sequences
   - Generate detection function code
   - Generate discovery function code

2. Pattern validation:
   - Test generated patterns in sandbox
   - Validate against known examples
   - Calculate success rate

3. Pattern lifecycle:
   - Draft → Review → Approved → Active
   - Version management
   - Deprecation workflow

**Files to Create**:
```
packages/ai-discovery/src/
├── pattern-compiler.ts          # Generate code from traces
├── pattern-validator.ts         # Validate generated patterns
├── pattern-analyzer.ts          # Detect similar traces
└── templates/
    ├── detection.template.ts    # Detection function template
    └── discovery.template.ts    # Discovery function template
```

**Code Generation Example**:
```typescript
// AI discovers Spring Boot app 3 times with similar steps
// Pattern compiler generates:

export const springBootActuatorPattern: DiscoveryPattern = {
  id: 'spring-boot-actuator',
  version: '1.0.0',
  name: 'Spring Boot Actuator',
  category: 'java-frameworks',

  detect: (scanResult) => {
    let confidence = 0;
    const indicators = [];

    // Check for Spring Boot banner
    if (scanResult.http?.headers?.['X-Application-Context']) {
      confidence += 0.4;
      indicators.push('spring-header');
    }

    // Check for actuator endpoints
    if (scanResult.http?.endpoints?.includes('/actuator/health')) {
      confidence += 0.6;
      indicators.push('actuator-endpoint');
    }

    return {
      matches: confidence >= 0.5,
      confidence,
      indicators
    };
  },

  discover: async (context) => {
    const { host, port } = context;
    // ... generated discovery logic
  },

  metadata: {
    author: 'ai-compiler',
    created: new Date(),
    learnedFrom: ['session-123', 'session-456', 'session-789'],
    usageCount: 0,
    successRate: 0,
    avgExecutionTime: 0
  }
};
```

**Success Criteria**:
- [ ] Pattern compiler generates valid TypeScript code
- [ ] Generated patterns pass validation tests
- [ ] At least 1 pattern learned from AI traces
- [ ] Pattern reduces discovery time by 10x vs AI

---

### Phase 4: UI and Monitoring (Weeks 7-8)

**Scope**: User interface for AI discovery, pattern management, analytics

**Deliverables**:
1. Pattern management UI:
   - Browse available patterns
   - View pattern details and code
   - Test patterns manually
   - Approve/reject learned patterns

2. AI discovery dashboard:
   - Active AI discoveries in progress
   - AI vs pattern usage breakdown
   - Cost tracking (LLM API calls)
   - Success rates and performance

3. Discovery session viewer:
   - View AI reasoning traces
   - See tool calls and responses
   - Replay discoveries
   - Debug failures

**Files to Create**:
```
web-ui/src/pages/
├── ai-discovery/
│   ├── Dashboard.tsx            # AI discovery overview
│   ├── Patterns.tsx             # Pattern library
│   ├── PatternDetail.tsx        # View pattern code
│   ├── Sessions.tsx             # AI session traces
│   └── SessionDetail.tsx        # Replay AI discovery
```

**Key Features**:
- Real-time WebSocket updates for active AI discoveries
- Code editor for reviewing generated patterns
- Approval workflow for learned patterns
- Cost analytics (Claude API usage)

**Success Criteria**:
- [ ] Pattern library browsable in UI
- [ ] AI discovery sessions viewable with traces
- [ ] Users can approve/reject learned patterns
- [ ] Cost and performance metrics visible

---

### Phase 5: Community Registry (Weeks 9-12)

**Scope**: Share and discover patterns across organizations

**Deliverables**:
1. Local pattern registry:
   - Export patterns as JSON
   - Import patterns from files
   - Version conflict resolution

2. Community registry API:
   - Search public patterns
   - Download popular patterns
   - Publish patterns (with approval)
   - Pattern ratings and reviews

3. Pattern sync service:
   - Automatic updates for subscribed patterns
   - Conflict resolution
   - Security scanning for malicious patterns

**Architecture**:
```
┌──────────────────────────────────────────────────┐
│         ConfigBuddy Instance                     │
│  ┌────────────────────────────────────────────┐ │
│  │        Local Pattern Registry              │ │
│  │  - Private patterns                        │ │
│  │  - Downloaded community patterns           │ │
│  └────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
                    ↕ HTTPS
┌──────────────────────────────────────────────────┐
│      Community Pattern Registry                  │
│      (patterns.configbuddy.org)                  │
│                                                   │
│  - Public pattern library                        │
│  - Pattern search and discovery                  │
│  - Version management                            │
│  - Ratings and reviews                           │
│  - Security scanning (AI-powered)                │
└──────────────────────────────────────────────────┘
```

**Success Criteria**:
- [ ] Patterns can be exported/imported
- [ ] Community registry API functional
- [ ] At least 10 community patterns available
- [ ] Security review process in place

---

## Database Schema

### ai_discovery_patterns

```sql
CREATE TABLE ai_discovery_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL,

  -- Pattern code (TypeScript as string)
  detection_code TEXT NOT NULL,
  discovery_code TEXT NOT NULL,

  -- Metadata
  description TEXT,
  author VARCHAR(255) DEFAULT 'ai-compiler',
  license VARCHAR(50) DEFAULT 'MIT',

  -- Quality metrics
  confidence_score FLOAT DEFAULT 0.0,
  usage_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  avg_execution_time_ms INTEGER,

  -- Learning provenance
  learned_from_sessions JSONB, -- Array of session IDs
  ai_model VARCHAR(100),

  -- Lifecycle
  status VARCHAR(50) DEFAULT 'draft', -- draft, review, approved, active, deprecated
  is_active BOOLEAN DEFAULT false,

  -- Community (if synced)
  registry_url VARCHAR(500),
  community_upvotes INTEGER DEFAULT 0,
  community_downvotes INTEGER DEFAULT 0,

  -- Validation
  test_cases JSONB,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by VARCHAR(255),

  CONSTRAINT unique_pattern_version UNIQUE (pattern_id, version)
);

CREATE INDEX idx_patterns_category ON ai_discovery_patterns(category);
CREATE INDEX idx_patterns_status ON ai_discovery_patterns(status);
CREATE INDEX idx_patterns_active ON ai_discovery_patterns(is_active);
```

### ai_discovery_sessions

```sql
CREATE TABLE ai_discovery_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) UNIQUE NOT NULL,

  -- Discovery context
  target_host VARCHAR(255),
  target_port INTEGER,
  scan_result JSONB,

  -- Execution
  status VARCHAR(50) NOT NULL, -- running, completed, failed
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INTEGER,

  -- AI details
  ai_model VARCHAR(100),
  total_tokens INTEGER,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  estimated_cost DECIMAL(10, 6),

  -- Results
  discovered_cis JSONB, -- Array of CI IDs
  confidence_score FLOAT,

  -- Trace (for pattern learning)
  tool_calls JSONB, -- Array of tool calls and responses
  ai_reasoning TEXT, -- Claude's reasoning
  pattern_matched VARCHAR(255), -- If pattern was used

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_status ON ai_discovery_sessions(status);
CREATE INDEX idx_sessions_target ON ai_discovery_sessions(target_host, target_port);
CREATE INDEX idx_sessions_started ON ai_discovery_sessions(started_at);
```

### ai_pattern_usage

```sql
CREATE TABLE ai_pattern_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id VARCHAR(255) NOT NULL REFERENCES ai_discovery_patterns(pattern_id),
  session_id VARCHAR(255) NOT NULL REFERENCES ai_discovery_sessions(session_id),

  -- Execution details
  success BOOLEAN NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  confidence_score FLOAT,

  -- Error details (if failed)
  error_message TEXT,
  error_type VARCHAR(100),

  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (pattern_id) REFERENCES ai_discovery_patterns(pattern_id),
  FOREIGN KEY (session_id) REFERENCES ai_discovery_sessions(session_id)
);

CREATE INDEX idx_usage_pattern ON ai_pattern_usage(pattern_id);
CREATE INDEX idx_usage_timestamp ON ai_pattern_usage(timestamp);
```

---

## Configuration

### Environment Variables

```bash
# AI Discovery Configuration
AI_DISCOVERY_ENABLED=true
AI_DISCOVERY_PROVIDER=anthropic  # anthropic or openai
ANTHROPIC_API_KEY=sk-ant-xxx
ANTHROPIC_MODEL=claude-sonnet-4.5

# Pattern System
PATTERN_LEARNING_ENABLED=true
PATTERN_LEARNING_THRESHOLD=3  # Min discoveries before compiling pattern
PATTERN_AUTO_APPROVE=false    # Require manual approval for learned patterns

# Community Registry
PATTERN_REGISTRY_URL=https://patterns.configbuddy.org
PATTERN_REGISTRY_SYNC_ENABLED=false
PATTERN_REGISTRY_API_KEY=

# Cost Controls
AI_DISCOVERY_MAX_COST_PER_SESSION=0.50  # USD
AI_DISCOVERY_MONTHLY_BUDGET=100.00      # USD
AI_DISCOVERY_FALLBACK_ON_BUDGET_EXCEEDED=true

# Performance
PATTERN_MATCHER_TIMEOUT_MS=1000
AI_DISCOVERY_TIMEOUT_MS=60000
MAX_CONCURRENT_AI_SESSIONS=3
```

---

## Cost Analysis

### LLM API Costs (Claude Sonnet 3.5)

**Per Discovery Session** (estimated):
- Input tokens: ~2,000 (context + scan results)
- Output tokens: ~500 (reasoning + actions)
- Tool calls: ~3-5 per session
- **Total cost**: ~$0.015 - $0.030 per discovery

**Monthly Costs** (examples):
- **Low usage** (100 discoveries/month): ~$2-3
- **Medium usage** (1,000 discoveries/month): ~$20-30
- **High usage** (10,000 discoveries/month): ~$200-300

### Cost Optimization Strategies

1. **Pattern Matching** (Fast Path):
   - First-time discovery: $0.02 (AI)
   - Subsequent discoveries: $0.00 (pattern)
   - **ROI**: Break-even after 1 reuse

2. **Caching**:
   - Cache scan results for 1 hour
   - Avoid redundant AI calls for same target

3. **Budget Controls**:
   - Monthly spending limits
   - Fallback to legacy workers when budget exceeded
   - Alert at 80% budget utilization

---

## Security Considerations

### Pattern Code Execution

**Risk**: Generated pattern code executes in Node.js runtime

**Mitigations**:
1. **Sandboxed Validation**:
   - Test patterns in isolated VM before approval
   - No access to filesystem, network, or environment

2. **Code Review**:
   - All learned patterns start in "draft" status
   - Require manual approval before "active"
   - Show diff for pattern updates

3. **Static Analysis**:
   - Scan for dangerous functions (`eval`, `require`, `exec`)
   - Reject patterns with suspicious imports
   - Rate limit pattern execution

### Credential Handling

**Risk**: AI tools need credentials for SSH, API calls

**Mitigations**:
1. Use existing unified credential system
2. Credential selection based on affinity matching
3. Never include credentials in AI prompts or traces
4. Redact secrets from logs and stored traces

### Community Patterns

**Risk**: Malicious patterns from community registry

**Mitigations**:
1. **AI Security Review**:
   - Claude analyzes pattern code for malicious behavior
   - Checks for data exfiltration, destructive commands

2. **Reputation System**:
   - Track pattern author history
   - Community voting and reviews
   - Flag suspicious patterns

3. **Manual Review**:
   - Popular patterns reviewed by maintainers
   - Security audit for high-risk categories

---

## Success Metrics

### Technical Metrics

1. **Discovery Performance**:
   - Pattern execution time: <1 second (target)
   - AI discovery time: <60 seconds (target)
   - Pattern hit rate: >70% after 3 months

2. **Pattern Quality**:
   - Pattern success rate: >90%
   - False positive rate: <5%
   - Patterns learned per month: >10

3. **Cost Efficiency**:
   - AI cost per discovery: <$0.03
   - Pattern reuse factor: >10x
   - Monthly budget adherence: 100%

### Business Metrics

1. **Time Savings**:
   - Reduce manual discovery time by 80%
   - Infrastructure mapping in minutes vs hours

2. **Coverage**:
   - Discover 50+ service types automatically
   - Support 100+ technology patterns

3. **Adoption**:
   - 50% of discoveries use AI/patterns (vs legacy workers)
   - 80% pattern approval rate from users

---

## Risks and Mitigation

### Risk 1: LLM Hallucinations

**Risk**: AI may infer incorrect service details

**Impact**: High (incorrect CMDB data)

**Mitigation**:
- Confidence scoring on all discoveries
- Require multiple indicators for high confidence
- Validation against known patterns
- Human review for low-confidence results

### Risk 2: Pattern Code Bugs

**Risk**: Generated patterns have logic errors

**Impact**: Medium (failed discoveries, wasted time)

**Mitigation**:
- Extensive validation before approval
- Test suite for each pattern
- Gradual rollout (shadow mode first)
- Easy rollback to previous version

### Risk 3: API Cost Overruns

**Risk**: Excessive AI usage exceeds budget

**Impact**: Medium (unexpected costs)

**Mitigation**:
- Hard monthly spending limits
- Alert at 80% threshold
- Fallback to legacy workers when budget exceeded
- Per-user cost tracking

### Risk 4: Complexity Creep

**Risk**: System becomes too complex to maintain

**Impact**: High (technical debt)

**Mitigation**:
- Clear separation of concerns
- Maintain backward compatibility
- Comprehensive documentation
- Gradual rollout (feature flags)

---

## Rollout Strategy

### Phase Deployment

**Phase 1 (Weeks 1-2)**: Internal Testing
- Deploy to development environment only
- Test with 10 known services
- Validate pattern learning on 3 services

**Phase 2 (Weeks 3-4)**: Limited Production
- Enable for 5% of discovery jobs
- Shadow mode (run AI but use legacy results)
- Collect metrics, tune confidence thresholds

**Phase 3 (Weeks 5-6)**: Expanded Rollout
- Enable for 25% of discovery jobs
- AI results used when confidence >0.8
- Monitor error rates and costs

**Phase 4 (Weeks 7-8)**: Full Rollout
- Enable for 100% of discovery jobs
- Pattern matching as primary method
- AI as fallback for unknown services

### Feature Flags

```typescript
const AI_DISCOVERY_FLAGS = {
  AI_ENABLED: true,
  PATTERN_MATCHING_ENABLED: true,
  PATTERN_LEARNING_ENABLED: true,
  AUTO_APPROVE_PATTERNS: false,
  COMMUNITY_REGISTRY_ENABLED: false,

  // Rollout percentages
  AI_DISCOVERY_ROLLOUT_PCT: 100,
  PATTERN_ROLLOUT_PCT: 100,
};
```

---

## Next Steps

1. **Review and Approve Plan**:
   - Technical review by engineering team
   - Architecture review
   - Budget approval

2. **Kickoff Phase 1**:
   - Create `packages/ai-discovery` package
   - Set up Anthropic API access
   - Create database migrations

3. **Prototype**:
   - Build simple Claude integration
   - Test tool calling with NMAP
   - Demonstrate single AI discovery

4. **Iterate**:
   - Gather feedback
   - Refine approach
   - Adjust timeline based on learnings

---

## Appendices

### Appendix A: Alternative Approaches Considered

#### Option 1: Python Microservice (from Technical Design)

**Pros**: Matches technical design exactly, LangChain ecosystem

**Cons**:
- Introduces polyglot complexity
- Separate deployment and monitoring
- Team learning curve (Python + LangChain)
- Communication overhead between Node.js and Python

**Decision**: Rejected due to complexity

#### Option 2: No AI Discovery (Manual Patterns Only)

**Pros**: Simple, predictable, low cost

**Cons**:
- Requires manual pattern creation for each service type
- Slow to add new technology support
- Doesn't leverage AI capabilities

**Decision**: Rejected, doesn't meet vision

#### Option 3: Full AI (No Pattern Matching)

**Pros**: Maximum intelligence, always up-to-date

**Cons**:
- High API costs (every discovery uses AI)
- Slow (60 seconds per discovery)
- Budget unpredictability

**Decision**: Rejected, not cost-effective

### Appendix B: Tool Definitions

**Complete list of planned tools for AI agent**:

1. `nmap_scan` - Network port scanning
2. `http_probe` - HTTP/HTTPS endpoint probing
3. `ssh_execute` - Execute commands via SSH
4. `read_config_file` - Read and parse config files
5. `snmp_walk` - Query SNMP MIBs
6. `dns_lookup` - DNS resolution and records
7. `certificate_inspect` - Inspect SSL/TLS certificates
8. `api_call` - Make authenticated API calls
9. `docker_inspect` - Query Docker daemon
10. `kubernetes_query` - Query Kubernetes API

### Appendix C: Example AI Discovery Session

**Scenario**: Discover unknown web service on port 8080

**AI Reasoning**:
```
Target: 10.0.1.50:8080

Step 1: HTTP probe to check if service is HTTP-based
→ Tool: http_probe
→ Result: 200 OK, header "X-Application-Context: application:prod:8080"

Step 2: Indicator detected - likely Spring Boot application
→ Tool: http_probe on /actuator/health
→ Result: {"status": "UP"}

Step 3: Confirmed Spring Boot Actuator present
→ Tool: http_probe on /actuator/info
→ Result: {"app": {"name": "order-service", "version": "2.1.5"}}

Step 4: Get environment details
→ Tool: http_probe on /actuator/env
→ Result: Spring config with PostgreSQL connection

Step 5: Identify dependencies
→ Database: PostgreSQL at postgres.prod.svc.cluster.local:5432
→ Cache: Redis at redis.prod.svc.cluster.local:6379

Conclusion:
- Service Type: Spring Boot Application
- Service Name: order-service
- Version: 2.1.5
- Dependencies: PostgreSQL (database), Redis (cache)
- Confidence: 0.95
```

**Pattern Learned**:
After 3 similar Spring Boot discoveries, the pattern compiler generates a "Spring Boot Actuator" pattern that can discover these services in <1 second without AI.

---

## Conclusion

This implementation plan provides a **pragmatic path** to add AI-powered discovery to ConfigBuddy while:

✅ Maintaining existing TypeScript/Node.js stack
✅ Preserving backward compatibility
✅ Supporting both legacy and AI discovery methods
✅ Controlling costs through pattern learning
✅ Delivering incremental value in 2-week phases

**Estimated Timeline**: 12 weeks (3 months)
**Estimated Cost**: ~$500-1000/month (AI API usage after full rollout)
**Expected ROI**: 10x faster discovery for known services, 80% time savings overall

**Recommendation**: Proceed with Phase 1 as a proof-of-concept to validate technical approach and cost model.
