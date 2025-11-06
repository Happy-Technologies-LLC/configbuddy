# AI-Powered Discovery

**AI Discovery** is ConfigBuddy's intelligent infrastructure discovery system that uses Large Language Models (LLMs) to automatically discover, identify, and classify configuration items without predefined connectors.

## Overview

Traditional discovery requires writing custom connectors for each target system. AI Discovery eliminates this limitation by using LLMs to understand and extract infrastructure information on-the-fly. The system learns from successful discoveries and compiles them into reusable patterns for faster execution.

### Key Features

- **Multi-Provider LLM Support** - Works with Anthropic Claude, OpenAI, or custom/self-hosted models
- **Hybrid Discovery** - Combines pattern matching with AI fallback for optimal performance and cost
- **Pattern Learning** - Automatically compiles successful discoveries into reusable patterns
- **Cost Controls** - Monthly budgets and per-session limits prevent runaway costs
- **Real-time Updates** - WebSocket-based notifications for pattern updates and discoveries

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Discovery Request                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Hybrid Discovery Orchestrator                   │
│  ┌──────────────┐                  ┌──────────────┐         │
│  │Pattern       │  Match? ──Yes──▶ │Execute       │         │
│  │Matcher       │                  │Pattern       │         │
│  └──────────────┘                  └──────────────┘         │
│         │                                  │                 │
│         │ No match                         │                 │
│         ▼                                  │                 │
│  ┌──────────────┐                         │                 │
│  │LLM Discovery │                         │                 │
│  │Engine        │                         │                 │
│  └──────────────┘                         │                 │
│         │                                  │                 │
│         └──────────────┬───────────────────┘                 │
│                        │                                     │
└────────────────────────┼─────────────────────────────────────┘
                         │
                         ▼
           ┌─────────────────────────┐
           │Pattern Learning Pipeline│
           │(Compile new patterns)   │
           └─────────────────────────┘
```

## How It Works

### 1. Pattern Matching (Fast Path)

When a discovery request arrives, the system first checks if any compiled patterns match the target:

```typescript
// Scan target to collect indicators
const scanResult = {
  openPorts: [80, 443, 22],
  services: ['nginx', 'sshd'],
  headers: { 'Server': 'nginx/1.18.0' }
};

// Match against patterns
const match = await patternMatcher.match(scanResult);

if (match && match.confidence >= 0.9) {
  // Execute pre-compiled pattern (fast, no LLM cost)
  const cis = await patternMatcher.executePattern(match.patternId, context);
}
```

**Benefits:**
- ⚡ **10x faster** than AI discovery
- 💰 **Zero LLM cost** for matched targets
- 📈 **High confidence** (0.9+ typical)

### 2. AI Discovery (Fallback)

If no pattern matches (or confidence is low), the system falls back to AI discovery:

```typescript
// LLM-powered discovery
const result = await llmDiscoveryEngine.discover({
  targetHost: '10.0.1.50',
  targetPort: 443,
  scanResult: scanResult,
  credentials: sshCredentials
});

// Result includes discovered CIs and usage metadata
console.log(result.discoveredCIs);    // [{ ci_type: 'web-server', ... }]
console.log(result.cost);             // 0.0234 USD
console.log(result.tokensUsed);       // { input: 1243, output: 567 }
```

**Benefits:**
- 🤖 **Universal discovery** - Works with any infrastructure
- 🎯 **High accuracy** - Uses latest LLM reasoning capabilities
- 📊 **Contextual understanding** - Identifies relationships and dependencies

### 3. Pattern Learning

After successful AI discoveries, the system analyzes sessions to compile patterns:

```typescript
// Triggered manually or automatically
await patternCompiler.compilePatterns({
  minSessions: 3,              // Require 3+ successful discoveries
  minConfidence: 0.85,         // 85% success rate minimum
  autoApprove: true            // Auto-approve high-confidence patterns
});
```

Compiled patterns include:
- **Detection logic** - How to identify this target type
- **Discovery logic** - How to extract configuration items
- **Test cases** - Validation scenarios
- **Metadata** - Success rate, average execution time

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Enable AI Discovery
AI_DISCOVERY_ENABLED=true

# LLM Provider Configuration
AI_DISCOVERY_PROVIDER=anthropic        # anthropic | openai | custom
AI_DISCOVERY_MODEL=claude-sonnet-4-20250514

# Provider API Keys
ANTHROPIC_API_KEY=your-anthropic-api-key-here
OPENAI_API_KEY=your-openai-api-key-here

# Custom LLM Configuration (for vLLM, Ollama, LocalAI)
AI_DISCOVERY_BASE_URL=http://localhost:8000/v1
AI_DISCOVERY_CUSTOM_MODEL=llama-3-70b

# Cost Controls
AI_DISCOVERY_MONTHLY_BUDGET=100.00     # USD
AI_DISCOVERY_MAX_COST_PER_SESSION=0.50 # USD

# Pattern Learning
AI_PATTERN_LEARNING_ENABLED=true
AI_PATTERN_MIN_SESSIONS=3              # Min sessions before compiling
AI_PATTERN_AUTO_APPROVAL_ENABLED=true
AI_PATTERN_AUTO_APPROVAL_MIN_SESSIONS=5
AI_PATTERN_AUTO_APPROVAL_MIN_CONFIDENCE=0.9

# Hybrid Discovery
AI_HYBRID_DISCOVERY_ENABLED=true
AI_PATTERN_CONFIDENCE_THRESHOLD=0.9
AI_ENABLE_LEGACY_FALLBACK=true

# Security & Timeouts
AI_DISCOVERY_TIMEOUT_MS=30000          # 30 seconds
AI_DISCOVERY_MAX_RETRIES=2
```

### Supported LLM Providers

#### Anthropic Claude (Recommended)
- **Models**: `claude-sonnet-4-20250514`, `claude-3-5-sonnet-20241022`
- **Best for**: Complex infrastructure, relationship mapping
- **Cost**: ~$3/million tokens (input), ~$15/million tokens (output)

```bash
AI_DISCOVERY_PROVIDER=anthropic
AI_DISCOVERY_MODEL=claude-sonnet-4-20250514
ANTHROPIC_API_KEY=sk-ant-...
```

#### OpenAI
- **Models**: `gpt-4`, `gpt-4-turbo`, `gpt-3.5-turbo`
- **Best for**: General-purpose discovery
- **Cost**: ~$10/million tokens (GPT-4)

```bash
AI_DISCOVERY_PROVIDER=openai
AI_DISCOVERY_MODEL=gpt-4-turbo
OPENAI_API_KEY=sk-...
```

