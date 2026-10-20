import { describe, expect, it } from 'vitest';
import { createTicker, type Driver } from '../../src/core/ticker';

/** A driver the test advances by hand. */
function manualDriver() {
  let frame: ((now: number) => void) | null = null;
  const driver: Driver = {
    start: (f) => (frame = f),
    stop: () => (frame = null),
  };
  return {
    driver,
    get running() {
      return frame !== null;
    },
    tick(now: number) {
      frame?.(now);
    },
  };
}

describe('ticker', () => {
  it('runs every-frame callbacks with dt between frames', () => {
    const m = manualDriver();
    const t = createTicker(m.driver);
    const calls: [number, number][] = [];
    t.add((time, dt) => calls.push([time, dt]));
    m.tick(1000);
    m.tick(1016);
    m.tick(1033);
    expect(calls).toEqual([
      [1000, 0],
      [1016, 16],
      [1033, 17],
    ]);
  });

  it('steps fps callbacks: once per step, never between', () => {
    const m = manualDriver();
    const t = createTicker(m.driver);
    const steps: number[] = [];
    t.add((time) => steps.push(time), { fps: 10 });
    for (let now = 0; now <= 400; now += 16) m.tick(now);
    // 10 fps = a 100 ms step: the first 16 ms frame in each step runs it.
    expect(steps).toEqual([0, 112, 208, 304, 400]);
  });

  it('freezes the clock for screenshots: t fixed, dt 0, a stepped callback runs once', () => {
    const m = manualDriver();
    const t = createTicker(m.driver, 100);
    const every: [number, number][] = [];
    const stepped: number[] = [];
    t.add((time, dt) => every.push([time, dt]));
    t.add((time) => stepped.push(time), { fps: 10 });
    m.tick(5);
    m.tick(21);
    m.tick(37);
    expect(every).toEqual([
      [100, 0],
      [100, 0],
      [100, 0],
    ]);
    expect(stepped).toEqual([100]);
    expect(t.now()).toBe(100);
  });

  it('starts the driver on the first subscriber and stops it after the last', () => {
    const m = manualDriver();
    const t = createTicker(m.driver);
    expect(m.running).toBe(false);
    const off1 = t.add(() => {});
    const off2 = t.add(() => {});
    expect(m.running).toBe(true);
    off1();
    expect(m.running).toBe(true);
    off2();
    expect(m.running).toBe(false);
  });

  it('pauses while hidden and restarts dt from zero', () => {
    const m = manualDriver();
    const t = createTicker(m.driver);
    const dts: number[] = [];
    t.add((_time, dt) => dts.push(dt));
    m.tick(0);
    m.tick(16);
    t.setPaused(true);
    expect(m.running).toBe(false);
    t.setPaused(false);
    m.tick(60_000); // back after a minute: no jump
    m.tick(60_016);
    expect(dts).toEqual([0, 16, 0, 16]);
  });
});
