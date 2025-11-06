-- Migration: Add AI Discovery Support to Discovery Definitions
-- Date: 2025-01-05
-- Description: Adds fields to support AI and hybrid discovery methods

BEGIN;

-- Add discovery method column (connector, ai, hybrid, agent)
ALTER TABLE discovery_definitions
ADD COLUMN IF NOT EXISTS discovery_method VARCHAR(50) DEFAULT 'connector' CHECK (discovery_method IN ('connector', 'ai', 'hybrid', 'agent'));

-- Add AI provider and model configuration
ALTER TABLE discovery_definitions
ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS ai_model VARCHAR(100);

-- Add pattern matching flag
ALTER TABLE discovery_definitions
ADD COLUMN IF NOT EXISTS enable_pattern_matching BOOLEAN DEFAULT true;

-- Add index for discovery method queries
CREATE INDEX IF NOT EXISTS idx_discovery_definitions_method
ON discovery_definitions(discovery_method)
WHERE discovery_method IN ('ai', 'hybrid');

-- Update existing definitions to use 'connector' method by default
UPDATE discovery_definitions
SET discovery_method = 'connector'
WHERE discovery_method IS NULL;

COMMIT;

-- Add helpful comment
COMMENT ON COLUMN discovery_definitions.discovery_method IS
  'Discovery method: connector (v2.0 connectors), ai (LLM-powered), hybrid (pattern + AI), agent (network protocols)';

COMMENT ON COLUMN discovery_definitions.ai_provider IS
  'LLM provider for AI discovery: anthropic, openai, custom';

COMMENT ON COLUMN discovery_definitions.ai_model IS
  'LLM model name: claude-sonnet-4-20250514, gpt-4-turbo-preview, llama-3-70b, etc.';

COMMENT ON COLUMN discovery_definitions.enable_pattern_matching IS
  'Enable pattern matching for hybrid discovery (patterns before AI)';
