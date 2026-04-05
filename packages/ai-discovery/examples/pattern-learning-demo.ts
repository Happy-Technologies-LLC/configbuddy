// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Pattern Learning Demo
 * Demonstrates automatic pattern generation from AI discoveries
 */

import {
  HybridDiscoveryOrchestrator,
  PatternAnalyzer,
  PatternCompiler,
  PatternWorkflow,
  PatternValidator,
  AIDiscoveryContext,
} from '../src';

async function main() {
  console.log('='.repeat(70));
  console.log('Pattern Learning Demo: From AI to Patterns');
  console.log('='.repeat(70));
  console.log('');
  console.log('This demo shows how the system learns patterns from AI discoveries');
  console.log('');

  // Initialize components
  const orchestrator = new HybridDiscoveryOrchestrator({
    aiEnabled: true,
    patternMatchingEnabled: true,
  });

  const analyzer = new PatternAnalyzer();
  const compiler = new PatternCompiler(analyzer);
  const validator = new PatternValidator();
  const workflow = new PatternWorkflow();

  // Simulate discovering 3 similar Spring Boot applications
  console.log('Step 1: Discovering Multiple Similar Services');
  console.log('-'.repeat(70));
  console.log('');

  const springBootApps: AIDiscoveryContext[] = [
    {
      targetHost: 'api1.example.com',
      targetPort: 8080,
      scanResult: {
        http: {
          headers: {
            'X-Application-Context': 'order-service:prod:8080',
            'Content-Type': 'application/json',
          },
          endpoints: ['/actuator/health', '/actuator/info'],
        },
      },
    },
    {
      targetHost: 'api2.example.com',
      targetPort: 8080,
      scanResult: {
        http: {
          headers: {
            'X-Application-Context': 'user-service:prod:8080',
            'Content-Type': 'application/json',
          },
          endpoints: ['/actuator/health', '/actuator/info', '/actuator/metrics'],
        },
      },
    },
    {
      targetHost: 'api3.example.com',
      targetPort: 8080,
      scanResult: {
        http: {
          headers: {
            'X-Application-Context': 'payment-service:prod:8080',
            'Content-Type': 'application/json',
          },
          endpoints: ['/actuator/health', '/actuator/info'],
        },
      },
    },
  ];

  console.log(`Discovering ${springBootApps.length} services (simulated)...`);
  console.log('');

  for (let i = 0; i < springBootApps.length; i++) {
    const app = springBootApps[i];
    console.log(`  ${i + 1}. ${app.targetHost}:${app.targetPort}`);
    console.log(
      `     Headers: X-Application-Context=${app.scanResult?.http?.headers?.['X-Application-Context']}`
    );
    console.log(
      `     Endpoints: ${app.scanResult?.http?.endpoints?.join(', ')}`
    );

    // In real scenario, this would be actual AI discovery
    // For demo, we'll simulate the result
    const result = await orchestrator.discover(app);
    console.log(`     Result: ${result.method}, confidence: ${result.confidence.toFixed(2)}`);
    console.log('');
  }

  // Step 2: Analyze for patterns
  console.log('Step 2: Analyzing Discoveries for Patterns');
  console.log('-'.repeat(70));
  console.log('');

  console.log('Looking for repeating patterns in discoveries...');

  // Get pattern candidates
  const candidates = await compiler.getCandidates();

  if (candidates.length === 0) {
    console.log('❌ No pattern candidates found yet.');
    console.log('');
    console.log('💡 Tip: Patterns are identified after 3+ similar discoveries.');
    console.log('   Continue discovering similar services to build patterns.');
    console.log('');
  } else {
    console.log(`✅ Found ${candidates.length} pattern candidate(s)!`);
    console.log('');

    for (const candidate of candidates) {
      console.log(`Pattern Candidate: ${candidate.suggestedName}`);
      console.log(`  Category: ${candidate.suggestedCategory}`);
      console.log(`  Sessions: ${candidate.signature.sessionCount}`);
      console.log(`  Confidence: ${(candidate.signature.confidenceScore * 100).toFixed(0)}%`);
      console.log('  Common Elements:');
      console.log(`    - Ports: ${candidate.commonElements.ports.join(', ') || 'None'}`);
      console.log(`    - Headers: ${candidate.commonElements.headers.join(', ') || 'None'}`);
      console.log(`    - Endpoints: ${candidate.commonElements.endpoints.join(', ') || 'None'}`);
      console.log('');
    }

    // Step 3: Compile pattern
    console.log('Step 3: Compiling Pattern Code');
    console.log('-'.repeat(70));
    console.log('');

    const candidate = candidates[0];
    console.log(`Compiling pattern: ${candidate.suggestedName}...`);

    // For demo, create a sample pattern
    const sampleSessions = createSampleSessions(springBootApps);
    const pattern = await compiler.compilePattern(sampleSessions);

    console.log('✅ Pattern compiled successfully!');
    console.log('');
    console.log('Generated Detection Code:');
    console.log('---');
    console.log(pattern.detectionCode.substring(0, 400) + '...');
    console.log('---');
    console.log('');
    console.log('Generated Discovery Code:');
    console.log('---');
    console.log(pattern.discoveryCode.substring(0, 400) + '...');
    console.log('---');
    console.log('');

    // Step 4: Validate pattern
    console.log('Step 4: Validating Pattern');
    console.log('-'.repeat(70));
    console.log('');

    console.log('Running validation checks...');
    const validation = await validator.validate(pattern);

    console.log(`  Syntax Check: ${validation.errors.length === 0 ? '✅ Pass' : '❌ Fail'}`);
    console.log(`  Security Check: ${validation.warnings.length === 0 ? '✅ Pass' : '⚠️  Warnings'}`);
    console.log(`  Test Cases: ${validation.testResults.filter(t => t.passed).length}/${validation.testResults.length} passed`);
    console.log('');

    if (validation.errors.length > 0) {
      console.log('Errors:');
      validation.errors.forEach(err => console.log(`  ❌ ${err}`));
      console.log('');
    }

    if (validation.warnings.length > 0) {
      console.log('Warnings:');
      validation.warnings.forEach(warn => console.log(`  ⚠️  ${warn}`));
      console.log('');
    }

    if (validation.isValid) {
      console.log('✅ Pattern validation passed!');
    } else {
      console.log('❌ Pattern validation failed - needs revision');
    }
    console.log('');

    // Step 5: Approval workflow
    console.log('Step 5: Approval Workflow');
    console.log('-'.repeat(70));
    console.log('');

    console.log('Pattern Lifecycle:');
    console.log('  1. Draft     → Pattern created by compiler');
    console.log('  2. Review    → Submitted for human review');
    console.log('  3. Approved  → Approved by reviewer');
    console.log('  4. Active    → Enabled for discovery');
    console.log('');

    console.log(`Current status: ${pattern.status.toUpperCase()}`);
    console.log('');

    // Simulate workflow
    if (validation.isValid) {
      console.log('Submitting pattern for review...');
      // Note: In real scenario, pattern would be saved to DB first
      // const submitResult = await workflow.submitForReview(pattern.patternId, 'demo-user');
      console.log('✅ Pattern submitted for review');
      console.log('');

      // Check auto-approval eligibility
      const autoApprovalEligible =
        pattern.learnedFromSessions &&
        pattern.learnedFromSessions.length >= 5 &&
        pattern.confidenceScore >= 0.9;

      if (autoApprovalEligible) {
        console.log('✅ Pattern eligible for auto-approval!');
        console.log('   (Learned from 5+ sessions with 90%+ confidence)');
      } else {
        console.log('⏳ Pattern requires manual review');
        console.log(`   (Sessions: ${pattern.learnedFromSessions?.length || 0}, Confidence: ${(pattern.confidenceScore * 100).toFixed(0)}%)`);
      }
      console.log('');
    }
  }

  // Summary
  console.log('');
  console.log('='.repeat(70));
  console.log('Pattern Learning Summary');
  console.log('='.repeat(70));
  console.log('');
  console.log('The Pattern Learning Flywheel:');
  console.log('');
  console.log('  1. AI discovers unknown service    (20s, $0.02)');
  console.log('  2. System tracks discovery steps');
  console.log('  3. After 3+ similar discoveries    Pattern suggested');
  console.log('  4. Pattern compiler generates code');
  console.log('  5. Validator tests the pattern');
  console.log('  6. Review → Approve → Activate');
  console.log('  7. Future discoveries use pattern  (<1s, $0.00)');
  console.log('');
  console.log('Benefits:');
  console.log('  ✅ Cost reduction: $0.02 → $0.00 (100% savings)');
  console.log('  ✅ Speed increase: 20s → <1s (95% faster)');
  console.log('  ✅ System gets smarter over time');
  console.log('  ✅ No manual pattern creation needed');
  console.log('');
  console.log('Auto-Approval Criteria:');
  console.log('  • Learned from 5+ sessions');
  console.log('  • Confidence score ≥ 90%');
  console.log('  • Passes all validation checks');
  console.log('');
  console.log('='.repeat(70));
}

