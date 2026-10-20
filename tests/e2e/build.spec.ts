// Checks on dist/ itself: nothing from reference/ ships, and the JS budget
// from SPEC §6 holds. Runs once (desktop project).

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { expect, test } from '@playwright/test';

const DIST = path.resolve(import.meta.dirname, '../../dist');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'checks the build once');
});

test('ships nothing from reference/ (her drafts and the moodboard pins)', () => {
  const shipped = files(DIST).map((f) => path.basename(f));
  const reference = files(path.resolve(import.meta.dirname, '../../reference')).map((f) => path.basename(f));
  expect(shipped.filter((f) => reference.includes(f))).toEqual([]);
  const html = readFileSync(path.join(DIST, 'index.html'), 'utf8');
  expect(html).not.toMatch(/reference\/|moodboard/);
});

test('SPEC §6: initial JS is at most 100 KB gzip', () => {
  const html = readFileSync(path.join(DIST, 'index.html'), 'utf8');
  const entry = html.match(/<script type="module"[^>]*src="\.\/(assets\/[^"]+\.js)"/)?.[1];
  expect(entry).toBeTruthy();
  const size = gzipSync(readFileSync(path.join(DIST, entry!))).length;
  expect(size).toBeLessThanOrEqual(100 * 1024);
});
