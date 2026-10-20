import { describe, expect, it } from 'vitest';
import { janky } from '../../src/core/motion';

const frames = (pattern: number[], n = 60) => Array.from({ length: n }, (_, i) => pattern[i % pattern.length]!);

describe('slow-frame detection', () => {
  it('a steady 60 Hz is not slow', () => {
    expect(janky(frames([16.7]))).toBe(false);
  });

  it('a steady 30 Hz cap (iOS Low Power Mode) is not slow', () => {
    expect(janky(frames([33.3]))).toBe(false);
  });

  it('occasional dropped frames are not slow', () => {
    expect(janky(frames([16.7, 16.7, 16.7, 16.7, 16.7, 33.4]))).toBe(false);
  });

  it('dropping every other frame against its own cadence is slow', () => {
    expect(janky(frames([16.7, 33.4]))).toBe(true);
    expect(janky(frames([16.7, 50, 16.7, 33.4, 66]))).toBe(true);
  });
});