/**
 * Create sample AI discovery sessions for demo
 */
function createSampleSessions(contexts: AIDiscoveryContext[]): any[] {
  return contexts.map((ctx, index) => ({
    id: `session-${index + 1}`,
    sessionId: `demo-session-${index + 1}`,
    targetHost: ctx.targetHost,
    targetPort: ctx.targetPort,
    status: 'completed',
    startedAt: new Date(),
    completedAt: new Date(),
    durationMs: 15000 + Math.random() * 10000,
    aiModel: 'claude-sonnet-4-20250514',
    totalTokens: 3000 + Math.floor(Math.random() * 2000),
    promptTokens: 2000,
    completionTokens: 1000,
    estimatedCost: 0.025,
    discoveredCIs: [
      {
        _type: 'application',
        name: `Spring Boot on ${ctx.targetHost}`,
        metadata: {
          technology: 'Spring Boot',
          framework: 'Spring Framework',
        },
      },
    ],
    confidenceScore: 0.92 + Math.random() * 0.08,
    toolCalls: [
      {
        id: 'tool-1',
        toolName: 'http_probe',
        input: { host: ctx.targetHost, port: ctx.targetPort, path: '/' },
        output: ctx.scanResult,
        success: true,
        executionTime: 150,
        timestamp: new Date(),
      },
      {
        id: 'tool-2',
        toolName: 'http_probe',
        input: {
          host: ctx.targetHost,
          port: ctx.targetPort,
          path: '/actuator/health',
        },
        output: { status: 'UP' },
        success: true,
        executionTime: 120,
        timestamp: new Date(),
      },
    ],
    aiReasoning: `Based on the X-Application-Context header and /actuator endpoints, this is a Spring Boot application.`,
    retryCount: 0,
  }));
}

// Run demo
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
