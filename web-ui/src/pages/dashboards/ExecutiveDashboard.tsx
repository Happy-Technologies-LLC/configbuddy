import React from 'react';
import { DollarSign, TrendingUp, Shield, Activity, Download } from 'lucide-react';
import { useExecutiveDashboard, useTimeRange, useExportDashboard } from '@/hooks/useDashboardData';
import { KPICard } from '@/components/dashboard/KPICard';
import { CostTrendChart } from '@/components/dashboard/CostTrendChart';
import { CostBreakdownChart } from '@/components/dashboard/CostBreakdownChart';
import { RiskMatrix } from '@/components/dashboard/RiskMatrix';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const ExecutiveDashboard: React.FC = () => {
  const { timeRange, updateTimeRange } = useTimeRange('1y'); // Default to 1 year for executives
  const { data, loading, error, refetch } = useExecutiveDashboard(timeRange);
  const { exportToPDF, exportToExcel } = useExportDashboard();

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load executive dashboard data: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  // Calculate overall health score
  const overallHealthScore = data.serviceHealthByTier.reduce(
    (acc: number, tier: any) => acc + tier.averageHealthScore,
    0
  ) / data.serviceHealthByTier.length;

  // Calculate total risk exposure (services in critical+high risk)
  const highRiskServices = data.riskMatrix.services.filter(
    (s: any) => s.criticality === 'critical' && s.riskLevel === 'high'
  ).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Executive Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Strategic overview of IT investment and business value
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Time Range Selector */}
          <select
            className="px-4 py-2 border border-border rounded-md text-sm"
            value={timeRange.start}
            onChange={(e) => updateTimeRange(e.target.value)}
          >
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>

          {/* Export Buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToPDF('executive', { timeRange })}
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToExcel('executive', { timeRange })}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total IT Spend"
          value={formatCurrency(data.totalITSpend)}
          icon={DollarSign}
          color="blue"
          description={timeRange.label}
        />
        <KPICard
          title="Overall Health Score"
          value={`${overallHealthScore.toFixed(0)}%`}
          icon={Activity}
          color={overallHealthScore >= 80 ? 'green' : overallHealthScore >= 60 ? 'yellow' : 'red'}
          trend={data.serviceHealthByTier[0]?.trend}
          description="Across all service tiers"
        />
        <KPICard
          title="High Risk Services"
          value={highRiskServices}
          icon={Shield}
          color={highRiskServices > 0 ? 'red' : 'green'}
          description="Requiring immediate attention"
        />
        <KPICard
          title="Average ROI"
          value={`${(
            data.valueScorecard.reduce((acc: number, s: any) => acc + s.roi, 0) /
            data.valueScorecard.length
          ).toFixed(1)}%`}
          icon={TrendingUp}
          color="green"
          description="Return on IT investment"
        />
      </div>

      {/* Cost Breakdown and Trends */}
      <div className="grid gap-4 md:grid-cols-2">
        <CostBreakdownChart
          data={data.costByCapability.map((cap: any) => ({
            name: cap.capability,
            value: cap.totalCost,
            children: cap.businessServices.map((bs: any) => ({
              name: bs.serviceName,
              value: bs.monthlyCost,
            })),
          }))}
          title="Total IT Spend by Business Capability"
          description="Click to drill down into services"
          type="treemap"
        />
        <CostTrendChart
          data={data.costTrends}
          title="Cost Trends"
          description="Monthly IT spend over time"
          showBudget={true}
        />
      </div>

      {/* Service Health by Tier */}
      <Card>
        <CardHeader>
          <CardTitle>Service Health Scores by Tier</CardTitle>
          <CardDescription>Average health across service tiers</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.serviceHealthByTier}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="tier" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="averageHealthScore"
                fill="#8b5cf6"
                name="Health Score"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Risk Matrix */}
      <RiskMatrix
        items={data.riskMatrix.services}
        title="Risk Exposure Matrix"
        description="Services plotted by business criticality vs risk level"
      />

      {/* Top 5 Cost Drivers */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Cost Drivers</CardTitle>
          <CardDescription>Services with highest monthly cost</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.topCostDrivers.slice(0, 5)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" tickFormatter={formatCurrency} />
              <YAxis dataKey="serviceName" type="category" width={150} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="monthlyCost" fill="#3b82f6" name="Monthly Cost" radius={[0, 8, 8, 0]}>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {data.topCostDrivers.slice(0, 5).map((service: any) => (
              <div
                key={service.serviceId}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-accent"
              >
                <span className="text-sm font-medium">{service.serviceName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{formatCurrency(service.monthlyCost)}/mo</span>
                  {service.trend && (
                    <Badge variant={service.trend === 'up' ? 'destructive' : 'default'}>
                      {service.trend === 'up' ? '↑' : '↓'} {Math.abs(service.changePercent)}%
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Value Scorecard */}
      <Card>
        <CardHeader>
          <CardTitle>Value Scorecard</CardTitle>
          <CardDescription>Business value and ROI by service</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-sm font-semibold">Service</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold">Annual Revenue</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold">Monthly Cost</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold">ROI</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold">Customers</th>
                </tr>
              </thead>
              <tbody>
                {data.valueScorecard
                  .sort((a: any, b: any) => b.roi - a.roi)
                  .map((service: any) => (
                    <tr key={service.serviceId} className="border-b border-border hover:bg-accent">
                      <td className="py-3 px-2 text-sm font-medium">{service.serviceName}</td>
                      <td className="py-3 px-2 text-sm text-right">
                        {formatCurrency(service.annualRevenue)}
                      </td>
                      <td className="py-3 px-2 text-sm text-right">
                        {formatCurrency(service.monthlyCost)}
                      </td>
                      <td className="py-3 px-2 text-sm text-right">
                        <Badge
                          variant={service.roi >= 100 ? 'default' : 'secondary'}
                          className={
                            service.roi >= 100
                              ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                              : ''
                          }
                        >
                          {service.roi.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-sm text-right">
                        {service.customers.toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExecutiveDashboard;
