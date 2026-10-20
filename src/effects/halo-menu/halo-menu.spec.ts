// halo-menu: PLAN step 7 "Verify" and SPEC §9 step 6 [auto].

import { chromium, expect, test, type Page } from '@playwright/test';
import { open, trackErrors } from '../../../tests/e2e/helpers.ts';

const mount = '[data-fx="halo-menu"]';
/** The lazily loaded ring chunk (and Three.js, wherever the bundler puts it). */
const RING_CHUNK = /\/assets\/(ring|three)[^/]*\.js$/;

async function openRing(page: Page) {
  await page.locator('[data-menu-open=""]').click();
  await expect(page.locator('dialog#menu')).toBeVisible();
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'ring', { timeout: 15_000 });
  await expect(page.locator(mount)).toHaveAttribute('data-rendered', '', { timeout: 15_000 });
}

/** A real touch drag (CDP) across the ring's canvas. */
async function touchDrag(page: Page, from: [number, number], to: [number, number], steps = 10) {
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

test('no Three.js before the menu is first used; the ring loads on open', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', (r) => RING_CHUNK.test(r.url()) && requested.push(r.url()));
  await open(page);
  await page.waitForTimeout(1500); // past idle: the effect is loaded, Three.js is not
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'idle');
  expect(requested).toEqual([]);
  await openRing(page);
  expect(requested.length).toBeGreaterThan(0);
});

test('SPEC §9.6 keyboard path: Tab to Menu, Enter, arrows turn the ring, Enter goes; Esc returns focus', async ({ page }) => {
  const errors = trackErrors(page);
  await open(page);
  const button = page.locator('[data-menu-open=""]');
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'ring', { timeout: 15_000 });
  const links = page.locator('dialog#menu nav a');
  await expect(links.nth(0)).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(links.nth(1)).toBeFocused();
  await expect(page.locator(mount)).toHaveAttribute('data-front', 'info');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(links.nth(3)).toBeFocused(); // wraps
  await expect(page.locator(mount)).toHaveAttribute('data-front', 'credits');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page.locator('dialog#menu')).toBeHidden();
  await expect(page.locator('#info-title')).toBeFocused();
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('dialog#menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog#menu')).toBeHidden();
  await expect(button).toBeFocused();
  expect(errors).toEqual([]);
});

test('the list stays the menu: visible, and the ring is hidden from assistive tech', async ({ page }) => {
  await open(page);
  await openRing(page);
  for (const name of [/Poster/, /Info/, /Projects/, /Credits/]) await expect(page.getByRole('link', { name })).toBeVisible();
  await expect(page.locator(mount)).toHaveAttribute('aria-hidden', 'true');
  const box = (await page.locator('dialog#menu nav a').first().boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);
});

test('phone: a touch swipe turns the ring to another screen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'touch');
  await open(page);
  await openRing(page);
  await expect(page.locator(mount)).toHaveAttribute('data-front', 'poster');
  const c = (await page.locator(`${mount} canvas`).boundingBox())!;
  const y = c.y + c.height * 0.5;
  await touchDrag(page, [c.x + c.width * 0.8, y], [c.x + c.width * 0.35, y]);
  await expect(page.locator(mount)).not.toHaveAttribute('data-front', 'poster');
  const front = await page.locator(mount).getAttribute('data-front');
  await expect(page.locator(`dialog#menu nav a[href="#${front}"]`)).toBeFocused();
});

test('tapping the front screen dollies in, closes the menu and lands on the section', async ({ page }) => {
  await open(page);
  await openRing(page);
  await page.keyboard.press('ArrowRight'); // Info to the front
  await expect(page.locator(mount)).toHaveAttribute('data-front', 'info');
  await page.waitForTimeout(700); // let the snap settle
  const c = (await page.locator(`${mount} canvas`).boundingBox())!;
  // data-front-at: the front screen's centre, as fractions of the canvas.
  const [fx, fy] = (await page.locator(mount).getAttribute('data-front-at'))!.split(',').map(Number);
  await page.mouse.click(c.x + c.width * fx!, c.y + c.height * fy!);
  await expect(page.locator('dialog#menu')).toBeHidden();
  await expect(page.locator('#info-title')).toBeFocused();
});

test('opened from the halo, the screens grow out of her halo, then settle into the ring', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'the halo hit area is pointer-only');
  await open(page, '/?only=halo-menu');
  await page.locator('.halo-hit').hover(); // intent: the ring chunk starts loading
  await page.locator('.halo-hit').click();
  await expect(page.locator(mount)).toHaveAttribute('data-entrance', 'growing', { timeout: 15_000 });
  await expect(page.locator(mount)).not.toHaveAttribute('data-entrance', /.*/, { timeout: 15_000 });
  await expect(page.locator(mount)).toHaveAttribute('data-front', 'poster');
});

test('ten open and close cycles leave no warnings or errors', async ({ page }) => {
  const messages: string[] = [];
  // Chromium's own GPU-process notes when WebGL runs in software (CI and cloud
  // VMs have no GPU) are not the page's; anything from the page still fails.
  const driver = /software WebGL has been deprecated|GL Driver Message|GroupMarkerNotSet/;
  page.on('console', (m) => (m.type() === 'warning' || m.type() === 'error') && !driver.test(m.text()) && messages.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => messages.push(e.message));
  await open(page);
  for (let i = 0; i < 10; i++) {
    await openRing(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog#menu')).toBeHidden();
    await expect(page.locator(`${mount} canvas`)).toHaveCount(0);
  }
  expect(messages).toEqual([]);
});

test('reduced motion: the grid of screens, no Three.js', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ ...testInfo.project.use, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const requested: string[] = [];
  page.on('request', (r) => RING_CHUNK.test(r.url()) && requested.push(r.url()));
  await open(page);
  await page.waitForTimeout(800);
  await page.locator('[data-menu-open=""]').click();
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'grid');
  await expect(page.locator('html')).toHaveAttribute('data-fx-halo-menu', 'grid');
  await expect(page.locator(`${mount} canvas`)).toHaveCount(0);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('dialog#menu nav a').nth(1)).toBeFocused();
  expect(requested).toEqual([]);
  await context.close();
});

test('without WebGL the menu is the grid', async ({}, testInfo) => {
  const browser = await chromium.launch({ args: ['--disable-webgl', '--disable-webgl2', '--disable-gpu'] });
  const context = await browser.newContext({ ...testInfo.project.use, baseURL: 'http://localhost:4173' });
  const page = await context.newPage();
  const errors = trackErrors(page);
  const requested: string[] = [];
  page.on('request', (r) => RING_CHUNK.test(r.url()) && requested.push(r.url()));
  await open(page);
  await page.waitForTimeout(800);
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'grid');
  await page.locator('[data-menu-open=""]').click();
  await expect(page.locator('dialog#menu')).toBeVisible();
  await expect(page.locator(`${mount} canvas`)).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Projects/ })).toBeVisible();
  expect(requested).toEqual([]);
  expect(errors).toEqual([]);
  await browser.close();
});
