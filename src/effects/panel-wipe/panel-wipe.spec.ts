// panel-wipe: PLAN step 10 "Verify".

import { expect, test, type Page } from '@playwright/test';
import { open, trackErrors } from '../../../tests/e2e/helpers.ts';

const mounts = '[data-fx="panel-wipe"]';
const states = (page: Page) => page.locator(mounts).evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.state));

async function scrollTo(page: Page, sel: string) {
  await page.evaluate((s) => document.querySelector(s)!.scrollIntoView({ behavior: 'instant', block: 'center' }), sel);
}

test('headers below the fold start covered, wipe once on entering, then the block is gone', async ({ page }) => {
  const errors = trackErrors(page);
  await open(page, '/?only=panel-wipe');
  expect(await states(page)).toEqual(['covered', 'covered', 'covered']);
  // Accent and ink by turns.
  const kinds = await page.locator('.panel-wipe__block').evaluateAll((els) => els.map((el) => el.className.split('--')[1]));
  expect(kinds).toEqual(['accent', 'ink', 'accent']);

  await scrollTo(page, '#info-title');
  await expect.poll(async () => (await states(page))[0]).toMatch(/wiping|done/);
  await expect.poll(async () => (await states(page))[0], { timeout: 2000 }).toBe('done');
  await expect(page.locator('#info .panel-wipe')).toHaveCount(0);

  // Once: scrolling away and back doesn't cover it again.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await scrollTo(page, '#info-title');
  await page.waitForTimeout(200);
  expect((await states(page))[0]).toBe('done');
  await expect(page.locator('#info .panel-wipe')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the heading stays in the accessibility tree while covered, and the block moves by transform', async ({ page }) => {
  await open(page, '/?only=panel-wipe&freeze=220');
  await expect(page.getByRole('heading', { level: 2, name: /Info/ })).toBeAttached();
  await scrollTo(page, '#info-title');
  await expect.poll(async () => (await states(page))[0]).toBe('wiping');
  await expect(page.getByRole('heading', { level: 2, name: /Info/ })).toBeVisible();
  const { position, transform } = await page.locator('#info .panel-wipe__block').evaluate((el) => {
    const cs = getComputedStyle(el);
    return { position: cs.position, transform: cs.transform };
  });
  expect(position).toBe('absolute');
  expect(transform).toMatch(/^matrix\(1, 0, 0, 1, [1-9]/);
  expect(await page.locator('[data-fx="panel-wipe"]').first().getAttribute('aria-hidden')).toBe('true');
});

test('no layout shift while scrolling through every section, and no sideways scroll', async ({ page }) => {
  await open(page, '/?only=panel-wipe');
  await page.evaluate(() => {
    (window as unknown as { cls: number }).cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!e.hadRecentInput) (window as unknown as { cls: number }).cls += e.value;
    }).observe({ type: 'layout-shift' });
  });
  for (const sel of ['#info-title', '#projects-title', '#credits-title']) {
    await scrollTo(page, sel);
    await page.waitForTimeout(250);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(wide, `sideways scroll at ${sel}`).toBe(false);
  }
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => (window as unknown as { cls: number }).cls)).toBeLessThanOrEqual(0.01);
  expect(await states(page)).toEqual(['done', 'done', 'done']);
});

test('focus landing on a heading (the menu) finishes its wipe at once', async ({ page }) => {
  await open(page, '/?only=panel-wipe&freeze=0');
  await page.locator('[data-menu-open=""]').click();
  await page.locator('dialog#menu').getByRole('link', { name: /Projects/ }).click();
  await expect(page.locator('#projects-title')).toBeFocused();
  await expect(page.locator('#projects .panel-wipe')).toHaveCount(0);
});

test('a header already on screen at load gets no block', async ({ page }) => {
  await page.goto('/?only=panel-wipe#credits');
  await expect(page.locator('html')).toHaveAttribute('data-booted', '');
  const credits = page.locator('[data-fx="panel-wipe"][data-part="credits"]');
  await expect(credits).toHaveAttribute('data-state', 'done');
  await expect(page.locator('#credits .panel-wipe')).toHaveCount(0);
});

test('reduced motion: off, the headings are simply there', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ ...testInfo.project.use, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await open(page, '/?only=panel-wipe');
  await expect(page.locator('.panel-wipe')).toHaveCount(0);
  await context.close();
});

test('a restart (quality change) never covers a header again', async ({ page }) => {
  await open(page, '/?only=panel-wipe');
  await scrollTo(page, '#info-title');
  await expect.poll(async () => (await states(page))[0], { timeout: 2000 }).toBe('done');
  // What main.ts does on a quality change: destroy(), then init().
  await page.evaluate(async () => {
    const src = [...document.querySelectorAll('link[rel=modulepreload], script')].map((e) => (e as HTMLLinkElement).href || (e as HTMLScriptElement).src);
    const url = performance.getEntriesByType('resource').map((e) => e.name).find((n) => /panel-wipe-[^/]+\.js$/.test(n)) ?? src.find((n) => /panel-wipe/.test(n));
    const mod = await import(url!);
    mod.destroy();
    mod.init(document.querySelector('[data-fx="panel-wipe"]:not([data-part])'), { quality: 'lite' });
  });
  // Info was wiped; the poster section above is behind; only headers still ahead get covered.
  expect((await states(page))[0]).toBe('done');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await scrollTo(page, '#info-title');
  await page.waitForTimeout(200);
  await expect(page.locator('#info .panel-wipe')).toHaveCount(0);
});
