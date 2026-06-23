import { type ReactNode, type HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * UI POLISH - Card Component
 *
 * ECC make-interfaces-feel-better principles applied:
 * 1. Shadows and Borders: layered subtle shadows for depth, borders for separation
 * 2. Concentric Radius: outer radius = inner radius + padding
 *    - Card uses rounded-xl (12px)
 *    - Card body has p-4 (16px padding)
 *    - Inner elements should use rounded-lg (8px) for visual coherence
 */

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive' | 'glass';
  noPadding?: boolean;
  children: ReactNode;
}

/**
 * Card container with layered shadow depth
 *
 * Shadow layers create realistic depth:
 * - Layer 1: tight shadow for immediate depth
 * - Layer 2: medium spread for mid-range depth
 * - Layer 3: large spread for ambient occlusion
 */
const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', noPadding = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'rounded-xl border',
          // Variant styles
          variants[variant],
          // Padding (can be disabled for custom layouts)
          !noPadding && 'p-4',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Variant styles with layered shadows
const variants = {
  // Default card - subtle elevation
  default: [
    'bg-gray-900 border-gray-800',
    // Three-layer shadow for realistic depth
    'shadow-[0_1px_2px_0_rgba(0,0,0,0.3),0_4px_8px_-2px_rgba(0,0,0,0.2),0_12px_24px_-4px_rgba(0,0,0,0.15)]',
  ].join(' '),

  // Elevated card - more pronounced shadow
  elevated: [
    'bg-gray-900 border-gray-800',
    'shadow-[0_2px_4px_0_rgba(0,0,0,0.4),0_8px_16px_-4px_rgba(0,0,0,0.3),0_20px_40px_-8px_rgba(0,0,0,0.2)]',
  ].join(' '),

  // Interactive card - hover state with transition
  interactive: [
    'bg-gray-900 border-gray-800',
    'shadow-[0_1px_2px_0_rgba(0,0,0,0.3),0_4px_8px_-2px_rgba(0,0,0,0.2),0_12px_24px_-4px_rgba(0,0,0,0.15)]',
    // Transition: specific properties only
    'transition-[transform,box-shadow,border-color] duration-150 ease-out',
    'hover:shadow-[0_2px_4px_0_rgba(0,0,0,0.4),0_8px_16px_-4px_rgba(0,0,0,0.3),0_20px_40px_-8px_rgba(0,0,0,0.2)]',
    'hover:border-gray-700',
    'cursor-pointer',
  ].join(' '),

  // Glass card - translucent with backdrop blur
  glass: [
    'bg-gray-900/90 backdrop-blur-md border-gray-700/50',
    'shadow-[0_1px_2px_0_rgba(0,0,0,0.3),0_4px_8px_-2px_rgba(0,0,0,0.2)]',
  ].join(' '),
};

/**
 * CardHeader - Consistent header styling with concentric radius
 */
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between',
          // Border for separation
          'pb-3 mb-3 border-b border-gray-800',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

/**
 * CardTitle - Heading with text-wrap: balance
 */
export interface CardTitleProps {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  className?: string;
  children: ReactNode;
}

export function CardTitle({ className, as: Tag = 'h3', children }: CardTitleProps) {
  return (
    <Tag
      className={cn(
        'font-semibold text-white',
        // text-wrap: balance is applied globally to headings in index.css
        className
      )}
    >
      {children}
    </Tag>
  );
}

/**
 * CardContent - Body content with text-wrap: pretty
 */
export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Inner content uses rounded-lg for concentric radius harmony
          // (card is rounded-xl with p-4, so inner = rounded-lg)
          'text-gray-300',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

/**
 * CardFooter - Footer with top border
 */
export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center', 'pt-3 mt-3 border-t border-gray-800', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

/**
 * StatCard - Pre-styled card for displaying metrics
 *
 * Uses tabular-nums for counter values
 */
export interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  color?: 'blue' | 'purple' | 'green' | 'red' | 'yellow';
}

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, icon, title, value, subtitle, trend, color = 'blue', ...props }, ref) => {
    const colorStyles = {
      blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
      purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
      green: 'from-green-500/20 to-green-600/20 border-green-500/30',
      red: 'from-red-500/20 to-red-600/20 border-red-500/30',
      yellow: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30',
    };

    const trendColors = {
      up: 'text-green-400',
      down: 'text-red-400',
      neutral: 'text-gray-400',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl border p-4',
          'bg-gradient-to-br backdrop-blur-sm',
          // Layered shadow
          'shadow-[0_1px_2px_0_rgba(0,0,0,0.3),0_4px_8px_-2px_rgba(0,0,0,0.2)]',
          colorStyles[color],
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-3 mb-2">
          {icon && <div className="text-white">{icon}</div>}
          <span className="text-gray-400 text-sm font-medium">{title}</span>
        </div>
        <div className="flex items-end gap-2">
          {/* Value uses tabular-nums for stable width when numbers change */}
          <span className="text-3xl font-bold text-white tabular-nums">{value}</span>
          {trend && (
            <span className={cn('text-sm font-medium tabular-nums', trendColors[trend.direction])}>
              {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}
              {Math.abs(trend.value)}%
            </span>
          )}
        </div>
        {subtitle && <div className="text-gray-400 text-sm mt-1">{subtitle}</div>}
      </div>
    );
  }
);

StatCard.displayName = 'StatCard';

export default Card;
