// paper-grain: PLAN step 3 "Verify" and SPEC §9 step 2 (the grain moves).

import { expect, test, type Page } from '@playwright/test';
import { open, trackErrors } from '../../../tests/e2e/helpers.ts';

const mount = '[data-fx="paper-grain"]';

/** WCAG relative luminance and contrast, for sRGB 0-255 triples. */
function luminance([r, g, b]: number[]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r!) + 0.7152 * lin(g!) + 0.0722 * lin(b!);
}
const contrast = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

/**
 * The darkest background a line of info text sits on: screenshot the text
 * block with its glyphs and marks hidden (grain and paper still drawn), decode it in the
 * page, and take the 1st-percentile luminance pixel. Returns [r, g, b].
 */
async function darkestBehind(page: Page, selector: string): Promise<number[]> {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  // Glyphs and her hatch marks go; what's left is paper, texture and grain.
  const hide = await page.addStyleTag({ content: `${selector},${selector} *{color:transparent!important}${selector} svg{visibility:hidden!important}` });
  const png = await el.screenshot();
  await hide.evaluate((s) => (s as Element).remove());
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const px: number[][] = [];
    for (let i = 0; i < d.length; i += 4) px.push([d[i]!, d[i + 1]!, d[i + 2]!]);
    px.sort((a, b) => a[0]! + a[1]! + a[2]! - (b[0]! + b[1]! + b[2]!));
    return px[Math.floor(px.length * 0.01)]!;
  }, png.toString('base64'));
}

const textColor = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => getComputedStyle(el).color.match(/\d+/g)!.slice(0, 3).map(Number));

test('the grain shows, over the content and under the chrome, and never takes a tap', async ({ page }) => {
  const errors = trackErrors(page);
  await open(page, '/?only=paper-grain&freeze=0');
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'moving');
  await expect(page.locator(`${mount} .paper-grain__field`)).toHaveCount(1);
  expect(await page.evaluate(() => document.getAnimations().map((a) => (a as CSSAnimation).animationName))).toEqual(['c3-grain-shift']);
  const withGrain = await page.screenshot();
  await open(page, '/?off=all');
  expect(withGrain.equals(await page.screenshot())).toBe(false);
  const z = await page.evaluate(() => {
    const zi = (sel: string) => Number(getComputedStyle(document.querySelector(sel)!).zIndex);
    return { grain: zi('[data-fx="paper-grain"]'), main: zi('main'), chrome: zi('.chrome') };
  });
  expect(z.grain).toBeGreaterThan(z.main);
  expect(z.grain).toBeLessThan(z.chrome);
  expect(await page.locator(mount).evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
  expect(errors).toEqual([]);
});

test('steps at 8 fps: one step holds, the next differs', async ({ page }) => {
  await open(page, '/?only=paper-grain&freeze=0');
  const t0 = await page.screenshot();
  await open(page, '/?only=paper-grain&freeze=60');
  const t60 = await page.screenshot();
  await open(page, '/?only=paper-grain&freeze=125');
  const t125 = await page.screenshot();
  expect(t0.equals(t60), 't0 and t60 are one step').toBe(true);
  expect(t0.equals(t125), 't0 and t125 are different tiles').toBe(false);
});

test('info text keeps 4.5:1 over the grain', async ({ page }) => {
  for (const colorway of ['teal-coral', 'mauve-periwinkle']) {
    await page.addInitScript((c) => localStorage.setItem('c3:colorway', c), colorway);
    await open(page, '/?only=paper-grain&freeze=0');
    for (const selector of ['#info .info-about', '#info .fact__label', '#info .fact__value']) {
      const ratio = contrast(await textColor(page, selector), await darkestBehind(page, selector));
      expect(ratio, `${colorway} ${selector}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test('reduced motion: one still tile', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ ...testInfo.project.use, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await open(page, '/?only=paper-grain');
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'still');
  await expect(page.locator(`${mount} .paper-grain__field`)).toHaveCount(1);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  const a = await page.screenshot();
  await page.waitForTimeout(500);
  expect(a.equals(await page.screenshot())).toBe(true);
  await context.close();
});
