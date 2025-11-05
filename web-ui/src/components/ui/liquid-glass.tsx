import React from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '../../contexts/ThemeContext';

interface LiquidGlassProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Padding size preset
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Border radius preset
   * @default 'lg'
   */
  rounded?: 'none' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  /**
   * Enable hover effect that slightly enlarges the component
   * @default false
   */
  hover?: boolean;
  /**
   * Variant controls the glass effect intensity and color
   * @default 'default' - Adapts to light/dark theme automatically
   * @example 'primary' - Uses primary color tint
   * @example 'muted' - Subtle glass effect
   */
  variant?: 'default' | 'primary' | 'secondary' | 'muted' | 'accent';
  /**
   * Optional click handler
   */
  onClick?: () => void;
}

const sizeMap = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
};

const roundedMap = {
  none: 'rounded-none',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  xl: 'rounded-3xl',
  '2xl': 'rounded-[2rem]',
  '3xl': 'rounded-[3rem]',
};

export const LiquidGlass: React.FC<LiquidGlassProps> = ({
  children,
  className,
  size = 'md',
  rounded = 'lg',
  hover = false,
  variant = 'default',
  onClick,
}) => {
  const { resolvedTheme } = useTheme();
  const isLightMode = resolvedTheme === 'light';

  // Get background color - lighten for dark mode, darken for light mode
  const getBackgroundColor = () => {
    if (typeof window === 'undefined') return 'rgba(255, 255, 255, 0.25)';

    const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim();

    // Parse hex color
    if (bgColor.startsWith('#')) {
      const hex = bgColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);

      // Determine if background is light or dark (using luminance)
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const isLight = luminance > 0.5;

      if (isLight) {
        // For light backgrounds, darken by 15% and add more opacity
        const darken = (val: number) => Math.max(0, val * 0.85);
        return `rgba(${darken(r)}, ${darken(g)}, ${darken(b)}, 0.4)`;
      } else {
        // For dark backgrounds, lighten by 25%
        const lighten = (val: number) => Math.min(255, val + (255 - val) * 0.25);
        return `rgba(${lighten(r)}, ${lighten(g)}, ${lighten(b)}, 0.25)`;
      }
    }

    return 'rgba(255, 255, 255, 0.25)';
  };

  // Get tint colors based on variant
  const getTintColor = () => {
    switch (variant) {
      case 'primary':
        return 'rgba(59, 130, 246, 0.12)'; // blue
      case 'secondary':
        return 'rgba(139, 92, 246, 0.12)'; // purple
      case 'muted':
        return 'rgba(100, 116, 139, 0.08)'; // slate
      case 'accent':
        return 'rgba(245, 158, 11, 0.12)'; // amber
      case 'default':
      default:
        // In light mode, use stronger blue/coral gradient
        if (isLightMode) {
          return 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(239, 68, 68, 0.15))';
        }
        return getBackgroundColor(); // Use lightened bg-background for dark mode
    }
  };


  const getEdgeHighlights = () => {
    return `
      inset 3px 3px 3px 0 rgba(255, 255, 255, 0.45),
      inset -3px -3px 3px 0 rgba(255, 255, 255, 0.45)
    `;
  };

  // Generate unique ID for this instance
  const glassId = React.useId();
  const bendClass = `liquid-glass--bend-${glassId.replace(/:/g, '-')}`;

  return (
    <>
      {/* Inject pseudo-element styles for light mode gradient */}
      <style>{`
        .${bendClass}::before {
          content: '';
          position: absolute;
          inset: -40px;
          border-radius: inherit;
          background: radial-gradient(circle at top left, rgba(59, 130, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at bottom right, rgba(239, 68, 68, 0.1) 0%, transparent 50%);
          z-index: -1;
        }
      `}</style>

      <div
        className={cn(
          'liquid-glass relative overflow-hidden',
          'transition-all duration-300 ease-out',
          sizeMap[size],
          roundedMap[rounded],
          hover && 'hover:scale-[1.02]',
          className
        )}
        style={{
          boxShadow: isLightMode && variant === 'default'
            ? '0 4px 6px rgba(59, 130, 246, 0.15), 0 2px 4px rgba(239, 68, 68, 0.1), 0 8px 16px rgba(59, 130, 246, 0.1), 0 8px 16px rgba(239, 68, 68, 0.08)'
            : '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06), 0 8px 16px rgba(0, 0, 0, 0.08)',
        }}
        onClick={onClick}
      >
        {/* Bend layer - light backdrop blur with gradient background */}
        <div
          className={cn('liquid-glass--bend absolute inset-0', roundedMap[rounded], bendClass)}
          style={{
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            filter: 'url(#glass-blur)',
          }}
        />

        {/* Face layer - subtle outer shadows for depth */}
        <div
          className={cn('liquid-glass--face absolute inset-0', roundedMap[rounded])}
          style={{
            boxShadow: '0 4px 4px rgba(0, 0, 0, 0.15), 0 0 12px rgba(0, 0, 0, 0.08)',
          }}
        />

        {/* Edge layer - crisp inner highlights for glass effect */}
        <div
          className={cn(
            'liquid-glass--edge absolute inset-0 pointer-events-none',
            roundedMap[rounded]
          )}
          style={{
            boxShadow: getEdgeHighlights(),
          }}
        />

        {/* Content */}
        <div className="liquid-glass--content relative z-10">
          {children}
        </div>
      </div>
    </>
  );
};

LiquidGlass.displayName = 'LiquidGlass';
