import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: [
                'bufferutil', 
                'utf-8-validate', 
                'mediasoup',
                'express',
                'socket.io'
              ]
            }
          }
        }
      },
      {
        entry: 'electron/server.ts',
        vite: {
          build: {
            rollupOptions: {
              external: [
                'bufferutil', 
                'utf-8-validate', 
                'mediasoup',
                'express',
                'socket.io'
              ]
            }
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload()
        },
      },
    ]),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['lucide-react']
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
