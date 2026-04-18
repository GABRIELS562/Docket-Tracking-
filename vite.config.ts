import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:8080',
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // Split Three.js and related (largest dependencies)
          'vendor-three': ['three'],
          'vendor-r3f': ['@react-three/fiber', '@react-three/drei', '@react-three/postprocessing'],

          // Split charts
          'vendor-charts': ['recharts'],

          // Split data/state management
          'vendor-data': ['@tanstack/react-query', 'zustand', 'axios'],
        },
      },
    },
    // Increase chunk size warning limit since Three.js is inherently large (~670KB)
    chunkSizeWarningLimit: 700,
  },
});
