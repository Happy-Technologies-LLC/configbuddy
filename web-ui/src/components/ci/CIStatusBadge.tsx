import React from 'react';
import {
  CheckCircle,
  X,
  Wrench,
  Trash2,
} from 'lucide-react';
import { CIStatus } from '../../services/ci.service';
import { cn } from '../../utils/cn';
import { useTheme } from '../../contexts/ThemeContext';

interface CIStatusBadgeProps {
  status: CIStatus;
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined';
  className?: string;
}

const statusConfig: Record<
  CIStatus,
  {
    label: string;
    colors: {
      light: { filled: string; outlined: string; text: string };
      dark: { filled: string; outlined: string; text: string };
    };
    icon: React.ReactElement
  }
> = {
  active: {
    label: 'Active',
    colors: {
      light: {
        filled: 'bg-green-500 text-white border-green-500',
        outlined: 'bg-green-50 text-green-700 border-green-500',
        text: 'text-green-700'
      },
      dark: {
        filled: 'bg-green-600 text-green-50 border-green-600',
        outlined: 'bg-green-900/20 text-green-400 border-green-400',
        text: 'text-green-400'
      }
    },
    icon: <CheckCircle className="w-4 h-4" />,
  },
  inactive: {
    label: 'Inactive',
    colors: {
      light: {
        filled: 'bg-gray-500 text-white border-gray-500',
        outlined: 'bg-gray-50 text-gray-700 border-gray-500',
        text: 'text-gray-700'
      },
      dark: {
        filled: 'bg-gray-600 text-gray-50 border-gray-600',
        outlined: 'bg-gray-900/20 text-gray-400 border-gray-400',
        text: 'text-gray-400'
      }
    },
    icon: <X className="w-4 h-4" />,
  },
  maintenance: {
    label: 'Maintenance',
    colors: {
      light: {
        filled: 'bg-yellow-500 text-white border-yellow-500',
        outlined: 'bg-yellow-50 text-yellow-700 border-yellow-500',
        text: 'text-yellow-700'
      },
      dark: {
        filled: 'bg-yellow-600 text-yellow-50 border-yellow-600',
        outlined: 'bg-yellow-900/20 text-yellow-400 border-yellow-400',
        text: 'text-yellow-400'
      }
    },
    icon: <Wrench className="w-4 h-4" />,
  },
  decommissioned: {
    label: 'Decommissioned',
    colors: {
      light: {
        filled: 'bg-red-600 text-white border-red-600',
        outlined: 'bg-red-50 text-red-700 border-red-500',
        text: 'text-red-700'
      },
      dark: {
        filled: 'bg-red-600 text-red-50 border-red-600',
        outlined: 'bg-red-900/20 text-red-400 border-red-400',
        text: 'text-red-400'
      }
    },
    icon: <Trash2 className="w-4 h-4" />,
  },
};

export const CIStatusBadge: React.FC<CIStatusBadgeProps> = ({
  status,
  size = 'small',
  variant = 'filled',
  className,
}) => {
  const { resolvedTheme } = useTheme();
  const config = statusConfig[status] || statusConfig.inactive;
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
      <span className={cn(variant === 'outlined' && themeColors.text)}>
        {config.icon}
      </span>
      {config.label}
    </span>
  );
};

export default CIStatusBadge;
