import { describe, expect, it, vi } from 'vitest';
import { current, onChange, request, setTransition } from '../../src/core/palette';

describe('palette', () => {
  it('swaps instantly with no transition registered', async () => {
    await request('black-red');
    expect(current).toBe('black-red');
  });

  it('keeps working after a transition throws', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    setTransition(() => Promise.reject(new Error('wipe bug')));
    await expect(request('indigo-pink')).resolves.toBeUndefined();
    expect(current).toBe('indigo-pink');
    expect(error).toHaveBeenCalledOnce();
    setTransition(null);
    await request('teal-coral');
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
    await request('violet-pink');
    setTransition(null);
    off();
    expect(seen).toEqual(['cover', 'violet-pink', 'uncover']);
  });

  it('ignores names that are not colorways', async () => {
    await request('teal-coral');
    await request('neon-green' as never);
    expect(current).toBe('teal-coral');
  });
});
