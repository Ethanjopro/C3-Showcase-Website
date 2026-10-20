# cables

SPEC §3 row 10 (tier B), built in PLAN step 11. Status: **stub**.

The cables hanging from the halo swing with scroll and part under a finger or cursor.

- **Owns:** this folder. Nothing else (PLAN "Rules for parallel sessions").
- **Mount:** the canvas mount inside the cables layer; may hide the static cables art through `data-fx-cables` on <html>.
- **Contract:** `init(root, { quality })` and `destroy()`, from `src/core/effect.ts`. Import shared code only from `src/core/`.
- **Screenshots:** add states to `shots.json` (format in PLAN 1.9); `npm run shots` writes `.shots/cables-<state>@<width>.png`.
- **Tests:** `cables.spec.ts` in this folder runs with `npm run test:e2e`.

## Tuning knobs

None yet.
