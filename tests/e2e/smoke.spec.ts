// Baseline checks from PLAN 1.9 and SPEC §9 that every later step keeps green.

import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { layoutShift, open, trackErrors } from './helpers.ts';

const features = JSON.parse(readFileSync(new URL('../../src/config/features.json', import.meta.url), 'utf8'));
const effects = Object.keys(features.effects);

test('loads with no console errors', async ({ page }) => {
  const errors = trackErrors(page);
  await open(page);
  await page.mouse.wheel(0, 2000);
  await page.waitForTimeout(300);
  expect(errors).toEqual([]);
});

test('SPEC §9.1: the first screen says what, when and where, with no layout shift', async ({ page }) => {
  await open(page);
  const viewport = page.viewportSize()!;
  await expect(page.getByRole('heading', { level: 1, name: 'C3 Showcase' })).toBeAttached();
  await expect(page.getByRole('img', { name: /Poster for C3 Showcase/ })).toBeVisible();
  for (const locator of [page.locator('.print--date'), page.locator('.print--location')]) {
    await expect(locator).toBeVisible();
    await expect(locator).toContainText('0.0.0');
    const box = (await locator.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  }
  expect(await layoutShift(page)).toBeLessThanOrEqual(0.01);
});

test('no horizontal scrolling', async ({ page }) => {
  await open(page);
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll).toBeLessThanOrEqual(client);
});

test('axe finds no serious or critical violations', async ({ page }) => {
  await open(page);
  const results = await new AxeBuilder({ page }).analyze();
  const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
});

test('reduced motion: the finished poster, nothing hidden, nothing moving', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ ...testInfo.project.use, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await open(page);
  const pending = await page.evaluate(() => [...document.documentElement.classList].filter((c) => c.startsWith('fx-pending')));
  expect(pending).toEqual([]);
  await expect(page.locator('.poster-stage')).toBeVisible();
  const a = await page.screenshot();
  await page.waitForTimeout(500);
  const b = await page.screenshot();
  expect(a.equals(b)).toBe(true);
  await context.close();
});

test('without JavaScript the poster and copy still read', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ ...testInfo.project.use, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('.poster-stage')).toBeVisible();
  await expect(page.locator('.layer--lineart svg')).toBeVisible();
  await expect(page.locator('#info .fact__value').first()).toHaveText('0.0.0');
  await expect(page.locator('[data-menu-open=""]')).toBeHidden(); // needs JS to open the dialog
  await context.close();
});

for (const query of [...effects.map((name) => `?off=${name}`), '?only=line-boil', '?off=all']) {
  test(`flags: ${query} still works`, async ({ page }) => {
    const errors = trackErrors(page);
    await open(page, `/${query}`);
    await expect(page.locator('.poster-stage')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('menu: opens from the keyboard, Esc closes it and focus returns', async ({ page }) => {
  await open(page);
  const button = page.locator('[data-menu-open=""]');
  await button.focus();
  await page.keyboard.press('Enter');
  const dialog = page.locator('dialog#menu');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('link', { name: /Info/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(button).toBeFocused();
});

test('menu: a section link closes the menu and lands on the section', async ({ page }) => {
  await open(page);
  await page.locator('[data-menu-open=""]').click();
  await page.locator('dialog#menu').getByRole('link', { name: /Projects/ }).click();
  await expect(page.locator('dialog#menu')).toBeHidden();
  await expect(page.locator('#projects-title')).toBeFocused();
  await expect(page.locator('#projects')).toBeInViewport();
});

test('color bar: switches colorway, and a reload keeps it', async ({ page }) => {
  await open(page);
  await page.locator('label[for="cw-poster-black-red"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-colorway', 'black-red');
  await expect(page.locator('#cw-credits-black-red')).toBeChecked();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-colorway', 'black-red');
  await expect(page.locator('#cw-poster-black-red')).toBeChecked();
});
