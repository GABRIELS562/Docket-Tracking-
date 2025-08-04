import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react({
        // Enable React Fast Refresh
        fastRefresh: true,
        // Optimize production builds
        babel: {
          plugins: mode === 'production' ? [
            ['babel-plugin-react-remove-properties', { properties: ['data-testid'] }]
          ] : []
        }
      }),
    ],
    
    // Build optimization
    build: {
      target: 'es2015',
      minify: 'terser',
      cssMinify: true,
      sourcemap: mode === 'production' ? false : true,
      
      // Optimize bundle size
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks for better caching
            vendor: ['react', 'react-dom'],
            ui: ['framer-motion', '@heroicons/react'],
            utils: ['clsx', 'class-variance-authority'],
            
            // Feature-based chunks for code splitting
            auth: ['./src/hooks/useGuestAuth.ts'],
            rsvp: [
              './src/hooks/useRSVPForm.ts',
              './src/components/forms/RSVPForm.tsx',
              './src/components/forms/SmartRSVPForm.tsx'
            ],
            services: [
              './src/services/GoogleSheetsService.ts',
              './src/utils/emailService.ts'
            ]
          },
          
          // Optimize chunk file names
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId ? 
              chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '') : 
              'chunk';
            return `js/${facadeModuleId}-[hash].js`;
          },
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') || [];
            const ext = info[info.length - 1];
            if (/\.(png|jpe?g|gif|svg|webp|avif)$/i.test(assetInfo.name || '')) {
              return `images/[name]-[hash].${ext}`;
            }
            if (/\.(css)$/i.test(assetInfo.name || '')) {
              return `css/[name]-[hash].${ext}`;
            }
            return `assets/[name]-[hash].${ext}`;
          }
        }
      },
      
      // Terser optimization for production
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production',
          pure_funcs: mode === 'production' ? ['console.log', 'console.info'] : []
        },
        format: {
          comments: false
        }
      },
      
      // Chunk size warnings
      chunkSizeWarningLimit: 1000
    },
    
    // Development server
    server: {
      port: 3000,
      host: true,
      hmr: {
        overlay: true
      }
    },
    
    // Preview server (for production builds)
    preview: {
      port: 3000,
      host: true
    },
    
    // Path resolution
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@components': resolve(__dirname, './src/components'),
        '@hooks': resolve(__dirname, './src/hooks'),
        '@services': resolve(__dirname, './src/services'),
        '@utils': resolve(__dirname, './src/utils'),
        '@types': resolve(__dirname, './src/types'),
        '@styles': resolve(__dirname, './src/styles')
      }
    },
    
    // CSS optimization
    css: {
      devSourcemap: mode !== 'production'
    },
    
    // Environment variables
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __PRODUCTION__: JSON.stringify(mode === 'production')
    },
    
    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'framer-motion',
        '@heroicons/react/24/outline',
        '@heroicons/react/24/solid'
      ]
    }
  };
});
