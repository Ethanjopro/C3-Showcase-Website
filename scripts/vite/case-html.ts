// Bakes the page into index.html at build (and dev) time from src/content/site.json
// and src/art/scene.json, so the first paint is complete and nothing shifts later.
// Runs before Vite's own HTML processing, so the art paths it writes get hashed.

import type { Plugin } from 'vite';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderCase, esc, type Content, type Scene } from '../../src/markup.ts';

const read = (root: string, file: string) => JSON.parse(readFileSync(path.join(root, file), 'utf8'));

export function caseHtml(): Plugin {
  let root = process.cwd();
  return {
    name: 'c3-case-html',
    configResolved(cfg) {
      root = cfg.root;
    },
    configureServer(server) {
      // Content or geometry edits reload the dev page.
      for (const f of ['src/content/site.json', 'src/art/scene.json', 'src/content/title-widths.json', 'src/markup.ts', 'src/organs.ts']) {
        server.watcher.add(path.join(root, f));
      }
      server.watcher.on('change', (f) => {
        if (/site\.json|scene\.json|title-widths\.json|markup\.ts|organs\.ts/.test(f)) server.ws.send({ type: 'full-reload' });
      });
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const c = read(root, 'src/content/site.json') as Content;
        const s = read(root, 'src/art/scene.json') as Scene;
        const w = read(root, 'src/content/title-widths.json').widths as Record<string, number>;
        if (!html.includes('<!--case-->')) throw new Error('index.html is missing <!--case-->');
        return html
          // Function replacements, so a "$&" in the content stays literal text.
          .replace('<!--case-->', () => renderCase(c, s, w))
          .replaceAll('{{title}}', () => esc(c.title))
          .replaceAll('{{description}}', () => esc(c.description))
          .replaceAll('{{url}}', () => esc(c.url));
      },
    },
  };
}
