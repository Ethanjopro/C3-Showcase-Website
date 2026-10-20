# line-boil

SPEC §3 row 1 (tier A), built in PLAN step 2. Status: **stub**.

Every hand-drawn layer jitters like pencil animation, stepping at 10 fps.

- **Owns:** this folder. Nothing else (PLAN "Rules for parallel sessions").
- **Mount:** a hidden defs mount at the top of <body>; writes `filter` on `.layer__boil` only.
- **Contract:** `init(root, { quality })` and `destroy()`, from `src/core/effect.ts`. Import shared code only from `src/core/`.
- **Screenshots:** add states to `shots.json` (format in PLAN 1.9); `npm run shots` writes `.shots/line-boil-<state>@<width>.png`.
- **Tests:** `line-boil.spec.ts` in this folder runs with `npm run test:e2e`.

## Tuning knobs

None yet.