#### Custom/Self-Hosted
- **Engines**: vLLM, Ollama, LocalAI, LM Studio
- **Models**: Llama 3, Mistral, Qwen, custom fine-tuned models
- **Best for**: Data privacy, cost control, custom domains

```bash
AI_DISCOVERY_PROVIDER=custom
AI_DISCOVERY_BASE_URL=http://localhost:8000/v1
AI_DISCOVERY_CUSTOM_MODEL=llama-3-70b
```

## Database Schema

AI Discovery requires these PostgreSQL tables:

```bash
# Deploy schema
./scripts/deploy-ai-discovery-db.sh
```

This creates:
- `ai_discovery_patterns` - Compiled patterns
- `ai_discovery_sessions` - Discovery session history
- `ai_pattern_usage` - Pattern execution metrics

## Usage

### 1. Create Discovery Definition

```bash
curl -X POST http://localhost:3000/api/v1/discovery/definitions \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Unknown Web Servers",
    "description": "Discover unknown web servers using AI",
    "discovery_method": "ai",
    "schedule": "0 2 * * *",
    "ai_provider": "anthropic",
    "ai_model": "claude-sonnet-4-20250514",
    "enable_pattern_matching": true,
    "config": {
      "targetHost": "10.0.1.50",
      "targetPort": 443
    }
  }'
```

**Discovery Methods:**
- `connector` - Use traditional connectors
- `ai` - Use AI discovery only
- `hybrid` - Try pattern matching first, fallback to AI (recommended)
- `agent` - Use discovery agents (NMAP, SSH, etc.)

### 2. Trigger Discovery

```bash
curl -X POST http://localhost:3000/api/v1/discovery/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "ai",
    "config": {
      "targetHost": "10.0.1.50",
      "targetPort": 443,
      "credentials": {...}
    }
  }'
```

### 3. View Results

**Via API:**
```bash
GET /api/v1/ai/sessions
GET /api/v1/ai/sessions/{sessionId}
GET /api/v1/ai/patterns
```

**Via Web UI:**
- Navigate to **AI Pattern Learning** page
- View **Discovery Sessions** tab for AI discovery history
- View **Pattern Library** tab for compiled patterns
- View **Cost Analytics** for budget tracking

## Pattern Management

### Pattern Lifecycle

1. **Draft** - Pattern created but not validated
2. **Review** - Submitted for approval
3. **Approved** - Validated and ready for use
4. **Active** - Currently being used for discovery
5. **Deprecated** - No longer recommended

### Pattern Operations

**Approve Pattern:**
```bash
POST /api/v1/ai/patterns/{patternId}/approve
{
  "approvedBy": "admin@example.com",
  "notes": "Validated against 10 web servers"
}
```

**Activate Pattern:**
```bash
POST /api/v1/ai/patterns/{patternId}/activate
{
  "activatedBy": "admin@example.com"
}
```

**Deactivate Pattern:**
```bash
POST /api/v1/ai/patterns/{patternId}/deactivate
{
  "deactivatedBy": "admin@example.com",
  "reason": "Better pattern available"
}
```

## Performance Optimizations

### Redis Caching
- **Pattern Cache** - 1-hour TTL for individual patterns
- **Pattern List Cache** - 10-minute TTL for active patterns
- **Match Result Cache** - 5-minute TTL for scan results

**Expected Performance:**
- Pattern loading: **10x faster**
- Pattern matching: **5x faster**
- Database queries: **10-50x faster** (with indexes)

### Database Indexes
Comprehensive indexes are automatically created:
- Partial indexes for active patterns
- Composite indexes for common queries
- Performance indexes for session and usage tracking

### Real-time Updates
WebSocket-based notifications for:
- Pattern updates
- Pattern approvals
- New patterns learned
- Discovery session completion
- Cost alerts

**Connection:**
```javascript
ws://localhost:3000/ws
```

## Cost Management

### Budget Controls

**Monthly Budget:**
```bash
AI_DISCOVERY_MONTHLY_BUDGET=100.00  # Alert when 80% reached
```

**Per-Session Limit:**
```bash
AI_DISCOVERY_MAX_COST_PER_SESSION=0.50  # Abort if exceeded
```

### Cost Tracking

**View Current Usage:**
```bash
GET /api/v1/ai/analytics/cost-summary
```

**Response:**
```json
{
  "currentMonth": {
    "totalCost": 42.35,
    "sessionCount": 127,
    "avgCostPerSession": 0.33
  },
  "budget": {
    "monthlyLimit": 100.00,
    "remaining": 57.65,
    "percentUsed": 42.35
  },
  "alerts": [
    {
      "type": "warning",
      "message": "80% of monthly budget reached"
    }
  ]
}
```

### Cost Optimization Tips

1. **Enable pattern matching** - Reduces AI calls by 80-95%
2. **Use cheaper models for simple tasks** - GPT-3.5 for basic discovery
3. **Batch discoveries** - Group similar targets together
4. **Set conservative budgets** - Start low and increase based on needs
5. **Monitor pattern hit rate** - High hit rate = low costs

## Industry Patterns

ConfigBuddy ships with 9 pre-built industry patterns:

1. **Nginx Web Server** - Detects Nginx installations
2. **Apache Web Server** - Identifies Apache HTTP servers
3. **PostgreSQL Database** - Discovers PostgreSQL instances
4. **MySQL Database** - Identifies MySQL/MariaDB servers
5. **Redis Cache** - Detects Redis servers
6. **MongoDB Database** - Identifies MongoDB instances
7. **Docker Container Host** - Discovers Docker hosts
8. **Kubernetes Cluster** - Identifies K8s control planes
9. **Jenkins CI/CD** - Detects Jenkins servers

**Load patterns:**
```bash
./scripts/deploy-ai-discovery-db.sh  # Includes industry patterns
```

## Best Practices

### 1. Start with Hybrid Discovery
```bash
AI_HYBRID_DISCOVERY_ENABLED=true
```
This uses pattern matching when possible (fast, free) and falls back to AI when needed.

### 2. Set Conservative Budgets Initially
```bash
AI_DISCOVERY_MONTHLY_BUDGET=50.00
AI_DISCOVERY_MAX_COST_PER_SESSION=0.25
```
Monitor usage for a month, then adjust based on actual needs.

### 3. Enable Auto-Approval for High-Confidence Patterns
```bash
AI_PATTERN_AUTO_APPROVAL_ENABLED=true
AI_PATTERN_AUTO_APPROVAL_MIN_SESSIONS=5
AI_PATTERN_AUTO_APPROVAL_MIN_CONFIDENCE=0.9
```
Patterns with 90%+ success rate over 5+ sessions are automatically approved.

