// Her poster frame as an inline SVG string: four separate strokes that wobble
// and overshoot the corners. Shared by the build (scripts/vite/c3-html.ts, the
// <c3-frame> tag and the screen tags) and by effects that draw a frame at run
// time (the X-ray toggle), so both draw the same line from the same seed.

// With the extension: vite.config.ts loads this module too (through c3-html.ts).
import { rng } from './raster.ts';

const n = (v: number) => +v.toFixed(2);

/**
 * Stretches to any box (viewBox 0-100, no aspect lock); strokes keep their
 * width through vector-effect: non-scaling-stroke (CSS). Each entry of
 * `passes` draws the frame once more, overshooting the corners by that much;
 * passes after the first are echoes (`.rough-frame__echo`).
 */
export function roughFrame(seed: number, passes: readonly number[] = [1.4, 0.6]): string {
  const r = rng(seed);
  const j = (a: number) => (r() - 0.5) * a;
  const side = (x0: number, y0: number, x1: number, y1: number) =>
    `M${n(x0 + j(1))} ${n(y0 + j(1))}Q${n((x0 + x1) / 2 + j(1.6))} ${n((y0 + y1) / 2 + j(1.6))} ${n(x1 + j(1))} ${n(y1 + j(1))}`;
  const pass = (o: number) =>
    [side(-o, 0.4, 100 + o, 0.2), side(99.7, -o, 99.5, 100 + o), side(100 + o, 99.6, -o, 99.8), side(0.3, 100 + o, 0.5, -o)].join('');
  const paths = passes.map((o, i) => (i === 0 ? `<path d="${pass(o)}"/>` : `<path class="rough-frame__echo" d="${pass(o)}"/>`));
  return `<svg class="rough-frame" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">${paths.join('')}</svg>`;
}
