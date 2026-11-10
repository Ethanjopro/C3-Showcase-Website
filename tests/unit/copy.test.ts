import { describe, expect, it } from 'vitest';
import { copyNumber, marksOf, seedOf } from '../../src/copy.ts';

describe('your own copy', () => {
  it('is the same copy for the same name, and different for another', () => {
    expect(marksOf(seedOf('Ethan'))).toEqual(marksOf(seedOf('Ethan')));
    expect(marksOf(seedOf('Ethan'))).not.toEqual(marksOf(seedOf('Ana')));
  });

  it('keeps the marks on the poster', () => {
    for (const m of marksOf(seedOf('a very long name indeed'))) {
      expect(m.x).toBeGreaterThanOrEqual(10);
      expect(m.x + m.w).toBeLessThanOrEqual(150);
      expect(m.y).toBeGreaterThanOrEqual(60);
      expect(m.y).toBeLessThanOrEqual(200);
    }
  });

  it('numbers copies with six digits', () => {
    expect(copyNumber(seedOf(''))).toMatch(/^\d{6}$/);
    expect(copyNumber(seedOf('Ethan'))).toMatch(/^\d{6}$/);
  });
});