### 4. Use Appropriate Models
- **Complex infrastructure**: Claude Sonnet 4
- **General discovery**: GPT-4 Turbo
- **Simple/budget**: GPT-3.5 Turbo
- **Data privacy**: Self-hosted Llama 3 70B

### 5. Monitor Pattern Hit Rates
Check the Pattern Library dashboard regularly. Aim for:
- **80%+ pattern hit rate** - Good coverage
- **<20% AI fallback** - Cost-effective
- **90%+ pattern success rate** - High quality

## Troubleshooting

### Discovery Fails with "Budget Exceeded"

**Cause**: Monthly or per-session budget limit reached

**Solution:**
```bash
# Check current usage
GET /api/v1/ai/analytics/cost-summary

# Increase budget if justified
AI_DISCOVERY_MONTHLY_BUDGET=200.00
```

### Pattern Not Matching Expected Targets

**Cause**: Pattern detection logic too specific

**Solution:**
1. View pattern details in Pattern Library
2. Check detection code requirements
3. Edit pattern or create new variant
4. Submit for re-approval

### High AI Discovery Costs

**Cause**: Low pattern hit rate

**Solution:**
1. Enable pattern learning: `AI_PATTERN_LEARNING_ENABLED=true`
2. Lower confidence threshold: `AI_PATTERN_CONFIDENCE_THRESHOLD=0.85`
3. Compile patterns more frequently
4. Review and activate approved patterns

### WebSocket Not Connecting

**Cause**: WebSocket service not initialized

**Solution:**
```bash
# Check API server logs
docker logs cmdb-api-server | grep WebSocket

# Verify WebSocket endpoint
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  http://localhost:3000/ws
```

## API Reference

See [AI Pattern API Reference](/api/rest/ai-patterns) for complete endpoint documentation.

## Related Documentation

- [Pattern Learning Guide](/components/pattern-learning) - Deep dive into pattern compilation
- [Discovery Definitions](/components/discovery-definitions) - Configure discovery jobs
- [Cost Analytics](/operations/cost-analytics) - Monitor and optimize AI discovery costs
- [Environment Variables](/configuration/environment-variables) - Complete configuration reference

## Performance Metrics

**Typical Performance** (after pattern library is established):

| Metric | Pattern Match | AI Discovery |
|--------|--------------|--------------|
| Execution Time | 50-200ms | 2-10s |
| Cost | $0.00 | $0.10-$0.50 |
| Accuracy | 95%+ | 90-95% |
| Coverage | 80-90% | 100% |

**Combined (Hybrid Discovery):**
- **Average Cost**: $0.02-$0.10 per discovery
- **Average Time**: 200-500ms
- **Accuracy**: 93-97%
- **Coverage**: 100%

## Pattern Compilation Workflow

The pattern compiler transforms successful AI discovery sessions into reusable TypeScript code, creating a growing library of optimized discovery patterns.

### How AI Sessions Become Patterns

When the system executes AI discovery, it logs every step:

```typescript
// Example AI discovery session log
{
  sessionId: "sess_abc123",
  timestamp: "2025-11-06T10:30:00Z",
  targetHost: "10.0.1.50",
  targetPort: 443,
  steps: [
    { tool: "port_scan", result: { openPorts: [80, 443, 22] } },
    { tool: "http_headers", result: { server: "nginx/1.18.0" } },
    { tool: "ssh_command", command: "nginx -v", result: "nginx version: 1.18.0" },
    { tool: "ssh_command", command: "systemctl status nginx", result: "active (running)" }
  ],
  discoveredCIs: [
    { ci_type: "web-server", ci_name: "nginx-prod-01", confidence: 0.95 }
  ],
  cost: 0.23,
  tokensUsed: { input: 1543, output: 687 },
  executionTime: 4200
}
```

### Pattern Analyzer Algorithm

The pattern analyzer identifies **repeatable sequences** across multiple sessions:

```typescript
interface SessionPattern {
  // Common characteristics
  commonPorts: number[];           // Ports found in 80%+ of sessions
  commonServices: string[];        // Services found in 80%+ of sessions
  commonCommands: string[];        // Commands executed in 80%+ of sessions

  // Success metrics
  successRate: number;             // Percentage of successful discoveries
  avgConfidence: number;           // Average confidence score
  sessionCount: number;            // Number of sessions analyzed

  // Performance metrics
  avgExecutionTime: number;        // Average time to complete
  avgCost: number;                 // Average LLM cost
}

// Example: Analyzing Nginx web server sessions
const nginxPattern = {
  commonPorts: [80, 443, 22],
  commonServices: ["nginx", "sshd"],
  commonCommands: [
    "nginx -v",
    "systemctl status nginx",
    "cat /etc/nginx/nginx.conf"
  ],
  successRate: 0.94,               // 94% success rate
  avgConfidence: 0.93,
  sessionCount: 12,
  avgExecutionTime: 4100,          // ~4 seconds
  avgCost: 0.21                    // $0.21 per discovery
}
```

**Pattern Detection Criteria:**

1. **Minimum sessions**: 3+ successful discoveries (configurable)
2. **High success rate**: 85%+ success rate
3. **Consistent indicators**: Same ports/services in 80%+ of sessions
4. **Stable commands**: Same discovery steps in 75%+ of sessions

### Pattern Compiler

The compiler generates TypeScript code from session analysis:

```typescript
// Input: Session pattern analysis
const patternSpec = {
  name: "nginx-web-server",
  detectionLogic: {
    requiredPorts: [80, 443],
    requiredServices: ["nginx"],
    httpHeaders: { serverPattern: /nginx\/\d+\.\d+/ }
  },
  discoveryLogic: {
    commands: [
      "nginx -v",
      "systemctl status nginx",
      "cat /etc/nginx/nginx.conf | grep server_name"
    ],
    ciType: "web-server",
    namePattern: "nginx-{hostname}"
  }
};

// Output: Generated TypeScript pattern
export class NginxWebServerPattern implements IDiscoveryPattern {
  async detect(context: DiscoveryContext): Promise<boolean> {
    // Check required ports
    if (!context.openPorts.includes(80) && !context.openPorts.includes(443)) {
      return false;
    }

    // Check for nginx service
    if (!context.services.includes('nginx')) {
      return false;
    }

    // Verify HTTP headers
    const headers = await context.getHttpHeaders();
    if (!headers.server?.match(/nginx\/\d+\.\d+/)) {
      return false;
    }

    return true;
  }

  async discover(context: DiscoveryContext): Promise<DiscoveredCI[]> {
    const version = await context.sshCommand('nginx -v');
    const status = await context.sshCommand('systemctl status nginx');
    const config = await context.sshCommand('cat /etc/nginx/nginx.conf');

    return [{
      ci_type: 'web-server',
      ci_name: `nginx-${context.hostname}`,
      ci_status: status.includes('active') ? 'active' : 'inactive',
      metadata: {
        software: 'nginx',
        version: this.extractVersion(version),
        configPath: '/etc/nginx/nginx.conf'
      },
      confidence_score: 0.95
    }];
  }

  private extractVersion(output: string): string {
    const match = output.match(/nginx version: nginx\/(\d+\.\d+\.\d+)/);
    return match ? match[1] : 'unknown';
  }
}
```

