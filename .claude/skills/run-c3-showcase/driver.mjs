// Drives the C3 Showcase site in headless Chromium: one command per line on
// stdin (pipe a heredoc, or run under tmux and send-keys).
//
//   node .claude/skills/run-c3-showcase/driver.mjs [--dev] [--port N]
//
// It serves the site itself: `vite preview` of dist/ by default (run
// `npm run build` first), or the Vite dev server with --dev (live source).
// Screenshots go to .shots/driver/<name>.png. Commands: see HELP below.

import { chromium } from '@playwright/test';
import { createServer, preview } from 'vite';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';

const ROOT = path.resolve(import.meta.dirname, '../../..');
const OUT = path.join(ROOT, '.shots/driver');
const args = process.argv.slice(2);
const dev = args.includes('--dev');
const port = Number(args[args.indexOf('--port') + 1]) || 4190;

const VIEWPORTS = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { viewport: { width: 1440, height: 900 } },
};

const HELP = `commands (one per line):
  open [phone|desktop] [?query] [reduced]   new page; waits for html[data-booted]
  goto <path-or-?query>                     navigate the current page
  ss [name]                                 viewport screenshot -> .shots/driver/<name>.png
  ssfull [name]                             full-page screenshot
  ssel <selector> [name]                    element screenshot
  click <selector> | tap <selector> | hover <selector>
  swipe <x0> <y0> <x1> <y1>                 viewport fractions 0-1 (touch on phone, mouse on desktop)
  scroll <selector|pixels>                  scroll element into view, or window to y
  press <key>                               e.g. Tab, Enter, Escape
  state                                     the case's state, view and channel
  wait <ms|selector>
  eval <js expression>                      prints the JSON result
  errors                                    console errors and page errors so far
  help | quit`;

const viteListeners = new Set(process.stdin.listeners('end'));
let server;
if (dev) {
  server = await createServer({ root: ROOT, server: { port, strictPort: true }, logLevel: 'warn' });
  await server.listen();
} else {
  server = await preview({ root: ROOT, preview: { port, strictPort: true }, logLevel: 'warn' });
}
// Vite shuts itself down (and the process exits) when stdin ends, which is
// the end of every piped heredoc. This driver owns shutdown, so detach that.
for (const fn of process.stdin.listeners('end')) if (!viteListeners.has(fn)) process.stdin.off('end', fn);
const base = `http://localhost:${port}/`;
const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });

let context = null;
let page = null;
let cdp = null;
let kind = 'phone';
const errors = [];
let shotCount = 0;

const say = (s) => console.log(s);
const need = () => {
  if (!page) throw new Error('no page: run `open` first');
  return page;
};
const shotPath = (name) => path.join(OUT, `${name || `shot-${++shotCount}`}.png`);

async function ready(p) {
  await p.waitForSelector('html[data-booted]', { timeout: 15_000 }).catch(() => say('warn: html[data-booted] never appeared'));
  await p.evaluate(() => document.fonts.ready);
}

async function open(rest) {
  if (context) await context.close();
  kind = rest.find((r) => r in VIEWPORTS) ?? 'phone';
  const query = rest.find((r) => r.startsWith('?')) ?? '';
  const reduced = rest.includes('reduced');
  context = await browser.newContext({ ...VIEWPORTS[kind], reducedMotion: reduced ? 'reduce' : 'no-preference' });
  page = await context.newPage();
  cdp = kind === 'phone' ? await context.newCDPSession(page) : null;
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + query);
  await ready(page);
  say(`opened ${kind}${reduced ? ' (reduced motion)' : ''} ${base + query}`);
}

async function swipe(x0, y0, x1, y1) {
  const p = need();
  const { width, height } = p.viewportSize();
  const [ax, ay, bx, by] = [x0 * width, y0 * height, x1 * width, y1 * height];
  const steps = 12;
  if (!cdp) {
    await p.mouse.move(ax, ay);
    await p.mouse.down();
    await p.mouse.move(bx, by, { steps });
    await p.mouse.up();
    return;
  }
  const pt = (x, y) => [{ x, y, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(ax, ay) });
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(ax + (bx - ax) * t, ay + (by - ay) * t) });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function run(line) {
  const [cmd, ...rest] = line.trim().split(/\s+/);
  const arg = line.trim().slice(cmd.length).trim();
  switch (cmd) {
    case '':
    case '#':
      return;
    case 'help':
      return say(HELP);
    case 'open':
      return open(rest);
    case 'goto':
      await need().goto(arg.startsWith('?') ? base + arg : new URL(arg, base).href);
      await ready(page);
      return say(`at ${page.url()}`);
    case 'ss':
    case 'ssfull': {
      const file = shotPath(rest[0]);
      await need().screenshot({ path: file, fullPage: cmd === 'ssfull' });
      return say(`saved ${path.relative(ROOT, file)}`);
    }
    case 'ssel': {
      const file = shotPath(rest[1]);
      await need().locator(rest[0]).first().screenshot({ path: file });
      return say(`saved ${path.relative(ROOT, file)}`);
    }
    case 'click':
      await need().locator(arg).first().click();
      return say(`clicked ${arg}`);
    case 'tap':
      await (kind === 'phone' ? need().locator(arg).first().tap() : need().locator(arg).first().click());
      return say(`tapped ${arg}`);
    case 'hover':
      await need().locator(arg).first().hover();
      return say(`hovering ${arg}`);
    case 'swipe':
      await swipe(...rest.map(Number));
      return say(`swiped ${rest.join(' ')}`);
    case 'scroll':
      if (/^\d+$/.test(arg)) await need().evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), Number(arg));
      else await need().locator(arg).first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      return say(`scrollY ${await page.evaluate(() => window.scrollY)}`);
    case 'press':
      await need().keyboard.press(arg);
      return say(`pressed ${arg}`);
    case 'state':
      return say(JSON.stringify(await need().evaluate(() => ({ ...document.getElementById('case')?.dataset, hash: location.hash }))));
    case 'wait':
      if (/^\d+$/.test(arg)) await need().waitForTimeout(Number(arg));
      else await need().waitForSelector(arg, { timeout: 15_000 });
      return say(`waited ${arg}`);
    case 'eval': {
      const v = await need().evaluate((src) => (0, eval)(src), arg);
      return say(JSON.stringify(v));
    }
    case 'errors':
      return say(errors.length ? errors.join('\n') : 'no errors');
    case 'quit':
      throw Object.assign(new Error('quit'), { quit: true });
    default:
      say(`unknown command: ${cmd} (try help)`);
  }
}

async function shutdown(code = 0) {
  await browser.close().catch(() => {});
  if (dev) await server.close();
  else await new Promise((r) => server.httpServer.close(r));
  process.exit(code);
}

say(`ready: serving ${dev ? 'source (dev)' : 'dist/ (preview)'} at ${base}. Type help.`);
// Commands run strictly one after another, whether piped (all lines arrive at
// once) or typed under tmux.
const rl = readline.createInterface({ input: process.stdin, terminal: false });
let queue = Promise.resolve();
let quitting = false;
rl.on('line', (line) => {
  queue = queue.then(async () => {
    if (quitting) return;
    try {
      await run(line);
    } catch (err) {
      if (err.quit) quitting = true;
      else say(`error: ${err.message.split('\n')[0]}`);
    }
  });
});
rl.on('close', () => queue.then(() => shutdown(errors.length ? 1 : 0)));
