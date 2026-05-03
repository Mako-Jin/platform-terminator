import { defineConfig } from 'vite'
import {resolve} from "path";

// https://vite.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'), // 你的库入口文件
      name: 'common-three',
      fileName: 'common-three',
      formats: ['es', 'cjs']
    },
    outDir: 'dist',
    sourcemap: true
  }
})
