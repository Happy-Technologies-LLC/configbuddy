/**
 * Dashboard Service
 * API client for Business Insights dashboards
 */

import { apiClient } from './api';

export interface TimeRange {
  days: number;
  startDate: string;
  endDate: string;
}

export interface DashboardResponse<T> {
  success: boolean;
  data: T;
  timeRange?: TimeRange;
  serviceId?: string;
  error?: string;
  message?: string;
}

// Executive Dashboard Types
export interface ExecutiveSummaryData {
  totalITSpend: number;
  costByCapability: Array<{
    capability: string;
    totalCost: number;
    businessServices: Array<{
      serviceId: string;
      serviceName: string;
      monthlyCost: number;
      applicationServices: Array<{
        serviceId: string;
        serviceName: string;
        monthlyCost: number;
      }>;
    }>;
  }>;
  costTrends: Array<{
    month: string;
    total: number;
    compute: number;
    storage: number;
    network: number;
    data: number;
    security: number;
    applications: number;
    budget: number;
    variance: number;
  }>;
  serviceHealthByTier: Array<{
    tier: string;
    averageHealthScore: number;
    serviceCount: number;
    trend: string;
  }>;
  riskMatrix: {
    services: Array<{
      id: string;
      name: string;
      criticality: string;
      riskLevel: string;
      type: string;
      description: string;
    }>;
  };
  topCostDrivers: Array<{
    serviceId: string;
    serviceName: string;
    monthlyCost: number;
    trend: string;
    changePercent: number;
  }>;
  valueScorecard: Array<{
    serviceId: string;
    serviceName: string;
    annualRevenue: number;
    monthlyCost: number;
    roi: number;
    customers: number;
  }>;
}

// CIO Dashboard Types
export interface CIOMetricsData {
  serviceAvailability: Array<{
    tier: string;
    averageAvailability: number;
    slaTarget: number;
    complianceStatus: string;
  }>;
  changeSuccessRates: {
    successful: number;
    failed: number;
    rollbacks: number;
    total: number;
    successRate: number;
  };
  incidentResponseTimes: Array<{
    priority: string;
    mttr: number;
    target: number;
    count: number;
  }>;
  configurationAccuracy: {
    totalCIs: number;
    accurateCIs: number;
    accuracyPercentage: number;
    driftDetected: number;
    lastAuditDate: string;
  };
  costByCapability: Array<{
    capability: string;
    cost: number;
    budgetAllocated: number;
    variance: number;
  }>;
  capacityPlanning: Array<{
    month: string;
    computeUtilization: number;
    storageUtilization: number;
    networkUtilization: number;
    forecast: number;
  }>;
}

// ITSM Dashboard Types
export interface ITSMDashboardData {
  openIncidents: Array<{
    id: string;
    title: string;
    priority: string;
    status: string;
    affectedCI: string;
    assignedTeam: string;
    createdAt: string;
    updatedAt: string;
    age: number;
  }>;
  changesInProgress: Array<{
    id: string;
    title: string;
    status: string;
    type: string;
    riskLevel: string;
    scheduledDate: string;
    affectedCIs: string[];
    assignedTo: string;
    createdAt: string;
  }>;
  ciStatus: Array<{
    status: string;
    count: number;
    cis: Array<{
      ci_id: string;
      name: string;
      type: string;
      status: string;
      environment: string;
      lastSeen: string;
    }>;
  }>;
  topFailingCIs: Array<{
    ci_id: string;
    name: string;
    type: string;
    incidentCount: number;
    mttr: number;
    lastFailure: string;
    recommendation: string;
  }>;
  slaCompliance: Array<{
    priority: string;
    withinSLA: number;
    total: number;
    compliancePercentage: number;
    target: number;
  }>;
  baselineCompliance: Array<{
    ci_id: string;
    name: string;
    type: string;
    driftSeverity: string;
    driftDetails: string;
    remediationStatus: string;
    lastChecked: string;
  }>;
}

