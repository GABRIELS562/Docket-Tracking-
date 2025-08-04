import { type ClassValue, clsx } from 'clsx';

/**
 * Utility function to merge class names with conditional logic
 * Combines clsx functionality for conditional classes
 * 
 * @param inputs - Class names, objects, or arrays to merge
 * @returns Merged class name string
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Utility to merge CSS custom properties with inline styles
 * Useful for combining design system variables with component-specific styles
 * 
 * @param designSystemProps - CSS custom properties from design system
 * @param componentProps - Component-specific style properties
 * @returns Merged style object
 */
export function mergeStyles(
  designSystemProps: React.CSSProperties = {},
  componentProps: React.CSSProperties = {}
): React.CSSProperties {
  return { ...designSystemProps, ...componentProps };
}

/**
 * Convert size prop to design system spacing value
 * 
 * @param size - Size identifier (xs, sm, md, lg, xl, etc.)
 * @returns CSS custom property reference
 */
export function getSpacing(size: string): string {
  const spacingMap: Record<string, string> = {
    'xs': 'var(--space-1)',
    'sm': 'var(--space-2)',
    'md': 'var(--space-4)',
    'lg': 'var(--space-6)',
    'xl': 'var(--space-8)',
    '2xl': 'var(--space-12)',
  };
  
  return spacingMap[size] || 'var(--space-4)';
}

/**
 * Get design system color value
 * 
 * @param color - Color identifier
 * @param shade - Optional shade (50-900)
 * @returns CSS custom property reference
 */
export function getColor(color: string, shade?: number): string {
  if (shade) {
    return `var(--color-${color}-${shade})`;
  }
  return `var(--color-${color})`;
}

/**
 * Get design system typography class
 * 
 * @param variant - Typography variant
 * @returns CSS class name
 */
export function getTypography(variant: string): string {
  const typographyMap: Record<string, string> = {
    'hero': 'heading-hero',
    'h1': 'heading-primary',
    'h2': 'heading-secondary',
    'h3': 'heading-tertiary',
    'h4': 'heading-quaternary',
    'subtitle': 'subheading',
    'body': 'body-base',
    'body-large': 'body-large',
    'body-small': 'body-small',
    'script': 'script-text',
    'script-accent': 'script-accent',
  };
  
  return typographyMap[variant] || 'body-base';
}