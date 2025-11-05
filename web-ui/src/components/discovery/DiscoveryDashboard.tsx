import React, { useEffect, useState } from 'react';
import { useDiscovery } from '../../hooks/useDiscovery';
import { useDiscoveryJobs } from '../../hooks/useDiscoveryJobs';
import DiscoveryProviderCard from './DiscoveryProviderCard';
import { DiscoveryProvider, JobStatus } from '../../services/discovery.service';
import { useNavigate } from 'react-router-dom';
import { LiquidGlass } from '../ui/liquid-glass';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

const STATUS_CONFIG: Record<JobStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  pending: { variant: 'outline', label: 'Pending' },
  running: { variant: 'default', label: 'Running' },
  completed: { variant: 'secondary', label: 'Completed' },
  failed: { variant: 'destructive', label: 'Failed' },
  cancelled: { variant: 'outline', label: 'Cancelled' },
};

export const DiscoveryDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { stats, loadStats, triggerJob } = useDiscovery();
  const { jobs } = useDiscoveryJobs({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }, false);
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const calculateOverallStats = () => {
    // Ensure stats is an array
    const statsArray = Array.isArray(stats) ? stats : [];

    const totalJobs = statsArray.reduce((sum, s) => sum + s.totalJobs, 0);
    const successfulJobs = statsArray.reduce((sum, s) => sum + s.successfulJobs, 0);
    const failedJobs = statsArray.reduce((sum, s) => sum + s.failedJobs, 0);
    const totalCIs = statsArray.reduce((sum, s) => sum + s.totalDiscoveredCIs, 0);
    const avgDuration =
      statsArray.reduce((sum, s) => sum + s.averageDuration, 0) / (statsArray.length || 1);
    const successRate = totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 0;

    return { totalJobs, successfulJobs, failedJobs, totalCIs, avgDuration, successRate };
  };

  const overallStats = calculateOverallStats();

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Discovery Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Monitor and manage multi-cloud discovery operations
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <LiquidGlass size="sm" rounded="xl">
          <div className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Total Jobs</p>
            <p className="text-3xl font-bold">{overallStats.totalJobs}</p>
          </div>
        </LiquidGlass>
        <LiquidGlass size="sm" rounded="xl">
          <div className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Success Rate</p>
            <p className="text-3xl font-bold text-green-600">
              {overallStats.successRate.toFixed(1)}%
            </p>
          </div>
        </LiquidGlass>
        <LiquidGlass size="sm" rounded="xl">
          <div className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Avg Duration</p>
            <p className="text-3xl font-bold">
              {formatDuration(overallStats.avgDuration)}
            </p>
          </div>
        </LiquidGlass>
        <LiquidGlass size="sm" rounded="xl">
          <div className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Discovered CIs</p>
            <p className="text-3xl font-bold">{overallStats.totalCIs.toLocaleString()}</p>
          </div>
        </LiquidGlass>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Discovery Providers</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.isArray(stats) && stats.map((providerStats) => (
            <DiscoveryProviderCard
              key={providerStats.provider}
              stats={providerStats}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Recent Jobs</h3>
        <LiquidGlass size="sm" rounded="xl" className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job ID</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">CIs Discovered</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!jobs || jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    <p className="text-sm text-muted-foreground py-4">
                      No recent jobs
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job) => (
                  <TableRow
                    key={job.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate('/discovery?tab=jobs&jobId=' + job.id)}
                  >
                    <TableCell>
                      <span className="font-mono text-sm">
                        {job.id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {job.provider.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_CONFIG[job.status].variant}>
                        {STATUS_CONFIG[job.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{job.discoveredCIs}</TableCell>
                    <TableCell>
                      {new Date(job.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </LiquidGlass>
      </div>
    </div>
  );
};

export default DiscoveryDashboard;
