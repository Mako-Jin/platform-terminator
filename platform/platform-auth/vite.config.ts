import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path";
import qiankun from 'vite-plugin-qiankun';

const useQianKun = process.env.USE_QIANKUN === 'true';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
      react(),
      qiankun('platform-auth', {  // 子应用名称，与基座注册时一致
        useDevMode: true,
        devHistoryMode: 'hash',  // 开发环境使用 hash 模式
      }),
  ],
  resolve: {
    alias: {
      '/@': path.resolve(__dirname, './src'),
      '/@components': path.resolve(__dirname, './src/components'),
      '/@types': path.resolve(__dirname, './src/types'),
      '/@views': path.resolve(__dirname, './src/views')
    },
  },
  server: {
    port: 3001,
    cors: true,
    origin: '//localhost:3001',
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  preview: {
    port: 3001,
    cors: true,
  },
  build: {
    target: 'es2023',
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
})
