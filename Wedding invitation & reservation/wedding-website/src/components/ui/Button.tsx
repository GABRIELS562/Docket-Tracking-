import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  // Use design system classes
  const getVariantClass = () => {
    switch (variant) {
      case 'primary': return 'btn-primary';
      case 'secondary': return 'btn-secondary';
      case 'outline': return 'btn-outline';
      case 'ghost': return 'btn-ghost';
      default: return 'btn-primary';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm': return 'btn-small';
      case 'lg': return 'btn-large';
      default: return ''; // Default size
    }
  };

  const classes = [
    'btn', // Base button class from design system
    getVariantClass(),
    getSizeClass(),
    isLoading ? 'btn-loading' : '',
    (disabled || isLoading) ? 'btn-disabled' : '',
    className
  ].filter(Boolean).join(' ');

  const { onAnimationStart, onAnimationEnd, onDragStart, onDragEnd, onDrag, ...restProps } = props;
  
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={classes}
      disabled={disabled || isLoading}
      {...restProps}
    >
      {isLoading ? (
        <>
          <div className="spinner spinner-small" />
          Loading...
        </>
      ) : (
        <>
          {leftIcon && <span style={{ marginRight: 'var(--space-2)' }}>{leftIcon}</span>}
          {children}
          {rightIcon && <span style={{ marginLeft: 'var(--space-2)' }}>{rightIcon}</span>}
        </>
      )}
    </motion.button>
  );
};