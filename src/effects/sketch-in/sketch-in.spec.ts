// sketch-in: PLAN step 6 "Verify" and SPEC §9 step 2 (the line art draws in).

import { expect, test, type Page } from '@playwright/test';
import { open, trackErrors } from '../../../tests/e2e/helpers.ts';

const mount = '[data-fx="sketch-in"]';
const ATTR = 'data-fx-sketch-in';

async function posterAt(page: Page, ms: number): Promise<Buffer> {
  await open(page, `/?only=sketch-in&freeze=${ms}`);
  return page.locator('.poster').screenshot();
}

/** Her art's markup is back as the file has it: no wrapper, no dash, no clip. */
const clean = (page: Page) =>
  page.evaluate(() =>
    ['lineart', 'title'].every((slot) => {
      const svg = document.querySelector(`.layer--${slot} svg`)!;
      return (
        !svg.querySelector('clipPath, [pathLength], [id^="c3-sketch-in"]') &&
        [...svg.children].every((c) => c.tagName === 'path') &&
        // Its own animations only: c3-window and others run CSS animations of their own.
        document.getAnimations().every((a) => !(a.effect as KeyframeEffect | null)?.target?.closest?.('.layer__art'))
      );
    }),
  );

test('draws progressively at 0, 600, 1200 and 2400 ms; two times inside one 83 ms step match', async ({ page }) => {
  const errors = trackErrors(page);
  const shots = [];
  for (const ms of [0, 600, 1200, 2400]) shots.push(await posterAt(page, ms));
  for (let i = 1; i < shots.length; i++) expect(shots[i]!.equals(shots[i - 1]!), `frame ${i} differs from the one before`).toBe(false);
  // 600 and 660 ms sit in the same step (7: 583-667 ms).
  const a = await posterAt(page, 600);
  const b = await posterAt(page, 660);
  expect(a.equals(b), 'one step, one drawing').toBe(true);
  expect(errors).toEqual([]);
});

test('the line-boil handshake: "drawing" while it plays, "done" after, and her markup restored', async ({ page }) => {
  await open(page, '/?only=sketch-in&freeze=600');
  await expect(page.locator('html')).toHaveAttribute(ATTR, 'drawing');
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'drawing');
  await open(page, '/?only=sketch-in&freeze=2400');
  await expect(page.locator('html')).toHaveAttribute(ATTR, 'done');
  expect(await clean(page)).toBe(true);
});

test('plays through to the end by itself within 2.4 s', async ({ page }) => {
  await open(page, '/?only=sketch-in');
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'done', { timeout: 3000 });
  await expect(page.locator('html')).toHaveAttribute(ATTR, 'done');
  expect(await clean(page)).toBe(true);
});

test('a scroll during the intro completes it', async ({ page }) => {
  await open(page, '/?only=sketch-in');
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'drawing');
  await page.evaluate(() => window.scrollBy({ top: 200, behavior: 'instant' }));
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'done');
  expect(await clean(page)).toBe(true);
});

test('a tap or a key completes it', async ({ page }, testInfo) => {
  await open(page, '/?only=sketch-in');
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'drawing');
  if (testInfo.project.name === 'phone') await page.touchscreen.tap(200, 400);
  else await page.keyboard.press('Shift');
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'done');
});

test('a second visit in the same session skips the intro', async ({ page }) => {
  await open(page, '/?only=sketch-in');
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'done', { timeout: 3000 });
  await open(page, '/?only=sketch-in');
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'skipped');
  expect(await page.evaluate(() => document.documentElement.classList.contains('fx-pending-sketch-in'))).toBe(false);
  await expect(page.locator('.layer--lineart .layer__art')).toBeVisible();
});

test('reduced motion and no JavaScript: the finished poster at time 0', async ({ browser }, testInfo) => {
  const finished = await (async () => {
    const page = await browser.newPage({ ...testInfo.project.use });
    const shot = await posterAt(page, 2400);
    await page.close();
    return shot;
  })();
  for (const opts of [{ reducedMotion: 'reduce' as const }, { javaScriptEnabled: false }]) {
    const context = await browser.newContext({ ...testInfo.project.use, ...opts });
    const page = await context.newPage();
    if (opts.javaScriptEnabled === false) await page.goto('/?only=sketch-in&freeze=0');
    else await open(page, '/?only=sketch-in&freeze=0');
    await expect(page.locator('.layer--lineart .layer__art')).toBeVisible();
    await expect(page.locator('html')).not.toHaveAttribute(ATTR, 'drawing');
    expect((await page.locator('.poster').screenshot()).equals(finished), JSON.stringify(opts)).toBe(true);
    await context.close();
  }
});

