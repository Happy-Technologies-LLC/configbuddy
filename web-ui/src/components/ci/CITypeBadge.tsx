// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import {
  Server,
  Cloud as CloudIcon,
  Box,
  Grid3x3,
  Code,
  Database,
  Network,
  HardDrive,
  Scale,
  CloudCog,
} from 'lucide-react';
import { CIType } from '../../services/ci.service';
import { cn } from '../../utils/cn';
import { useTheme } from '../../contexts/ThemeContext';

interface CITypeBadgeProps {
  type: CIType;
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined';
  showIcon?: boolean;
  className?: string;
}

const typeConfig: Record<
  CIType,
  {
    label: string;
    colors: {
      light: { filled: string; outlined: string; text: string };
      dark: { filled: string; outlined: string; text: string };
    };
    icon: React.ReactElement
  }
> = {
  server: {
    label: 'Server',
    colors: {
      light: {
        filled: 'bg-blue-600 text-white border-blue-600',
        outlined: 'bg-blue-50 text-blue-600 border-blue-600',
        text: 'text-blue-600'
      },
      dark: {
        filled: 'bg-blue-600 text-blue-50 border-blue-600',
        outlined: 'bg-blue-900/20 text-blue-400 border-blue-400',
        text: 'text-blue-400'
      }
    },
    icon: <Server className="w-4 h-4" />,
  },
  'virtual-machine': {
    label: 'Virtual Machine',
    colors: {
      light: {
        filled: 'bg-purple-600 text-white border-purple-600',
        outlined: 'bg-purple-50 text-purple-600 border-purple-600',
        text: 'text-purple-600'
      },
      dark: {
        filled: 'bg-purple-600 text-purple-50 border-purple-600',
        outlined: 'bg-purple-900/20 text-purple-400 border-purple-400',
        text: 'text-purple-400'
      }
    },
    icon: <CloudIcon className="w-4 h-4" />,
  },
  container: {
    label: 'Container',
    colors: {
      light: {
        filled: 'bg-cyan-600 text-white border-cyan-600',
        outlined: 'bg-cyan-50 text-cyan-600 border-cyan-600',
        text: 'text-cyan-600'
      },
      dark: {
        filled: 'bg-cyan-600 text-cyan-50 border-cyan-600',
        outlined: 'bg-cyan-900/20 text-cyan-400 border-cyan-400',
        text: 'text-cyan-400'
      }
    },
    icon: <Box className="w-4 h-4" />,
  },
  application: {
    label: 'Application',
    colors: {
      light: {
        filled: 'bg-orange-600 text-white border-orange-600',
        outlined: 'bg-orange-50 text-orange-600 border-orange-600',
        text: 'text-orange-600'
      },
      dark: {
        filled: 'bg-orange-600 text-orange-50 border-orange-600',
        outlined: 'bg-orange-900/20 text-orange-400 border-orange-400',
        text: 'text-orange-400'
      }
    },
    icon: <Grid3x3 className="w-4 h-4" />,
  },
  service: {
    label: 'Service',
    colors: {
      light: {
        filled: 'bg-green-600 text-white border-green-600',
        outlined: 'bg-green-50 text-green-600 border-green-600',
        text: 'text-green-600'
      },
      dark: {
        filled: 'bg-green-600 text-green-50 border-green-600',
        outlined: 'bg-green-900/20 text-green-400 border-green-400',
        text: 'text-green-400'
      }
    },
    icon: <Code className="w-4 h-4" />,
  },
  database: {
    label: 'Database',
    colors: {
      light: {
        filled: 'bg-red-600 text-white border-red-600',
        outlined: 'bg-red-50 text-red-600 border-red-600',
        text: 'text-red-600'
      },
      dark: {
        filled: 'bg-red-600 text-red-50 border-red-600',
        outlined: 'bg-red-900/20 text-red-400 border-red-400',
        text: 'text-red-400'
      }
    },
    icon: <Database className="w-4 h-4" />,
  },
  'network-device': {
    label: 'Network Device',
    colors: {
      light: {
        filled: 'bg-indigo-700 text-white border-indigo-700',
        outlined: 'bg-indigo-50 text-indigo-700 border-indigo-700',
        text: 'text-indigo-700'
      },
      dark: {
        filled: 'bg-indigo-700 text-indigo-50 border-indigo-700',
        outlined: 'bg-indigo-900/20 text-indigo-400 border-indigo-400',
        text: 'text-indigo-400'
      }
    },
    icon: <Network className="w-4 h-4" />,
  },
  storage: {
    label: 'Storage',
    colors: {
      light: {
        filled: 'bg-teal-700 text-white border-teal-700',
        outlined: 'bg-teal-50 text-teal-700 border-teal-700',
        text: 'text-teal-700'
      },
      dark: {
        filled: 'bg-teal-700 text-teal-50 border-teal-700',
        outlined: 'bg-teal-900/20 text-teal-400 border-teal-400',
        text: 'text-teal-400'
      }
    },
    icon: <HardDrive className="w-4 h-4" />,
  },
  'load-balancer': {
    label: 'Load Balancer',
    colors: {
      light: {
        filled: 'bg-pink-700 text-white border-pink-700',
        outlined: 'bg-pink-50 text-pink-700 border-pink-700',
        text: 'text-pink-700'
      },
      dark: {
        filled: 'bg-pink-700 text-pink-50 border-pink-700',
        outlined: 'bg-pink-900/20 text-pink-400 border-pink-400',
        text: 'text-pink-400'
      }
    },
    icon: <Scale className="w-4 h-4" />,
  },
  'cloud-resource': {
    label: 'Cloud Resource',
    colors: {
      light: {
        filled: 'bg-violet-600 text-white border-violet-600',
        outlined: 'bg-violet-50 text-violet-600 border-violet-600',
        text: 'text-violet-600'
      },
      dark: {
        filled: 'bg-violet-600 text-violet-50 border-violet-600',
        outlined: 'bg-violet-900/20 text-violet-400 border-violet-400',
        text: 'text-violet-400'
      }
    },
    icon: <CloudCog className="w-4 h-4" />,
  },
};

export const CITypeBadge: React.FC<CITypeBadgeProps> = ({
  type,
  size = 'small',
  variant = 'outlined',
  showIcon = true,
  className,
}) => {
  const { resolvedTheme } = useTheme();
  const config = typeConfig[type] || typeConfig.server;
  const themeColors = config.colors[resolvedTheme];
  const colorClasses = variant === 'filled' ? themeColors.filled : themeColors.outlined;
  const sizeClasses = size === 'small' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        colorClasses,
        sizeClasses,
        className
      )}
    >
      {showIcon && (
        <span className={cn(variant === 'outlined' && themeColors.text)}>
          {config.icon}
        </span>
      )}
      {config.label}
    </span>
  );
};

export default CITypeBadge;
