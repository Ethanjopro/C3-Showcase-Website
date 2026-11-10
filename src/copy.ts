// "Print your own copy" on the RSVP channel: a visitor's name seeds a few red
// marks over a small copy of the poster, and they can save it as an image.

export interface Mark {
  x: number;
  y: number;
  w: number;
}

/** A stable 31-bit seed from a name (same name, same copy). */
export function seedOf(name: string): number {
  let seed = 0;
  for (let i = 0; i < name.length; i++) seed = (seed * 31 + name.charCodeAt(i)) % 2147483647;
  return seed || 7;
}

/** Red marks in a 150 x 243 box, from the seed (Park-Miller). */
export function marksOf(seed: number, count = 14): Mark[] {
  let r = seed;
  const rnd = () => {
    r = (r * 48271) % 2147483647;
    return r / 2147483647;
  };
  const out: Mark[] = [];
  for (let k = 0; k < count; k++) out.push({ x: Math.round(10 + rnd() * 120), y: Math.round(60 + rnd() * 140), w: Math.round(4 + rnd() * 22) });
  return out;
}

export const copyNumber = (seed: number) => String(seed).padStart(6, '0').slice(-6);

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Draws the copy at 1080 px wide and downloads it as a PNG. */
export async function saveCopy(opts: { name: string; date: string; her: string; title: string }): Promise<void> {
  const W = 1080;
  const H = Math.round((W * 181) / 112);
  const k = W / 150;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  if (!g) return;
  const [her, title] = await Promise.all([load(opts.her), load(opts.title)]);
  g.fillStyle = '#dcdbde';
  g.fillRect(0, 0, W, H);
  g.drawImage(her, 0, 0, W, (W * her.naturalHeight) / her.naturalWidth);

  // Her lettering, tinted: draw it on its own canvas, then fill through it.
  const tw = Math.round(W * 0.76);
  const th = Math.round(H * 0.13);
  const t = document.createElement('canvas');
  t.width = tw;
  t.height = th;
  const tg = t.getContext('2d');
  if (tg) {
    const s = Math.min(tw / title.naturalWidth, th / title.naturalHeight);
    const dw = title.naturalWidth * s;
    const dh = title.naturalHeight * s;
    tg.drawImage(title, (tw - dw) / 2, (th - dh) / 2, dw, dh);
    tg.globalCompositeOperation = 'source-in';
    tg.fillStyle = '#24171f';
    tg.fillRect(0, 0, tw, th);
    g.drawImage(t, W * 0.12, H * 0.08);
  }

  const seed = seedOf(opts.name);
  g.fillStyle = '#c8102e';
  for (const m of marksOf(seed)) g.fillRect(m.x * k, (m.y * H) / 243, m.w * k, 2.5 * k);

  const footH = Math.round(H * 0.075);
  g.fillStyle = '#f1eff2';
  g.fillRect(0, H - footH, W, footH);
  g.fillStyle = '#17151a';
  g.fillRect(0, H - footH, W, 3);
  await document.fonts.load('600 40px "IBM Plex Mono"').catch(() => undefined);
  g.font = `600 ${Math.round(footH * 0.36)}px "IBM Plex Mono", monospace`;
  g.textBaseline = 'alphabetic';
  g.fillText((opts.name || 'YOUR NAME').toUpperCase(), 40, H - footH * 0.48);
  g.font = `500 ${Math.round(footH * 0.2)}px "IBM Plex Mono", monospace`;
  g.fillText(`COPY ${copyNumber(seed)} · ${opts.date} · C3 SHOWCASE`, 40, H - footH * 0.16);

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const slug = (opts.name || 'copy').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'copy';
  a.download = `c3-showcase-${slug}.png`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
