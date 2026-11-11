import { describe, expect, it } from 'vitest';
import scene from '../../src/art/scene.json';
import { advance, aim, frontAngle, frontIndex, OBSTRUCTED_BELOW, pose, poses, shortestTurn, wire } from '../../src/halo.ts';

const halo = scene.halo;
const cams = scene.cameras;

describe('halo', () => {
  it('puts a camera at 90 degrees at the front centre, biggest', () => {
    const p = pose(halo, { file: 'x', w: 100, h: 60, base: 90 }, 0, 0);
    expect(p.x).toBeCloseTo(halo.cx);
    expect(p.y).toBeCloseTo(halo.cy + halo.ry);
    expect(p.depth).toBeCloseTo(1);
    expect(p.scale).toBeCloseTo(1.04);
    expect(p.obstructed).toBe(false);
  });

  it('hides a camera at the back behind her head', () => {
    const p = pose(halo, { file: 'x', w: 100, h: 60, base: 270 }, 0, 0);
    expect(p.depth).toBeCloseTo(-1);
    expect(p.obstructed).toBe(true);
    expect(p.scale).toBeCloseTo(0.8);
  });

  it('lifts a hovered camera', () => {
    const a = pose(halo, cams[0]!, 0, 30);
    const b = pose(halo, cams[0]!, 0, 30, true);
    expect(b.scale / a.scale).toBeCloseTo(1.22);
  });

  it('finds the front camera', () => {
    expect(frontIndex(poses(halo, cams, 0))).toBe(0); // camera 01 sits at 90
    expect(frontIndex(poses(halo, cams, 60))).toBe(5); // camera 06 (base 30) reaches 90
  });

  it('brings any channel\'s camera round to the front, in view', () => {
    cams.forEach((cam, i) => {
      const a = frontAngle(cam);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(360);
      const ps = poses(halo, cams, a);
      expect(frontIndex(ps)).toBe(i);
      expect(ps[i]!.depth).toBeCloseTo(1);
      expect(ps[i]!.obstructed).toBe(false);
    });
  });

  it('turns the shorter way round', () => {
    expect(shortestTurn(10, 50)).toBe(40);
    expect(shortestTurn(350, 10)).toBe(20);
    expect(shortestTurn(10, 350)).toBe(-20);
    expect(shortestTurn(0, 180)).toBe(180);
    expect(shortestTurn(90, 90)).toBe(0);
    expect(Math.abs(shortestTurn(123.4, 271.9))).toBeLessThanOrEqual(180);
  });

  it('turns once every turnSeconds and wraps', () => {
    expect(advance(350, halo.turnSeconds / 36, halo.turnSeconds)).toBeCloseTo(0);
    expect(advance(0, halo.turnSeconds, halo.turnSeconds)).toBeCloseTo(0);
    expect(advance(10, 1, 40)).toBeCloseTo(19);
  });

  it('obstructs roughly a third of the ring', () => {
    let blocked = 0;
    for (let a = 0; a < 360; a++) if (pose(halo, cams[0]!, 0, a).depth < OBSTRUCTED_BELOW) blocked++;
    expect(blocked / 360).toBeGreaterThan(0.25);
    expect(blocked / 360).toBeLessThan(0.4);
  });

  it('hangs each wire from above the top of the painting', () => {
    for (const p of poses(halo, cams, 123)) {
      const [x1, y1, , y2] = wire(halo, p, 70);
      expect(y2).toBeLessThan(0);
      expect(y1).toBeLessThan(p.y);
      expect(x1).toBeCloseTo(p.x);
    }
  });

  it('aims feeds at her face', () => {
    const p = pose(halo, cams[0]!, 0, 0);
    const a = aim(halo, scene.face, p);
    expect(Math.abs(a.x - scene.face.x)).toBeLessThan(40);
    expect(Math.abs(a.y - scene.face.y)).toBeLessThan(20);
  });
});
