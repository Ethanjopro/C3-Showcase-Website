# panel-wipe

SPEC §3 row 9 (tier A), built in PLAN step 10. Status: **stub**.

Each section enters once from behind a flat ink or coral block that slides off.

- **Owns:** this folder. Nothing else (PLAN "Rules for parallel sessions").
- **Mount:** one `[data-fx="panel-wipe"]` mount in each section header (the first is the root; the rest carry `data-part`).
- **Contract:** `init(root, { quality })` and `destroy()`, from `src/core/effect.ts`. Import shared code only from `src/core/`.
- **Screenshots:** add states to `shots.json` (format in PLAN 1.9); `npm run shots` writes `.shots/panel-wipe-<state>@<width>.png`.
- **Tests:** `panel-wipe.spec.ts` in this folder runs with `npm run test:e2e`.

## Tuning knobs

None yet.
