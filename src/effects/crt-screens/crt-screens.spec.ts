// crt-screens: PLAN step 12 "Verify" and SPEC §9 step 9 (the teaser screens
// show static and the "revealed at the show" line).

import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { open, trackErrors } from '../../../tests/e2e/helpers.ts';

const projects = JSON.parse(readFileSync(new URL('../../content/projects.json', import.meta.url), 'utf8')) as {
  screens: number;
  teaser: string;
};

const mount = '[data-fx="crt-screens"]';
const glass = '.screen__glass[data-crt]';
const poster = '.layer[data-slot] [data-crt]';

async function toProjects(page: Page, url: string) {
  await open(page, url);
  await page.locator('#projects').scrollIntoViewIfNeeded();
  await expect(page.locator(`${glass} .crt`)).toHaveCount(projects.screens);
}

const shot = (page: Page, selector: string) => page.locator(selector).first().screenshot();

/**
 * Per-pixel WCAG relative luminance of PNG screenshots, decoded in the page.
 * Returns one array per image.
 */
function luminances(page: Page, pngs: Buffer[]): Promise<number[][]> {
  return page.evaluate(async (list) => {
    const lin = (c: number) => {
      const s = c / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const out: number[][] = [];
    for (const b64 of list) {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      const l: number[] = [];
      for (let i = 0; i < d.length; i += 4) l.push(0.2126 * lin(d[i]!) + 0.7152 * lin(d[i + 1]!) + 0.0722 * lin(d[i + 2]!));
      out.push(l);
    }
    return out;
  }, pngs.map((p) => p.toString('base64')));
}

test('every screen gets static, and the project screens spell the teaser line', async ({ page }) => {
  const errors = trackErrors(page);
  await toProjects(page, '/?only=crt-screens&freeze=0');
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'moving');
  const targets = await page.locator('[data-crt]').count();
  await expect(page.locator('[data-crt] > .crt')).toHaveCount(targets);
  await expect(page.locator('[data-crt] .crt__static')).toHaveCount(targets);
  const words = await page.locator(`${glass} .crt__word`).allTextContents();
  expect(words.join(' ')).toBe(projects.teaser);
  // The screens are decoration; the readable line stays in the page.
  await expect(page.locator('.screens')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.teaser')).toHaveText(projects.teaser);
  expect(errors).toEqual([]);
});

test('steps at 10 fps: one step holds, the next differs', async ({ page }) => {
  await toProjects(page, '/?only=crt-screens&freeze=0');
  const t0 = await shot(page, glass);
  await toProjects(page, '/?only=crt-screens&freeze=50');
  const t50 = await shot(page, glass);
  await toProjects(page, '/?only=crt-screens&freeze=100');
  const t100 = await shot(page, glass);
  expect(t0.equals(t50), 't0 and t50 are one step').toBe(true);
  expect(t0.equals(t100), 't0 and t100 are different frames').toBe(false);
});

// SPEC §6: nothing flashes. Over a full loop of the static (and the first
// screen's word slip, which falls on step 1), frame to frame: mean luminance
// moves by under 10 %, and under 10 % of the screen's area changes by 0.1 or
// more (WCAG 2.3.1's flash threshold).
test('flash safety: consecutive frames stay under the flash threshold', async ({ page }) => {
  for (const colorway of ['teal-coral', 'mauve-periwinkle']) {
    await page.addInitScript((c) => localStorage.setItem('c3:colorway', c), colorway);
    const frames: Buffer[] = [];
    for (let t = 0; t <= 1200; t += 100) {
      await toProjects(page, `/?only=crt-screens&freeze=${t}`);
      frames.push(await shot(page, glass));
    }
    const lum = await luminances(page, frames);
    for (let k = 1; k < lum.length; k++) {
      const a = lum[k - 1]!;
      const b = lum[k]!;
      const mean = (l: number[]) => l.reduce((s, v) => s + v, 0) / l.length;
      const dMean = Math.abs(mean(b) - mean(a)) / mean(a);
      let flashing = 0;
      for (let i = 0; i < a.length; i++) if (Math.abs(b[i]! - a[i]!) >= 0.1) flashing++;
      const area = flashing / a.length;
      expect(dMean, `${colorway} step ${k}: mean luminance moved ${(dMean * 100).toFixed(2)} %`).toBeLessThan(0.1);
      expect(area, `${colorway} step ${k}: ${(area * 100).toFixed(2)} % of the screen changed by >= 0.1`).toBeLessThan(0.1);
    }
  }
});

test('reduced motion: one still frame', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ ...testInfo.project.use, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await toProjects(page, '/?only=crt-screens');
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'still');
  await expect(page.locator(`${glass} .crt__word`)).toHaveCount(projects.screens);
  const running = () =>
    page.evaluate(() => document.getAnimations().filter((a) => (a.effect as KeyframeEffect).target?.closest('.crt')).length);
  expect(await running()).toBe(0);
  const a = await shot(page, '.screens');
  await page.waitForTimeout(500);
  expect(a.equals(await shot(page, '.screens'))).toBe(true);
  await context.close();
});

