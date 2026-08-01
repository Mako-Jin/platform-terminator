// vite.config.ts
import {defineConfig} from 'vite';
import {resolve} from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(import.meta.dirname, 'src/index.ts'),
        'adapters/react-use-theme': resolve(import.meta.dirname, 'src/adapters/react-use-theme.ts'),
        'adapters/vue-use-theme': resolve(import.meta.dirname, 'src/adapters/vue-use-theme.ts'),
      },
      name: 'common-theme',
      fileName: 'common-theme',
      formats: ['es', 'cjs'],
    },
    outDir: 'dist',
    sourcemap: true
  }
});