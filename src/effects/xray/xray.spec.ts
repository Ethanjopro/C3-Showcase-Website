// xray: PLAN step 4 "Verify" and SPEC §9 step 4 [auto].

import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { open, trackErrors } from '../../../tests/e2e/helpers.ts';

const manifest = JSON.parse(readFileSync(new URL('../../art/manifest.json', import.meta.url), 'utf8'));
const RECT = manifest.slots.ribcage.rect as { x: number; y: number; w: number; h: number };
const copy = JSON.parse(readFileSync(new URL('../../content/xray.json', import.meta.url), 'utf8'));

/** Viewport point at poster-relative (x, y). */
async function at(page: Page, x: number, y: number): Promise<[number, number]> {
  const box = (await page.locator('.poster').boundingBox())!;
  return [box.x + box.width * x, box.y + box.height * y];
}

/** A real touch drag (CDP), so the browser decides between painting and scrolling. */
async function touchDrag(page: Page, from: [number, number], to: [number, number], steps = 12) {
  const cdp = await page.context().newCDPSession(page);
  const pt = (x: number, y: number) => [{ x, y, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(...from) });
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t) });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

/** Share of the ribcage rect the canvas shows (alpha > 0), and the darkest pixel there. */
function shown(page: Page) {
  return page.evaluate((r) => {
    const c = document.querySelector<HTMLCanvasElement>('[data-fx="xray"] canvas.xray')!;
    const x = Math.round(r.x * c.width);
    const y = Math.round(r.y * c.height);
    const w = Math.round(r.w * c.width);
    const h = Math.round(r.h * c.height);
    const d = c.getContext('2d')!.getImageData(x, y, w, h).data;
    let on = 0;
    let dark = [255, 255, 255];
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      on++;
      if (d[i + 3] === 255 && d[i]! + d[i + 1]! + d[i + 2]! < dark[0]! + dark[1]! + dark[2]!) dark = [d[i]!, d[i + 1]!, d[i + 2]!];
    }
    return { share: on / (w * h), dark };
  }, RECT);
}

const ink = (page: Page) =>
  page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.color = 'var(--ink)';
    document.body.append(probe);
    const c = getComputedStyle(probe).color.match(/\d+/g)!.slice(0, 3).map(Number);
    probe.remove();
    return c;
  });

/** Canvas readback rounds premultiplied alpha, so a channel may be off by one or two. */
const near = (a: number[], b: number[]) => a.every((v, i) => Math.abs(v - b[i]!) <= 2);

const ribcageVisible = (page: Page) => page.locator('.layer--ribcage').evaluate((el) => getComputedStyle(el).visibility === 'visible');

test('the toggle reveals the whole rect and hides it again', async ({ page }, testInfo) => {
  const errors = trackErrors(page);
  await open(page, '/?only=xray');
  const toggle = page.getByRole('button', { name: copy.toggle });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect((await shown(page)).share).toBe(0);
  expect(await ribcageVisible(page), 'at rest the poster keeps her panel').toBe(true);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await shown(page)).share).toBeGreaterThan(0.95);
  await expect(toggle).toHaveAccessibleDescription(copy.hint[testInfo.project.name === 'phone' ? 'touch' : 'pointer']);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(async () => (await shown(page)).share).toBe(0);
  expect(errors).toEqual([]);
});

test('the toggle is a real button: 44 px, keyboard, hint for this device', async ({ page }, testInfo) => {
  await open(page, '/?only=xray');
  const toggle = page.getByRole('button', { name: copy.toggle });
  const box = (await toggle.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.width).toBeGreaterThanOrEqual(44);
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  const hint = testInfo.project.name === 'phone' ? copy.hint.touch : copy.hint.pointer;
  await expect(page.locator('.xray-hint')).toHaveText(hint);
});

