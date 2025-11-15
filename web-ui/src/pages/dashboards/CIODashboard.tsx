import React from 'react';
import { Activity, CheckCircle, AlertTriangle, Database, DollarSign, TrendingUp, Download } from 'lucide-react';
import { useCIODashboard, useTimeRange, useExportDashboard } from '@/hooks/useDashboardData';
import { KPICard } from '@/components/dashboard/KPICard';
import { LiquidGlass } from '@/components/ui/liquid-glass';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  LineChart,
  Line,
} from 'recharts';

export const CIODashboard: React.FC = () => {
  const { timeRange, updateTimeRange } = useTimeRange('30d');
  const { data, loading, error, refetch } = useCIODashboard(timeRange);
  const { exportToPDF, exportToExcel } = useExportDashboard();

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load CIO dashboard data: {error.message}
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

  // Calculate averages
  const avgAvailability = data.serviceAvailability.reduce(
    (acc: number, tier: any) => acc + tier.averageAvailability,
    0
  ) / data.serviceAvailability.length;

  const changeData = [
    { name: 'Successful', value: data.changeSuccessRates.successful, color: '#10b981' },
    { name: 'Failed', value: data.changeSuccessRates.failed, color: '#ef4444' },
    { name: 'Rollbacks', value: data.changeSuccessRates.rollbacks, color: '#f59e0b' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">CIO Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            IT operations, service quality, and capacity planning
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="px-4 py-2 border border-border rounded-md text-sm"
            value={timeRange.start}
            onChange={(e) => updateTimeRange(e.target.value)}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToPDF('cio', { timeRange })}
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToExcel('cio', { timeRange })}
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
          title="Average Availability"
          value={`${avgAvailability.toFixed(2)}%`}
          icon={Activity}
          color={avgAvailability >= 99.9 ? 'green' : avgAvailability >= 99 ? 'yellow' : 'red'}
          description="Across all service tiers"
        />
        <KPICard
          title="Change Success Rate"
          value={`${data.changeSuccessRates.successRate.toFixed(1)}%`}
          icon={CheckCircle}
          color={data.changeSuccessRates.successRate >= 85 ? 'green' : 'yellow'}
          description={`${data.changeSuccessRates.total} changes (${timeRange.label})`}
        />
        <KPICard
          title="Config Accuracy"
          value={`${data.configurationAccuracy.accuracyPercentage.toFixed(1)}%`}
          icon={Database}
          color={data.configurationAccuracy.accuracyPercentage >= 95 ? 'green' : 'yellow'}
          description={`${data.configurationAccuracy.driftDetected} CIs with drift`}
        />
        <KPICard
          title="Total IT Budget"
          value={formatCurrency(
            data.costByCapability.reduce((acc: number, c: any) => acc + c.budgetAllocated, 0)
          )}
          icon={DollarSign}
          color="blue"
          description="Allocated across capabilities"
        />
      </div>

      {/* Service Availability and Change Success */}
      <div className="grid gap-4 md:grid-cols-2">
        <LiquidGlass variant="default" rounded="xl">
          <div>
          <h3 className="text-lg font-semibold mb-1">Service Availability by Tier</h3>
          <p className="text-sm text-muted-foreground mb-4">SLA compliance by service tier</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.serviceAvailability}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="tier" />
                <YAxis domain={[95, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="averageAvailability" fill="#8b5cf6" name="Availability %" radius={[8, 8, 0, 0]} />
                <Bar dataKey="slaTarget" fill="#10b981" name="SLA Target %" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {data.serviceAvailability.map((tier: any) => (
                <div key={tier.tier} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent">
                  <span className="text-sm font-medium">{tier.tier}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{tier.averageAvailability.toFixed(2)}%</span>
                    <Badge
                      variant={tier.complianceStatus === 'compliant' ? 'default' : 'destructive'}
                      className={
                        tier.complianceStatus === 'compliant'
                          ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                          : ''
                      }
                    >
                      {tier.complianceStatus === 'compliant' ? 'Within SLA' : 'Below SLA'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </LiquidGlass>

        <LiquidGlass variant="default" rounded="xl">
          <div>
          <h3 className="text-lg font-semibold mb-1">Change Success Rates</h3>
          <p className="text-sm text-muted-foreground mb-4">Last {timeRange.label}</p>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={changeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {changeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {data.changeSuccessRates.successful}
                </p>
                <p className="text-xs text-muted-foreground">Successful</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {data.changeSuccessRates.failed}
                </p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {data.changeSuccessRates.rollbacks}
                </p>
                <p className="text-xs text-muted-foreground">Rollbacks</p>
              </div>
            </div>
          </div>
        </LiquidGlass>
      </div>

      {/* Incident Response Times */}
      <LiquidGlass variant="default" rounded="xl">
        <div>
          <h3 className="text-lg font-semibold mb-1">Incident Response Times (MTTR)</h3>
          <p className="text-sm text-muted-foreground mb-4">Mean Time to Resolution by priority</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.incidentResponseTimes}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="priority" />
              <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="mttr" fill="#ef4444" name="Actual MTTR" radius={[8, 8, 0, 0]} />
              <Bar dataKey="target" fill="#10b981" name="Target MTTR" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {data.incidentResponseTimes.map((priority: any) => (
              <div key={priority.priority} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent">
                <span className="text-sm font-medium">{priority.priority}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm">{priority.count} incidents</span>
                  <span className="text-sm">
                    MTTR: {priority.mttr.toFixed(1)}h / Target: {priority.target.toFixed(1)}h
                  </span>
                  <Badge
                    variant={priority.mttr <= priority.target ? 'default' : 'destructive'}
                    className={
                      priority.mttr <= priority.target
                        ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                        : ''
                    }
                  >
                    {priority.mttr <= priority.target ? 'On Target' : 'Over Target'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </LiquidGlass>

      {/* Configuration Accuracy */}
      <LiquidGlass variant="default" rounded="xl">
        <div>
          <h3 className="text-lg font-semibold mb-1">Configuration Accuracy</h3>
          <p className="text-sm text-muted-foreground mb-4">CMDB health and drift detection status</p>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Configuration Accuracy</span>
                <span className="text-sm font-bold">
                  {data.configurationAccuracy.accuracyPercentage.toFixed(1)}%
                </span>
              </div>
              <Progress value={data.configurationAccuracy.accuracyPercentage} className="h-3" />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center p-4 border border-border rounded-lg">
                <p className="text-2xl font-bold">{data.configurationAccuracy.totalCIs}</p>
                <p className="text-sm text-muted-foreground">Total CIs</p>
              </div>
              <div className="text-center p-4 border border-border rounded-lg">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {data.configurationAccuracy.accurateCIs}
                </p>
                <p className="text-sm text-muted-foreground">Accurate CIs</p>
              </div>
              <div className="text-center p-4 border border-border rounded-lg">
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {data.configurationAccuracy.driftDetected}
                </p>
                <p className="text-sm text-muted-foreground">Drift Detected</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Last audit: {new Date(data.configurationAccuracy.lastAuditDate).toLocaleString()}
            </p>
          </div>
        </div>
      </LiquidGlass>

      {/* Cost by Capability */}
      <LiquidGlass variant="default" rounded="xl">
        <div>
          <h3 className="text-lg font-semibold mb-1">Cost by Business Capability</h3>
          <p className="text-sm text-muted-foreground mb-4">Budget allocation and variance</p>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data.costByCapability.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" tickFormatter={formatCurrency} />
              <YAxis dataKey="capability" type="category" width={150} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="cost" fill="#8b5cf6" name="Actual Cost" radius={[0, 8, 8, 0]} />
              <Bar dataKey="budgetAllocated" fill="#10b981" name="Budget" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </LiquidGlass>

      {/* Capacity Planning */}
      <LiquidGlass variant="default" rounded="xl">
        <div>
          <h3 className="text-lg font-semibold mb-1">Capacity Planning</h3>
          <p className="text-sm text-muted-foreground mb-4">Resource utilization trends and forecast</p>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data.capacityPlanning}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} label={{ value: 'Utilization %', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="computeUtilization"
                stroke="#8b5cf6"
                strokeWidth={2}
                name="Compute"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="storageUtilization"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Storage"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="networkUtilization"
                stroke="#10b981"
                strokeWidth={2}
                name="Network"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </LiquidGlass>
    </div>
  );
};

export default CIODashboard;
