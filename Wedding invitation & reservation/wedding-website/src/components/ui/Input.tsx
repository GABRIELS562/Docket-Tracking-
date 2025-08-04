import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helpText,
  leftIcon,
  rightIcon,
  variant = 'default',
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  // Use design system classes
  const getInputClasses = () => {
    const baseClass = error ? 'form-input form-input-error' : 'form-input';
    const iconPadding = leftIcon ? { paddingLeft: 'var(--space-10)' } : 
                        rightIcon ? { paddingRight: 'var(--space-10)' } : {};
    
    return {
      className: `${baseClass} ${className}`,
      style: iconPadding
    };
  };

  const inputProps = getInputClasses();

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
        </label>
      )}
      
      <div style={{ position: 'relative' }}>
        {leftIcon && (
          <div style={{ 
            position: 'absolute', 
            top: '50%', 
            left: 'var(--space-3)', 
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: 'var(--color-gray-400)'
          }}>
            {leftIcon}
          </div>
        )}
        
        <motion.input
          ref={ref}
          id={inputId}
          className={inputProps.className}
          style={inputProps.style}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          {...(props as any)}
        />
        
        {rightIcon && (
          <div style={{ 
            position: 'absolute', 
            top: '50%', 
            right: 'var(--space-3)', 
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: 'var(--color-gray-400)'
          }}>
            {rightIcon}
          </div>
        )}
      </div>
      
      {error && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="form-error"
        >
          {error}
        </motion.p>
      )}
      
      {helpText && !error && (
        <p className="body-small" style={{ marginTop: 'var(--space-1)' }}>
          {helpText}
        </p>
      )}
    </div>
  );
});