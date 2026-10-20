// Which effects run. Defaults live in src/config/features.json; any visit can
// override them (SPEC §3):
//   ?off=xray,palette    turn these off
//   ?only=line-boil      turn everything else off
//   ?off=all             static poster only

import features from '../config/features.json';

export type EffectName = keyof typeof features.effects;

export const names = Object.keys(features.effects) as EffectName[];

/** Pure: resolves the flags for a query string. Unknown names are ignored. */
export function parseFlags(defaults: Record<string, boolean>, search: string): Record<string, boolean> {
  const params = new URLSearchParams(search);
  const list = (key: string) =>
    (params.get(key) ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  const out = { ...defaults };
  const only = list('only');
  if (only.length) for (const k of Object.keys(out)) out[k] = only.includes(k);
  const off = list('off');
  for (const k of Object.keys(out)) if (off.includes(k) || off.includes('all')) out[k] = false;
  return out;
}

const resolved = parseFlags(features.effects, typeof location !== 'undefined' ? location.search : '');

export function enabled(name: EffectName): boolean {
  return resolved[name] ?? false;
}
