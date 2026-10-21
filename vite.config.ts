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
    // The halo menu's lazy Three.js ring chunk is ~550 KB minified (~140 KB
    // gzip, inside SPEC §6's 170 KB); it loads only for the menu.
    chunkSizeWarningLimit: 600,
  },
});
