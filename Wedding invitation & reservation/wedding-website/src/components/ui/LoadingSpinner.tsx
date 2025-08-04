import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white' | 'gray';
  text?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  text,
  className = ''
}) => {
  // Use design system classes
  const getSpinnerClass = () => {
    switch (size) {
      case 'sm': return 'spinner-small';
      case 'lg': return 'spinner-large';
      default: return 'spinner';
    }
  };

  const getTextClass = () => {
    switch (size) {
      case 'sm': return 'body-small';
      case 'lg': return 'body-large';
      default: return 'body-base';
    }
  };

  const getColorStyle = () => {
    switch (color) {
      case 'primary': return { borderTopColor: 'var(--color-primary)' };
      case 'secondary': return { borderTopColor: 'var(--color-secondary)' };
      case 'white': return { borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' };
      case 'gray': return { borderTopColor: 'var(--color-gray-500)' };
      default: return {};
    }
  };

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)'
  };

  return (
    <div style={containerStyle} className={className}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className={getSpinnerClass()}
        style={getColorStyle()}
      />
      
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={getTextClass()}
          style={{ 
            color: color === 'white' ? 'white' : 
                   color === 'primary' ? 'var(--color-primary)' :
                   color === 'secondary' ? 'var(--color-secondary)' :
                   'var(--color-gray-600)',
            fontWeight: 'var(--font-medium)',
            textAlign: 'center'
          }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
};

interface LoadingOverlayProps {
  isVisible: boolean;
  text?: string;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  text = 'Loading...',
  className = ''
}) => {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="bg-white p-6 rounded-lg shadow-xl"
      >
        <LoadingSpinner size="lg" text={text} />
      </motion.div>
    </motion.div>
  );
};

interface LoadingDotsProps {
  color?: 'primary' | 'secondary' | 'white' | 'gray';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({
  color = 'primary',
  size = 'md',
  className = ''
}) => {
  const colorClasses = {
    primary: 'bg-rose-600',
    secondary: 'bg-gray-600',
    white: 'bg-white',
    gray: 'bg-gray-400'
  };

  const sizeClasses = {
    sm: 'h-1 w-1',
    md: 'h-2 w-2',
    lg: 'h-3 w-3'
  };

  const dotVariants = {
    initial: { y: 0 },
    animate: { y: -10 }
  };

  return (
    <div className={`flex space-x-1 ${className}`}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={`rounded-full ${colorClasses[color]} ${sizeClasses[size]}`}
          variants={dotVariants}
          initial="initial"
          animate="animate"
          transition={{
            duration: 0.6,
            repeat: Infinity,
            repeatType: 'reverse',
            delay: index * 0.2
          }}
        />
      ))}
    </div>
  );
};