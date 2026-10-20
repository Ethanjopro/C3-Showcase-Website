// Art slots from src/art/manifest.json. Effects get art only through here, so
// her final files replace the placeholders with no code changes.
//
//   slot('ribcage')        the manifest entry, with `url` resolved
//   image('ribcage')       a decoded <img>, cached
//   rect('ribcage')        poster-relative geometry, 0-1
//   frame                  the poster canvas size every frame-sized slot shares

import manifest from '../art/manifest.json';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Anchor {
  x: number;
  y: number;
  length: number;
}

export type Tint = 'ink' | 'accent' | 'paper';

export interface Slot {
  source: string;
  src: string;
  width: number;
  height: number;
  tint: Tint;
  vectorize?: boolean;
  inline?: boolean;
  rect?: Rect;
  regions?: Record<string, Rect>;
  screens?: Rect[];
  anchors?: Anchor[];
}

export type SlotName = keyof typeof manifest.slots;

const slots = manifest.slots as unknown as Record<SlotName, Slot>;

export const frame: { width: number; height: number } = manifest.frame;
export const slotNames = Object.keys(slots) as SlotName[];

/** Resolves a manifest `src` against the site's base URL. */
export function url(src: string): string {
  const base = typeof import.meta.env !== 'undefined' ? import.meta.env.BASE_URL : './';
  return `${base}${src}`;
}

export function slot(name: SlotName): Slot & { url: string } {
  const s = slots[name];
  return { ...s, url: url(s.src) };
}

export function rect(name: SlotName): Rect | undefined {
  return slots[name].rect;
}

const images = new Map<SlotName, Promise<HTMLImageElement>>();

export function image(name: SlotName): Promise<HTMLImageElement> {
  let p = images.get(name);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => img.decode().then(() => resolve(img), () => resolve(img));
      img.onerror = () => {
        images.delete(name); // let the next call retry (a network blip shouldn't stick)
        reject(new Error(`art: could not load ${name} (${slots[name].src})`));
      };
      img.src = url(slots[name].src);
    });
    images.set(name, p);
  }
  return p;
}
