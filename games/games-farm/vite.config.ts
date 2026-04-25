import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import qiankun from 'vite-plugin-qiankun';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
      react(),
      qiankun('games-farm', {  // 子应用名称，与基座注册时一致
        useDevMode: true,
        devHistoryMode: 'hash',  // 开发环境使用 hash 模式
        useDevBinary: true,
        // 关键配置：解决 module 脚本问题
        devSandbox: false, // 开发环境禁用沙箱
      }),
  ],
  server: {
    port: 7001,
    cors: true,
    origin: 'http://localhost:7001',
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    hmr: false,
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
