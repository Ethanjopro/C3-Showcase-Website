# sketch-in

SPEC §3 row 5 (tier A), built in PLAN step 6. Status: **stub**.

On the first visit of a session, her line art draws itself in at 12 fps and the fill floods in.

- **Owns:** this folder. Nothing else (PLAN "Rules for parallel sessions").
- **Mount:** a hidden mount at the top of <body>; writes stroke dash, clip and opacity on `.layer__art` and the SVG paths inside it.
- **Line-boil handshake (PLAN step 6):** while drawing, add the token `drawing` to `<html data-fx-sketch-in>`, and remove it at the end state. line-boil holds on her live line art while it's set.
- **Contract:** `init(root, { quality })` and `destroy()`, from `src/core/effect.ts`. Import shared code only from `src/core/`.
- **Screenshots:** add states to `shots.json` (format in PLAN 1.9); `npm run shots` writes `.shots/sketch-in-<state>@<width>.png`.
- **Tests:** `sketch-in.spec.ts` in this folder runs with `npm run test:e2e`.

## Tuning knobs

None yet.
