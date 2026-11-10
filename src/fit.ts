// Channel titles are set in a condensed display serif and sized so each line
// fills its column, like a title card. The size is worked out at build time from
// the font's advance widths (src/content/title-widths.json), so titles can be
// edited in site.json without touching CSS.

export type Widths = Record<string, number>;

/** Width of `text` in em, ignoring kerning. Unknown characters count as 0.5 em. */
export function emWidth(text: string, widths: Widths): number {
  let w = 0;
  for (const ch of text) w += widths[ch] ?? 0.5;
  return w;
}

/**
 * Font size for one title line, as a fraction of the column width: as large as
 * fits on one line, but never taller than `cap` of the column (short words like
 * "OFF" would otherwise grow huge).
 */
export function fitFraction(text: string, widths: Widths, cap = 0.36): number {
  const w = emWidth(text, widths);
  if (w <= 0) return cap;
  return Math.min(cap, 0.985 / w);
}
