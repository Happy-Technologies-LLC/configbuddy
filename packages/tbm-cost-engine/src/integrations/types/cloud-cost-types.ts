/**
 * Cloud Cost Integration Types
 * Types for AWS, Azure, and GCP cost data
 */

export interface CostBreakdown {
  total: number;
  currency: string;
  breakdown: Array<{
    category: string;
    amount: number;
    currency: string;
    percentage?: number;
  }>;
  metadata?: Record<string, any>;
}

export interface DailyCostData {
  date: Date;
  amount: number;
  currency: string;
  service?: string;
  resourceId?: string;
  tags?: Record<string, string>;
}

export interface ResourceCost {
  resourceId: string;
  resourceName?: string;
  resourceType?: string;
  totalCost: number;
  currency: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  breakdown?: CostBreakdown;
  tags?: Record<string, string>;
}

export interface CostAllocationTag {
  key: string;
  value: string;
  description?: string;
}

export interface CostAnomalyDetection {
  detected: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  expectedCost: number;
  actualCost: number;
  variance: number;
  variancePercentage: number;
  reason?: string;
}

export interface CostForecast {
  period: {
    startDate: Date;
    endDate: Date;
  };
  predictedCost: number;
  currency: string;
  confidence: number; // 0-1
  basedOnDays: number;
}

// AWS-specific types
export interface AWSCostData {
  accountId: string;
  service: string;
  region?: string;
  resourceId?: string;
  cost: number;
  currency: string;
  usageType?: string;
  operation?: string;
  tags?: Record<string, string>;
}

export interface AWSCostExplorerParams {
  startDate: Date;
  endDate: Date;
  granularity: 'DAILY' | 'MONTHLY' | 'HOURLY';
  groupBy?: Array<{
    type: 'DIMENSION' | 'TAG';
    key: string;
  }>;
  filter?: any; // AWS filter expression
}

// Azure-specific types
export interface AzureCostData {
  subscriptionId: string;
  resourceGroupName?: string;
  resourceId?: string;
  serviceName: string;
  cost: number;
  currency: string;
  meterCategory?: string;
  meterSubCategory?: string;
  tags?: Record<string, string>;
}

export interface AzureCostManagementParams {
  scope: string; // subscription, resource group, or management group
  startDate: Date;
  endDate: Date;
  granularity: 'Daily' | 'Monthly';
  aggregation?: Record<string, any>;
}

// GCP-specific types
export interface GCPCostData {
  projectId: string;
  projectName?: string;
  serviceName: string;
  skuDescription?: string;
  cost: number;
  currency: string;
  location?: string;
  labels?: Record<string, string>;
}

export interface GCPBillingParams {
  projectId?: string;
  startDate: Date;
  endDate: Date;
  services?: string[];
  locations?: string[];
}

// Common sync types
export interface SyncResult {
  success: boolean;
  provider: 'aws' | 'azure' | 'gcp' | 'gl' | 'license';
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errors?: Array<{
    resourceId?: string;
    error: string;
    timestamp: Date;
  }>;
  syncStartTime: Date;
  syncEndTime: Date;
  duration: number; // milliseconds
}

export interface CostSyncConfig {
  provider: 'aws' | 'azure' | 'gcp';
  credentialId: string;
  enabled: boolean;
  schedule: string; // cron expression
  lookbackDays: number;
  batchSize: number;
  retryAttempts: number;
  retryDelay: number; // milliseconds
}

export interface ReconciliationReport {
  month: Date;
  totalCloudCosts: number;
  totalGLCosts: number;
  totalLicenseCosts: number;
  variance: number;
  variancePercentage: number;
  reconciled: boolean;
  discrepancies: Array<{
    source: string;
    expected: number;
    actual: number;
    difference: number;
    reason?: string;
  }>;
  generatedAt: Date;
}
