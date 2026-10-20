# xray

SPEC §3 row 3 (tier B), built in PLAN step 4. Status: **stub**.

Her ribcage and heart in halftone ink, through a hole in the drawing: a lens on desktop, scribble-to-reveal on touch.

- **Owns:** this folder, plus `src/content/xray.json`. Nothing else (PLAN "Rules for parallel sessions").
- **Mount:** the canvas layer inside `.poster`; the X-ray toggle lives in `[data-fx="xray"][data-part="toggle"]` in the poster small print.
- **Ribcage layer:** the static poster shows the `ribcage` slot, because her sketch draws the panel on her chest. This effect may hide that layer through `data-fx-xray` on `<html>` (its own CSS) and reveal it through the lens or scribble instead.
- **Contract:** `init(root, { quality })` and `destroy()`, from `src/core/effect.ts`. Import shared code only from `src/core/`.
- **Screenshots:** add states to `shots.json` (format in PLAN 1.9); `npm run shots` writes `.shots/xray-<state>@<width>.png`.
- **Tests:** `xray.spec.ts` in this folder runs with `npm run test:e2e`.

## Tuning knobs

None yet.