test('phone: sideways strokes across the chest paint the X-ray, and it heals', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'touch');
  const errors = trackErrors(page);
  await open(page, '/?only=xray');
  const y0 = RECT.y + RECT.h * 0.3;
  for (let i = 0; i < 4; i++) {
    const y = y0 + i * 0.03;
    await touchDrag(page, await at(page, i % 2 ? 0.75 : 0.3, y), await at(page, i % 2 ? 0.3 : 0.75, y + 0.01));
  }
  expect(await page.evaluate(() => window.scrollY), 'sideways strokes never scroll').toBe(0);
  const painted = await shown(page);
  expect(painted.share).toBeGreaterThan(0.1);
  await page.waitForTimeout(4400);
  expect((await shown(page)).share, 'healed after 4 s').toBe(0);
  expect(errors).toEqual([]);
});

test('phone: a vertical swipe on the poster scrolls the page, and paints nothing', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'touch');
  await open(page, '/?only=xray');
  const cx = RECT.x + RECT.w / 2;
  await touchDrag(page, await at(page, cx, RECT.y + RECT.h * 0.9), await at(page, cx, RECT.y - 0.25));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(50);
  expect((await shown(page)).share).toBe(0);
  expect(await page.locator('.poster').evaluate((el) => getComputedStyle(el).touchAction)).toBe('pan-y pinch-zoom');
});

test('desktop: the lens follows the mouse over the chest, and goes when it leaves', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'fine pointer');
  await open(page, '/?only=xray');
  await page.mouse.move(...(await at(page, 0.5, 0.4)));
  await page.mouse.move(...(await at(page, RECT.x + RECT.w / 2, RECT.y + RECT.h / 2)), { steps: 8 });
  await expect.poll(async () => (await shown(page)).share).toBeGreaterThan(0.05);
  await expect(page.locator('html')).toHaveAttribute('data-fx-xray', /lens/);
  await page.mouse.move(20, 20, { steps: 4 });
  await expect.poll(async () => (await shown(page)).share).toBe(0);
  await expect(page.locator('html')).not.toHaveAttribute('data-fx-xray', /lens/);
});

test('the film takes the colorway', async ({ page }) => {
  await open(page, '/?only=xray');
  await page.getByRole('button', { name: copy.toggle }).click();
  await expect.poll(async () => (await shown(page)).share).toBeGreaterThan(0.95);
  expect(near((await shown(page)).dark, await ink(page))).toBe(true);
  await page.locator('label[for="cw-poster-black-red"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-colorway', 'black-red');
  const black = await ink(page);
  await expect.poll(async () => near((await shown(page)).dark, black)).toBe(true);
});

test('reduced motion: her panel stays; the toggle reveals at once', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ ...testInfo.project.use, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await open(page, '/?only=xray');
  await expect(page.locator('html')).toHaveAttribute('data-fx-xray', 'static');
  expect(await ribcageVisible(page), 'the finished poster keeps her ribcage').toBe(true);
  await expect(page.locator('.xray-hint')).toHaveText(copy.hint.static);
  await page.getByRole('button', { name: copy.toggle }).click();
  expect((await shown(page)).share, 'instant: no scan').toBeGreaterThan(0.95);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  const a = await page.screenshot();
  await page.waitForTimeout(500);
  expect(a.equals(await page.screenshot())).toBe(true);
  await context.close();
});

test('without the effect, the poster keeps her panel and no toggle shows', async ({ page }) => {
  await open(page, '/?off=xray');
  expect(await ribcageVisible(page)).toBe(true);
  await expect(page.locator('.print--xray')).toBeHidden();
});

test('wide screens: the toggle and hint overlap no other small print at laptop sizes', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'wide layouts');
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 1536, height: 864 }, { width: 1920, height: 1080 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await open(page, '/?only=xray');
    const clashes = await page.evaluate(() => {
      const mine = [...document.querySelectorAll('.xray-toggle, .xray-hint')];
      const others = [...document.querySelectorAll('.print--date, .print--location, .print--class, .colorbar--poster, .regmarks .reg, .poster-stage')];
      const hit = (a: Element, b: Element) => {
        const r = a.getBoundingClientRect();
        const s = b.getBoundingClientRect();
        return r.left < s.right && r.right > s.left && r.top < s.bottom && r.bottom > s.top;
      };
      return mine.flatMap((m) => others.filter((o) => hit(m, o)).map((o) => `${m.className} x ${o.className}`));
    });
    expect(clashes, `${viewport.width}x${viewport.height}`).toEqual([]);
    await context.close();
  }
});
