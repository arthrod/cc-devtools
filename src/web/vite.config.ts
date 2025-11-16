import { resolve } from 'path';

import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: '../../../dist/web/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    }),
  ],

  // Set the root to the client directory
  root: 'client',

  // Configure the build
  build: {
    outDir: '../../../dist/web/public',
    emptyOutDir: true,
  },

  // Optimize dependencies
  optimizeDeps: {
    exclude: ['winston', 'winston-transport']
  },

  // Development server configuration
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      // Proxy cc-devtools API requests to the Express server
      '/cc-api': {
        target: 'http://localhost:9100',
        changeOrigin: true,
        secure: false
      },
      // Proxy VibeTunnel API requests to the Express server
      '/api': {
        target: 'http://localhost:9100',
        changeOrigin: true,
        secure: false
      },
      // Proxy WebSocket endpoints
      '/ws': {
        target: 'http://localhost:9100',
        changeOrigin: true,
        secure: false,
        ws: true // Enable WebSocket proxying
      },
      '/buffers': {
        target: 'http://localhost:9100',
        changeOrigin: true,
        secure: false,
        ws: true // Enable WebSocket proxying
      },
      // Proxy Monaco Editor assets
      '/monaco-editor': {
        target: 'http://localhost:9100',
        changeOrigin: true,
        secure: false
      }
    }
  },

  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, 'client'),
      '@shared': resolve(__dirname, 'shared')
    }
  },

  // Define environment variables
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env['NODE_ENV'] ?? 'development')
  }
});
