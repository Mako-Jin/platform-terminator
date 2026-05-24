import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path";
import qiankun from 'vite-plugin-qiankun';
import glsl from 'vite-plugin-glsl'

export default defineConfig({
  base: '/',
  plugins: [
    react({}),
    glsl(),
    qiankun('elemental-weather', {
      useDevMode: true,
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  },
  preview: {
    port: 5001,
    cors: true,
  },
  build: {
    target: 'es2023',
    outDir: 'dist',
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three')) return 'three';
            if (id.includes('gsap')) return 'gsap';
            if (id.includes('lil-gui')) return 'lil-gui';
          }
        },
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['three', 'gsap', 'lil-gui']
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
})