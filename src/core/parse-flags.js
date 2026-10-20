// Resolves effect flags for a query string. Plain JavaScript with no imports:
// src/core/flags.ts uses it, and scripts/vite/c3-html.ts inlines this exact
// source into the boot script in index.html, so the two can never disagree.
//   ?only=a,b   only these effects (can turn on an effect that is off by default)
//   ?off=a,b    these off; wins over ?only
//   ?off=all    every effect off
// Unknown names and stray spaces or commas are ignored.
// Keep every statement ;-terminated: the inlined copy is joined onto one line.

/**
 * @param {Record<string, boolean>} defaults
 * @param {string} search
 * @returns {Record<string, boolean>}
 */
export function parseFlags(defaults, search) {
  var params = new URLSearchParams(search);
  /** @param {string} key */
  var list = function (key) {
    return (params.get(key) || '')
      .split(',')
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
  };
  /** @type {Record<string, boolean>} */
  var out = {};
  var only = list('only');
  var off = list('off');
  Object.keys(defaults).forEach(function (k) {
    var on = only.length ? only.indexOf(k) > -1 : defaults[k];
    if (off.indexOf(k) > -1 || off.indexOf('all') > -1) on = false;
    out[k] = Boolean(on);
  });
  return out;
}
