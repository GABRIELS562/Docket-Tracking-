import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * UI POLISH - Button Component
 *
 * ECC make-interfaces-feel-better principles applied:
 * 1. Hit Areas: minimum 44x44px touch target
 * 2. Transition Scope: specific properties only (transform, background-color, box-shadow, border-color)
 * 3. Motion: scale(0.96) press state for tactile feedback
 * 4. Optical Alignment: icon buttons can use optical-align-* utilities
 * 5. Focus: visible focus rings with ring offset
 */

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          // Base styles
          'relative inline-flex items-center justify-center font-medium rounded-lg',
          // Focus ring - use border for focus, not transition: all
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900',
          // Transition: specific properties only (never transition: all)
          // transition-property: transform, background-color, box-shadow, border-color, color
          'transition-[transform,background-color,box-shadow,border-color,color] duration-150 ease-out',
          // Press state: scale(0.96) for tactile feedback
          'active:scale-[0.96]',
          // Disabled state
          isDisabled && 'cursor-not-allowed opacity-60',
          // Variant styles
          variants[variant],
          // Size styles - ensure minimum 44px hit area
          sizes[size],
          className
        )}
        {...props}
      >
        {/* Loading spinner */}
        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <LoadingSpinner className="w-4 h-4" />
          </span>
        )}

        {/* Content wrapper - hide when loading */}
        <span className={cn('inline-flex items-center gap-2', isLoading && 'invisible')}>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';

// Variant styles
const variants = {
  primary: [
    'bg-blue-600 text-white',
    'hover:bg-blue-700',
    'focus-visible:ring-blue-500',
    'disabled:bg-gray-700 disabled:text-gray-500',
  ].join(' '),
  secondary: [
    'bg-gray-800 text-gray-300 border border-gray-700',
    'hover:bg-gray-700 hover:text-white hover:border-gray-600',
    'focus-visible:ring-gray-500',
    'disabled:bg-gray-800 disabled:text-gray-600',
  ].join(' '),
  ghost: [
    'bg-transparent text-gray-400',
    'hover:bg-gray-800 hover:text-white',
    'focus-visible:ring-gray-500',
  ].join(' '),
  danger: [
    'bg-red-600 text-white',
    'hover:bg-red-700',
    'focus-visible:ring-red-500',
    'disabled:bg-gray-700 disabled:text-gray-500',
  ].join(' '),
};

// Size styles - all sizes maintain minimum 44px hit area
const sizes = {
  sm: 'min-h-[44px] px-3 text-sm gap-1.5',
  md: 'min-h-[44px] px-4 py-2 text-sm gap-2',
  lg: 'min-h-[48px] px-6 py-3 text-base gap-2',
  // Icon button: square 44x44 minimum
  icon: 'min-h-[44px] min-w-[44px] p-2',
};

// Loading spinner component
function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin', className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * IconButton - Convenience wrapper for icon-only buttons
 *
 * Ensures 44x44 hit area even with small icons.
 * Use optical-align-* utilities for asymmetric icons (play, arrows, etc.)
 */
export interface IconButtonProps extends Omit<ButtonProps, 'size' | 'leftIcon' | 'rightIcon'> {
  icon: ReactNode;
  label: string; // Required for accessibility
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        size="icon"
        aria-label={label}
        title={label}
        className={className}
        {...props}
      >
        {icon}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

export default Button;
