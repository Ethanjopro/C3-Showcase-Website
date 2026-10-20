# paper-grain

SPEC §3 row 2 (tier A), built in PLAN step 3. Status: **stub**.

Her scratchy grey paper with a riso grain that shifts at 8 fps.

- **Owns:** this folder. Nothing else (PLAN "Rules for parallel sessions").
- **Mount:** the fixed full-viewport layer behind all content.
- **Contract:** `init(root, { quality })` and `destroy()`, from `src/core/effect.ts`. Import shared code only from `src/core/`.
- **Screenshots:** add states to `shots.json` (format in PLAN 1.9); `npm run shots` writes `.shots/paper-grain-<state>@<width>.png`.
- **Tests:** `paper-grain.spec.ts` in this folder runs with `npm run test:e2e`.

## Tuning knobs

None yet.