test('offscreen screens pause; onscreen ones run', async ({ page }) => {
  await open(page, '/?only=crt-screens');
  // The poster's screens are onscreen at load, so the effect has started.
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'moving');
  await expect(page.locator(`${glass} > .crt`).first()).toHaveAttribute('data-paused', '');
  await page.locator('#projects').scrollIntoViewIfNeeded();
  await expect(page.locator(`${glass} > .crt`).first()).not.toHaveAttribute('data-paused', '');
  const playing = await page.evaluate(
    (sel) =>
      document
        .getAnimations()
        .filter((a) => (a.effect as KeyframeEffect).target?.closest(sel))
        .map((a) => a.playState),
    glass,
  );
  expect(playing.length).toBeGreaterThan(0);
  expect(new Set(playing)).toEqual(new Set(['running']));
});

test('a poster screen is masked to its own slot art and gets the two-ink split', async ({ page }) => {
  await open(page, '/?only=crt-screens&freeze=0');
  const screens = page.locator(`${poster} > .crt`);
  test.skip((await page.locator(poster).count()) === 0, 'no poster screen in this composition');
  await expect(screens.first()).toHaveClass(/crt--poster/);
  const slot = await page.locator(poster).first().evaluate((el) => (el.closest('[data-slot]') as HTMLElement).dataset.slot);
  const mask = await screens.first().evaluate((el) => getComputedStyle(el).maskImage || getComputedStyle(el).webkitMaskImage);
  expect(mask).toContain(`art/${slot}.`);
  await expect(screens.first().locator('.crt__split')).toHaveCount(2);
  await expect(screens.first().locator('.crt__word')).toHaveCount(0);
});

test('works with no eye screen: the project screens still run', async ({ page }) => {
  const errors = trackErrors(page);
  // Her newest drafts may drop the eye screen (OWNER.md #9).
  await page.addInitScript(() =>
    document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('.layer [data-crt]').forEach((el) => el.remove())),
  );
  await toProjects(page, '/?only=crt-screens&freeze=0');
  await expect(page.locator('.crt--poster')).toHaveCount(0);
  await expect(page.locator(`${glass} .crt__word`)).toHaveCount(projects.screens);
  expect(errors).toEqual([]);
});

test('switching to reduced motion mid-visit restarts it cleanly', async ({ page }) => {
  await toProjects(page, '/?only=crt-screens');
  const targets = await page.locator('[data-crt]').count();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'still');
  await expect(page.locator('[data-crt] > .crt')).toHaveCount(targets);
  await expect(page.locator(`${mount} style`)).toHaveCount(1);
});

test('lite: the project screens still step, the poster screens hold one frame', async ({ page }) => {
  await toProjects(page, '/?only=crt-screens&quality=lite');
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'moving');
  await expect(page.locator(`${glass} .crt__static--moving`)).toHaveCount(projects.screens);
  await expect(page.locator(`${poster} .crt__static--moving`)).toHaveCount(0);
  await expect(page.locator(`${glass} .crt__word--slip`)).toHaveCount(0);
});
