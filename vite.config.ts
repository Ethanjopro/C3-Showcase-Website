import { defineConfig } from 'vite';
import { caseHtml } from './scripts/vite/case-html.ts';

export default defineConfig({
  // Relative base: the build works at any path (the GitHub Pages project URL, a
  // custom domain) without a rebuild.
  base: './',
  plugins: [caseHtml()],
  build: {
    target: 'es2022',
    reportCompressedSize: true,
    // Her art stays a file: small images inlined as data URIs would bloat the CSS.
    assetsInlineLimit: 0,
  },
});
