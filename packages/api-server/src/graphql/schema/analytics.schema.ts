// packages/api-server/src/graphql/schema/analytics.schema.ts

export const analyticsTypeDefs = `
  """
  CI count by type statistic
  """
  type CICountByType {
    """CI type"""
    _ciType: String!
    """Number of CIs of this type"""
    _count: Int!
  }

  """
  CI count by status statistic
  """
  type CICountByStatus {
    """CI status"""
    _status: String!
    """Number of CIs with this status"""
    _count: Int!
  }

  """
  CI count by environment statistic
  """
  type CICountByEnvironment {
    """Environment name"""
    _environment: String!
    """Number of CIs in this environment"""
    _count: Int!
  }

  """
  Relationship count by type statistic
  """
  type RelationshipCount {
    """Relationship type"""
    _relationshipType: String!
    """Number of relationships of this type"""
    _count: Int!
  }

  """
  Discovery statistics summary
  """
  type DiscoveryStatsSummary {
    """Total number of CIs"""
    _totalCis: Int!
    """Number of unique CI types"""
    _uniqueTypes: Int!
    """First discovery timestamp"""
    _firstDiscovery: String!
    """Last discovery timestamp"""
    _lastDiscovery: String!
  }

  """
  Discovery statistics by provider
  """
  type DiscoveryByProvider {
    """Discovery provider name"""
    _discoveryProvider: String!
    """Number of CIs discovered by this provider"""
    _count: Int!
  }

  """
  Discovery statistics
  """
  type DiscoveryStats {
    """Summary statistics"""
    _summary: DiscoveryStatsSummary!
    """Statistics by provider"""
    _byProvider: [DiscoveryByProvider!]!
  }

  """
  Discovery timeline data point
  """
  type DiscoveryTimelinePoint {
    """Time period"""
    _period: String!
    """Number of CIs discovered in this period"""
    _count: Int!
    """Number of unique CI types discovered"""
    _uniqueTypes: Int!
  }

  """
  Top connected CI
  """
  type TopConnectedCI {
    """CI identifier"""
    _ciId: String!
    """CI name"""
    _ciName: String!
    """CI type"""
    _ciType: String!
    """Number of relationships"""
    _relationshipCount: Int!
  }

  """
  Dependency depth statistics for a single CI
  """
  type DependencyDepthCI {
    """CI identifier"""
    _ciId: String!
    """Maximum dependency depth"""
    _maxDepth: Int!
    """Total number of dependencies"""
    _totalDependencies: Int!
  }

  """
  Dependency depth distribution
  """
  type DependencyDepthDistribution {
    """Depth level"""
    _maxDepth: Int!
    """Number of CIs at this depth"""
    _count: Int!
  }

  """
  Dependency depth statistics
  """
  type DependencyDepthStats {
    """Top CIs by dependency depth"""
    _topCis: [DependencyDepthCI!]!
    """Distribution of dependency depths"""
    _depthDistribution: [DependencyDepthDistribution!]!
  }

  """
  CI change history entry
  """
  type ChangeHistoryEntry {
    """Change timestamp"""
    _changeTimestamp: String!
    """Type of change"""
    _changeType: String!
    """Field that changed"""
    _fieldName: String
    """Old value"""
    _oldValue: String
    """New value"""
    _newValue: String
    """User or system that made the change"""
    _changedBy: String
  }

  """
  Change frequency data point
  """
  type ChangeFrequencyPoint {
    """CI type"""
    _ciType: String!
    """Time period"""
    _period: String!
    """Number of changes"""
    _changeCount: Int!
  }

  """
  Dashboard summary statistics
  """
  type DashboardSummary {
    """Total number of CIs"""
    _totalCis: Int!
    """Number of unique CI types"""
    _uniqueTypes: Int!
    """Number of unique environments"""
    _uniqueEnvironments: Int!
    """Total number of relationships"""
    _totalRelationships: Int!
    """Number of CIs discovered in last 24 hours"""
    _recentDiscoveries24h: Int!
  }

  """
  Dashboard breakdown by type
  """
  type DashboardBreakdownByType {
    """CI type"""
    _ciType: String!
    """Count"""
    _count: Int!
  }

  """
  Dashboard breakdown by status
  """
  type DashboardBreakdownByStatus {
    """Status"""
    _status: String!
    """Count"""
    _count: Int!
  }

  """
  Dashboard breakdown by environment
  """
  type DashboardBreakdownByEnvironment {
    """Environment"""
    _environment: String!
    """Count"""
    _count: Int!
  }

  """
  Dashboard breakdown statistics
  """
  type DashboardBreakdown {
    """Breakdown by CI type"""
    _byType: [DashboardBreakdownByType!]!
    """Breakdown by status"""
    _byStatus: [DashboardBreakdownByStatus!]!
    """Breakdown by environment"""
    _byEnvironment: [DashboardBreakdownByEnvironment!]!
  }

  """
  Dashboard statistics
  """
  type DashboardStats {
    """Summary statistics"""
    _summary: DashboardSummary!
    """Breakdown statistics"""
    _breakdown: DashboardBreakdown!
  }

  """
  CI health metrics data point
  """
  type CIHealthMetricsPoint {
    """Time bucket"""
    _timeBucket: String!
    """Average CPU usage percentage"""
    _avgCpu: Float
    """Average memory usage percentage"""
    _avgMemory: Float
    """Average disk usage percentage"""
    _avgDisk: Float
    """Number of status changes"""
    _statusChanges: Int!
  }

  """
  Inventory report entry
  """
  type InventoryReportEntry {
    """CI identifier"""
    _ciId: String!
    """CI name"""
    _ciName: String!
    """CI type"""
    _ciType: String!
    """Status"""
    _status: String!
    """Environment"""
    _environment: String
    """Discovery timestamp"""
    _discoveredAt: String!
    """Number of relationships"""
    _relationshipCount: Int!
  }

  """
  Time interval enumeration for analytics queries
  """
  enum TimeInterval {
    HOUR
    DAY
    WEEK
    MONTH
  }

  """
  Relationship direction for analytics
  """
  enum RelationshipDirection {
    IN
    OUT
    BOTH
  }

  """
  Metrics time interval
  """
  enum MetricsInterval {
    FIVE_MINUTES
    FIFTEEN_MINUTES
    ONE_HOUR
    SIX_HOURS
    ONE_DAY
  }

  """
  Input for inventory report filters
  """
  input InventoryReportFilter {
    """Filter by CI type"""
    _type: String
    """Filter by status"""
    _status: String
    """Filter by environment"""
    _environment: String
  }

  """
  Analytics query operations
  """
  type AnalyticsQuery {
    """Get CI counts by type"""
    getCICountsByType: [CICountByType!]!

    """Get CI counts by status"""
    getCICountsByStatus: [CICountByStatus!]!

    """Get CI counts by environment"""
    getCICountsByEnvironment: [CICountByEnvironment!]!

    """Get relationship counts by type"""
    getRelationshipCounts: [RelationshipCount!]!

    """Get discovery statistics"""
    getDiscoveryStats(startDate: String, endDate: String): DiscoveryStats!

    """Get discovery timeline"""
    getDiscoveryTimeline(interval: TimeInterval, limit: Int): [DiscoveryTimelinePoint!]!

    """Get top connected CIs"""
    getTopConnectedCIs(limit: Int, direction: RelationshipDirection): [TopConnectedCI!]!

    """Get dependency depth statistics"""
    getDependencyDepthStats: DependencyDepthStats!

    """Get CI change history"""
    getChangeHistory(ciId: ID!, limit: Int): [ChangeHistoryEntry!]!

    """Get change frequency by CI type"""
    getChangeFrequencyByType(startDate: String, endDate: String, interval: TimeInterval): [ChangeFrequencyPoint!]!

    """Get dashboard summary statistics"""
    getDashboardStats: DashboardStats!

    """Get CI health metrics (time-series)"""
    getCIHealthMetrics(ciId: ID!, startTime: String!, endTime: String!, interval: MetricsInterval): [CIHealthMetricsPoint!]!

    """Get inventory report"""
    getInventoryReport(filter: InventoryReportFilter): [InventoryReportEntry!]!
  }

  extend type Query {
    """Analytics queries"""
    analytics: AnalyticsQuery!
  }
`;
