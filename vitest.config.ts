import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom for browser-like environment
    environment: 'jsdom',

    // Setup file for global test utilities
    setupFiles: ['./src/test/setup.ts'],

    // Include test files
    include: ['src/**/*.{test,spec}.{ts,tsx}'],

    // Exclude node_modules and build directories
    exclude: ['node_modules', 'dist', 'build', 'saps-rfid-platform/**'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage/frontend',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/test/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        statements: 50,
        branches: 50,
        functions: 50,
        lines: 50,
      },
    },

    // Global test utilities
    globals: true,

    // CSS handling
    css: true,

    // Reporter configuration
    reporters: ['verbose'],

    // Watch mode exclusions
    watchExclude: ['node_modules', 'dist', 'saps-rfid-platform/**'],

    // Test timeout
    testTimeout: 10000,

    // Use forks for better isolation
    pool: 'forks',

    // Isolate tests for reliability
    isolate: true,

    // Sequence tests deterministically
    sequence: {
      shuffle: false,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