**Generated files:**

```
packages/ai-patterns/patterns/nginx-web-server/
├── pattern.ts              # Main pattern class
├── pattern.test.ts         # Auto-generated tests
├── pattern.json            # Metadata and configuration
└── fixtures/               # Test fixtures from real sessions
    ├── session-001.json
    ├── session-002.json
    └── session-003.json
```

### Pattern Validator

Before approval, patterns are automatically tested:

```typescript
// Pattern validation test suite
describe('NginxWebServerPattern', () => {
  it('should detect nginx web servers', async () => {
    // Uses real session data as fixtures
    const fixture = await loadFixture('session-001.json');
    const pattern = new NginxWebServerPattern();

    const detected = await pattern.detect(fixture.context);
    expect(detected).toBe(true);
  });

  it('should not detect non-nginx servers', async () => {
    const apacheContext = createContext({
      services: ['apache2'],
      httpHeaders: { server: 'Apache/2.4.41' }
    });

    const pattern = new NginxWebServerPattern();
    const detected = await pattern.detect(apacheContext);
    expect(detected).toBe(false);
  });

  it('should discover correct CI attributes', async () => {
    const fixture = await loadFixture('session-001.json');
    const pattern = new NginxWebServerPattern();

    const cis = await pattern.discover(fixture.context);
    expect(cis).toHaveLength(1);
    expect(cis[0].ci_type).toBe('web-server');
    expect(cis[0].metadata.software).toBe('nginx');
    expect(cis[0].confidence_score).toBeGreaterThan(0.9);
  });

  it('should match original AI discovery results', async () => {
    // Validate that pattern produces same results as AI
    const fixture = await loadFixture('session-001.json');
    const pattern = new NginxWebServerPattern();

    const patternResult = await pattern.discover(fixture.context);
    const aiResult = fixture.discoveredCIs;

    expect(patternResult).toMatchObject(aiResult);
  });
});
```

**Validation criteria:**

- ✅ All tests pass (100% success rate)
- ✅ Matches original AI discoveries (95%+ similarity)
- ✅ No false positives (tested against 20+ other server types)
- ✅ Performance target met (<500ms execution time)

### Pattern Approval Workflow

Patterns move through a formal approval process:

**1. Draft State** (automatic)
```typescript
// Compiler creates draft pattern
POST /api/v1/ai/patterns
{
  "name": "nginx-web-server",
  "status": "draft",
  "generatedFrom": ["sess_001", "sess_002", "sess_003"],
  "metadata": {
    "sessionCount": 3,
    "successRate": 0.94,
    "avgConfidence": 0.93
  }
}
```

**2. Review State** (manual or auto)
```typescript
// Submit for review (triggers validation tests)
POST /api/v1/ai/patterns/{patternId}/submit-for-review
{
  "submittedBy": "ai-discovery-system",
  "notes": "Auto-generated from 3 successful sessions"
}

// System runs validation suite
// - Executes test cases against fixtures
// - Checks for false positives
// - Validates performance benchmarks
```

**3. Approved State** (manual or auto-approval)
```typescript
// Manual approval (by admin/engineer)
POST /api/v1/ai/patterns/{patternId}/approve
{
  "approvedBy": "admin@example.com",
  "notes": "Validated against 10 production servers. 100% accuracy."
}

// OR auto-approval (if criteria met)
// Requires:
// - 5+ successful sessions
// - 90%+ success rate
// - 0 false positives in validation
// - All tests pass
```

**4. Active State** (production use)
```typescript
// Activate pattern for discovery
POST /api/v1/ai/patterns/{patternId}/activate
{
  "activatedBy": "admin@example.com"
}

// Pattern is now used for hybrid discovery
// - Takes precedence over AI discovery
// - Appears in Pattern Library UI
// - Metrics tracked in ai_pattern_usage table
```

### CAB Integration for High-Risk Patterns

High-risk patterns require **Change Advisory Board (CAB)** approval:

```typescript
// High-risk pattern criteria
const isHighRisk = (pattern: Pattern): boolean => {
  return (
    pattern.targetTypes.includes('production') ||
    pattern.executesCommands.some(cmd => cmd.includes('rm') || cmd.includes('delete')) ||
    pattern.modifiesConfiguration === true ||
    pattern.impactedSystems > 100
  );
};

// CAB approval workflow
if (isHighRisk(pattern)) {
  // Create change request
  const changeRequest = await cabService.createChangeRequest({
    type: 'standard',
    category: 'ai-pattern-deployment',
    title: `Deploy AI pattern: ${pattern.name}`,
    description: pattern.description,
    risk: 'medium',
    impact: pattern.impactedSystems,
    rollbackPlan: 'Deactivate pattern, fallback to AI discovery',
    testingEvidence: pattern.validationResults,
    approvers: ['itil-service-manager', 'security-lead']
  });

  // Wait for CAB approval
  await changeRequest.waitForApproval();

  // Deploy only after approval
  if (changeRequest.status === 'approved') {
    await pattern.activate();
  }
}
```

**CAB approval requirements:**

- **Risk assessment**: Impact analysis on existing systems
- **Testing evidence**: Validation test results, fixtures
- **Rollback plan**: Deactivation procedure
- **Security review**: Command audit, credential usage
- **Approvers**: ITIL Service Manager, Security Lead, Infrastructure Lead

### Pattern Version Control

Patterns are versioned to support safe updates:

```typescript
// Pattern versioning
interface PatternVersion {
  patternId: string;
  version: string;           // Semantic versioning: 1.2.3
  status: 'draft' | 'active' | 'deprecated';
  createdAt: Date;
  changeLog: string;
}

// Example: Upgrading nginx pattern
const v1 = {
  patternId: 'nginx-web-server',
  version: '1.0.0',
  status: 'active',
  detectionPorts: [80, 443]
};

const v2 = {
  patternId: 'nginx-web-server',
  version: '2.0.0',
  status: 'draft',
  detectionPorts: [80, 443, 8080],  // Added port 8080
  changeLog: 'Added support for non-standard ports'
};

// Deploy new version
await patternRegistry.deployVersion(v2, {
  strategy: 'blue-green',        // Blue-green deployment
  rollbackOnError: true,
  monitoringPeriod: 3600         // 1 hour monitoring
});
```

