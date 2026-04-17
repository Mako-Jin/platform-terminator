import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '/@': path.resolve(__dirname, './src'),
      '/@components': path.resolve(__dirname, './src/components')
    },
  },
  server: {
    port: 3000,
    cors: true,
    origin: '//localhost:3000',
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    preview: {
      port: 3000,
      cors: true,
    },
    build: {
      target: 'es2015',
      outDir: 'dist',
      rollupOptions: {
        output: {
          manualChunks: {
            'qiankun': ['qiankun'],
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          },
        },
      },
    },
  },
})
