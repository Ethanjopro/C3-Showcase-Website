# crt-screens

SPEC §3 row 11 (tier C), built in PLAN step 12. Status: **stub**.

The eye screen and project screens get scanlines, a slight RGB split and stepped static.

- **Owns:** this folder. Nothing else (PLAN "Rules for parallel sessions").
- **Mount:** a hidden mount at the top of <body>; draws inside every `[data-crt]` element.
- **Contract:** `init(root, { quality })` and `destroy()`, from `src/core/effect.ts`. Import shared code only from `src/core/`.
- **Screenshots:** add states to `shots.json` (format in PLAN 1.9); `npm run shots` writes `.shots/crt-screens-<state>@<width>.png`.
- **Tests:** `crt-screens.spec.ts` in this folder runs with `npm run test:e2e`.

## Tuning knobs

None yet.
