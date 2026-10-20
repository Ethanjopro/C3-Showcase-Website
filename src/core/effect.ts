// The contract every effect in src/effects/<name>/index.ts implements (PLAN 1.4).

import type { Quality } from './motion';

export interface EffectOptions {
  /** full, lite or static (reduced motion). See core/motion.ts. */
  quality: Quality;
}

export interface EffectModule {
  /**
   * Starts the effect inside `root`, its mount: the first `[data-fx="<name>"]`
   * element. Extra mounts it owns are `[data-fx="<name>"][data-part]`.
   */
  init(root: HTMLElement, opts: EffectOptions): void | Promise<void>;
  /** Removes every listener, ticker subscription and GPU resource init created. */
  destroy(): void;
}
