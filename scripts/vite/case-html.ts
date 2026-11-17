// Bakes the page into index.html at build (and dev) time from src/content/site.json
// and src/art/scene.json, so the first paint is complete and nothing shifts later.
// Runs before Vite's own HTML processing, so the art paths it writes get hashed.
// Also writes the calendar file (c3-showcase.ics) beside index.html.

import type { Plugin } from 'vite';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderCase, esc, ICS_FILE, type Content, type Scene } from '../../src/markup.ts';
import { eventSchema, icsFile } from '../../src/event.ts';

const read = (root: string, file: string) => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
const WATCHED = ['src/content/site.json', 'src/art/scene.json', 'src/content/title-widths.json', 'src/markup.ts', 'src/organs.ts', 'src/event.ts'];

/** What a link preview or search result says: what, when and where in one line. */
export const describe = (c: Content) => `${c.tagline}. ${c.dateSpoken}, ${c.time}. ${c.location}, ${c.venue}.`;

export function caseHtml(): Plugin {
  let root = process.cwd();
  return {
    name: 'c3-case-html',
    configResolved(cfg) {
      root = cfg.root;
    },
    configureServer(server) {
      // Content or geometry edits reload the dev page.
      for (const f of WATCHED) server.watcher.add(path.join(root, f));
      server.watcher.on('change', (f) => {
        if (WATCHED.some((w) => f.endsWith(path.basename(w)))) server.ws.send({ type: 'full-reload' });
      });
      server.middlewares.use((req, res, next) => {
        if (!req.url?.split('?')[0]?.endsWith(`/${ICS_FILE}`)) return next();
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.end(icsFile(read(root, 'src/content/site.json') as Content));
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: ICS_FILE, source: icsFile(read(root, 'src/content/site.json') as Content) });
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const c = read(root, 'src/content/site.json') as Content;
        const s = read(root, 'src/art/scene.json') as Scene;
        const w = read(root, 'src/content/title-widths.json').widths as Record<string, number>;
        if (!html.includes('<!--case-->')) throw new Error('index.html is missing <!--case-->');
        return (
          html
            // Function replacements, so a "$&" in the content stays literal text.
            .replace('<!--case-->', () => renderCase(c, s, w))
            .replaceAll('{{title}}', () => esc(c.pageTitle))
            .replaceAll('{{description}}', () => esc(describe(c)))
            .replaceAll('{{url}}', () => esc(c.url))
            // "<" can't close the script early once it's escaped.
            .replace('{{schema}}', () => JSON.stringify(eventSchema(c)).replace(/</g, '\\u003c'))
        );
      },
    },
  };
}