test('lite: stepped wipes instead of per-path drawing', async ({ page }) => {
  await open(page, '/?only=sketch-in&quality=lite&freeze=600');
  await expect(page.locator('html')).toHaveAttribute(ATTR, 'drawing');
  const clip = await page.locator('.layer--lineart .layer__art').evaluate((el) => getComputedStyle(el).clipPath);
  expect(clip).toMatch(/^inset/);
  expect(await page.locator('.layer--lineart [pathLength]').count()).toBe(0);
});

test('a hidden tab pauses the drawing; coming back resumes it without un-drawing finished lines', async ({ page }) => {
  await open(page, '/?only=sketch-in');
  await page.waitForTimeout(900); // most of the line art is drawn
  const drawn = () => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'finished').length);
  const before = await drawn();
  expect(before).toBeGreaterThan(0);
  const setHidden = (hidden: boolean) =>
    page.evaluate((h) => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
      document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
  await setHidden(true);
  expect(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length)).toBe(0);
  await setHidden(false);
  expect(await drawn(), 'finished paths stay drawn').toBeGreaterThanOrEqual(before);
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'done', { timeout: 3000 });
});

// OWNER #7 (c): with c3-window on, the intro waits under her solid-ink C3 and
// draws inside the letters as the scroll drains the ink.

/** Scroll instantly to `px` from the top. */
const scrollTo = (page: Page, px: number) => page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), px);
/** c3-window's pin is ready (its ScrollTrigger exists). */
const pinReady = (page: Page) => expect(page.locator('[data-fx="c3-window"]')).toHaveAttribute('data-ready', '', { timeout: 5000 });

test('with c3-window: waits under the ink, ignores taps and keys there, and starts drawing when the ink drains', async ({ page }, testInfo) => {
  const errors = trackErrors(page);
  await open(page, '/');
  await pinReady(page);
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'waiting');
  await expect(page.locator('html')).toHaveAttribute(ATTR, 'waiting'); // nothing shows under the ink: line-boil needn't hold yet
  await expect(page.locator('.layer--lineart .layer__art')).toBeVisible(); // the prehide is lifted; the animations hold the start
  if (testInfo.project.name === 'phone') await page.touchscreen.tap(200, 400);
  else await page.keyboard.press('Shift');
  await page.waitForTimeout(300);
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'waiting');
  // A little scroll starts the drain: the drawing starts, and that scroll doesn't skip it.
  await scrollTo(page, 40);
  await expect(page.locator('[data-fx="c3-window"]')).toHaveAttribute('data-state', 'opening');
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'drawing');
  await expect(page.locator('html')).toHaveAttribute(ATTR, 'drawing');
  // Her inked edge holds still while her line is drawn (at most two things step on one screen).
  expect(await page.locator('.c3-window__boil').first().evaluate((el) => getComputedStyle(el).animationPlayState)).toBe('paused');
  await scrollTo(page, 80);
  await page.waitForTimeout(200);
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'drawing');
  // Left inside the pin, it plays to the end by itself.
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'done', { timeout: 3000 });
  expect(await clean(page)).toBe(true);
  expect(errors).toEqual([]);
});

test('with c3-window: a tap or a key while it draws in the pin finishes it', async ({ page }, testInfo) => {
  await open(page, '/');
  await pinReady(page);
  await scrollTo(page, 40);
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'drawing');
  if (testInfo.project.name === 'phone') await page.touchscreen.tap(200, 400);
  else await page.keyboard.press('Shift');
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'done');
});

test('with c3-window: scrolling on past the open window finishes it', async ({ page }) => {
  await open(page, '/');
  await pinReady(page);
  const pin = await page.evaluate(() => Math.round(window.innerHeight * 0.85));
  await scrollTo(page, 40);
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'drawing');
  await scrollTo(page, pin + 20);
  await expect(page.locator('[data-fx="c3-window"]')).toHaveAttribute('data-state', 'open');
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'drawing');
  await scrollTo(page, pin + 220);
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'done');
  expect(await clean(page)).toBe(true);
});
