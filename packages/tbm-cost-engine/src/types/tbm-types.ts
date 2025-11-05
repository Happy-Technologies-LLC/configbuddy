/**
 * TBM Cost Engine Types
 * Technology Business Management v5.0.1 implementation
 */

/**
 * TBM Resource Tower - Top-level categorization
 */
export enum TBMResourceTower {
  COMPUTE = 'compute',
  STORAGE = 'storage',
  NETWORK = 'network',
  DATA = 'data',
  SECURITY = 'security',
  END_USER = 'end_user',
  FACILITIES = 'facilities',
  RISK_COMPLIANCE = 'risk_compliance',
  IOT = 'iot',
  BLOCKCHAIN = 'blockchain',
  QUANTUM = 'quantum',
  APPLICATIONS = 'applications',
  TELECOM = 'telecom'
}

/**
 * TBM Sub-Tower - Second-level categorization
 */
export interface TBMSubTower {
  tower: TBMResourceTower;
  name: string;
  description: string;
}

/**
 * TBM Cost Pool - Categories of IT costs
 */
export enum TBMCostPool {
  LABOR_INTERNAL = 'labor_internal',
  LABOR_EXTERNAL = 'labor_external',
  HARDWARE = 'hardware',
  SOFTWARE = 'software',
  CLOUD = 'cloud',
  OUTSIDE_SERVICES = 'outside_services',
  FACILITIES = 'facilities',
  TELECOM = 'telecom'
}

/**
 * Cost Allocation Method
 */
export enum CostAllocationMethod {
  DIRECT = 'direct',
  USAGE_BASED = 'usage_based',
  EQUAL_SPLIT = 'equal_split'
}

/**
 * Depreciation Method
 */
export enum DepreciationMethod {
  STRAIGHT_LINE = 'straight_line',
  DECLINING_BALANCE = 'declining_balance'
}

/**
 * Tower Mapping Result
 */
export interface TowerMappingResult {
  ciId: string;
  ciType: string;
  tower: TBMResourceTower;
  subTower: string;
  costPool: TBMCostPool;
  confidence: number; // 0-1 scale
  mappingRules: string[];
}

/**
 * Cost Allocation Target
 */
export interface AllocationTarget {
  targetId: string;
  targetType: 'application_service' | 'business_service' | 'business_capability';
  targetName: string;
  allocatedAmount: number;
  allocationBasis: string;
  allocationPercentage: number;
}

/**
 * Cost Allocation Result
 */
export interface CostAllocationResult {
  ciId: string;
  ciName: string;
  tower: TBMResourceTower;
  subTower: string;
  costPool: TBMCostPool;
  monthlyCost: number;
  allocationMethod: CostAllocationMethod;
  allocatedTo: AllocationTarget[];
  unallocatedCost: number;
  timestamp: Date;
}

/**
 * Usage Metrics for usage-based allocation
 */
export interface UsageMetrics {
  ciId: string;
  metricType: 'cpu_hours' | 'storage_gb' | 'bandwidth_gb' | 'transactions' | 'users' | 'requests';
  value: number;
  period: 'hourly' | 'daily' | 'monthly';
  timestamp: Date;
}

/**
 * Cost Aggregation Result
 */
export interface CostAggregationResult {
  entityId: string;
  entityType: 'application_service' | 'business_service' | 'business_capability';
  entityName: string;
  totalMonthlyCost: number;
  costByTower: Record<TBMResourceTower, number>;
  costByPool: Record<TBMCostPool, number>;
  contributingCIs: Array<{
    ciId: string;
    ciName: string;
    cost: number;
    percentage: number;
  }>;
  timestamp: Date;
}

/**
 * Cost Trend Data
 */
export interface CostTrendData {
  entityId: string;
  entityType: 'ci' | 'application_service' | 'business_service' | 'business_capability';
  monthlyData: Array<{
    month: string;
    cost: number;
    change: number;
    changePercentage: number;
  }>;
  trend: 'increasing' | 'stable' | 'decreasing';
  averageMonthlyCost: number;
}