### Code Examples

**Compile patterns manually:**
```bash
# Compile patterns from recent sessions
curl -X POST http://localhost:3000/api/v1/ai/patterns/compile \
  -H "Content-Type: application/json" \
  -d '{
    "minSessions": 3,
    "minConfidence": 0.85,
    "autoApprove": false
  }'
```

**View pattern compilation queue:**
```bash
GET /api/v1/ai/patterns/compilation-queue

# Response
{
  "pending": [
    {
      "targetType": "postgresql-database",
      "sessionCount": 4,
      "avgConfidence": 0.89,
      "estimatedAt": "2025-11-06T15:00:00Z"
    }
  ],
  "inProgress": [
    {
      "targetType": "nginx-web-server",
      "progress": 0.75,
      "currentStep": "validation"
    }
  ]
}
```

## Cost Optimization Strategies

AI Discovery can be expensive without proper optimization. Here's how to reduce costs by 90% while maintaining coverage.

### Pattern Learning Reduces Costs by 90%

**Cost comparison:**

| Discovery Method | Execution Time | LLM Cost | Total Cost |
|------------------|----------------|----------|------------|
| AI Discovery (no patterns) | 4-10s | $0.10-$0.50 | $0.10-$0.50 |
| Pattern Matching | 50-200ms | $0.00 | $0.00 |
| Hybrid (80% pattern hit) | 200-500ms | $0.02-$0.10 | $0.02-$0.10 |

**Real-world example:**

```
Scenario: Discover 1,000 web servers monthly

Without patterns:
- 1,000 discoveries × $0.25 avg = $250/month
- Total time: 1,000 × 5s = 1.4 hours

With 85% pattern hit rate:
- 850 pattern matches × $0.00 = $0.00
- 150 AI discoveries × $0.25 = $37.50
- Total cost: $37.50/month (85% savings)
- Total time: 850 × 0.1s + 150 × 5s = 14 minutes (94% faster)
```

### Monthly Budget Allocation Strategies

**Budget planning by organization size:**

**Small Organization (100-500 CIs):**
```bash
AI_DISCOVERY_MONTHLY_BUDGET=50.00
AI_DISCOVERY_MAX_COST_PER_SESSION=0.25

# Expected usage:
# - 200 monthly discoveries
# - 70% pattern hit rate (after month 1)
# - 60 AI discoveries × $0.25 = $15/month
# - Remaining $35 for new target types
```

**Medium Organization (500-5,000 CIs):**
```bash
AI_DISCOVERY_MONTHLY_BUDGET=200.00
AI_DISCOVERY_MAX_COST_PER_SESSION=0.50

# Expected usage:
# - 1,000 monthly discoveries
# - 85% pattern hit rate (after month 2)
# - 150 AI discoveries × $0.35 = $52.50/month
# - Remaining $147.50 for new integrations
```

**Large Enterprise (5,000+ CIs):**
```bash
AI_DISCOVERY_MONTHLY_BUDGET=1000.00
AI_DISCOVERY_MAX_COST_PER_SESSION=1.00

# Expected usage:
# - 10,000 monthly discoveries
# - 90% pattern hit rate (after month 3)
# - 1,000 AI discoveries × $0.40 = $400/month
# - Remaining $600 for complex infrastructure
```

### Per-Session Cost Limits

Protect against runaway costs with per-session limits:

```typescript
// Configuration
AI_DISCOVERY_MAX_COST_PER_SESSION=0.50

// Enforcement
class LLMDiscoveryEngine {
  async discover(context: DiscoveryContext): Promise<DiscoveryResult> {
    const costTracker = new SessionCostTracker(this.maxCostPerSession);

    try {
      // Execute discovery steps
      for (const step of discoveryPlan) {
        // Check cost before each LLM call
        if (costTracker.wouldExceedLimit(step.estimatedCost)) {
          throw new BudgetExceededError(
            `Session would exceed $${this.maxCostPerSession} limit`
          );
        }

        const result = await this.executeLLMStep(step);
        costTracker.addCost(result.cost);
      }

      return costTracker.getResult();
    } catch (error) {
      // Log partial results and costs
      await this.logPartialSession(costTracker);
      throw error;
    }
  }
}
```

### When to Use AI vs Patterns

**Use Pattern Matching when:**
- ✅ Target matches known patterns (confidence > 0.9)
- ✅ Speed is critical (<200ms required)
- ✅ Cost must be $0
- ✅ Standard infrastructure (web servers, databases)

**Use AI Discovery when:**
- ✅ No pattern match (new/unknown infrastructure)
- ✅ Complex relationships need analysis
- ✅ Custom/proprietary systems
- ✅ One-time discovery (pattern not worth creating)

**Hybrid approach (recommended):**
```typescript
async function hybridDiscover(target: DiscoveryTarget): Promise<DiscoveryResult> {
  // Step 1: Try pattern matching (fast, free)
  const patternMatch = await patternMatcher.match(target);

  if (patternMatch && patternMatch.confidence >= 0.9) {
    logger.info('Pattern match found', {
      pattern: patternMatch.name,
      confidence: patternMatch.confidence
    });
    return await patternMatcher.execute(patternMatch);
  }

  // Step 2: Fallback to AI discovery
  logger.info('No pattern match, using AI discovery', {
    targetHost: target.host,
    estimatedCost: 0.25
  });
  return await aiDiscovery.discover(target);
}
```

### Cost Analytics and Trends

**Track cost trends over time:**

```bash
# Get cost analytics
GET /api/v1/ai/analytics/cost-trends?period=90d

# Response
{
  "trends": [
    {
      "month": "2025-08",
      "totalCost": 245.30,
      "sessionCount": 1247,
      "avgCostPerSession": 0.20,
      "patternHitRate": 0.65
    },
    {
      "month": "2025-09",
      "totalCost": 142.50,
      "sessionCount": 1389,
      "avgCostPerSession": 0.10,
      "patternHitRate": 0.82
    },
    {
      "month": "2025-10",
      "totalCost": 87.20,
      "sessionCount": 1456,
      "avgCostPerSession": 0.06,
      "patternHitRate": 0.91
    }
  ],
  "projections": {
    "next_month": {
      "estimatedCost": 65.00,
      "estimatedSessions": 1500,
      "estimatedPatternHitRate": 0.93
    }
  }
}
```

