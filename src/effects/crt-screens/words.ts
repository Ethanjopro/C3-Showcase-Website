// Spreads the teaser line over the project screens, in reading order: one
// word per screen when it fits, otherwise the most even run of words per
// screen (by characters), so no screen holds a word that's far too long.

/**
 * Splits `line` into at most `screens` chunks of whole words, in order.
 * Fewer words than screens leaves the extra screens empty (static only).
 */
export function chunk(line: string, screens: number): string[] {
  const words = line.trim().split(/\s+/).filter(Boolean);
  if (screens <= 0 || !words.length) return [];
  if (words.length <= screens) return words;
  // Linear partition: best[i][k] = the smallest possible longest chunk when the
  // first i words fill k screens. Teaser lines are short, so O(n^2 k) is fine.
  const n = words.length;
  const len = (a: number, b: number) => words.slice(a, b).join(' ').length;
  const best: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(screens + 1).fill(Infinity));
  const cut: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(screens + 1).fill(0));
  best[0]![0] = 0;
  for (let i = 1; i <= n; i++) {
    for (let k = 1; k <= screens; k++) {
      for (let j = k - 1; j < i; j++) {
        const cost = Math.max(best[j]![k - 1]!, len(j, i));
        if (cost < best[i]![k]!) {
          best[i]![k] = cost;
          cut[i]![k] = j;
        }
      }
    }
  }
  const out: string[] = [];
  for (let i = n, k = screens; k > 0; k--) {
    const j = cut[i]![k]!;
    out.unshift(words.slice(j, i).join(' '));
    i = j;
  }
  return out;
}
