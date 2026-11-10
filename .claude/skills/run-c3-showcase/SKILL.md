---
name: run-c3-showcase
description: Build, run, screenshot and drive the C3 Showcase site (Vite + TypeScript, "the case"). Use when asked to start or preview the site, take screenshots at phone or desktop size, click/tap through it, check the halo, doors, channels or X-ray in a real browser, run its tests, or compare it with her art and the mockups.
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
npm run build          # dist/; the page is baked into index.html from src/content and src/art
npm run art            # only after replacing her files in art-src/
```

## Run (agent path): the driver

Pipe a script. The driver serves `dist/` with `vite preview` on port 4190 by
default, or the live source with `--dev` (no build needed). Screenshots land in
`.shots/driver/<name>.png`. The exit code is 1 if the page logged console errors.

```bash
node .claude/skills/run-c3-showcase/driver.mjs <<'EOF2'
open phone
ss phone-sealed
tap .seal
wait 1600
state
ss phone-open
tap .key[data-key="1"]
wait 1300
ss phone-rsvp
press Escape
open desktop ?still=20
click .seal
wait 1700
hover .feed[data-feed="3"]
ss desktop-hover
goto ?still=20#inside
ss desktop-inside
open desktop reduced
errors
quit
EOF2
```

Then **look at the PNGs** (Read them).

| command | what it does |
|---|---|
| `open [phone\|desktop] [?query] [reduced]` | New page: phone is 390×844 with touch, desktop is 1440×900. Waits for `html[data-booted]` and fonts. `reduced` emulates prefers-reduced-motion. |
| `goto <path or ?query#hash>` | Navigate the current page. |
| `ss [name]` / `ssfull [name]` / `ssel <selector> [name]` | Viewport / full page / one element → `.shots/driver/`. |
| `click` / `tap` / `hover <selector>` | `tap` is a real touch on phone. |
| `swipe x0 y0 x1 y1` | Viewport fractions; touch on phone, mouse drag on desktop. |
| `press <key>` | `Tab`, `Enter`, `Escape`… |
| `state` | The case's `data-state` (sealed/open), `data-view` (hub/channel), `data-channel`, and the hash. |
| `wait <ms or selector>` | |
| `eval <js>` | Prints the JSON result. |
| `errors` | Console and page errors so far. |

Useful URLs: `?still=<degrees>` pins the halo at an angle with nothing moving
(repeatable screenshots); `#info` … `#credits` open a channel directly (the case
opens itself); `#halo` is the hub. The case remembers it was opened for the tab's
session (`sessionStorage c3.open`).

The X-ray band on phone needs a held touch; synthesize one in `eval`:
`new TouchEvent('touchstart', {touches: [new Touch({identifier: 1, target: card, clientX: 200, clientY: 320})], bubbles: true})`
on `[data-card]`, wait 300 ms, then check `.xr[data-on]`. A mouse over the card on the phone layout scans too.

## Screenshots for review (CLAUDE.md "Check your work")

```bash
npm run shots                 # every state at 390 and 1440, plus -reduced variants
npm run shots -- --no-build inside rsvp
```

Output: `.shots/<state>@<width>.png` for sealed, open, scan (390), hover (1440),
info, rsvp, projects, inside, source, credits.

## Test

```bash
npm run check          # tsc + vitest (halo math, markup, title fitting, copy, contrast)
npm run test:e2e       # builds, then Playwright at both sizes: keyboard path, reduced motion, axe, layout shift, reference/ not shipped
```

## Gotchas

- **Vite quits when stdin ends.** The driver detaches Vite's `end` listener on
  stdin; keep that if you write another stdin-driven script that uses Vite's
  `preview()` or `createServer()`.
- **`npx playwright test` reuses a stale `dist/`.** Use `npm run test:e2e`, which builds first.
- **Don't run `npx playwright install`.** `@playwright/test` and
  `playwright-core` are pinned to 1.56.1 because the cloud image ships that
  version's Chromium.
- **Never give an element the id a channel's hash uses** (`#info` …): the
  browser would scroll the 3D case to reveal it. Sections are `#ch-info` and so on.
- **The page is baked at build time** (`scripts/vite/case-html.ts`). Editing
  `site.json`, `scene.json` or `markup.ts` needs a rebuild, or `--dev`.
- **A focused feed or camera stops the turn** (keyboard focus only). If the halo
  seems frozen in a test, check `document.activeElement`.

## Troubleshooting

- **`Port 4190 is already in use`**: another driver is still running. Quit it, or pass `--port 4191`.
- **`warn: html[data-booted] never appeared`**: `main.ts` didn't boot. Check `errors`.