**Cost breakdown by target type:**

```bash
GET /api/v1/ai/analytics/cost-by-type

# Response
{
  "breakdown": [
    {
      "targetType": "web-server",
      "sessionCount": 456,
      "totalCost": 12.30,
      "avgCost": 0.03,
      "patternHitRate": 0.95  // 95% use patterns
    },
    {
      "targetType": "database",
      "sessionCount": 234,
      "totalCost": 8.50,
      "avgCost": 0.04,
      "patternHitRate": 0.92
    },
    {
      "targetType": "custom-app",
      "sessionCount": 45,
      "totalCost": 18.75,
      "avgCost": 0.42,
      "patternHitRate": 0.20  // Low hit rate = high cost
    }
  ],
  "recommendations": [
    {
      "targetType": "custom-app",
      "message": "Low pattern hit rate. Consider creating patterns for custom apps.",
      "potentialSavings": 15.00
    }
  ]
}
```

### Optimizing for Token Efficiency

**Reduce token usage:**

1. **Provide clear context upfront**
```typescript
// Bad: Vague context (LLM asks many follow-up questions)
const context = {
  targetHost: "10.0.1.50"
};

// Good: Rich context (LLM knows what to do)
const context = {
  targetHost: "10.0.1.50",
  openPorts: [80, 443, 22],
  services: ["nginx", "sshd"],
  osType: "linux",
  httpHeaders: { server: "nginx/1.18.0" },
  purpose: "Discover web server configuration"
};
```

2. **Use cheaper models for simple tasks**
```bash
# Complex infrastructure (needs reasoning)
AI_DISCOVERY_MODEL=claude-sonnet-4-20250514

# Simple infrastructure (pattern-like but no pattern exists yet)
AI_DISCOVERY_MODEL=gpt-3.5-turbo  # 10x cheaper
```

3. **Batch similar discoveries**
```typescript
// Bad: Individual discoveries (high overhead)
for (const server of servers) {
  await aiDiscovery.discover(server);  // 1000 LLM calls
}

// Good: Batch discovery (shared context)
await aiDiscovery.discoverBatch(servers, {
  sharedContext: {
    datacenter: "us-west-2",
    environment: "production",
    ownerTeam: "platform"
  }
});  // 10 LLM calls (100x reduction)
```

4. **Cache intermediate results**
```typescript
// Cache HTTP headers, port scans, etc.
const cache = new RedisCache({ ttl: 3600 });

const headers = await cache.getOrSet(
  `http-headers:${targetHost}`,
  () => fetchHttpHeaders(targetHost)
);
```

## Production Deployment Considerations

Deploying AI Discovery in production requires careful planning around LLM providers, security, scaling, and monitoring.

### LLM Provider Selection

**Anthropic Claude (Recommended for Production):**

**Pros:**
- ✅ Best reasoning quality (highest accuracy)
- ✅ Long context window (200K tokens)
- ✅ Fast API response times (<2s typical)
- ✅ Good rate limits (10K requests/min)
- ✅ Strong safety guardrails

**Cons:**
- ❌ More expensive than OpenAI ($3/$15 per million tokens)
- ❌ No self-hosted option

**Best for:** Complex infrastructure, relationship mapping, high-accuracy requirements

```bash
AI_DISCOVERY_PROVIDER=anthropic
AI_DISCOVERY_MODEL=claude-sonnet-4-20250514
ANTHROPIC_API_KEY=sk-ant-...
```

**OpenAI GPT-4 (Cost-Effective Alternative):**

**Pros:**
- ✅ Lower cost than Claude ($10/$30 per million tokens)
- ✅ Good performance for most tasks
- ✅ Excellent API reliability
- ✅ Wide model selection (GPT-4, GPT-4-Turbo, GPT-3.5)

**Cons:**
- ❌ Lower accuracy on complex tasks
- ❌ Shorter context window (128K tokens)

**Best for:** General-purpose discovery, budget-conscious deployments

```bash
AI_DISCOVERY_PROVIDER=openai
AI_DISCOVERY_MODEL=gpt-4-turbo
OPENAI_API_KEY=sk-...
```

**Self-Hosted (vLLM, Ollama, LocalAI):**

**Pros:**
- ✅ **Zero per-request cost**
- ✅ Full data privacy (no external API calls)
- ✅ Custom fine-tuned models
- ✅ No rate limits

**Cons:**
- ❌ Requires GPU infrastructure ($$$)
- ❌ Lower quality than Claude/GPT-4
- ❌ Higher maintenance burden

**Best for:** Data privacy requirements, high-volume deployments (>100K discoveries/month)

```bash
AI_DISCOVERY_PROVIDER=custom
AI_DISCOVERY_BASE_URL=http://vllm-server:8000/v1
AI_DISCOVERY_CUSTOM_MODEL=llama-3-70b-instruct

# GPU requirements:
# - Llama 3 70B: 4x A100 (80GB) or 8x A10G (24GB)
# - Qwen 72B: Similar to Llama 3 70B
# - Mistral 7B: 1x A10G (24GB) - budget option
```

### API Key Rotation and Security

**1. Use Secret Management**

```bash
# Bad: Hardcoded in .env
ANTHROPIC_API_KEY=sk-ant-api01-abc123...

# Good: Reference to secret manager
ANTHROPIC_API_KEY_SECRET_NAME=prod/configbuddy/anthropic-api-key
SECRET_MANAGER_TYPE=aws-secrets-manager  # or vault, azure-keyvault
```

**2. Rotate API Keys Monthly**

```typescript
// Automated key rotation
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

class APIKeyRotator {
  async rotateAnthropicKey(): Promise<void> {
    // Generate new API key via Anthropic console
    const newKey = await this.generateNewAPIKey('anthropic');

    // Store in secret manager
    await this.secretsManager.updateSecret({
      SecretId: 'prod/configbuddy/anthropic-api-key',
      SecretString: newKey
    });

    // Reload application config (zero-downtime)
    await this.reloadConfig();

    // Verify new key works
    await this.testAPIKey(newKey);

    // Deactivate old key (after 24h grace period)
    setTimeout(() => this.deactivateOldKey(), 86400000);
  }
}
```

**3. Implement Key Access Controls**

```typescript
// Restrict API key access to specific services
const apiKeyPolicy = {
  allowedServices: ['api-server', 'discovery-engine'],
  allowedEnvironments: ['production'],
  ipWhitelist: ['10.0.0.0/8'],  // Internal IPs only
  auditLog: true
};
```

### Rate Limiting and Throttling

**Prevent API quota exhaustion:**

