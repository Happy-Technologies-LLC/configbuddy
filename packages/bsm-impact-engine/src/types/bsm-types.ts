/**
 * BSM (Business Service Mapping) Types
 * Re-exports from @cmdb/unified-model plus additional types for impact engine
 */

// Re-export core BSM types from unified model
export type {
  BusinessCriticality,
  DataClassification,
  RiskRating,
  BSMCIAttributes,
  ComplianceFramework,
  ComplianceRequirement,
  BSMBusinessServiceAttributes,
  OperationalStatus,
  CapabilityType,
  StrategicImportance,
  MaturityLevel,
  LifecycleStage,
  RevenueImpact,
} from '@cmdb/unified-model';

export type {
  BusinessService,
  BusinessServiceUpdate,
  BusinessServiceInput,
  BusinessServiceFilters,
} from '@cmdb/unified-model';

export type {
  ConfigurationItem,
  ConfigurationItemUpdate,
  ConfigurationItemInput,
  CIFilters,
} from '@cmdb/unified-model';

/**
 * Business Criticality Tier Enum for convenience
 */
export enum BusinessCriticalityTier {
  TIER_0 = 'tier_0', // Mission-critical, business-stopping
  TIER_1 = 'tier_1', // Business-critical
  TIER_2 = 'tier_2', // Important
  TIER_3 = 'tier_3', // Standard
  TIER_4 = 'tier_4', // Low priority
}

/**
 * Risk Level Enum
 */
export enum RiskLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * Criticality Weight Configuration
 */
export interface CriticalityWeights {
  annualRevenue: number; // Weight for annual revenue (default: 0.40)
  customerCount: number; // Weight for customer count (default: 0.25)
  transactionVolume: number; // Weight for transaction volume (default: 0.15)
  complianceRequirements: number; // Weight for compliance (default: 0.10)
  userCount: number; // Weight for internal users (default: 0.10)
}

/**
 * Default criticality scoring weights
 */
export const DEFAULT_CRITICALITY_WEIGHTS: CriticalityWeights = {
  annualRevenue: 0.40,
  customerCount: 0.25,
  transactionVolume: 0.15,
  complianceRequirements: 0.10,
  userCount: 0.10,
};

/**
 * Revenue thresholds for tier classification (in USD)
 */
export interface TierRevenueThresholds {
  tier_0: number; // > $1M
  tier_1: number; // $500K - $1M
  tier_2: number; // $100K - $500K
  tier_3: number; // $10K - $100K
  tier_4: number; // < $10K
}

/**
 * Default tier revenue thresholds
 */
export const DEFAULT_TIER_THRESHOLDS: TierRevenueThresholds = {
  tier_0: 1_000_000,
  tier_1: 500_000,
  tier_2: 100_000,
  tier_3: 10_000,
  tier_4: 0,
};

/**
 * Criticality multipliers for downtime cost calculation
 */
export const CRITICALITY_MULTIPLIERS: Record<string, number> = {
  tier_0: 2.0,
  tier_1: 1.5,
  tier_2: 1.2,
  tier_3: 1.0,
  tier_4: 0.8,
};
