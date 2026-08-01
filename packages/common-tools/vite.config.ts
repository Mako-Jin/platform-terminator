// vite.config.ts
import {defineConfig} from 'vite';
import {resolve} from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(import.meta.dirname, 'src/index.ts'), // 你的库入口文件
            name: 'common-tools',
            fileName: 'common-tools',
            formats: ['es', 'cjs']
        },
        outDir: 'dist',
        sourcemap: true
    }
});
