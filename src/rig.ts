// The halo rig, drawn in code: a silver ring above her head with one camera per
// channel riding it, each hung on a wire and each turned to keep its lens on her.
// A small 3D model projected by hand (no WebGL), drawn on two canvases: the half
// of the ring behind her head, and the half in front. Pure geometry up to draw().

import { WIRE_TOP, type Halo, type Pose } from './halo.ts';

type V3 = [number, number, number];
type P2 = [number, number];

/** One flat piece of a camera, already projected to her painting's pixels. */
export interface Face {
  pts: P2[];
  /** 0 (in shadow) to 1 (facing the light). */
  light: number;
  /** Larger is nearer the viewer; faces are painted far to near. */
  depth: number;
  kind: 'body' | 'lens' | 'glass' | 'detail' | 'mount';
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => mul(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));

/** How far the ring is tipped toward the viewer: its ellipse is rx wide and ry tall. */
export const tiltOf = (halo: Halo) => Math.asin(Math.min(1, halo.ry / halo.rx));

// World space: x right, y up, z toward the viewer, origin at the ring's centre.
// The viewer looks slightly down on the ring, so depth (z) also lowers a point on screen.
const LIGHT = norm([-0.35, 0.9, 0.25]);

/** A camera's faces at one pose, in her painting's pixels. `size` scales the whole model. */
export function cameraFaces(halo: Halo, p: Pose, size: number): Face[] {
  const tilt = tiltOf(halo);
  const [ct, st] = [Math.cos(tilt), Math.sin(tilt)];
  const view: V3 = [0, st, ct]; // toward the viewer
  const a = (p.angle * Math.PI) / 180;
  const pos: V3 = [halo.rx * Math.cos(a), 0, halo.rx * Math.sin(a)];
  // Forward: at her, below the ring's centre. Up stays as upright as forward allows.
  const f = norm(sub([0, -halo.aimDrop, 0], pos));
  const r = norm(cross(f, [0, 1, 0]));
  const u = cross(r, f);
  const s = size * p.scale;
  const at = (x: number, y: number, z: number): V3 => add(pos, add(add(mul(f, x * s), mul(r, y * s)), mul(u, z * s)));
  const project = (v: V3): P2 => [halo.cx + v[0], halo.cy - v[1] * ct + v[2] * st];
  const out: Face[] = [];
  /** Adds a face if it's turned toward the viewer. `outward` overrides the winding's own normal. */
  const face = (corners: V3[], kind: Face['kind'], outward?: V3) => {
    const n = outward ?? norm(cross(sub(corners[1]!, corners[0]!), sub(corners[2]!, corners[0]!)));
    if (dot(n, view) <= 0) return;
    const c = corners.reduce((m, v) => add(m, v), [0, 0, 0] as V3);
    out.push({
      pts: corners.map(project),
      // Top faces catch the light, undersides fall off quickly.
      light: Math.max(0, Math.min(1, (dot(n, LIGHT) + 0.35) / 1.35)),
      depth: dot(mul(c, 1 / corners.length), view),
      kind,
    });
  };
  /** A box from two opposite corners in camera space (forward, right, up), wound outward. */
  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, kind: Face['kind']) => {
    const c = (x: number, y: number, z: number) => at(x, y, z);
    face([c(x1, y0, z0), c(x1, y1, z0), c(x1, y1, z1), c(x1, y0, z1)], kind); // front
    face([c(x0, y1, z0), c(x0, y0, z0), c(x0, y0, z1), c(x0, y1, z1)], kind); // back
    face([c(x0, y0, z1), c(x1, y0, z1), c(x1, y1, z1), c(x0, y1, z1)], kind); // top
    face([c(x0, y1, z0), c(x1, y1, z0), c(x1, y0, z0), c(x0, y0, z0)], kind); // bottom
    face([c(x0, y1, z0), c(x0, y1, z1), c(x1, y1, z1), c(x1, y1, z0)], kind); // right
    face([c(x1, y0, z0), c(x1, y0, z1), c(x0, y0, z1), c(x0, y0, z0)], kind); // left
  };
  /** A barrel along forward from x0 to x1: its side strips and its far cap. */
  const barrel = (x0: number, x1: number, rad: number, kind: Face['kind'], cap: Face['kind'] | null, capRad = rad) => {
    const N = 14;
    const ring = (x: number, k: number, q = rad): V3 => at(x, q * Math.cos((k / N) * 2 * Math.PI), q * Math.sin((k / N) * 2 * Math.PI));
    for (let k = 0; k < N; k++) face([ring(x0, k), ring(x1, k), ring(x1, k + 1), ring(x0, k + 1)], kind);
    if (cap) face(Array.from({ length: N }, (_, k) => ring(x1, k, capRad)), cap, f);
  };

  box(-36, 26, -20, 20, -17, 17, 'body'); // the body
  box(-12, 6, -8, 8, 17, 24, 'mount'); // the block the wire holds
  barrel(26, 46, 13, 'lens', null); // the lens barrel
  barrel(46, 56, 17.5, 'lens', 'lens'); // its hood, capped by a rim
  barrel(56, 56.2, 12, 'lens', 'glass'); // the glass, set in the rim
  // Panel details, a hair proud of the body so they sort in front of it.
  face([at(-36.3, 13, -9), at(-36.3, -13, -9), at(-36.3, -13, 9), at(-36.3, 13, 9)], 'detail', mul(f, -1)); // rear screen
  for (const side of [-1, 1]) {
    const y = side * 20.3;
    face([at(-28, y, 3), at(-28, y, 9), at(16, y, 9), at(16, y, 3)], 'detail', mul(r, side)); // a grip line down each side
  }
  face([at(-30, -14, 17.3), at(-30, 14, 17.3), at(-18, 14, 17.3), at(-18, -14, 17.3)], 'detail', u); // a vent on top
  return out.sort((x, y) => x.depth - y.depth);
}

