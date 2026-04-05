# @configbuddy/ai-discovery

AI-powered infrastructure discovery module for ConfigBuddy. Uses LLMs (Anthropic Claude, OpenAI GPT) to intelligently discover and catalog infrastructure resources, then compiles successful discoveries into reusable patterns.

## How It Works

1. **AI-Driven Discovery**: An LLM agent coordinates infrastructure discovery using tools (SSH, NMAP, HTTP) to explore networks and cloud environments, identifying servers, services, databases, and their relationships.

2. **Pattern Compilation**: After a successful AI discovery, the system compiles the sequence of tool calls, decisions, and extracted data into a deterministic reusable pattern.

3. **Pattern Replay**: On subsequent runs against similar infrastructure, compiled patterns execute directly -- no LLM call needed. This delivers ~10x faster discovery at zero LLM cost for known infrastructure shapes.

4. **Continuous Learning**: When patterns fail validation (infrastructure has changed), the system falls back to LLM-based discovery and compiles an updated pattern.

## Package Structure

```
packages/
  ai-discovery/src/     Core AI discovery module
    providers/           LLM provider integrations (Anthropic, OpenAI, custom)
    tools/               Discovery tools (SSH, NMAP, HTTP)
    pattern-*.ts         Pattern compiler, matcher, validator, analyzer, workflow
    ai-agent-coordinator.ts        Orchestrates LLM tool-use loops
    hybrid-discovery-orchestrator.ts  Combines pattern replay + AI fallback

  ai-ml-engine/src/     ML engines for operational intelligence
    engines/             Anomaly detection, drift detection, impact prediction
    types/               ML-specific type definitions

  common/src/types/     Shared type definitions (CI, discovery, relationships)
```

## Key Features

- **Multi-provider LLM support**: Anthropic Claude, OpenAI GPT, or custom/self-hosted models
- **Pattern caching**: Redis-backed pattern cache for sub-second lookups
- **Anomaly detection**: Statistical ML models flag configuration anomalies
- **Drift detection**: Detect configuration drift across discovered infrastructure
- **Impact prediction**: Predict blast radius of changes using graph relationships

## License

Apache-2.0