// FinOps Dashboard Types
export interface FinOpsDashboardData {
  cloudCosts: Array<{
    month: string;
    aws: number;
    azure: number;
    gcp: number;
    total: number;
    forecast: number;
  }>;
  onPremVsCloud: {
    onPremCost: number;
    cloudCost: number;
    totalCost: number;
    tcoComparison: Array<{
      category: string;
      onPrem: number;
      cloud: number;
    }>;
  };
  costByTower: Array<{
    tower: string;
    cost: number;
    subTowers: Array<{
      name: string;
      cost: number;
    }>;
  }>;
  budgetVariance: Array<{
    capability: string;
    budgetAllocated: number;
    actualSpend: number;
    variance: number;
    variancePercent: number;
  }>;
  unitEconomics: Array<{
    metric: string;
    value: number;
    unit: string;
    trend: string;
    changePercent: number;
  }>;
  costOptimization: {
    recommendations: Array<{
      id: string;
      type: string;
      resource: string;
      currentCost: number;
      potentialSavings: number;
      description: string;
      priority: string;
    }>;
    totalPotentialSavings: number;
  };
}

// Business Service Dashboard Types
export interface BusinessServiceDashboardData {
  serviceHealth: Array<{
    businessUnit: string;
    businessServices: Array<{
      serviceId: string;
      serviceName: string;
      healthScore: number;
      status: string;
    }>;
  }>;
  revenueAtRisk: {
    totalAnnualRevenue: number;
    revenueAtRisk: number;
    percentageAtRisk: number;
    affectedIncidents: Array<{
      id: string;
      priority: string;
      estimatedImpact: number;
    }>;
  };
  customerImpact: {
    totalCustomers: number;
    customersImpacted: number;
    estimatedUserImpact: number;
    incidents: Array<{
      id: string;
      priority: string;
      usersAffected: number;
    }>;
  };
  complianceStatus: {
    pciCompliant: boolean;
    hipaaCompliant: boolean;
    soxCompliant: boolean;
    gdprCompliant: boolean;
    lastAuditDate: string;
    nonCompliantItems: Array<{
      requirement: string;
      status: string;
      remediation: string;
    }>;
  };
  valueStreamHealth: {
    stages: Array<{
      name: string;
      healthScore: number;
      throughput: number;
      bottleneck: boolean;
    }>;
    flowRate: number;
    cycleTime: number;
  };
  serviceDependencies: {
    nodes: Array<{
      id: string;
      label: string;
      type: string;
      healthScore: number;
      status: string;
      layer: number;
    }>;
    edges: Array<{
      id: string;
      from: string;
      to: string;
      type: string;
      healthImpact: number;
    }>;
  };
}

class DashboardService {
  /**
   * Get Executive Dashboard summary data
   */
  async getExecutiveDashboard(days: number = 30): Promise<ExecutiveSummaryData> {
    const response = await apiClient.get<DashboardResponse<ExecutiveSummaryData>>(
      `/dashboards/executive?days=${days}`
    );
    return response.data.data;
  }

  /**
   * Get CIO Dashboard metrics
   */
  async getCIODashboard(days: number = 30): Promise<CIOMetricsData> {
    const response = await apiClient.get<DashboardResponse<CIOMetricsData>>(
      `/dashboards/cio?days=${days}`
    );
    return response.data.data;
  }

  /**
   * Get ITSM Dashboard data
   */
  async getITSMDashboard(): Promise<ITSMDashboardData> {
    const response = await apiClient.get<DashboardResponse<ITSMDashboardData>>(
      `/dashboards/itsm`
    );
    return response.data.data;
  }

  /**
   * Get FinOps Dashboard data
   */
  async getFinOpsDashboard(days: number = 30): Promise<FinOpsDashboardData> {
    const response = await apiClient.get<DashboardResponse<FinOpsDashboardData>>(
      `/dashboards/finops?days=${days}`
    );
    return response.data.data;
  }

  /**
   * Get Business Service Dashboard data
   */
  async getBusinessServiceDashboard(serviceId?: string): Promise<BusinessServiceDashboardData> {
    const url = serviceId
      ? `/dashboards/business-service/${serviceId}`
      : `/dashboards/business-service`;

    const response = await apiClient.get<DashboardResponse<BusinessServiceDashboardData>>(url);
    return response.data.data;
  }
}

export default new DashboardService();
