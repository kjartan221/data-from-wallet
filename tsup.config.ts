import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['hooks/index.ts'],
  outDir: 'dist',
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2020',
});
