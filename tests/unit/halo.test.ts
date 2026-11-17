import { describe, expect, it } from 'vitest';
import scene from '../../src/art/scene.json';
import { advance, aim, bases, frontAngle, frontIndex, OBSTRUCTED_BELOW, pose, poses, shortestTurn } from '../../src/halo.ts';

const halo = scene.halo;
const cams = bases(4);

describe('halo', () => {
  it('spaces the cameras evenly round the ring, the first at the front', () => {
    expect(cams).toEqual([90, 180, 270, 0]);
    expect(bases(6).map((b, i, all) => (((all[(i + 1) % 6]! - b) % 360) + 360) % 360)).toEqual([60, 60, 60, 60, 60, 60]);
  });

  it('puts a camera on the ring: front is lower on screen and larger', () => {
    const front = pose(halo, 90, 0, 0);
    const back = pose(halo, 270, 2, 0);
    expect(front.x).toBeCloseTo(halo.cx);
    expect(front.y).toBeCloseTo(halo.cy + halo.ry);
    expect(back.y).toBeCloseTo(halo.cy - halo.ry);
    expect(front.scale).toBeGreaterThan(back.scale);
    expect(front.angle).toBe(90);
  });

  it('lifts a hovered camera', () => {
    expect(pose(halo, 90, 0, 0, true).scale).toBeGreaterThan(pose(halo, 90, 0, 0).scale);
  });

  it('blocks only the feeds of cameras well behind her head', () => {
    let blocked = 0;
    for (let a = 0; a < 360; a++) if (pose(halo, 0, 0, a).obstructed) blocked++;
    expect(pose(halo, 270, 0, 0).obstructed).toBe(true);
    expect(pose(halo, 0, 0, 0).obstructed).toBe(false);
    expect(pose(halo, 0, 0, 0).depth).toBeGreaterThan(OBSTRUCTED_BELOW);
    expect(blocked / 360).toBeGreaterThan(0.25);
    expect(blocked / 360).toBeLessThan(0.4);
  });

  it('names the camera nearest the front', () => {
    expect(frontIndex(poses(halo, cams, 0))).toBe(0);
    expect(frontIndex(poses(halo, cams, -90))).toBe(1);
  });

  it('brings any channel\'s camera round to the front, in view', () => {
    cams.forEach((base, i) => {
      const a = frontAngle(base);
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
    expect(advance(0, halo.turnSeconds / 4, halo.turnSeconds)).toBeCloseTo(90);
    expect(advance(350, halo.turnSeconds / 18, halo.turnSeconds)).toBeCloseTo(10);
  });

  it('aims feeds at her face', () => {
    const a = aim(halo, scene.face, pose(halo, 90, 0, 0));
    expect(Math.abs(a.x - scene.face.x)).toBeLessThan(40);
    expect(Math.abs(a.y - scene.face.y)).toBeLessThan(40);
  });
});
