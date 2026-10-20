// Which effects run. Defaults live in src/config/features.json; any visit can
// override them (SPEC §3):
//   ?off=xray,palette    turn these off
//   ?only=line-boil      turn everything else off
//   ?off=all             static poster only

import features from '../config/features.json';
import { parseFlags } from './parse-flags.js';

export type EffectName = keyof typeof features.effects;

export const names = Object.keys(features.effects) as EffectName[];

export { parseFlags };

const resolved = parseFlags(features.effects, typeof location !== 'undefined' ? location.search : '');

export function enabled(name: EffectName): boolean {
  return resolved[name] ?? false;
}
