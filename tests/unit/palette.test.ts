import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GAP, current, onChange, request, setTransition, timeMs } from '../../src/core/palette';

// core/palette spaces colorway changes GAP ms apart (flash safety), so every
// test runs on one fake clock that moves past the gap before it starts.
/** Runs the clock until the pick (and any it waits behind) has settled. */
async function pick(name: Parameters<typeof request>[0]): Promise<void> {
  const done = request(name);
  await vi.runAllTimersAsync();
  await done;
}

describe('palette', () => {
  beforeAll(() => vi.useFakeTimers({ toFake: ['setTimeout', 'performance'] }));
  afterAll(() => vi.useRealTimers());
  beforeEach(async () => {
    setTransition(null);
    await vi.advanceTimersByTimeAsync(GAP);
  });

  it('swaps instantly with no transition registered', async () => {
    await pick('black-red');
    expect(current).toBe('black-red');
  });

  it('keeps working after a transition throws', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    setTransition(() => Promise.reject(new Error('wipe bug')));
    await expect(request('indigo-pink')).resolves.toBeUndefined();
    expect(current).toBe('indigo-pink');
    expect(error).toHaveBeenCalledOnce();
    setTransition(null);
    await pick('teal-coral');
    expect(current).toBe('teal-coral');
    error.mockRestore();
  });

  it('applies at the transition midpoint, once', async () => {
    const seen: string[] = [];
    const off = onChange((name) => seen.push(name));
    setTransition(async (apply) => {
      seen.push('cover');
      apply();
      seen.push('uncover');
    });
    await pick('violet-pink');
    off();
    expect(seen).toEqual(['cover', 'violet-pink', 'uncover']);
  });

  it('ignores names that are not colorways', async () => {
    await pick('teal-coral');
    await pick('neon-green' as never);
    expect(current).toBe('teal-coral');
  });

  describe('flash safety: one change per GAP, latest pick wins', () => {
    beforeEach(async () => {
      await pick('teal-coral');
      await vi.advanceTimersByTimeAsync(GAP);
    });

    it('collapses a burst of picks to the first and the last, GAP apart, with no transition', async () => {
      const seen: [string, number][] = [];
      const off = onChange((name) => seen.push([name, performance.now()]));
      void request('black-red');
      void request('mauve-periwinkle');
      await pick('indigo-pink');
      off();
      expect(seen.map(([name]) => name)).toEqual(['black-red', 'indigo-pink']);
      expect(seen[1]![1] - seen[0]![1]).toBeGreaterThanOrEqual(GAP);
      expect(current).toBe('indigo-pink');
    });

    it('wipes a pick that did not wait, and swaps one that did without the wipe', async () => {
      const wiped: string[] = [];
      setTransition(async (apply, to) => {
        wiped.push(to);
        apply();
      });
      void request('black-red');
      await pick('violet-pink');
      expect(wiped).toEqual(['black-red']);
      expect(current).toBe('violet-pink');
      // Once the gap has passed, the next pick wipes again.
      await vi.advanceTimersByTimeAsync(GAP);
      await pick('brown-orange');
      expect(wiped).toEqual(['black-red', 'brown-orange']);
    });

    it('a burst that comes back to the first pick still lands on it', async () => {
      const seen: string[] = [];
      const off = onChange((name) => seen.push(name));
      void request('black-red');
      void request('indigo-pink');
      await pick('teal-coral');
      off();
      expect(seen).toEqual(['black-red', 'teal-coral']);
    });

    it('also spaces swaps with no transition (reduced motion)', async () => {
      const at: number[] = [];
      const off = onChange(() => at.push(performance.now()));
      void request('black-red');
      await vi.advanceTimersByTimeAsync(10);
      await pick('brown-orange');
      off();
      expect(at).toHaveLength(2);
      expect(at[1]! - at[0]!).toBeGreaterThanOrEqual(GAP);
    });
  });

  it('reads time tokens in ms, whatever the unit', () => {
    expect(timeMs('600ms', 1)).toBe(600);
    expect(timeMs('.6s', 1)).toBe(600);
    expect(timeMs(' 0.5s ', 1)).toBe(500);
    expect(timeMs('250', 1)).toBe(250);
    expect(timeMs('', 1)).toBe(1);
    expect(timeMs('0ms', 1)).toBe(1);
  });
});
