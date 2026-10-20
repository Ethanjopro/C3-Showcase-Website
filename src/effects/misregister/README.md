# misregister

SPEC §3 row 8 (tier A), built in PLAN step 9. Status: **stub**.

The ink and coral layers slip 1-2 px apart on a fast scroll or flick, then snap back.

- **Owns:** this folder. Nothing else (PLAN "Rules for parallel sessions").
- **Mount:** a hidden mount at the top of <body>; writes `transform` on `.layer` only.
- **Contract:** `init(root, { quality })` and `destroy()`, from `src/core/effect.ts`. Import shared code only from `src/core/`.
- **Screenshots:** add states to `shots.json` (format in PLAN 1.9); `npm run shots` writes `.shots/misregister-<state>@<width>.png`.
- **Tests:** `misregister.spec.ts` in this folder runs with `npm run test:e2e`.

## Tuning knobs

None yet.
