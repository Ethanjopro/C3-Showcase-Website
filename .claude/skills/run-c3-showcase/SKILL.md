---
name: run-c3-showcase
description: Build, run, screenshot and drive the C3 Showcase site (Vite + TypeScript poster site). Use when asked to start or preview the site, take screenshots at phone or desktop size, click/tap/swipe through it, check an effect in a real browser, run its tests, or compare it with her drafts.
---

The C3 Showcase site is a static Vite build. Agents drive it with
`.claude/skills/run-c3-showcase/driver.mjs`: a headless-Chromium REPL (Playwright)
that serves the site itself and takes one command per line on stdin. Paths
below are relative to the repo root.

## Prerequisites

Nothing to `apt-get` in the cloud image: Chromium is preinstalled at
`/opt/pw-browsers`, and `@playwright/test` is pinned to 1.56.1 to match it.

```bash
npm ci
```

## Build

```bash
npm run build          # dist/; content and art are baked into index.html here
```

Re-run `npm run art` first if you changed `src/art/manifest.json` or a file in `art-src/`.

## Run (agent path): the driver

Pipe a script. The driver serves `dist/` with `vite preview` on port 4190 by
default, or the live source with `--dev` (no build needed). Screenshots land in
`.shots/driver/<name>.png`. The exit code is 1 if the page logged console errors.

```bash
node .claude/skills/run-c3-showcase/driver.mjs <<'EOF'
open phone
ss phone-top
colorway black-red
tap [data-menu-open=""]
wait dialog#menu[open]
ss phone-menu
click dialog#menu a[href="#projects"]
wait 600
eval document.activeElement.id
swipe 0.5 0.8 0.5 0.2
scroll #credits
ss phone-credits
open desktop ?off=all reduced
ss desktop-reduced
errors
quit
EOF
```

Then **look at the PNGs** (Read them). Live source, no build:

```bash
node .claude/skills/run-c3-showcase/driver.mjs --dev <<'EOF'
open desktop ?freeze=0
ssel .poster-stage dev-poster
errors
quit
EOF
```

Interactive, one command at a time:

```bash
tmux new-session -d -s c3 -x 200 -y 50
tmux send-keys -t c3 'node .claude/skills/run-c3-showcase/driver.mjs' Enter
timeout 60 bash -c 'until tmux capture-pane -t c3 -p | grep -q "Type help"; do sleep 0.3; done'
tmux send-keys -t c3 'open phone' Enter
timeout 60 bash -c 'until tmux capture-pane -t c3 -p | grep -q "opened phone"; do sleep 0.3; done'
tmux send-keys -t c3 'ss tmux-top' Enter
tmux send-keys -t c3 'quit' Enter
tmux kill-session -t c3
```

| command | what it does |
|---|---|
| `open [phone\|desktop] [?query] [reduced]` | New page: phone is 390×844 with touch, desktop is 1440×900. Waits for `html[data-booted]` and fonts. `reduced` emulates prefers-reduced-motion. |
| `goto <path or ?query>` | Navigate the current page. |
| `ss [name]` / `ssfull [name]` / `ssel <selector> [name]` | Viewport / full page / one element → `.shots/driver/`. |
| `click` / `tap` / `hover <selector>` | `tap` is a real touch on phone. |
| `swipe x0 y0 x1 y1` | Viewport fractions; CDP touch events on phone, mouse drag on desktop. |
| `scroll <selector or pixels>` | Instant scroll; prints `scrollY`. |
| `press <key>` | `Tab`, `Enter`, `Escape`… |
| `colorway <id>` | Click that swatch, e.g. `black-red`. |
| `wait <ms or selector>` | |
| `eval <js>` | Prints the JSON result. |
| `errors` | Console and page errors so far. |

Useful query strings (they work on any URL): `?off=xray,palette`,
`?only=line-boil`, `?off=all` (static poster only), `?freeze=<ms>` (pins the
effect clock, so stepped effects screenshot the same every time) and
`?quality=full|lite|static`.

## Screenshots for review (CLAUDE.md "verify")

```bash
npm run build && npm run shots          # every section at 390 and 1440, -reduced variants, menu, page
npm run shots -- --no-build xray        # one effect's shots.json states; keeps the other files
```

Output: `.shots/<section>@<width>.png` and `.shots/<effect>-<state>@<width>.png`.
Effect states go in `src/effects/<name>/shots.json` (format in PLAN 1.9).

## Direct invocation (core code without a browser)

Pure core functions are unit-tested with vitest in Node. Copy a test in
`tests/unit/` (for example `ticker.test.ts`, which drives `createTicker` with a
hand-cranked driver) and run it:

```bash
npx vitest run tests/unit/ticker.test.ts
```

## Run (human path)

```bash
npm run dev            # http://localhost:5173, Ctrl-C to stop. Useless headless; use the driver.
```

## Test

```bash
npm run check          # tsc + vitest: 58 tests
npm run test:e2e       # builds, then Playwright: 52 pass, 2 skipped by design (build checks run on desktop only)
```

## Gotchas

- **Vite quits when stdin ends.** Vite listens for `end` on stdin and shuts
  down when it fires, so a driver serving through Vite died the moment a
  heredoc finished, before any command ran. The driver detaches that listener;
  keep that if you write another stdin-driven script that uses Vite's
  `preview()` or `createServer()`.
- **`npx playwright test` reuses a stale `dist/`.** Its web server is
  `vite preview`, so changes don't show until you rebuild. Use
  `npm run test:e2e`, which builds first.
- **Don't run `npx playwright install`.** `@playwright/test` and
  `playwright-core` are pinned to 1.56.1 because the cloud image ships that
  version's Chromium (revision 1194). A newer `playwright-core`, for example
  one pulled in as a peer of `@axe-core/playwright`, splits the types and
  fails `tsc`.
- **Art URLs live in an inline `<style>` in `index.html`, not in CSS
  variables.** A `url()` inside a custom property resolves against the
  stylesheet (`dist/assets/`), not the page, so every mask silently 404'd.
  `scripts/vite/c3-html.ts` writes those rules.
- **Smooth scrolling is on** (`scroll-behavior: smooth`). Scroll with
  `behavior: 'instant'` before screenshotting, or you capture mid-scroll.
  The driver's `scroll` already does.
- **Full-page screenshots put the fixed Menu button wherever the viewport
  was.** It's an artifact, not a layout bug. `npm run shots` hides the chrome
  for section captures.
- **Section headings, copy and art are baked in at build time** (by
  `scripts/vite/c3-html.ts`). Changing `src/content/*.json` or the manifest
  needs a rebuild, or `--dev`.

## Troubleshooting

- **`Port 4190 is already in use`**: another driver is still running. Quit it, or pass `--port 4191`.
- **`warn: html[data-booted] never appeared`**: `main.ts` didn't boot. Check `errors`. Often an effect threw during init, though the page still renders.
