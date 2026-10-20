# halo-menu

SPEC §3 row 6 (tier B), built in PLAN step 7. Status: **stub**.

The menu becomes a ring of boxy CRT screens on a cable (Three.js).

- **Owns:** this folder. Nothing else (PLAN "Rules for parallel sessions").
- **Mount:** the mount inside `<dialog id="menu">`; the dialog and its `<nav>` list keep working without it.
- **Contract:** `init(root, { quality })` and `destroy()`, from `src/core/effect.ts`. Import shared code only from `src/core/`.
- **Screenshots:** add states to `shots.json` (format in PLAN 1.9); `npm run shots` writes `.shots/halo-menu-<state>@<width>.png`.
- **Tests:** `halo-menu.spec.ts` in this folder runs with `npm run test:e2e`.

## Tuning knobs

None yet.
