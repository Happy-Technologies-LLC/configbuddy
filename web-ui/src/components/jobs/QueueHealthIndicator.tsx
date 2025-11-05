/**
 * QueueHealthIndicator Component
 *
 * Visual indicator showing queue health status.
 */

import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Pause } from 'lucide-react';
import { Badge } from '../ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { QueueHealth } from '../../services/jobs.service';
import { cn } from '../../lib/utils';

interface QueueHealthIndicatorProps {
  health: QueueHealth;
  showLabel?: boolean;
  size?: 'sm' | 'default';
}

export const QueueHealthIndicator: React.FC<QueueHealthIndicatorProps> = ({
  health,
  showLabel = true,
  size = 'sm',
}) => {
  const getHealthColor = (): string => {
    if (health.isPaused) return 'bg-gray-500';

    switch (health.status) {
      case 'healthy':
        return 'bg-green-600';
      case 'degraded':
        return 'bg-yellow-600';
      case 'unhealthy':
        return 'bg-red-600';
      default:
        return 'bg-gray-500';
    }
  };

  const getHealthIcon = () => {
    if (health.isPaused) {
      return <Pause className="h-3 w-3" />;
    }

    switch (health.status) {
      case 'healthy':
        return <CheckCircle className="h-3 w-3" />;
      case 'degraded':
        return <AlertTriangle className="h-3 w-3" />;
      case 'unhealthy':
        return <XCircle className="h-3 w-3" />;
      default:
        return <CheckCircle className="h-3 w-3" />;
    }
  };

  const getHealthLabel = (): string => {
    if (health.isPaused) return 'PAUSED';
    return health.status.toUpperCase();
  };

  const getTooltipContent = () => {
    return (
      <div className="space-y-2">
        <div className="font-bold text-sm">
          {health.queueName}
        </div>
        <div className="space-y-1 text-xs">
          <div>Status: {health.isPaused ? 'Paused' : health.status}</div>
          <div>Workers: {health.workers}</div>
          <div>Error Rate: {(health.errorRate * 100).toFixed(1)}%</div>
          <div>Avg Processing Time: {health.avgProcessingTime.toFixed(0)}ms</div>
        </div>
        {health.issues.length > 0 && (
          <div className="space-y-1">
            <div className="font-bold text-xs">Issues:</div>
            {health.issues.map((issue, index) => (
              <div key={index} className="text-xs">- {issue}</div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Popover>
      <PopoverTrigger>
        <Badge
          variant="secondary"
          className={cn(
            "gap-1 font-bold text-white",
            getHealthColor(),
            !showLabel && "min-w-8 px-1"
          )}
        >
          {getHealthIcon()}
          {showLabel && <span>{getHealthLabel()}</span>}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        {getTooltipContent()}
      </PopoverContent>
    </Popover>
  );
};
