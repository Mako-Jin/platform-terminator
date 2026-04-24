import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path";
import qiankun from 'vite-plugin-qiankun';
import glsl from 'vite-plugin-glsl'

const useQianKun = process.env.USE_QIANKUN === 'true';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    glsl(),
    qiankun('elemental-weather', {  // 子应用名称，与基座注册时一致
      useDevMode: true, // 开发模式
      devHistoryMode: 'hash',  // 开发环境使用 hash 模式
    }),
  ],
  resolve: {
    alias: {
      '/@': path.resolve(__dirname, './src'),
      '/@components': path.resolve(__dirname, './src/components'),
    },
  },
  server: {
    port: 5001,
    cors: true,
    origin: '//localhost:5001',
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  preview: {
    port: 5001,
    cors: true,
  },
  build: {
    target: 'es2023',
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          gsap: ['gsap']
        },
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
  },
  optimizeDeps: {
    include: ['three', 'gsap', 'lil-gui']
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
})
