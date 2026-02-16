/**
 * 🔱 ULTRA 2026 - Vite Configuration
 * Optimized for React Compiler, code splitting, and production performance
 */

import path from 'path';
import { defineConfig, ConfigEnv, PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
/**
 * Service Worker Plugin for Vite
 * Builds and injects service worker during production builds
 */
function serviceWorkerPlugin(): PluginOption {
  return {
    name: 'service-worker',
    apply: 'build',
    closeBundle: async () => {
      const fs = await import('fs');
      const path = await import('path');

      // Read the service worker source
      const swSource = fs.readFileSync(path.resolve(__dirname, 'src/service-worker.ts'), 'utf-8');

      // Write to dist directory
      const distDir = path.resolve(__dirname, 'dist');
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }

      fs.writeFileSync(path.resolve(distDir, 'service-worker.js'), swSource);

      console.log('✅ Service worker built to dist/service-worker.js');
    },
  };
}

export default defineConfig(({ mode }: ConfigEnv) => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      // React with Compiler for automatic memoization
      react(),
      // Service worker builder for production
      serviceWorkerPlugin(),
    ],
    define: {
      // Only expose non-sensitive build info
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(
        process.env['npm_package_version'] || '1.0.0'
      ),
      'import.meta.env.VITE_BUILD_TIME': JSON.stringify(new Date().toISOString()),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      // Performance optimization
      target: 'es2022',
      minify: false, // Disable minification for now to avoid terser dependency
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production',
          pure_funcs: ['console.log', 'console.debug'],
        },
        format: {
          comments: false,
        },
      },

      // Bundle size optimization
      chunkSizeWarningLimit: 500, // KB
      assetsInlineLimit: 4096, // Inline small assets

      // Source maps (disabled in production for security)
      sourcemap: mode !== 'production',

      rollupOptions: {
        // Advanced code splitting
        output: {
          manualChunks: {
            // Core libraries
            'react-core': ['react', 'react-dom', 'react/jsx-runtime'],

            // State management
            state: ['zustand', '@tanstack/react-query'],

            // Validation & types
            validation: ['zod'],

            // Supabase
            supabase: ['@supabase/supabase-js'],

            // UI utilities
            ui: ['react-hot-toast', 'uuid'],

            // PDF generation
            pdf: ['jspdf', 'jspdf-autotable'],

            // PDF rendering
          },

          // Prevent circular dependencies
          preserveModules: false,

          // Optimize asset loading
          assetFileNames: (assetInfo) => {
            const ext = assetInfo.name?.split('.').pop();
            if (ext === 'css') return 'assets/css/[name]-[hash][extname]';
            if (ext === 'woff2') return 'assets/fonts/[name]-[hash][extname]';
            return 'assets/[name]-[hash][extname]';
          },
        },
      },
    },

    // Preview server configuration
    preview: {
      port: 3000,
      host: '0.0.0.0',
    },

    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom', '@tanstack/react-query', 'zod', 'zustand'],
    },

    // Worker configuration
    worker: {
      format: 'es',
      plugins: () => [react()], // Return function for worker plugins
    },
  };
});
