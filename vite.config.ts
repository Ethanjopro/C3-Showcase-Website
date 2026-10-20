import { defineConfig } from 'vite';
import { c3Html } from './scripts/vite/c3-html.ts';

export default defineConfig({
  // Relative base: the build works at any path (GitHub Pages project URL, a
  // custom domain, a school server) without a rebuild.
  base: './',
  plugins: [c3Html()],
  build: {
    target: 'es2022',
    reportCompressedSize: true,
  },
});