```typescript
// Rate limiter configuration
import Bottleneck from 'bottleneck';

const llmRateLimiter = new Bottleneck({
  maxConcurrent: 10,           // Max 10 concurrent LLM requests
  minTime: 100,                // Min 100ms between requests
  reservoir: 1000,             // 1000 requests per interval
  reservoirRefreshAmount: 1000,
  reservoirRefreshInterval: 60 * 1000  // Refresh every 60 seconds
});

// Apply rate limiting
async function rateLimitedLLMCall(prompt: string): Promise<string> {
  return await llmRateLimiter.schedule(() =>
    anthropicClient.messages.create({
      model: 'claude-sonnet-4-20250514',
      messages: [{ role: 'user', content: prompt }]
    })
  );
}
```

**Graceful degradation:**

```typescript
// Fallback to pattern matching if rate limited
async function discoverWithFallback(target: DiscoveryTarget): Promise<DiscoveryResult> {
  try {
    return await aiDiscovery.discover(target);
  } catch (error) {
    if (error instanceof RateLimitError) {
      logger.warn('LLM rate limit hit, using best-effort pattern matching');
      return await patternMatcher.matchBestEffort(target, {
        minConfidence: 0.7  // Lower threshold
      });
    }
    throw error;
  }
}
```

### Error Handling and Retries

**Exponential backoff with jitter:**

```typescript
import { retry } from '@anthropic-ai/sdk';

const aiDiscoveryWithRetry = retry(
  async (target: DiscoveryTarget) => {
    return await llmClient.discover(target);
  },
  {
    maxAttempts: 3,
    initialDelay: 1000,        // 1 second
    maxDelay: 10000,           // 10 seconds
    backoffFactor: 2,          // Exponential backoff
    jitter: true,              // Add randomness
    retryableErrors: [
      'RateLimitError',
      'TimeoutError',
      'ServiceUnavailableError'
    ]
  }
);
```

**Circuit breaker pattern:**

```typescript
import CircuitBreaker from 'opossum';

const llmCircuitBreaker = new CircuitBreaker(
  async (prompt: string) => llmClient.complete(prompt),
  {
    timeout: 30000,            // 30 second timeout
    errorThresholdPercentage: 50,  // Open circuit at 50% error rate
    resetTimeout: 30000,       // Try again after 30 seconds
    rollingCountTimeout: 10000 // 10 second rolling window
  }
);

llmCircuitBreaker.fallback(() => {
  logger.error('LLM circuit breaker open, using fallback');
  return { source: 'fallback', confidence: 0.5 };
});
```

### Monitoring AI Discovery Costs

**Real-time cost tracking:**

```typescript
// Cost tracking middleware
class CostTrackingMiddleware {
  async trackCost(session: DiscoverySession): Promise<void> {
    // Calculate cost
    const cost = this.calculateCost(session);

    // Store in database
    await db.ai_discovery_sessions.update({
      sessionId: session.id,
      cost: cost,
      tokensUsed: session.tokensUsed
    });

    // Update current month total
    await this.updateMonthlyTotal(cost);

    // Check budget alerts
    if (await this.shouldAlert()) {
      await this.sendBudgetAlert();
    }
  }

  private async shouldAlert(): Promise<boolean> {
    const usage = await this.getMonthlyUsage();
    const budget = parseFloat(process.env.AI_DISCOVERY_MONTHLY_BUDGET);

    return usage.totalCost >= budget * 0.8;  // Alert at 80%
  }
}
```

**Prometheus metrics:**

```typescript
import { Counter, Histogram, Gauge } from 'prom-client';

// Cost metrics
const aiDiscoveryCost = new Counter({
  name: 'ai_discovery_cost_usd_total',
  help: 'Total AI discovery cost in USD',
  labelNames: ['provider', 'model', 'target_type']
});

const aiDiscoveryTokens = new Counter({
  name: 'ai_discovery_tokens_total',
  help: 'Total tokens used',
  labelNames: ['provider', 'model', 'token_type']
});

const aiDiscoveryDuration = new Histogram({
  name: 'ai_discovery_duration_seconds',
  help: 'AI discovery duration',
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
});

const monthlyBudgetUsage = new Gauge({
  name: 'ai_discovery_monthly_budget_usage_percent',
  help: 'Percentage of monthly budget used'
});

// Update metrics
aiDiscoveryCost.inc({
  provider: 'anthropic',
  model: 'claude-sonnet-4',
  target_type: 'web-server'
}, 0.23);

monthlyBudgetUsage.set(42.5);  // 42.5% of budget used
```

### Scaling Considerations

**Horizontal scaling:**

```yaml
# Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-discovery-engine
spec:
  replicas: 5  # Scale out for high volume
  template:
    spec:
      containers:
      - name: discovery-engine
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        env:
        - name: AI_DISCOVERY_MAX_CONCURRENT_SESSIONS
          value: "10"  # 5 replicas × 10 = 50 concurrent discoveries
```

**Auto-scaling based on queue depth:**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ai-discovery-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ai-discovery-engine
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: External
    external:
      metric:
        name: bullmq_queue_waiting_count
        selector:
          matchLabels:
            queue: "ai-discovery"
      target:
        type: AverageValue
        averageValue: "10"  # Scale up if >10 jobs waiting per pod
```

### Multi-Region Deployment

**Deploy across regions for resilience:**

```typescript
// Multi-region configuration
const llmProviderConfig = {
  regions: [
    {
      name: 'us-east-1',
      provider: 'anthropic',
      apiEndpoint: 'https://api.anthropic.com',
      priority: 1  // Primary
    },
    {
      name: 'us-west-2',
      provider: 'openai',
      apiEndpoint: 'https://api.openai.com',
      priority: 2  // Fallback
    },
    {
      name: 'eu-west-1',
      provider: 'custom',
      apiEndpoint: 'https://vllm.eu-west-1.internal',
      priority: 3  // EU data residency
    }
  ]
};

// Regional routing
class MultiRegionLLMClient {
  async discover(target: DiscoveryTarget): Promise<DiscoveryResult> {
    const region = this.selectRegion(target);
    const client = this.getClientForRegion(region);

    try {
      return await client.discover(target);
    } catch (error) {
      // Failover to next region
      logger.warn(`Region ${region} failed, failing over`, { error });
      return await this.discoverWithFailover(target, region);
    }
  }

  private selectRegion(target: DiscoveryTarget): string {
    // Route EU targets to EU region for data residency
    if (target.region?.startsWith('eu-')) {
      return 'eu-west-1';
    }
    return 'us-east-1';
  }
}
```

## Advanced Features

AI Discovery includes advanced capabilities for power users and complex use cases.

### Custom Tools Development

Extend AI Discovery with custom tools for proprietary systems:

```typescript
// Custom tool for proprietary monitoring system
import { Tool } from '@cmdb/ai-discovery';

