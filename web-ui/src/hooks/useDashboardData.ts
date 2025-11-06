import { useQuery, useMutation, useSubscription } from '@apollo/client';
import { useState, useEffect } from 'react';
import {
  EXECUTIVE_SUMMARY_QUERY,
  CIO_METRICS_QUERY,
  OPEN_INCIDENTS_QUERY,
  CHANGES_IN_PROGRESS_QUERY,
  CI_STATUS_QUERY,
  TOP_FAILING_CIS_QUERY,
  SLA_COMPLIANCE_QUERY,
  BASELINE_COMPLIANCE_QUERY,
  CLOUD_COSTS_QUERY,
  ON_PREM_VS_CLOUD_QUERY,
  COST_BY_TOWER_QUERY,
  BUDGET_VARIANCE_QUERY,
  UNIT_ECONOMICS_QUERY,
  COST_OPTIMIZATION_QUERY,
  SERVICE_HEALTH_QUERY,
  REVENUE_AT_RISK_QUERY,
  CUSTOMER_IMPACT_QUERY,
  COMPLIANCE_STATUS_QUERY,
  VALUE_STREAM_HEALTH_QUERY,
  SERVICE_DEPENDENCIES_QUERY,
  EXPORT_DASHBOARD_QUERY,
  INCIDENT_UPDATES_SUBSCRIPTION,
  CHANGE_UPDATES_SUBSCRIPTION,
} from '../graphql/queries/dashboard.queries';

export interface TimeRange {
  start: string;
  end: string;
  label?: string;
}

// Executive Dashboard Hook
export const useExecutiveDashboard = (timeRange: TimeRange) => {
  const { data, loading, error, refetch } = useQuery(EXECUTIVE_SUMMARY_QUERY, {
    variables: { timeRange },
    pollInterval: 30000, // Auto-refresh every 30 seconds
  });

  return {
    data: data?.executiveSummary,
    loading,
    error,
    refetch,
  };
};

// CIO Dashboard Hook
export const useCIODashboard = (timeRange: TimeRange) => {
  const { data, loading, error, refetch } = useQuery(CIO_METRICS_QUERY, {
    variables: { timeRange },
    pollInterval: 30000,
  });

  return {
    data: data?.cioMetrics,
    loading,
    error,
    refetch,
  };
};

// ITSM Dashboard Hook
export const useITSMDashboard = (filters?: any) => {
  const incidents = useQuery(OPEN_INCIDENTS_QUERY, {
    variables: { filters },
    pollInterval: 10000, // More frequent for incidents
  });

  const changes = useQuery(CHANGES_IN_PROGRESS_QUERY, {
    pollInterval: 10000,
  });

  const ciStatus = useQuery(CI_STATUS_QUERY, {
    pollInterval: 30000,
  });

  const topFailing = useQuery(TOP_FAILING_CIS_QUERY, {
    variables: { timeRange: { start: '30d', end: 'now' } },
    pollInterval: 60000,
  });

  const slaCompliance = useQuery(SLA_COMPLIANCE_QUERY, {
    variables: { timeRange: { start: '30d', end: 'now' } },
    pollInterval: 60000,
  });

  const baselineCompliance = useQuery(BASELINE_COMPLIANCE_QUERY, {
    pollInterval: 60000,
  });

  // Real-time subscriptions
  const incidentUpdates = useSubscription(INCIDENT_UPDATES_SUBSCRIPTION);
  const changeUpdates = useSubscription(CHANGE_UPDATES_SUBSCRIPTION);

  return {
    incidents: {
      data: incidents.data?.openIncidents || [],
      loading: incidents.loading,
      error: incidents.error,
      refetch: incidents.refetch,
    },
    changes: {
      data: changes.data?.changesInProgress || [],
      loading: changes.loading,
      error: changes.error,
      refetch: changes.refetch,
    },
    ciStatus: {
      data: ciStatus.data?.ciStatus || [],
      loading: ciStatus.loading,
      error: ciStatus.error,
      refetch: ciStatus.refetch,
    },
    topFailing: {
      data: topFailing.data?.topFailingCIs || [],
      loading: topFailing.loading,
      error: topFailing.error,
      refetch: topFailing.refetch,
    },
    slaCompliance: {
      data: slaCompliance.data?.slaCompliance || [],
      loading: slaCompliance.loading,
      error: slaCompliance.error,
      refetch: slaCompliance.refetch,
    },
    baselineCompliance: {
      data: baselineCompliance.data?.baselineCompliance || [],
      loading: baselineCompliance.loading,
      error: baselineCompliance.error,
      refetch: baselineCompliance.refetch,
    },
    realTimeUpdates: {
      incidents: incidentUpdates.data?.incidentUpdated,
      changes: changeUpdates.data?.changeUpdated,
    },
  };
};

