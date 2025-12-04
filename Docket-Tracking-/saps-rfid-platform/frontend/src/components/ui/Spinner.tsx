import { Loader2 } from 'lucide-react';

/**
 * Enhanced Spinner Component
 *
 * Animated loading spinner with glow effects
 * Used for loading states throughout the application
 */

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

export const Spinner = ({ size = 'md', className = '', label }: SpinnerProps) => {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative">
        {/* Outer glow ring */}
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 blur-lg opacity-30 animate-pulse"
          style={{ transform: 'scale(1.5)' }}
        />

        {/* Main spinner */}
        <Loader2
          className={`${sizeClasses[size]} text-cyan-400 animate-spin relative z-10`}
        />
      </div>

      {label && (
        <span className="mt-3 text-sm text-gray-400 animate-pulse">{label}</span>
      )}
    </div>
  );
};

export default Spinner;
