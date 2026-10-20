// line-boil: SPEC §9 step 2 [auto] and PLAN step 2 "Verify".

import { expect, test, type Page } from '@playwright/test';
import { open, trackErrors } from '../../../tests/e2e/helpers.ts';

const ATTR = 'data-fx-line-boil';

async function posterAt(page: Page, query: string): Promise<Buffer> {
  await open(page, `/?only=line-boil&${query}`);
  return page.locator('.poster').screenshot();
}

/** Whether a layer shows boil frames: its pseudo-elements carry a mask. */
const boils = (page: Page, slot: string) =>
  page.locator(`.layer--${slot}`).evaluate((el) => getComputedStyle(el, '::before').content !== 'none');

test('steps at 10 fps: shots within one step match, shots 100 ms apart differ', async ({ page }) => {
  const errors = trackErrors(page);
  const t0 = await posterAt(page, 'freeze=0');
  await expect(page.locator('html')).toHaveAttribute(ATTR, 'on');
  const t50 = await posterAt(page, 'freeze=50');
  const t100 = await posterAt(page, 'freeze=100');
  const t200 = await posterAt(page, 'freeze=200');
  const t300 = await posterAt(page, 'freeze=300');
  expect(t0.equals(t50), 't0 and t50 are one step').toBe(true);
  expect(t0.equals(t100), 't0 and t100 are different drawings').toBe(false);
  expect(t100.equals(t200), 't100 and t200 are different drawings').toBe(false);
  expect(t0.equals(t300), 'three drawings, then the cycle repeats').toBe(true);
  expect(errors).toEqual([]);
});

test('full quality boils lineart, title, halo and wings, and nothing else', async ({ page }) => {
  await open(page, '/?only=line-boil&freeze=0');
  for (const slot of ['lineart', 'title', 'halo', 'wings']) expect(await boils(page, slot), slot).toBe(true);
  for (const slot of ['fill', 'ribcage', 'cables', 'paper']) expect(await boils(page, slot), slot).toBe(false);
});

test('lite boils the line art only', async ({ page }) => {
  await open(page, '/?only=line-boil&quality=lite&freeze=0');
  expect(await boils(page, 'lineart')).toBe(true);
  for (const slot of ['title', 'halo', 'wings']) expect(await boils(page, slot), slot).toBe(false);
});

test('reduced motion: clean, still lines', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ ...testInfo.project.use, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await open(page, '/?only=line-boil');
  await expect(page.locator('html')).not.toHaveAttribute(ATTR, /.*/);
  expect(await boils(page, 'lineart')).toBe(false);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await context.close();
});

test('the frames take the colorway: their tint is the slot token', async ({ page }) => {
  await open(page, '/?only=line-boil&freeze=0');
  const tint = () =>
    page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'var(--ink)';
      document.body.append(probe);
      const ink = getComputedStyle(probe).color;
      probe.remove();
      return [getComputedStyle(document.querySelector('.layer--lineart')!, '::before').backgroundColor, ink];
    });
  let [frame, ink] = await tint();
  expect(frame).toBe(ink);
  await page.locator('label[for="cw-poster-black-red"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-colorway', 'black-red');
  [frame, ink] = await tint();
  expect(frame).toBe(ink);
});

test('pauses while the poster is offscreen', async ({ page }) => {
  await open(page, '/?only=line-boil');
  await expect(page.locator('html')).toHaveAttribute(ATTR, 'on');
  await page.evaluate(() => document.querySelector('#credits')!.scrollIntoView({ behavior: 'instant' }));
  await expect(page.locator('html')).toHaveAttribute(ATTR, 'on paused');
  const states = await page.evaluate(() =>
    document.getAnimations().map((a) => (a.effect as KeyframeEffect).target && getComputedStyle((a.effect as KeyframeEffect).target!, (a.effect as KeyframeEffect).pseudoElement).animationPlayState),
  );
  expect(states.length).toBeGreaterThan(0);
  expect(new Set(states)).toEqual(new Set(['paused']));
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(page.locator('html')).toHaveAttribute(ATTR, 'on');
});
