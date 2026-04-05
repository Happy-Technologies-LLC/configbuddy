// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Test Data Helpers for AI Discovery
 */

export const mockDiscoveryPattern = () => ({
  pattern_id: 'pattern-001',
  name: 'AWS EC2 Instance Discovery',
  description: 'Discover EC2 instances and their configurations',
  target_type: 'aws-ec2',
  ai_provider: 'anthropic' as const,
  model: 'claude-3-5-sonnet-20241022',
  tools: ['http', 'ssh'],
  prompt_template: 'Discover AWS EC2 instances in region {region}',
  validation_rules: {
    required_fields: ['instance_id', 'instance_type'],
    min_confidence: 0.7,
  },
});

export const mockDiscoveryResult = () => ({
  pattern_id: 'pattern-001',
  execution_id: 'exec-001',
  status: 'completed' as const,
  discovered_cis: [
    {
      ci_id: 'i-1234567890abcdef0',
      ci_name: 'web-server-01',
      ci_type: 'virtual-machine',
      confidence_score: 0.95,
      metadata: {
        instance_type: 't3.medium',
        region: 'us-east-1',
        state: 'running',
      },
    },
  ],
  confidence_score: 0.95,
  tokens_used: 1500,
  duration_ms: 3000,
});

export const mockAIProvider = () => ({
  provider: 'anthropic' as const,
  api_key: 'test-api-key',
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 4096,
  temperature: 0,
});

export const mockTool = () => ({
  name: 'http_request',
  description: 'Make HTTP requests to APIs',
  input_schema: {
    type: 'object',
    properties: {
      url: { type: 'string' },
      method: { type: 'string' },
    },
    required: ['url'],
  },
});
