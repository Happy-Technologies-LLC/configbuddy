import React, { useState } from 'react';
import { AlertCircle, Clock, CheckCircle, XCircle, RefreshCw, Download } from 'lucide-react';
import { useITSMDashboard, useExportDashboard } from '@/hooks/useDashboardData';
import { KPICard } from '@/components/dashboard/KPICard';
import { IncidentTable } from '@/components/dashboard/IncidentTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export const ITSMDashboard: React.FC = () => {
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const { incidents, changes, ciStatus, topFailing, slaCompliance, baselineCompliance } = useITSMDashboard(
    priorityFilter ? { priority: priorityFilter } : undefined
  );
  const { exportToPDF, exportToExcel } = useExportDashboard();

  const loading = incidents.loading || changes.loading || ciStatus.loading;
  const error = incidents.error || changes.error || ciStatus.error;

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load ITSM dashboard data: {error.message}
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

  // Calculate metrics
  const openIncidents = incidents.data.filter((i: any) => i.status === 'open').length;
  const inProgressIncidents = incidents.data.filter((i: any) => i.status === 'in-progress').length;
  const p1Incidents = incidents.data.filter((i: any) => i.priority === 'P1').length;
  const totalCIs = ciStatus.data.reduce((acc: number, status: any) => acc + status.count, 0);
  const activeCIs = ciStatus.data.find((s: any) => s.status === 'active')?.count || 0;

  const changesByStatus = {
    scheduled: changes.data.filter((c: any) => c.status === 'scheduled').length,
    inProgress: changes.data.filter((c: any) => c.status === 'in-progress').length,
    rollback: changes.data.filter((c: any) => c.status === 'rollback').length,
    completed: changes.data.filter((c: any) => c.status === 'completed').length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">ITSM Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Incident and change management overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToPDF('itsm', {})}
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToExcel('itsm', {})}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              incidents.refetch();
              changes.refetch();
              ciStatus.refetch();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Open Incidents"
          value={openIncidents}
          icon={AlertCircle}
          color={openIncidents > 10 ? 'red' : openIncidents > 5 ? 'yellow' : 'green'}
          description={`${p1Incidents} P1 incidents`}
        />
        <KPICard
          title="In Progress"
          value={inProgressIncidents}
          icon={Clock}
          color="blue"
          description="Currently being worked on"
        />
        <KPICard
          title="Active CIs"
          value={activeCIs}
          icon={CheckCircle}
          color="green"
          description={`${totalCIs} total CIs`}
        />
        <KPICard
          title="Changes in Progress"
          value={changesByStatus.inProgress}
          icon={RefreshCw}
          color="yellow"
          description={`${changesByStatus.scheduled} scheduled`}
        />
      </div>

      {/* Open Incidents Table */}
      <IncidentTable
        incidents={incidents.data}
        title="Open Incidents by Priority"
        description="Real-time incident tracking"
        showFilters={true}
      />

      {/* Changes in Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Changes in Progress</CardTitle>
          <CardDescription>Active change requests</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Kanban-style view */}
          <div className="grid grid-cols-4 gap-4">
            {/* Scheduled Column */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm">Scheduled</h4>
                <Badge variant="secondary">{changesByStatus.scheduled}</Badge>
              </div>
              <div className="space-y-2">
                {changes.data
                  .filter((c: any) => c.status === 'scheduled')
                  .map((change: any) => (
                    <Card key={change.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <p className="text-sm font-medium truncate">{change.title}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {change.type}
                          </Badge>
                          {change.riskLevel && (
                            <Badge
                              variant="outline"
                              className={
                                change.riskLevel === 'high'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                  : change.riskLevel === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300'
                                  : 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                              }
                            >
                              {change.riskLevel}
                            </Badge>
                          )}
                        </div>
                        {change.scheduledDate && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(change.scheduledDate).toLocaleDateString()}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>

            {/* In Progress Column */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm">In Progress</h4>
                <Badge variant="secondary">{changesByStatus.inProgress}</Badge>
              </div>
              <div className="space-y-2">
                {changes.data
                  .filter((c: any) => c.status === 'in-progress')
                  .map((change: any) => (
                    <Card key={change.id} className="cursor-pointer hover:shadow-md transition-shadow border-blue-500">
                      <CardContent className="p-3">
                        <p className="text-sm font-medium truncate">{change.title}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {change.type}
                          </Badge>
                          {change.riskLevel && (
                            <Badge
                              variant="outline"
                              className={
                                change.riskLevel === 'high'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                  : change.riskLevel === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300'
                                  : 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                              }
                            >
                              {change.riskLevel}
                            </Badge>
                          )}
                        </div>
                        {change.assignedTo && (
                          <p className="text-xs text-muted-foreground mt-1">{change.assignedTo}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>

            {/* Rollback Column */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm">Rollback</h4>
                <Badge variant="destructive">{changesByStatus.rollback}</Badge>
              </div>
              <div className="space-y-2">
                {changes.data
                  .filter((c: any) => c.status === 'rollback')
                  .map((change: any) => (
                    <Card key={change.id} className="cursor-pointer hover:shadow-md transition-shadow border-red-500">
                      <CardContent className="p-3">
                        <p className="text-sm font-medium truncate">{change.title}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {change.type}
                          </Badge>
                          <Badge variant="destructive" className="text-xs">
                            Failed
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>

            {/* Completed Column */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm">Completed</h4>
                <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
                  {changesByStatus.completed}
                </Badge>
              </div>
              <div className="space-y-2">
                {changes.data
                  .filter((c: any) => c.status === 'completed')
                  .slice(0, 5)
                  .map((change: any) => (
                    <Card key={change.id} className="cursor-pointer hover:shadow-md transition-shadow border-green-500">
                      <CardContent className="p-3">
                        <p className="text-sm font-medium truncate">{change.title}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {change.type}
                          </Badge>
                          <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CI Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>CI Status Overview</CardTitle>
          <CardDescription>Configuration Items by status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {ciStatus.data.map((status: any) => (
              <div key={status.status} className="text-center p-4 border border-border rounded-lg">
                <p className="text-3xl font-bold">{status.count}</p>
                <Badge variant="outline" className="mt-2 capitalize">
                  {status.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Failing CIs */}
      <Card>
        <CardHeader>
          <CardTitle>Top Failing CIs</CardTitle>
          <CardDescription>CIs with most incidents in last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-sm font-semibold">CI Name</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold">Type</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold">Incident Count</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold">MTTR</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold">Last Failure</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {topFailing.data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      No failing CIs in the last 30 days
                    </td>
                  </tr>
                ) : (
                  topFailing.data.map((ci: any) => (
                    <tr key={ci.ci_id} className="border-b border-border hover:bg-accent">
                      <td className="py-3 px-2 text-sm font-medium">{ci.name}</td>
                      <td className="py-3 px-2 text-sm">
                        <Badge variant="outline">{ci.type}</Badge>
                      </td>
                      <td className="py-3 px-2 text-sm text-right">
                        <Badge variant="destructive">{ci.incidentCount}</Badge>
                      </td>
                      <td className="py-3 px-2 text-sm text-right">{ci.mttr.toFixed(1)}h</td>
                      <td className="py-3 px-2 text-sm">
                        {new Date(ci.lastFailure).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2 text-sm text-muted-foreground">{ci.recommendation}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* SLA Compliance */}
      <Card>
        <CardHeader>
          <CardTitle>SLA Compliance</CardTitle>
          <CardDescription>Incident resolution within SLA targets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {slaCompliance.data.map((sla: any) => (
              <div key={sla.priority}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{sla.priority}</Badge>
                    <span className="text-sm">
                      {sla.withinSLA} / {sla.total} within SLA
                    </span>
                  </div>
                  <span className="text-sm font-bold">
                    {sla.compliancePercentage.toFixed(1)}% (Target: {sla.target}%)
                  </span>
                </div>
                <Progress
                  value={sla.compliancePercentage}
                  className={`h-2 ${
                    sla.compliancePercentage >= sla.target ? '' : 'bg-red-200'
                  }`}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Baseline Compliance */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Baseline Compliance</CardTitle>
          <CardDescription>CIs with detected drift from baseline</CardDescription>
        </CardHeader>
        <CardContent>
          {baselineCompliance.data.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No configuration drift detected
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 text-sm font-semibold">CI Name</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold">Type</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold">Severity</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold">Drift Details</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold">Status</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold">Last Checked</th>
                  </tr>
                </thead>
                <tbody>
                  {baselineCompliance.data.map((ci: any) => (
                    <tr key={ci.ci_id} className="border-b border-border hover:bg-accent">
                      <td className="py-3 px-2 text-sm font-medium">{ci.name}</td>
                      <td className="py-3 px-2 text-sm">
                        <Badge variant="outline">{ci.type}</Badge>
                      </td>
                      <td className="py-3 px-2 text-sm">
                        <Badge
                          variant="outline"
                          className={
                            ci.driftSeverity === 'high'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                              : ci.driftSeverity === 'medium'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          }
                        >
                          {ci.driftSeverity}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-sm text-muted-foreground">{ci.driftDetails}</td>
                      <td className="py-3 px-2 text-sm">
                        <Badge variant="secondary">{ci.remediationStatus}</Badge>
                      </td>
                      <td className="py-3 px-2 text-sm">
                        {new Date(ci.lastChecked).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ITSMDashboard;
