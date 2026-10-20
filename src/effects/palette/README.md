# palette

SPEC §3 row 7 (tier B), built in PLAN step 8. Status: **stub**.

Picking a colorway slides a flat block of the new ink across the page.

- **Owns:** this folder. Nothing else (PLAN "Rules for parallel sessions").
- **Mount:** the fixed full-viewport wipe layer; registers `palette.setTransition()`.
- **Contract:** `init(root, { quality })` and `destroy()`, from `src/core/effect.ts`. Import shared code only from `src/core/`.
- **Screenshots:** add states to `shots.json` (format in PLAN 1.9); `npm run shots` writes `.shots/palette-<state>@<width>.png`.
- **Tests:** `palette.spec.ts` in this folder runs with `npm run test:e2e`.

## Tuning knobs

None yet.
