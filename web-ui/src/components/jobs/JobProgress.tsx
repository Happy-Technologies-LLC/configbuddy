// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * JobProgress Component
 *
 * Visual progress bar showing job completion percentage and status.
 */

import React from 'react';
import { CheckCircle, XCircle, HourglassIcon, Play, Pause } from 'lucide-react';
import { Progress } from '../ui/progress';
import { Job } from '../../services/jobs.service';
import { cn } from '../../lib/utils';

interface JobProgressProps {
  job: Job;
  showLabel?: boolean;
  showIcon?: boolean;
  height?: number;
}

export const JobProgress: React.FC<JobProgressProps> = ({
  job,
  showLabel = true,
  showIcon = true,
  height = 8,
}) => {
  const getStatusIcon = () => {
    switch (job.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'active':
        return <Play className="h-4 w-4 text-primary" />;
      case 'waiting':
      case 'delayed':
        return <HourglassIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getProgressValue = (): number => {
    if (job.status === 'completed') return 100;
    if (job.status === 'failed') return job.progress || 0;
    return job.progress || 0;
  };

  const getProgressColor = (): string => {
    switch (job.status) {
      case 'completed':
        return 'bg-green-600';
      case 'failed':
        return 'bg-red-600';
      case 'active':
        return 'bg-blue-600';
      case 'waiting':
      case 'delayed':
        return 'bg-yellow-600';
      default:
        return 'bg-gray-600';
    }
  };

  const formatStatus = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const progressValue = getProgressValue();

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center mb-1">
          {showIcon && (
            <div className="mr-2 flex items-center">
              {getStatusIcon()}
            </div>
          )}
          <span className="text-sm text-muted-foreground flex-grow">
            {formatStatus(job.status)}
          </span>
          <span className="text-sm text-muted-foreground">
            {progressValue.toFixed(0)}%
          </span>
        </div>
      )}
      <div className="relative" style={{ height: `${height}px` }}>
        <Progress
          value={progressValue}
          className="h-full"
        />
      </div>
    </div>
  );
};