/** Where a camera's wire attaches (top of its mount), in her painting's pixels. */
export function wireFoot(halo: Halo, p: Pose, size: number): P2 {
  return [p.x, p.y - 24 * size * p.scale * Math.cos(tiltOf(halo))];
}

export interface RigOpts {
  halo: Halo;
  poses: Pose[];
  /** The halo's own turn, for the studs that ride the ring. */
  turn: number;
  live: number;
  /** Model size multiplier (larger on a phone, where the painting is small). */
  size: number;
  /** Device pixels per painting pixel, and the canvas origin (painting pixel at its top-left). */
  k: number;
  origin: P2;
}

// Night-blue bodies picked out in her frame's silver, like the panels around her.
const BODY = ['#0a0f1a', '#121a29', '#1c2637', '#2a364b', '#3b4960'];
const INK = '#0b101b';
const LINE = '#c3c6c3';
const RED = '#d24a50';
const shade = (light: number) => BODY[Math.max(0, Math.min(BODY.length - 1, Math.round(light * (BODY.length - 1))))]!;

/** Draws one half of the rig: 'back' is everything behind her head, 'front' the rest. */
export function drawRig(ctx: CanvasRenderingContext2D, half: 'back' | 'front', o: RigOpts): void {
  const { halo, k } = o;
  const back = half === 'back';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(k, 0, 0, k, -o.origin[0] * k, -o.origin[1] * k);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const hair = Math.max(1.1, 1 / k); // never thinner than about a device pixel

  // Wires first: they run behind everything on their half.
  o.poses.forEach((p, i) => {
    if (p.depth < 0 !== back) return;
    const [x, y] = wireFoot(halo, p, o.size);
    const x40 = halo.cx + (x - halo.cx) * 1.32;
    const t = (y - WIRE_TOP) / (y + 40);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (x40 - x) * t, WIRE_TOP);
    const isLive = i === o.live;
    ctx.strokeStyle = isLive ? RED : 'rgba(195,198,195,0.5)';
    ctx.lineWidth = isLive ? Math.max(2.4, 2 / k) : Math.max(1.4, 1 / k);
    ctx.stroke();
  });

  // The ring: a tube, lit from above, with studs that ride round with the turn.
  const [a0, a1] = back ? [Math.PI, 2 * Math.PI] : [0, Math.PI];
  const arc = (dy: number, width: number, style: string) => {
    ctx.beginPath();
    ctx.ellipse(halo.cx, halo.cy + dy, halo.rx, halo.ry, 0, a0, a1);
    ctx.lineWidth = width;
    ctx.strokeStyle = style;
    ctx.lineCap = 'butt';
    ctx.stroke();
    ctx.lineCap = 'round';
  };
  arc(0, 12.5, INK);
  arc(0, 9.5, '#8b908e');
  arc(-1.2, 5, '#c9ccc8');
  arc(-2.6, 1.6, '#f3f4f0');
  const STUDS = 24;
  for (let s = 0; s < STUDS; s++) {
    const a = ((o.turn + (s * 360) / STUDS) * Math.PI) / 180;
    if (Math.sin(a) < 0 !== back) continue;
    const x = halo.cx + halo.rx * Math.cos(a);
    const y = halo.cy + halo.ry * Math.sin(a);
    const big = s % 6 === 0;
    ctx.beginPath();
    ctx.arc(x, y + 0.6, big ? 2.6 : 1.5, 0, 2 * Math.PI);
    ctx.fillStyle = INK;
    ctx.fill();
  }

  // Cameras, far to near, each with a small halo of its own where its wire meets it.
  const order = o.poses.map((p, i) => ({ p, i })).filter(({ p }) => p.depth < 0 === back);
  order.sort((x, y) => x.p.depth - y.p.depth);
  for (const { p, i } of order) {
    const isLive = i === o.live;
    for (const f of cameraFaces(halo, p, o.size)) {
      ctx.beginPath();
      f.pts.forEach(([x, y], n) => (n ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = f.kind === 'glass' ? (isLive ? RED : '#05080f') : f.kind === 'detail' ? '#7c8388' : shade(f.light);
      ctx.fill();
      ctx.lineWidth = hair * (f.kind === 'glass' ? 1.8 : 1);
      ctx.strokeStyle = f.kind === 'glass' ? '#eef0ec' : LINE;
      ctx.stroke();
    }
    const [wx, wy] = wireFoot(halo, p, o.size);
    const e = 13 * o.size * p.scale;
    ctx.beginPath();
    ctx.ellipse(wx, wy - e * 0.5, e, e * 0.3, 0, 0, 2 * Math.PI);
    ctx.lineWidth = Math.max(2.2, 1.6 / k);
    ctx.strokeStyle = isLive ? RED : '#eef0ec';
    ctx.stroke();
  }
}
