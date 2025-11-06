import { gql } from '@apollo/client';

// Executive Dashboard Queries
export const EXECUTIVE_SUMMARY_QUERY = gql`
  query ExecutiveSummary($timeRange: TimeRange!) {
    executiveSummary(timeRange: $timeRange) {
      totalITSpend
      costByCapability {
        capability
        businessServices {
          serviceId
          serviceName
          applicationServices {
            serviceId
            serviceName
            monthlyCost
          }
          monthlyCost
        }
        totalCost
      }
      costTrends {
        month
        total
        compute
        storage
        network
        data
        security
        applications
        budget
        variance
      }
      serviceHealthByTier {
        tier
        averageHealthScore
        serviceCount
        trend
      }
      riskMatrix {
        services {
          id
          name
          criticality
          riskLevel
          type
          description
        }
      }
      topCostDrivers {
        serviceId
        serviceName
        monthlyCost
        trend
        changePercent
      }
      valueScorecard {
        serviceId
        serviceName
        annualRevenue
        monthlyCost
        roi
        customers
      }
    }
  }
`;

// CIO Dashboard Queries
export const CIO_METRICS_QUERY = gql`
  query CIOMetrics($timeRange: TimeRange!) {
    cioMetrics(timeRange: $timeRange) {
      serviceAvailability {
        tier
        averageAvailability
        slaTarget
        complianceStatus
      }
      changeSuccessRates {
        successful
        failed
        rollbacks
        total
        successRate
      }
      incidentResponseTimes {
        priority
        mttr
        target
        count
      }
      configurationAccuracy {
        totalCIs
        accurateCIs
        accuracyPercentage
        driftDetected
        lastAuditDate
      }
      costByCapability {
        capability
        cost
        budgetAllocated
        variance
      }
      capacityPlanning {
        month
        computeUtilization
        storageUtilization
        networkUtilization
        forecast
      }
    }
  }
`;

// ITSM Dashboard Queries
export const OPEN_INCIDENTS_QUERY = gql`
  query OpenIncidents($filters: IncidentFilters) {
    openIncidents(filters: $filters) {
      id
      title
      priority
      status
      affectedCI
      assignedTeam
      createdAt
      updatedAt
      age
    }
  }
`;

export const CHANGES_IN_PROGRESS_QUERY = gql`
  query ChangesInProgress {
    changesInProgress {
      id
      title
      status
      type
      riskLevel
      scheduledDate
      affectedCIs
      assignedTo
      createdAt
    }
  }
`;

export const CI_STATUS_QUERY = gql`
  query CIStatus {
    ciStatus {
      status
      count
      cis {
        ci_id
        name
        type
        status
        environment
        lastSeen
      }
    }
  }
`;

export const TOP_FAILING_CIS_QUERY = gql`
  query TopFailingCIs($timeRange: TimeRange!) {
    topFailingCIs(timeRange: $timeRange) {
      ci_id
      name
      type
      incidentCount
      mttr
      lastFailure
      recommendation
    }
  }
`;

export const SLA_COMPLIANCE_QUERY = gql`
  query SLACompliance($timeRange: TimeRange!) {
    slaCompliance(timeRange: $timeRange) {
      priority
      withinSLA
      total
      compliancePercentage
      target
    }
  }
`;

export const BASELINE_COMPLIANCE_QUERY = gql`
  query BaselineCompliance {
    baselineCompliance {
      ci_id
      name
      type
      driftSeverity
      driftDetails
      remediationStatus
      lastChecked
    }
  }
`;

// FinOps Dashboard Queries
export const CLOUD_COSTS_QUERY = gql`
  query CloudCosts($timeRange: TimeRange!) {
    cloudCosts(timeRange: $timeRange) {
      month
      aws
      azure
      gcp
      total
      forecast
    }
  }
`;

export const ON_PREM_VS_CLOUD_QUERY = gql`
  query OnPremVsCloud($timeRange: TimeRange!) {
    onPremVsCloud(timeRange: $timeRange) {
      onPremCost
      cloudCost
      totalCost
      tcoComparison {
        category
        onPrem
        cloud
      }
    }
  }
`;

