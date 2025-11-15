import React from 'react';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { LiquidGlass } from '@/components/ui/liquid-glass';
import { Badge } from '@/components/ui/badge';

export interface KPICardProps {
  title: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  icon?: LucideIcon;
  color?: 'green' | 'red' | 'yellow' | 'blue' | 'purple';
  description?: string;
  onClick?: () => void;
}

const COLOR_CLASSES = {
  green: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950',
  red: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950',
  yellow: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950',
  blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950',
  purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950',
};

const ICON_COLOR_CLASSES = {
  green: 'text-green-600 dark:text-green-400',
  red: 'text-red-600 dark:text-red-400',
  yellow: 'text-yellow-600 dark:text-yellow-400',
  blue: 'text-blue-600 dark:text-blue-400',
  purple: 'text-purple-600 dark:text-purple-400',
};

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  unit,
  trend,
  trendValue,
  icon: Icon,
  color = 'blue',
  description,
  onClick,
}) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend === 'up') return <TrendingUp className="h-4 w-4" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend === 'up') return 'text-green-600 dark:text-green-400';
    if (trend === 'down') return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getVariant = () => {
    if (color === 'blue') return 'primary';
    if (color === 'green') return 'default';
    if (color === 'yellow' || color === 'red') return 'accent';
    if (color === 'purple') return 'secondary';
    return 'default';
  };

  return (
    <LiquidGlass
      variant={getVariant()}
      hover
      rounded="xl"
      className={onClick ? 'cursor-pointer' : ''}
      onClick={onClick}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {Icon && (
            <Icon className={`h-5 w-5 ${ICON_COLOR_CLASSES[color]} opacity-60`} />
          )}
        </div>

        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>

        {(trend || description) && (
          <div className="flex items-center gap-2">
            {trend && (
              <Badge variant="outline" className={`flex items-center gap-1 ${getTrendColor()}`}>
                {getTrendIcon()}
                {trendValue !== undefined && (
                  <span className="text-xs">{trendValue > 0 ? '+' : ''}{trendValue}%</span>
                )}
              </Badge>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        )}
      </div>
    </LiquidGlass>
  );
};
