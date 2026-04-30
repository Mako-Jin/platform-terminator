// vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'), // 你的库入口文件
            name: 'CommonShared',
            fileName: 'common-shared',
            formats: ['es', 'cjs']
        },
        outDir: 'dist',
        sourcemap: true
    }
});
