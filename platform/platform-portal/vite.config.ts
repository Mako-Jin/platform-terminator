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
  },
  preview: {
    port: 3000,
    cors: true,
  },
  build: {
    target: 'es2015',
    outDir: 'dist',
    rolldownOptions: {
      output: {
        manualChunks(id) {
          // 将 qiankun 单独打包
          if (id.includes('node_modules/qiankun')) {
            return 'qiankun';
          }

          // 将 React 相关库单独打包
          if (id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-router-dom')) {
            return 'react-vendor';
          }
        },
      },
    },
  },
})
