/**
 * AI Discovery Package
 * Provider-agnostic AI-powered infrastructure discovery
 *
 * Supports:
 * - Anthropic Claude (claude-sonnet, claude-opus, claude-haiku)
 * - OpenAI (gpt-4, gpt-3.5-turbo)
 * - Custom/Private LLMs (vLLM, Ollama, LocalAI, etc.)
 */

export * from './types';
export * from './providers';
export * from './tools';
export * from './ai-agent-coordinator';

// Main exports for easy usage
export { AIAgentCoordinator } from './ai-agent-coordinator';
export {
  createLLMProvider,
  getDefaultLLMConfig,
  testLLMConnection,
} from './providers';
export { getAllDiscoveryTools, getBasicDiscoveryTools } from './tools';

// Re-export key types for convenience
export type {
  ILLMProvider,
  LLMConfig,
  LLMProvider,
  DiscoveryTool,
  AIDiscoveryContext,
  AIDiscoveryResult,
  AIDiscoverySession,
  DiscoveryPattern,
  PatternMatch,
} from './types';
