import React from 'react';
import {
  Computer,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Cloud,
  HardDrive,
  AppWindow,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { LiquidGlass } from '@/components/ui/liquid-glass';
import ciService from '../services/ci.service';
import CITypeBadge from '../components/ci/CITypeBadge';
import CIStatusBadge from '../components/ci/CIStatusBadge';

const STATUS_COLORS: Record<string, string> = {
  active: '#4caf50',
  inactive: '#9e9e9e',
  maintenance: '#ff9800',
  decommissioned: '#f44336',
};

const ENVIRONMENT_COLORS: Record<string, string> = {
  production: '#7c3aed', // Purple - critical but neutral
  staging: '#0ea5e9',    // Sky blue - calm and clear
  development: '#14b8a6', // Teal - balanced and professional
  test: '#6366f1',        // Indigo - distinct but not alarming
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => ciService.getDashboardStats(),
    staleTime: 60000,
    refetchInterval: 300000,
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCIClick = (ciId: string) => {
    navigate(`/inventory/${ciId}`);
  };

  const handleFilterByType = (type: string) => {
    navigate(`/cis?type=${type}`);
  };

  const handleFilterByStatus = (status: string) => {
    navigate(`/cis?status=${status}`);
  };

  const handleFilterByEnvironment = (environment: string) => {
    navigate(`/cis?environment=${environment}`);
  };

  if (error) {
    return (
      <div>
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load dashboard data. {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const statusData = Object.entries(stats.by_status).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    color: STATUS_COLORS[status],
  }));

  const environmentData = Object.entries(stats.by_environment).map(([env, count]) => ({
    name: env.charAt(0).toUpperCase() + env.slice(1),
    value: count,
    color: ENVIRONMENT_COLORS[env],
  }));

  const typeData = Object.entries(stats.by_type)
    .map(([type, count]) => ({
      name: type
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const healthColor = stats.health_score >= 0.8 ? '#4caf50' : stats.health_score >= 0.5 ? '#ff9800' : '#f44336';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-4xl font-bold tracking-tight">CMDB Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your configuration management database
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {/* Summary Cards */}
        <LiquidGlass variant="primary" hover rounded="xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-4xl font-bold text-primary">
                {stats.total_cis}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Total CIs
              </p>
            </div>
            <Computer className="h-12 w-12 text-primary opacity-20" />
          </div>
        </LiquidGlass>

        <LiquidGlass
          variant="default"
          hover
          rounded="xl"
          className="cursor-pointer"
          onClick={() => handleFilterByStatus('active')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                {stats.by_status.active || 0}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Active CIs
              </p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400 opacity-20" />
          </div>
        </LiquidGlass>

        <LiquidGlass variant="accent" hover rounded="xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-4xl font-bold" style={{ color: healthColor }}>
                {(stats.health_score * 100).toFixed(0)}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Health Score
              </p>
            </div>
            <TrendingUp className="h-12 w-12 opacity-20" style={{ color: healthColor }} />
          </div>
        </LiquidGlass>

        <LiquidGlass variant="muted" hover rounded="xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats.critical_relationships}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Critical Links
              </p>
            </div>
            <AlertTriangle className="h-12 w-12 text-yellow-600 dark:text-yellow-400 opacity-20" />
          </div>
        </LiquidGlass>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        {/* Status Distribution */}
        <LiquidGlass variant="default" rounded="xl">
          <div>
            <h3 className="text-lg font-semibold mb-4">CI Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  onClick={(data) => handleFilterByStatus(data.name.toLowerCase())}
                  style={{ cursor: 'pointer' }}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </LiquidGlass>

        {/* Environment Distribution */}
        <LiquidGlass variant="default" rounded="xl">
          <div>
            <h3 className="text-lg font-semibold mb-4">Environment Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={environmentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  onClick={(data) => handleFilterByEnvironment(data.name.toLowerCase())}
                  style={{ cursor: 'pointer' }}
                >
                  {environmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </LiquidGlass>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {/* CI Types Chart */}
        <LiquidGlass variant="default" rounded="xl" className="md:col-span-2">
          <div>
            <h3 className="text-lg font-semibold mb-4">Top CI Types</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Bar
                  dataKey="count"
                  fill="#1976d2"
                  name="Count"
                  onClick={(data) => handleFilterByType(data.name.toLowerCase().replace(/ /g, '-'))}
                  style={{ cursor: 'pointer' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </LiquidGlass>

        {/* Recent Discoveries */}
        <LiquidGlass variant="default" rounded="xl">
          <div>
            <h3 className="text-lg font-semibold mb-4">Recent Discoveries</h3>
            {stats.recent_discoveries.length > 0 ? (
              <div className="max-h-[350px] overflow-y-auto space-y-2">
                {stats.recent_discoveries.map((ci) => (
                  <div
                    key={ci.id}
                    className="p-3 rounded-md hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleCIClick(ci.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {ci.type === 'server' && <Computer className="h-5 w-5" />}
                        {ci.type === 'virtual-machine' && <Cloud className="h-5 w-5" />}
                        {ci.type === 'database' && <HardDrive className="h-5 w-5" />}
                        {ci.type === 'application' && <AppWindow className="h-5 w-5" />}
                        {!['server', 'virtual-machine', 'database', 'application'].includes(ci.type) && (
                          <Computer className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{ci.name}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          <CITypeBadge type={ci.type} size="small" />
                          <CIStatusBadge status={ci.status} size="small" />
                        </div>
                        {ci.last_discovered && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(ci.last_discovered)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No recent discoveries
              </p>
            )}
          </div>
        </LiquidGlass>
      </div>

      {/* Quick Stats by Status */}
      <LiquidGlass variant="default" rounded="xl">
        <div>
          <h3 className="text-lg font-semibold mb-6">Status Breakdown</h3>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {Object.entries(stats.by_status).map(([status, count]) => (
              <div
                key={status}
                className="p-4 border border-white/10 rounded-lg text-center bg-white/5"
              >
                <p className="text-3xl font-bold mb-2" style={{ color: STATUS_COLORS[status] }}>
                  {count}
                </p>
                <Badge
                  style={{
                    backgroundColor: STATUS_COLORS[status],
                    color: '#fff',
                  }}
                  className="capitalize"
                >
                  {status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </LiquidGlass>
    </div>
  );
};

export default Dashboard;
