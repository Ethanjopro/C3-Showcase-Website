// Every effect from SPEC §3, in priority order. main.ts boots them; effect
// sessions never edit this file (PLAN "Rules for parallel sessions").
//
// when:
//   load         right after main.ts runs (arrival effects)
//   idle         when the browser is idle after load
//   visible      when the mount's box (or any `watch` target) first scrolls into view
//   interaction  on the first tap, key or scroll
// prehide (listed in src/config/features.json): the boot script in index.html
//   hides the effect's start state before first paint (see the fx-pending
//   rules in src/styles/base.css), and main.ts reveals it once init settles or
//   fails. An effect that plays once per session sets
//   sessionStorage['c3:fx-done:<name>'] so later visits skip the hiding.

import type { EffectModule } from '../core/effect';
import type { EffectName } from '../core/flags';
import features from '../config/features.json';

export type LoadTrigger = 'load' | 'idle' | 'visible' | 'interaction';

export interface EffectEntry {
  name: EffectName;
  mount: string;
  when: LoadTrigger;
  /** For `visible`: elements to watch instead of the mount's box. */
  watch?: string;
  /** Its `lite` is its `full`: a drop to lite mid-visit doesn't restart it. */
  liteIsFull?: true;
  load: () => Promise<EffectModule>;
}

const mount = (name: EffectName) => `[data-fx="${name}"]:not([data-part])`;

export const effects: EffectEntry[] = [
  { name: 'line-boil', mount: mount('line-boil'), when: 'load', load: () => import('./line-boil/index') },
  { name: 'paper-grain', mount: mount('paper-grain'), when: 'idle', load: () => import('./paper-grain/index') },
  { name: 'xray', mount: mount('xray'), when: 'idle', load: () => import('./xray/index') },
  { name: 'c3-window', mount: mount('c3-window'), when: 'load', liteIsFull: true, load: () => import('./c3-window/index') },
  { name: 'sketch-in', mount: mount('sketch-in'), when: 'load', load: () => import('./sketch-in/index') },
  { name: 'halo-menu', mount: mount('halo-menu'), when: 'idle', load: () => import('./halo-menu/index') },
  { name: 'palette', mount: mount('palette'), when: 'idle', load: () => import('./palette/index') },
  { name: 'misregister', mount: mount('misregister'), when: 'idle', load: () => import('./misregister/index') },
  { name: 'panel-wipe', mount: mount('panel-wipe'), when: 'idle', liteIsFull: true, load: () => import('./panel-wipe/index') },
  { name: 'cables', mount: mount('cables'), when: 'visible', load: () => import('./cables/index') },
  { name: 'crt-screens', mount: mount('crt-screens'), when: 'visible', watch: '[data-crt]', liteIsFull: true, load: () => import('./crt-screens/index') },
];

/** Effects whose start state is hidden before first paint. */
export const prehidden = features.prehide as EffectName[];
