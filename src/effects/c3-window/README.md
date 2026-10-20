# c3-window

SPEC §3 row 4 (tier B), built in PLAN step 5. Status: **stub**.

On arrival the poster shows only through a giant cropped "C3"; scrolling opens the window.

- **Owns:** this folder. Nothing else (PLAN "Rules for parallel sessions").
- **Mount:** a mount inside `.poster-stage`; writes mask, scale and pin on `.poster-stage` only.
- **Contract:** `init(root, { quality })` and `destroy()`, from `src/core/effect.ts`. Import shared code only from `src/core/`.
- **Screenshots:** add states to `shots.json` (format in PLAN 1.9); `npm run shots` writes `.shots/c3-window-<state>@<width>.png`.
- **Tests:** `c3-window.spec.ts` in this folder runs with `npm run test:e2e`.

## Tuning knobs

None yet.
