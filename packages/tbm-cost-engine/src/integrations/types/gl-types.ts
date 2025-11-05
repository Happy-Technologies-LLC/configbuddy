/**
 * General Ledger Integration Types
 * Types for GL account mapping and cost synchronization
 */

export interface GLAccount {
  accountNumber: string;
  accountName: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  costCenter: string;
  costPool?: string; // TBM cost pool mapping
  department?: string;
  description?: string;
  isActive: boolean;
  parentAccount?: string;
}

export interface GLTransaction {
  transactionId: string;
  accountNumber: string;
  transactionDate: Date;
  amount: number;
  currency: string;
  debitCredit: 'debit' | 'credit';
  description?: string;
  costCenter?: string;
  project?: string;
  vendor?: string;
  reference?: string;
}

export interface GLCostSync {
  syncId: string;
  month: Date;
  accountsProcessed: number;
  totalAmount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  errors?: string[];
}

export interface GLCostPoolMapping {
  id: string;
  glAccount: string;
  glAccountName: string;
  costPool: string;
  costPoolName: string;
  allocationPercentage: number; // 0-100
  effectiveDate: Date;
  endDate?: Date;
  notes?: string;
}

export interface GLAssetDepreciation {
  assetId: string;
  assetName: string;
  glAccount: string;
  purchaseDate: Date;
  purchasePrice: number;
  currency: string;
  depreciationMethod: 'straight-line' | 'declining-balance' | 'units-of-production';
  usefulLife: number; // years
  salvageValue: number;
  currentBookValue: number;
  monthlyDepreciation: number;
}

export interface GLImportConfig {
  format: 'csv' | 'excel' | 'json' | 'api';
  delimiter?: string; // for CSV
  encoding?: string;
  columnMappings: {
    accountNumber: string;
    accountName: string;
    amount: string;
    date: string;
    costCenter?: string;
    description?: string;
  };
  dateFormat?: string;
  skipRows?: number;
  hasHeader: boolean;
}

export interface GLExportConfig {
  format: 'csv' | 'excel' | 'json';
  includeTransactions: boolean;
  includeBalances: boolean;
  period: {
    startDate: Date;
    endDate: Date;
  };
  filters?: {
    accounts?: string[];
    costCenters?: string[];
    minAmount?: number;
  };
}

export interface GLReconciliation {
  reconciliationId: string;
  month: Date;
  glTotalCost: number;
  cmdbTotalCost: number;
  variance: number;
  variancePercentage: number;
  status: 'matched' | 'variance' | 'unreconciled';
  accountBreakdown: Array<{
    glAccount: string;
    glAmount: number;
    cmdbAmount: number;
    difference: number;
  }>;
  notes?: string;
  reconciledBy?: string;
  reconciledAt?: Date;
}

export interface OnPremiseAssetCost {
  assetId: string;
  assetName: string;
  assetType: 'server' | 'storage' | 'network' | 'facility' | 'other';
  glAccount: string;
  location: string;
  monthlyCost: number; // depreciation + maintenance
  currency: string;
  breakdown: {
    depreciation: number;
    maintenance: number;
    power: number;
    cooling: number;
    space: number;
    other: number;
  };
}

export interface CostCenterAllocation {
  costCenter: string;
  costCenterName: string;
  totalBudget: number;
  totalSpent: number;
  currency: string;
  allocations: Array<{
    category: string;
    budgeted: number;
    actual: number;
    variance: number;
    variancePercentage: number;
  }>;
  period: {
    startDate: Date;
    endDate: Date;
  };
}

export interface GLSyncSchedule {
  id: string;
  name: string;
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfMonth?: number; // for monthly
  dayOfWeek?: number; // for weekly (0-6)
  timeOfDay: string; // HH:mm
  lastRun?: Date;
  nextRun: Date;
  config: GLImportConfig;
}
