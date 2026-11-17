// The halo: one camera per channel riding an ellipse above her head. Pure math,
// no DOM, so it can be unit-tested and shared by the rig, the stage and the feeds.

export interface Halo {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  turnSeconds: number;
  startAngle: number;
  cameraSize: number;
  cameraSizePhone: number;
  aimDrop: number;
}

export interface Pose {
  index: number;
  /** The camera's angle on the ring in degrees: 90 is the front, 270 behind her. */
  angle: number;
  x: number;
  y: number;
  /** sin of the camera's angle: 1 at the front, -1 at the back. */
  depth: number;
  scale: number;
  /** Far enough behind her head that its feed is blocked. */
  obstructed: boolean;
}

/** Below this depth a camera's view of her face is blocked by her head. */
export const OBSTRUCTED_BELOW = -0.35;
export const HOVER_LIFT = 1.22;

/** The hit box of a camera on her painting, in her pixels (the drawing itself is on a canvas). */
export const CAM_BOX = { w: 104, h: 76 };

/** How far above her painting the wires run (the card clips them). */
export const WIRE_TOP = -700;

const wrap = (deg: number) => ((deg % 360) + 360) % 360;

/** Where each of `n` cameras sits on the ring at angle 0: evenly spaced, the first at the front. */
export const bases = (n: number): number[] => Array.from({ length: n }, (_, i) => wrap(90 + (i * 360) / n));

export function pose(halo: Halo, base: number, index: number, angle: number, lifted = false): Pose {
  const deg = wrap(base + angle);
  const a = (deg * Math.PI) / 180;
  const depth = Math.sin(a);
  return {
    index,
    angle: deg,
    x: halo.cx + halo.rx * Math.cos(a),
    y: halo.cy + halo.ry * depth,
    depth,
    scale: (0.8 + (0.24 * (depth + 1)) / 2) * (lifted ? HOVER_LIFT : 1),
    obstructed: depth < OBSTRUCTED_BELOW,
  };
}

export function poses(halo: Halo, camBases: number[], angle: number, lifted = -1): Pose[] {
  return camBases.map((b, i) => pose(halo, b, i, angle, i === lifted));
}

/** The camera nearest the front: the one on air when nothing is hovered. */
export function frontIndex(ps: Pose[]): number {
  let best = 0;
  for (const p of ps) if (p.depth > (ps[best]?.depth ?? -2)) best = p.index;
  return best;
}

/** The halo angle that brings the camera at `base` round to the front. In [0, 360). */
export const frontAngle = (base: number): number => wrap(90 - base);

/** The shorter way round from one angle to another, in degrees: (-180, 180]. */
export function shortestTurn(from: number, to: number): number {
  const d = wrap(to - from);
  return d > 180 ? d - 360 : d;
}

/** Next angle after `dt` seconds of turning. Kept in [0, 360). */
export function advance(angle: number, dt: number, turnSeconds: number): number {
  return wrap(angle + (dt * 360) / turnSeconds);
}

/**
 * Where a camera's feed is pointed: her face, shifted a little by where the
 * camera sits, so each feed shows a slightly different angle.
 */
export function aim(halo: Halo, face: { x: number; y: number }, p: Pose): { x: number; y: number } {
  return { x: face.x + (p.x - halo.cx) * 0.15, y: face.y + (p.y - halo.cy) * 0.25 };
}
