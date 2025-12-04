import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Increase chunk size warning limit (Three.js is large but necessary)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Manual chunk splitting for optimal loading
        manualChunks: {
          // React core - loaded on every page
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // Three.js ecosystem - lazy loaded with 3D pages
          'three-core': ['three'],
          'three-fiber': ['@react-three/fiber', '@react-three/drei'],
          'three-postprocessing': ['@react-three/postprocessing', 'postprocessing'],

          // Animation libraries
          'animation': ['gsap', '@gsap/react', 'framer-motion'],

          // Charts and visualization
          'charts': ['recharts'],

          // State management
          'state': ['zustand'],

          // Utilities
          'utils': ['socket.io-client', 'lucide-react'],
        },
      },
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei'],
  },
})
