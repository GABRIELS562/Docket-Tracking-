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
      animation: {
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
    },
  },
  plugins: [],
};