export const COST_BY_TOWER_QUERY = gql`
  query CostByTower($timeRange: TimeRange!) {
    costByTower(timeRange: $timeRange) {
      tower
      cost
      subTowers {
        name
        cost
      }
    }
  }
`;

export const BUDGET_VARIANCE_QUERY = gql`
  query BudgetVariance($timeRange: TimeRange!) {
    budgetVariance(timeRange: $timeRange) {
      capability
      budgetAllocated
      actualSpend
      variance
      variancePercent
    }
  }
`;

export const UNIT_ECONOMICS_QUERY = gql`
  query UnitEconomics($timeRange: TimeRange!) {
    unitEconomics(timeRange: $timeRange) {
      metric
      value
      unit
      trend
      changePercent
    }
  }
`;

export const COST_OPTIMIZATION_QUERY = gql`
  query CostOptimization {
    costOptimization {
      recommendations {
        id
        type
        resource
        currentCost
        potentialSavings
        description
        priority
      }
      totalPotentialSavings
    }
  }
`;

// Business Service Dashboard Queries
export const SERVICE_HEALTH_QUERY = gql`
  query ServiceHealth($serviceId: ID, $businessUnit: String) {
    serviceHealth(serviceId: $serviceId, businessUnit: $businessUnit) {
      businessUnit
      businessServices {
        serviceId
        serviceName
        healthScore
        status
      }
    }
  }
`;

export const REVENUE_AT_RISK_QUERY = gql`
  query RevenueAtRisk($serviceId: ID!) {
    revenueAtRisk(serviceId: $serviceId) {
      totalAnnualRevenue
      revenueAtRisk
      percentageAtRisk
      affectedIncidents {
        id
        priority
        estimatedImpact
      }
    }
  }
`;

export const CUSTOMER_IMPACT_QUERY = gql`
  query CustomerImpact($serviceId: ID!) {
    customerImpact(serviceId: $serviceId) {
      totalCustomers
      customersImpacted
      estimatedUserImpact
      incidents {
        id
        priority
        usersAffected
      }
    }
  }
`;

export const COMPLIANCE_STATUS_QUERY = gql`
  query ComplianceStatus($serviceId: ID!) {
    complianceStatus(serviceId: $serviceId) {
      pciCompliant
      hipaaCompliant
      soxCompliant
      gdprCompliant
      lastAuditDate
      nonCompliantItems {
        requirement
        status
        remediation
      }
    }
  }
`;

export const VALUE_STREAM_HEALTH_QUERY = gql`
  query ValueStreamHealth($serviceId: ID!) {
    valueStreamHealth(serviceId: $serviceId) {
      stages {
        name
        healthScore
        throughput
        bottleneck
      }
      flowRate
      cycleTime
    }
  }
`;

export const SERVICE_DEPENDENCIES_QUERY = gql`
  query ServiceDependencies($serviceId: ID!, $depth: Int) {
    serviceDependencies(serviceId: $serviceId, depth: $depth) {
      nodes {
        id
        label
        type
        healthScore
        status
        layer
      }
      edges {
        id
        from
        to
        type
        healthImpact
      }
    }
  }
`;

// Common Queries
export const DASHBOARD_TIME_RANGES = gql`
  query DashboardTimeRanges {
    dashboardTimeRanges {
      label
      value
      days
    }
  }
`;

export const EXPORT_DASHBOARD_QUERY = gql`
  mutation ExportDashboard($dashboardType: String!, $format: String!, $filters: JSONObject) {
    exportDashboard(dashboardType: $dashboardType, format: $format, filters: $filters) {
      url
      expiresAt
    }
  }
`;

// Subscriptions for real-time updates
export const INCIDENT_UPDATES_SUBSCRIPTION = gql`
  subscription IncidentUpdates {
    incidentUpdated {
      id
      title
      priority
      status
      affectedCI
      createdAt
    }
  }
`;

export const CHANGE_UPDATES_SUBSCRIPTION = gql`
  subscription ChangeUpdates {
    changeUpdated {
      id
      title
      status
      type
      riskLevel
      scheduledDate
    }
  }
`;
