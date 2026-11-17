import { describe, expect, it } from 'vitest';
import scene from '../../src/art/scene.json';
import { pose } from '../../src/halo.ts';
import { cameraFaces, tiltOf, wireFoot } from '../../src/rig.ts';

const halo = scene.halo;
const centre = (pts: [number, number][]) => pts.reduce((m, p) => [m[0] + p[0] / pts.length, m[1] + p[1] / pts.length], [0, 0]);

describe('the drawn rig', () => {
  it('tips the ring so its ellipse matches the one her painting is set up for', () => {
    expect(Math.sin(tiltOf(halo)) * halo.rx).toBeCloseTo(halo.ry);
  });

  it('draws every camera as finite faces near its place on the ring, far to near', () => {
    for (let a = 0; a < 360; a += 15) {
      const p = pose(halo, 0, 0, a);
      const faces = cameraFaces(halo, p, halo.cameraSize);
      expect(faces.length).toBeGreaterThan(8);
      for (const f of faces) {
        for (const [x, y] of f.pts) {
          expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
          expect(Math.hypot(x - p.x, y - p.y)).toBeLessThan(120);
        }
        expect(f.light).toBeGreaterThanOrEqual(0);
        expect(f.light).toBeLessThanOrEqual(1);
      }
      expect(faces.map((f) => f.depth)).toEqual([...faces.map((f) => f.depth)].sort((x, y) => x - y));
    }
  });

  it('keeps every lens pointed in at her', () => {
    for (const a of [0, 180]) {
      // At the ring's two sides the lens is in profile: it sits on the inward side of the body.
      const p = pose(halo, 0, 0, a);
      const faces = cameraFaces(halo, p, 1);
      const lens = centre(faces.filter((f) => f.kind === 'lens').flatMap((f) => f.pts));
      const body = centre(faces.filter((f) => f.kind === 'body').flatMap((f) => f.pts));
      expect(Math.abs(lens[0] - halo.cx)).toBeLessThan(Math.abs(body[0] - halo.cx));
      expect(lens[1]).toBeGreaterThan(body[1]); // and tipped down, toward her face
    }
  });

  it('shows the glass only when a camera faces the viewer (from the far side of the ring)', () => {
    const glass = (a: number) => cameraFaces(halo, pose(halo, 0, 0, a), 1).some((f) => f.kind === 'glass');
    expect(glass(270)).toBe(true);
    expect(glass(90)).toBe(false);
  });

  it('hangs each wire from just above its camera', () => {
    const p = pose(halo, 90, 0, 0);
    const [x, y] = wireFoot(halo, p, 1);
    expect(x).toBeCloseTo(p.x);
    expect(y).toBeLessThan(p.y);
    expect(p.y - y).toBeLessThan(40);
  });
});
