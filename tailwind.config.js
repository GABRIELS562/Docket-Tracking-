/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        zone: {
          explosives: '#3b82f6',
          chemistry: '#a78bfa',
          fraud: '#fcd34d',
          biology: '#fb923c',
          ballistics: '#ef4444',
          security: '#10b981',
          offices: '#1e40af',
          labs: '#ec4899',
        },
      },
      /* =======================================================================
         UI POLISH - Extended animations following ECC principles:
         - Enter: opacity + translateY + optional blur
         - Exit: shorter (150ms) and quieter
         - Press: scale(0.96) handled via active-press utility class
         ======================================================================= */
      animation: {
        'float': 'float 6s ease-in-out infinite',
        // Enter animations - combine opacity and transform
        'fade-in': 'fadeIn 200ms ease-out',
        'fade-in-up': 'fadeInUp 200ms ease-out',
        'fade-in-down': 'fadeInDown 200ms ease-out',
        'fade-in-scale': 'fadeInScale 200ms ease-out',
        'slide-in-right': 'slideInRight 200ms ease-out',
        'slide-in-left': 'slideInLeft 200ms ease-out',
        'slide-in-up': 'slideInUp 200ms ease-out',
        // Exit animations - shorter duration (150ms)
        'fade-out': 'fadeOut 150ms ease-in',
        'fade-out-down': 'fadeOutDown 150ms ease-in',
        'fade-out-scale': 'fadeOutScale 150ms ease-in',
        'slide-out-right': 'slideOutRight 150ms ease-in',
        'slide-out-left': 'slideOutLeft 150ms ease-in',
        // Loading/processing indicators
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        // Fade in with opacity only
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        // Fade in from below (common enter pattern)
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Fade in from above
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Fade in with scale (good for modals/popovers)
        fadeInScale: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        // Slide in from right (panels, drawers)
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        // Slide in from left
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        // Slide in from below (notifications, toasts)
        slideInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Exit animations - shorter and quieter
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        fadeOutDown: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(4px)' },
        },
        fadeOutScale: {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.98)' },
        },
        slideOutRight: {
          '0%': { opacity: '1', transform: 'translateX(0)' },
          '100%': { opacity: '0', transform: 'translateX(16px)' },
        },
        slideOutLeft: {
          '0%': { opacity: '1', transform: 'translateX(0)' },
          '100%': { opacity: '0', transform: 'translateX(-16px)' },
        },
        // Subtle pulse for attention without being distracting
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      /* =======================================================================
         Box Shadow Layering - subtle, transparent shadows that work on any bg
         ======================================================================= */
      boxShadow: {
        // Elevated card shadow - three layers for realistic depth
        'card': '0 1px 2px 0 rgba(0, 0, 0, 0.3), 0 4px 8px -2px rgba(0, 0, 0, 0.2), 0 12px 24px -4px rgba(0, 0, 0, 0.15)',
        'card-elevated': '0 2px 4px 0 rgba(0, 0, 0, 0.4), 0 8px 16px -4px rgba(0, 0, 0, 0.3), 0 20px 40px -8px rgba(0, 0, 0, 0.2)',
        // Button shadow on hover
        'button': '0 2px 4px 0 rgba(0, 0, 0, 0.2), 0 4px 8px -2px rgba(0, 0, 0, 0.15)',
        // Dropdown/popover shadow
        'dropdown': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 10px 20px -3px rgba(0, 0, 0, 0.25)',
        // Modal shadow - more pronounced
        'modal': '0 4px 8px 0 rgba(0, 0, 0, 0.4), 0 16px 32px -8px rgba(0, 0, 0, 0.3), 0 32px 64px -16px rgba(0, 0, 0, 0.2)',
        // Glow effects for active states
        'glow-blue': '0 0 20px -4px rgba(59, 130, 246, 0.5)',
        'glow-green': '0 0 20px -4px rgba(34, 197, 94, 0.5)',
        'glow-red': '0 0 20px -4px rgba(239, 68, 68, 0.5)',
      },
      /* =======================================================================
         Transition Duration - explicit values for enter/exit asymmetry
         ======================================================================= */
      transitionDuration: {
        'enter': '200ms',
        'exit': '150ms',
      },
      /* =======================================================================
         Spacing for hit areas - ensure 44px minimum
         ======================================================================= */
      minWidth: {
        'touch': '44px',
      },
      minHeight: {
        'touch': '44px',
      },
    },
  },
  plugins: [],
};
