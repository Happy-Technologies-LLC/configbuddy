import React from 'react';
import { LiquidGlass } from '@/components/ui/liquid-glass';
import { Server, Activity, CheckCircle, XCircle } from 'lucide-react';

interface AgentStatusCardProps {
  totalAgents: number;
  activeAgents: number;
  offlineAgents: number;
  totalJobs: number;
  successRate: number;
}

export const AgentStatusCard: React.FC<AgentStatusCardProps> = ({
  totalAgents,
  activeAgents,
  offlineAgents,
  totalJobs,
  successRate,
}) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <LiquidGlass size="sm" rounded="xl" className="p-6">
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-sm font-medium">Total Agents</h3>
          <Server className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <div className="text-2xl font-bold">{totalAgents}</div>
          <p className="text-xs text-muted-foreground">Registered agents</p>
        </div>
      </LiquidGlass>

      <LiquidGlass size="sm" rounded="xl" className="p-6">
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-sm font-medium">Active</h3>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </div>
        <div>
          <div className="text-2xl font-bold text-green-600">{activeAgents}</div>
          <p className="text-xs text-muted-foreground">
            {totalAgents > 0
              ? `${Math.round((activeAgents / totalAgents) * 100)}% online`
              : 'No agents'}
          </p>
        </div>
      </LiquidGlass>

      <LiquidGlass size="sm" rounded="xl" className="p-6">
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-sm font-medium">Offline</h3>
          <XCircle className="h-4 w-4 text-red-600" />
        </div>
        <div>
          <div className="text-2xl font-bold text-red-600">{offlineAgents}</div>
          <p className="text-xs text-muted-foreground">Need attention</p>
        </div>
      </LiquidGlass>

      <LiquidGlass size="sm" rounded="xl" className="p-6">
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-sm font-medium">Total Jobs</h3>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <div className="text-2xl font-bold">{totalJobs}</div>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>
      </LiquidGlass>

      <LiquidGlass size="sm" rounded="xl" className="p-6">
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-sm font-medium">Success Rate</h3>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <div className="text-2xl font-bold">{successRate}%</div>
          <p className="text-xs text-muted-foreground">Overall performance</p>
        </div>
      </LiquidGlass>
    </div>
  );
};
