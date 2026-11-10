// The halo: six cameras riding an ellipse above her head. Pure math, no DOM, so
// it can be unit-tested and shared by the stage, the feeds and the radar.

export interface Halo {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  turnSeconds: number;
  startAngle: number;
  cameraScale: number;
}

export interface CameraArt {
  file: string;
  w: number;
  h: number;
  /** Where this camera sits on the ring at angle 0, in degrees (90 = front). */
  base: number;
}

export interface Pose {
  index: number;
  x: number;
  y: number;
  /** sin of the camera's angle: 1 at the front, -1 at the back. */
  depth: number;
  scale: number;
  /** Small tilt that follows the ring's curve. */
  rotate: number;
  /** Far enough behind her head that its feed is blocked. */
  obstructed: boolean;
}

/** Below this depth a camera's view of her face is blocked by her head. */
export const OBSTRUCTED_BELOW = -0.35;
export const HOVER_LIFT = 1.22;

export function pose(halo: Halo, cam: CameraArt, index: number, angle: number, lifted = false): Pose {
  const a = ((cam.base + angle) * Math.PI) / 180;
  const depth = Math.sin(a);
  const scale = (0.8 + (0.24 * (depth + 1)) / 2) * (lifted ? HOVER_LIFT : 1);
  return {
    index,
    x: halo.cx + halo.rx * Math.cos(a),
    y: halo.cy + halo.ry * depth,
    depth,
    scale,
    rotate: -6 * Math.cos(a),
    obstructed: depth < OBSTRUCTED_BELOW,
  };
}

export function poses(halo: Halo, cams: CameraArt[], angle: number, lifted = -1): Pose[] {
  return cams.map((c, i) => pose(halo, c, i, angle, i === lifted));
}

/** The camera nearest the front: the one on air when nothing is hovered. */
export function frontIndex(ps: Pose[]): number {
  let best = 0;
  for (const p of ps) if (p.depth > (ps[best]?.depth ?? -2)) best = p.index;
  return best;
}

/** Next angle after `dt` seconds of turning. Kept in [0, 360). */
export function advance(angle: number, dt: number, turnSeconds: number): number {
  return (((angle + (dt * 360) / turnSeconds) % 360) + 360) % 360;
}

/**
 * The suspension wire: from the top of the camera straight up past the top of
 * her painting, splaying out a little like a stage rig.
 */
export function wire(halo: Halo, p: Pose, camHeight: number): [number, number, number, number] {
  const top = p.y - camHeight * p.scale * 0.36;
  return [p.x, top, halo.cx + (p.x - halo.cx) * 1.32, -40];
}

/**
 * Where a camera's feed is pointed: her face, shifted a little by where the
 * camera sits, so each feed shows a slightly different angle.
 */
export function aim(halo: Halo, face: { x: number; y: number }, p: Pose): { x: number; y: number } {
  return { x: face.x + (p.x - halo.cx) * 0.15, y: face.y + (p.y - halo.cy) * 0.25 };
}
