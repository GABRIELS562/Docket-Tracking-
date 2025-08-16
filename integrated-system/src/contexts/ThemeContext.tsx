import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Theme {
  mode: 'light' | 'dark';
  colors: {
    // Primary colors - Professional blue-based scheme
    primary: string;
    primaryLight: string;
    primaryDark: string;
    
    // Secondary colors - Teal accent
    secondary: string;
    secondaryLight: string;
    secondaryDark: string;
    
    // Background colors
    background: string;
    backgroundPaper: string;
    backgroundElevated: string;
    
    // Text colors
    textPrimary: string;
    textSecondary: string;
    textDisabled: string;
    
    // Status colors
    success: string;
    warning: string;
    error: string;
    info: string;
    
    // Border and divider
    border: string;
    divider: string;
    
    // Special colors
    hover: string;
    selected: string;
    disabled: string;
    
    // Chart colors for data visualization
    chart1: string;
    chart2: string;
    chart3: string;
    chart4: string;
    chart5: string;
  };
  fonts: {
    primary: string;
    secondary: string;
    mono: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

const lightTheme: Theme = {
  mode: 'light',
  colors: {
    // Professional blue palette
    primary: '#1e40af',
    primaryLight: '#3b82f6',
    primaryDark: '#1e3a8a',
    
    // Teal accent colors
    secondary: '#0891b2',
    secondaryLight: '#06b6d4',
    secondaryDark: '#0e7490',
    
    // Backgrounds
    background: '#f8fafc',
    backgroundPaper: '#ffffff',
    backgroundElevated: '#ffffff',
    
    // Text
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textDisabled: '#94a3b8',
    
    // Status
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    
    // Borders
    border: '#e2e8f0',
    divider: '#e2e8f0',
    
    // Interactive states
    hover: 'rgba(30, 64, 175, 0.04)',
    selected: 'rgba(30, 64, 175, 0.08)',
    disabled: '#f1f5f9',
    
    // Chart colors - Professional palette
    chart1: '#1e40af',
    chart2: '#0891b2',
    chart3: '#10b981',
    chart4: '#f59e0b',
    chart5: '#8b5cf6',
  },
  fonts: {
    primary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    secondary: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"SF Mono", "Monaco", "Inconsolata", "Fira Code", monospace',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
};

const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    // Professional blue palette - adjusted for dark mode
    primary: '#3b82f6',
    primaryLight: '#60a5fa',
    primaryDark: '#2563eb',
    
    // Teal accent colors
    secondary: '#06b6d4',
    secondaryLight: '#22d3ee',
    secondaryDark: '#0891b2',
    
    // Dark backgrounds
    background: '#0f172a',
    backgroundPaper: '#1e293b',
    backgroundElevated: '#334155',
    
    // Text
    textPrimary: '#f1f5f9',
    textSecondary: '#cbd5e1',
    textDisabled: '#64748b',
    
    // Status
    success: '#10b981',
    warning: '#f59e0b',
    error: '#f87171',
    info: '#60a5fa',
    
    // Borders
    border: '#334155',
    divider: '#334155',
    
    // Interactive states
    hover: 'rgba(59, 130, 246, 0.08)',
    selected: 'rgba(59, 130, 246, 0.16)',
    disabled: '#1e293b',
    
    // Chart colors - Vibrant for dark mode
    chart1: '#3b82f6',
    chart2: '#06b6d4',
    chart3: '#10b981',
    chart4: '#f59e0b',
    chart5: '#a78bfa',
  },
  fonts: {
    primary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    secondary: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"SF Mono", "Monaco", "Inconsolata", "Fira Code", monospace',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
  },
};

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : false;
  });

  const theme = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // Apply theme to document root for CSS variables
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    root.style.setProperty('--font-primary', theme.fonts.primary);
    root.style.setProperty('--font-secondary', theme.fonts.secondary);
    root.style.setProperty('--font-mono', theme.fonts.mono);
  }, [isDark, theme]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};