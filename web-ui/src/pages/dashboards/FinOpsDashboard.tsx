import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Cloud, Server, Lightbulb, Download } from 'lucide-react';
import { useFinOpsDashboard, useTimeRange, useExportDashboard } from '@/hooks/useDashboardData';
import { KPICard } from '@/components/dashboard/KPICard';
import { CostTrendChart } from '@/components/dashboard/CostTrendChart';
import { CostBreakdownChart } from '@/components/dashboard/CostBreakdownChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const FinOpsDashboard: React.FC = () => {
  const { timeRange, updateTimeRange } = useTimeRange('90d');
  const { cloudCosts, onPremVsCloud, costByTower, budgetVariance, unitEconomics, costOptimization } = useFinOpsDashboard(timeRange);
  const { exportToPDF, exportToExcel } = useExportDashboard();

  const loading = cloudCosts.loading || onPremVsCloud.loading || costByTower.loading;
  const error = cloudCosts.error || onPremVsCloud.error || costByTower.error;

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load FinOps dashboard data: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  // Calculate totals
  const totalCloudCost = cloudCosts.data.reduce((acc: number, m: any) => acc + m.total, 0);
  const avgMonthlyCloudCost = totalCloudCost / (cloudCosts.data.length || 1);
  const lastMonthCost = cloudCosts.data[cloudCosts.data.length - 1]?.total || 0;
  const previousMonthCost = cloudCosts.data[cloudCosts.data.length - 2]?.total || lastMonthCost;
  const costTrend = lastMonthCost > previousMonthCost ? 'up' : 'down';
  const costTrendPercent = ((lastMonthCost - previousMonthCost) / previousMonthCost) * 100;

  const totalPotentialSavings = costOptimization.data?.totalPotentialSavings || 0;

  const onPremVsCloudData = [
    { name: 'On-Premise', value: onPremVsCloud.data?.onPremCost || 0, color: '#8b5cf6' },
    { name: 'Cloud', value: onPremVsCloud.data?.cloudCost || 0, color: '#3b82f6' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">FinOps Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Cloud cost management and optimization opportunities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="px-4 py-2 border border-border rounded-md text-sm"
            value={timeRange.start}
            onChange={(e) => updateTimeRange(e.target.value)}
          >
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToPDF('finops', { timeRange })}
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToExcel('finops', { timeRange })}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              cloudCosts.refetch();
              onPremVsCloud.refetch();
              costByTower.refetch();
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Cloud Spend"
          value={formatCurrency(totalCloudCost)}
          icon={Cloud}
          color="blue"
          description={timeRange.label}
        />
        <KPICard
          title="Monthly Average"
          value={formatCurrency(avgMonthlyCloudCost)}
          icon={DollarSign}
          color="purple"
          trend={costTrend}
          trendValue={Math.abs(costTrendPercent)}
          description="Cloud spend trend"
        />
        <KPICard
          title="Total IT Cost"
          value={formatCurrency(onPremVsCloud.data?.totalCost || 0)}
          icon={Server}
          color="yellow"
          description="On-prem + Cloud"
        />
        <KPICard
          title="Potential Savings"
          value={formatCurrency(totalPotentialSavings)}
          icon={Lightbulb}
          color="green"
          description="Optimization opportunities"
        />
      </div>

      {/* Cloud Spend Over Time */}
      <CostTrendChart
        data={cloudCosts.data}
        title="Cloud Spend by Provider"
        description="Monthly cloud costs across AWS, Azure, and GCP"
        stacked={true}
      />

      {/* On-Prem vs Cloud Comparison */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>On-Premise vs Cloud</CardTitle>
            <CardDescription>Total cost comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={onPremVsCloudData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(1)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {onPremVsCloudData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent">
                <span className="text-sm font-medium">On-Premise</span>
                <span className="text-sm">{formatCurrency(onPremVsCloud.data?.onPremCost || 0)}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent">
                <span className="text-sm font-medium">Cloud</span>
                <span className="text-sm">{formatCurrency(onPremVsCloud.data?.cloudCost || 0)}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent border-t border-border pt-2">
                <span className="text-sm font-bold">Total</span>
                <span className="text-sm font-bold">{formatCurrency(onPremVsCloud.data?.totalCost || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>TCO Comparison</CardTitle>
            <CardDescription>Total Cost of Ownership by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={onPremVsCloud.data?.tcoComparison || []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="category" angle={-45} textAnchor="end" height={80} />
                <YAxis tickFormatter={formatCurrency} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="onPrem" fill="#8b5cf6" name="On-Premise" radius={[8, 8, 0, 0]} />
                <Bar dataKey="cloud" fill="#3b82f6" name="Cloud" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cost Allocation by Tower */}
      <CostBreakdownChart
        data={costByTower.data.map((tower: any) => ({
          name: tower.tower,
          value: tower.cost,
          children: tower.subTowers?.map((sub: any) => ({
            name: sub.name,
            value: sub.cost,
          })) || [],
        }))}
        title="Cost Allocation by Resource Tower"
        description="Hierarchical view of infrastructure costs"
        type="treemap"
      />

      {/* Budget Variance */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Variance by Capability</CardTitle>
          <CardDescription>Actual spend vs. budget allocation</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={budgetVariance.data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" tickFormatter={formatCurrency} />
              <YAxis dataKey="capability" type="category" width={150} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="budgetAllocated" fill="#10b981" name="Budget" radius={[0, 8, 8, 0]} />
              <Bar dataKey="actualSpend" fill="#3b82f6" name="Actual" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {budgetVariance.data.map((item: any) => (
              <div
                key={item.capability}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-accent"
              >
                <span className="text-sm font-medium">{item.capability}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {formatCurrency(item.actualSpend)} / {formatCurrency(item.budgetAllocated)}
                  </span>
                  <Badge
                    variant={item.variance < 0 ? 'default' : 'destructive'}
                    className={
                      item.variance < 0
                        ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                        : ''
                    }
                  >
                    {item.variance > 0 ? '+' : ''}{item.variancePercent.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Unit Economics */}
      <Card>
        <CardHeader>
          <CardTitle>Unit Economics</CardTitle>
          <CardDescription>Cost per unit metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {unitEconomics.data.map((metric: any) => (
              <div key={metric.metric} className="p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">{metric.metric}</p>
                <p className="text-2xl font-bold mt-1">
                  {typeof metric.value === 'number' ? formatCurrency(metric.value) : metric.value}
                </p>
                <p className="text-xs text-muted-foreground">{metric.unit}</p>
                {metric.trend && (
                  <div className="flex items-center gap-1 mt-2">
                    {metric.trend === 'up' ? (
                      <TrendingUp className="h-3 w-3 text-red-600 dark:text-red-400" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-green-600 dark:text-green-400" />
                    )}
                    <span
                      className={`text-xs ${
                        metric.trend === 'up'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}
                    >
                      {metric.trend === 'up' ? '+' : ''}{metric.changePercent.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cost Optimization Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Optimization Recommendations</CardTitle>
          <CardDescription>
            Potential savings: {formatCurrency(totalPotentialSavings)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {costOptimization.data?.recommendations?.map((rec: any) => (
              <div
                key={rec.id}
                className="p-4 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="capitalize">
                        {rec.type}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          rec.priority === 'high'
                            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                            : rec.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }
                      >
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mb-1">{rec.resource}</p>
                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm text-muted-foreground">Current Cost</p>
                    <p className="text-sm font-medium">{formatCurrency(rec.currentCost)}/mo</p>
                    <p className="text-sm text-green-600 dark:text-green-400 font-bold mt-1">
                      Save {formatCurrency(rec.potentialSavings)}/mo
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinOpsDashboard;
