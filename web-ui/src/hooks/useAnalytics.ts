/**
 * Custom React Hook for Analytics Data
 * Provides reusable data fetching logic with loading and error states
 */

import { useState, useEffect, useCallback } from 'react';
import {
  analyticsService,
  DashboardStats,
  CICountByType,
  CICountByStatus,
  CICountByEnvironment,
  DiscoveryStats,
  TopConnectedCI,
  RelationshipMatrix,
  ChangeTimelinePoint,
  HealthMetric,
  DateRangeParams,
} from '../services/analytics.service';

interface UseAnalyticsState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Generic hook for analytics data fetching
 */
function useAnalyticsData<T>(
  fetchFn: () => Promise<T>,
  dependencies: any[] = []
): UseAnalyticsState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    fetchData();
  }, dependencies);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for dashboard statistics
 */
export function useDashboardStats(): UseAnalyticsState<DashboardStats> {
  return useAnalyticsData(() => analyticsService.getDashboardStats());
}

/**
 * Hook for CI counts by type
 */
export function useCICountsByType(): UseAnalyticsState<CICountByType[]> {
  return useAnalyticsData(() => analyticsService.getCICountsByType());
}

/**
 * Hook for CI counts by status
 */
export function useCICountsByStatus(): UseAnalyticsState<CICountByStatus[]> {
  return useAnalyticsData(() => analyticsService.getCICountsByStatus());
}

/**
 * Hook for CI counts by environment
 */
export function useCICountsByEnvironment(): UseAnalyticsState<CICountByEnvironment[]> {
  return useAnalyticsData(() => analyticsService.getCICountsByEnvironment());
}

/**
 * Hook for discovery statistics
 */
export function useDiscoveryStats(
  dateRange?: DateRangeParams
): UseAnalyticsState<DiscoveryStats> {
  return useAnalyticsData(
    () => analyticsService.getDiscoveryStats(dateRange),
    [dateRange?.startDate, dateRange?.endDate]
  );
}

/**
 * Hook for top connected CIs
 */
export function useTopConnectedCIs(limit: number = 10): UseAnalyticsState<TopConnectedCI[]> {
  return useAnalyticsData(() => analyticsService.getTopConnectedCIs(limit), [limit]);
}

/**
 * Hook for relationship matrix
 */
export function useRelationshipMatrix(): UseAnalyticsState<RelationshipMatrix[]> {
  return useAnalyticsData(() => analyticsService.getRelationshipMatrix());
}

/**
 * Hook for change timeline
 */
export function useChangeTimeline(
  dateRange?: DateRangeParams
): UseAnalyticsState<ChangeTimelinePoint[]> {
  return useAnalyticsData(
    () => analyticsService.getChangeTimeline(dateRange),
    [dateRange?.startDate, dateRange?.endDate]
  );
}

/**
 * Hook for health metrics
 */
export function useHealthMetrics(
  ciId: string | null,
  dateRange?: DateRangeParams
): UseAnalyticsState<HealthMetric[]> {
  return useAnalyticsData(
    async () => {
      if (!ciId) return [];
      return analyticsService.getHealthMetrics(ciId, dateRange);
    },
    [ciId, dateRange?.startDate, dateRange?.endDate]
  );
}

/**
 * Hook for multiple analytics queries (dashboard overview)
 */
export function useAnalyticsOverview() {
  const dashboardStats = useDashboardStats();
  const ciCountsByType = useCICountsByType();
  const ciCountsByStatus = useCICountsByStatus();
  const discoveryStats = useDiscoveryStats();

  const loading =
    dashboardStats.loading ||
    ciCountsByType.loading ||
    ciCountsByStatus.loading ||
    discoveryStats.loading;

  const error =
    dashboardStats.error ||
    ciCountsByType.error ||
    ciCountsByStatus.error ||
    discoveryStats.error;

  const refetchAll = async () => {
    await Promise.all([
      dashboardStats.refetch(),
      ciCountsByType.refetch(),
      ciCountsByStatus.refetch(),
      discoveryStats.refetch(),
    ]);
  };

  return {
    dashboardStats: dashboardStats.data,
    ciCountsByType: ciCountsByType.data,
    ciCountsByStatus: ciCountsByStatus.data,
    discoveryStats: discoveryStats.data,
    loading,
    error,
    refetch: refetchAll,
  };
}