export class ProprietaryMonitoringTool extends Tool {
  name = 'query_proprietary_monitoring';
  description = 'Queries our proprietary monitoring system for infrastructure data';

  parameters = {
    type: 'object',
    properties: {
      resource_id: {
        type: 'string',
        description: 'Resource identifier in monitoring system'
      },
      metric_type: {
        type: 'string',
        enum: ['cpu', 'memory', 'disk', 'network'],
        description: 'Type of metric to query'
      }
    },
    required: ['resource_id']
  };

  async execute(params: { resource_id: string; metric_type?: string }): Promise<any> {
    // Call proprietary API
    const client = new ProprietaryMonitoringClient({
      apiKey: process.env.PROPRIETARY_MONITORING_API_KEY
    });

    const metrics = await client.getResourceMetrics({
      resourceId: params.resource_id,
      metricType: params.metric_type || 'all'
    });

    return {
      resource: params.resource_id,
      metrics: metrics,
      timestamp: new Date().toISOString()
    };
  }
}

// Register custom tool
aiDiscoveryEngine.registerTool(new ProprietaryMonitoringTool());
```

**Tool registration:**

```typescript
// Register multiple custom tools
const customTools = [
  new ProprietaryMonitoringTool(),
  new CustomCMDBQueryTool(),
  new LegacySystemAPITool()
];

aiDiscoveryEngine.registerTools(customTools);
```

### Multi-Step Discovery Workflows

Chain multiple discoveries for complex scenarios:

```typescript
// Multi-step workflow: Discover web server → Discover database → Map relationship
const workflowDefinition = {
  name: 'web-app-full-stack-discovery',
  steps: [
    {
      id: 'discover-web-server',
      type: 'ai-discovery',
      targetType: 'web-server',
      config: { targetHost: '10.0.1.50' }
    },
    {
      id: 'extract-db-connection',
      type: 'data-extraction',
      input: '${discover-web-server.metadata.configFiles}',
      extract: {
        dbHost: 'database.host',
        dbPort: 'database.port'
      }
    },
    {
      id: 'discover-database',
      type: 'ai-discovery',
      targetType: 'database',
      config: {
        targetHost: '${extract-db-connection.dbHost}',
        targetPort: '${extract-db-connection.dbPort}'
      }
    },
    {
      id: 'create-relationship',
      type: 'create-relationship',
      source: '${discover-web-server.ci_id}',
      target: '${discover-database.ci_id}',
      relationshipType: 'CONNECTS_TO'
    }
  ]
};

// Execute workflow
const result = await workflowEngine.execute(workflowDefinition);
```

### Confidence Scoring Tuning

Adjust confidence thresholds based on your requirements:

```typescript
// Confidence score calculation
interface ConfidenceFactors {
  patternMatchScore: number;      // 0-1: How well target matches pattern
  dataCompletenessScore: number;  // 0-1: % of expected fields found
  validationScore: number;        // 0-1: Cross-validation checks passed
  llmConfidence: number;          // 0-1: LLM's self-reported confidence
}

function calculateConfidence(factors: ConfidenceFactors): number {
  // Weighted average
  return (
    factors.patternMatchScore * 0.3 +
    factors.dataCompletenessScore * 0.3 +
    factors.validationScore * 0.2 +
    factors.llmConfidence * 0.2
  );
}

// Custom confidence thresholds per CI type
const confidenceThresholds = {
  'web-server': 0.85,      // Lower risk, lower threshold
  'database': 0.90,        // Higher risk, higher threshold
  'security-device': 0.95  // Critical, highest threshold
};
```

### Session Replay for Debugging

Replay AI discovery sessions to debug issues:

```bash
# Replay a session
curl -X POST http://localhost:3000/api/v1/ai/sessions/{sessionId}/replay \
  -H "Content-Type: application/json" \
  -d '{
    "debugMode": true,
    "stepByStep": true
  }'

# Response includes detailed trace
{
  "sessionId": "sess_abc123_replay",
  "originalSessionId": "sess_abc123",
  "steps": [
    {
      "stepNumber": 1,
      "tool": "port_scan",
      "input": { "targetHost": "10.0.1.50" },
      "output": { "openPorts": [80, 443, 22] },
      "duration": 1234,
      "cost": 0.00
    },
    {
      "stepNumber": 2,
      "tool": "llm_analyze",
      "input": { "context": "..." },
      "output": { "analysis": "...", "next_steps": [...] },
      "duration": 3456,
      "cost": 0.12,
      "tokensUsed": { "input": 543, "output": 234 }
    }
  ],
  "comparison": {
    "originalResult": { "ci_type": "web-server", "confidence": 0.92 },
    "replayResult": { "ci_type": "web-server", "confidence": 0.92 },
    "match": true
  }
}
```

### Pattern Versioning and Rollback

Roll back to previous pattern versions if issues arise:

```typescript
// Pattern version history
GET /api/v1/ai/patterns/{patternId}/versions

// Response
{
  "patternId": "nginx-web-server",
  "versions": [
    {
      "version": "2.0.0",
      "status": "active",
      "deployedAt": "2025-11-01T10:00:00Z",
      "successRate": 0.87,  // Lower than expected!
      "executionCount": 145
    },
    {
      "version": "1.5.0",
      "status": "deprecated",
      "deployedAt": "2025-10-15T10:00:00Z",
      "successRate": 0.94,  // Better success rate
      "executionCount": 1523
    }
  ]
}

// Rollback to previous version
POST /api/v1/ai/patterns/{patternId}/rollback
{
  "targetVersion": "1.5.0",
  "reason": "Version 2.0.0 has lower success rate (87% vs 94%)"
}

// Response
{
  "success": true,
  "rolledBackFrom": "2.0.0",
  "rolledBackTo": "1.5.0",
  "changeId": "CHG0012345",  // ITIL change ticket created
  "message": "Pattern rolled back successfully"
}
```

## Next Steps

1. **Deploy database schema**: `./scripts/deploy-ai-discovery-db.sh`
2. **Configure LLM provider**: Add API keys to `.env`
3. **Create discovery definition**: Use UI or API
4. **Run initial discoveries**: Build pattern library
5. **Enable auto-approval**: Let the system learn automatically
6. **Monitor costs**: Review analytics dashboard regularly

---

**Need help?** See [Troubleshooting](/troubleshooting/v3-troubleshooting#ai-discovery-issues) or check the [FAQ](/reference/faq#ai-discovery).