// FinOps Dashboard Hook
export const useFinOpsDashboard = (timeRange: TimeRange) => {
  const cloudCosts = useQuery(CLOUD_COSTS_QUERY, {
    variables: { timeRange },
    pollInterval: 60000,
  });

  const onPremVsCloud = useQuery(ON_PREM_VS_CLOUD_QUERY, {
    variables: { timeRange },
    pollInterval: 60000,
  });

  const costByTower = useQuery(COST_BY_TOWER_QUERY, {
    variables: { timeRange },
    pollInterval: 60000,
  });

  const budgetVariance = useQuery(BUDGET_VARIANCE_QUERY, {
    variables: { timeRange },
    pollInterval: 60000,
  });

  const unitEconomics = useQuery(UNIT_ECONOMICS_QUERY, {
    variables: { timeRange },
    pollInterval: 60000,
  });

  const costOptimization = useQuery(COST_OPTIMIZATION_QUERY, {
    pollInterval: 300000, // Every 5 minutes
  });

  return {
    cloudCosts: {
      data: cloudCosts.data?.cloudCosts || [],
      loading: cloudCosts.loading,
      error: cloudCosts.error,
      refetch: cloudCosts.refetch,
    },
    onPremVsCloud: {
      data: onPremVsCloud.data?.onPremVsCloud,
      loading: onPremVsCloud.loading,
      error: onPremVsCloud.error,
      refetch: onPremVsCloud.refetch,
    },
    costByTower: {
      data: costByTower.data?.costByTower || [],
      loading: costByTower.loading,
      error: costByTower.error,
      refetch: costByTower.refetch,
    },
    budgetVariance: {
      data: budgetVariance.data?.budgetVariance || [],
      loading: budgetVariance.loading,
      error: budgetVariance.error,
      refetch: budgetVariance.refetch,
    },
    unitEconomics: {
      data: unitEconomics.data?.unitEconomics || [],
      loading: unitEconomics.loading,
      error: unitEconomics.error,
      refetch: unitEconomics.refetch,
    },
    costOptimization: {
      data: costOptimization.data?.costOptimization,
      loading: costOptimization.loading,
      error: costOptimization.error,
      refetch: costOptimization.refetch,
    },
  };
};

// Business Service Dashboard Hook
export const useBusinessServiceDashboard = (serviceId?: string, businessUnit?: string) => {
  const serviceHealth = useQuery(SERVICE_HEALTH_QUERY, {
    variables: { serviceId, businessUnit },
    pollInterval: 30000,
    skip: !serviceId && !businessUnit,
  });

  const revenueAtRisk = useQuery(REVENUE_AT_RISK_QUERY, {
    variables: { serviceId },
    pollInterval: 30000,
    skip: !serviceId,
  });

  const customerImpact = useQuery(CUSTOMER_IMPACT_QUERY, {
    variables: { serviceId },
    pollInterval: 30000,
    skip: !serviceId,
  });

  const complianceStatus = useQuery(COMPLIANCE_STATUS_QUERY, {
    variables: { serviceId },
    pollInterval: 60000,
    skip: !serviceId,
  });

  const valueStreamHealth = useQuery(VALUE_STREAM_HEALTH_QUERY, {
    variables: { serviceId },
    pollInterval: 60000,
    skip: !serviceId,
  });

  const serviceDependencies = useQuery(SERVICE_DEPENDENCIES_QUERY, {
    variables: { serviceId, depth: 3 },
    pollInterval: 60000,
    skip: !serviceId,
  });

  return {
    serviceHealth: {
      data: serviceHealth.data?.serviceHealth,
      loading: serviceHealth.loading,
      error: serviceHealth.error,
      refetch: serviceHealth.refetch,
    },
    revenueAtRisk: {
      data: revenueAtRisk.data?.revenueAtRisk,
      loading: revenueAtRisk.loading,
      error: revenueAtRisk.error,
      refetch: revenueAtRisk.refetch,
    },
    customerImpact: {
      data: customerImpact.data?.customerImpact,
      loading: customerImpact.loading,
      error: customerImpact.error,
      refetch: customerImpact.refetch,
    },
    complianceStatus: {
      data: complianceStatus.data?.complianceStatus,
      loading: complianceStatus.loading,
      error: complianceStatus.error,
      refetch: complianceStatus.refetch,
    },
    valueStreamHealth: {
      data: valueStreamHealth.data?.valueStreamHealth,
      loading: valueStreamHealth.loading,
      error: valueStreamHealth.error,
      refetch: valueStreamHealth.refetch,
    },
    serviceDependencies: {
      data: serviceDependencies.data?.serviceDependencies,
      loading: serviceDependencies.loading,
      error: serviceDependencies.error,
      refetch: serviceDependencies.refetch,
    },
  };
};

// Export Dashboard Hook
export const useExportDashboard = () => {
  const [exportDashboard, { data, loading, error }] = useMutation(EXPORT_DASHBOARD_QUERY);

  const exportToPDF = async (dashboardType: string, filters?: any) => {
    try {
      const result = await exportDashboard({
        variables: {
          dashboardType,
          format: 'pdf',
          filters,
        },
      });
      if (result.data?.exportDashboard?.url) {
        window.open(result.data.exportDashboard.url, '_blank');
      }
    } catch (err) {
      console.error('Export to PDF failed:', err);
    }
  };

  const exportToExcel = async (dashboardType: string, filters?: any) => {
    try {
      const result = await exportDashboard({
        variables: {
          dashboardType,
          format: 'excel',
          filters,
        },
      });
      if (result.data?.exportDashboard?.url) {
        window.open(result.data.exportDashboard.url, '_blank');
      }
    } catch (err) {
      console.error('Export to Excel failed:', err);
    }
  };

  return {
    exportToPDF,
    exportToExcel,
    loading,
    error,
  };
};

// Time Range Helper Hook
export const useTimeRange = (defaultRange: string = '30d') => {
  const [timeRange, setTimeRange] = useState<TimeRange>({
    start: defaultRange,
    end: 'now',
    label: 'Last 30 days',
  });

  const updateTimeRange = (range: string) => {
    const ranges: Record<string, TimeRange> = {
      '7d': { start: '7d', end: 'now', label: 'Last 7 days' },
      '30d': { start: '30d', end: 'now', label: 'Last 30 days' },
      '90d': { start: '90d', end: 'now', label: 'Last 90 days' },
      '1y': { start: '1y', end: 'now', label: 'Last year' },
    };
    setTimeRange(ranges[range] || ranges['30d']);
  };

  return {
    timeRange,
    updateTimeRange,
  };
};
