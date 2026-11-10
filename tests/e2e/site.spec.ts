import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const CHANNELS = ['info', 'rsvp', 'projects', 'inside', 'source', 'credits'];

async function boot(page: Page, url = './') {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(url);
  await page.waitForSelector('html[data-booted]');
  return errors;
}

const caseState = (page: Page) =>
  page.locator('#case').evaluate((el: HTMLElement) => ({ ...el.dataset }) as Record<string, string>);

test('arrives sealed, saying what, when and where, and opens with one tap', async ({ page }) => {
  const errors = await boot(page);
  await expect(page.locator('h1')).toContainText('C3 Showcase');
  await expect(page.locator('h1')).toContainText('Date 0.0.0');
  await expect(page.locator('.door--l .door__dl .big')).toBeVisible();
  expect((await caseState(page)).state).toBe('sealed');
  await page.locator('.seal').click();
  await expect.poll(async () => (await caseState(page)).state).toBe('open');
  expect(errors).toEqual([]);
});

test('RSVP is one tap away even while sealed', async ({ page }) => {
  await boot(page);
  await page.locator('.bar__rsvp').click();
  await expect.poll(async () => (await caseState(page)).channel).toBe('rsvp');
  expect((await caseState(page)).view).toBe('channel');
  await expect(page.locator('#ch-rsvp-t')).toBeFocused();
});

test('keyboard: open the case, tune in, and come back', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'keyboard path checked at desktop size');
  await boot(page);
  await page.keyboard.press('Tab'); // RSVP
  await page.keyboard.press('Tab'); // the sealed case
  await expect(page.locator('.seal')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.feed').first()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('.feed').nth(1)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#ch-rsvp-t')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await caseState(page)).view).toBe('hub');
  await expect(page.locator('.feed').nth(1)).toBeFocused();
});

test('every channel has a page of its own, reachable by its link', async ({ page }) => {
  await boot(page);
  for (const id of CHANNELS) {
    await page.goto(`./#${id}`);
    await expect.poll(async () => (await caseState(page)).channel).toBe(id);
    await expect(page.locator(`#ch-${id}`)).toBeVisible();
    await expect(page.locator(`#ch-${id} h2`)).toHaveCount(1);
  }
  await page.goBack();
  await expect.poll(async () => (await caseState(page)).channel).toBe('source');
});

test('the halo turns, and stops for a hovered or focused camera', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'hover is a desktop gesture');
  await boot(page);
  await page.locator('.seal').click();
  const cam = page.locator('.cam').first();
  const t1 = await cam.evaluate((el: HTMLElement) => el.style.transform);
  await page.waitForTimeout(400);
  expect(await cam.evaluate((el: HTMLElement) => el.style.transform)).not.toBe(t1);
  await page.locator('.feed').nth(2).hover();
  await page.waitForTimeout(100);
  const held = await cam.evaluate((el: HTMLElement) => el.style.transform);
  await page.waitForTimeout(400);
  expect(await cam.evaluate((el: HTMLElement) => el.style.transform)).toBe(held);
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('nothing turns, and everything is still reachable', async ({ page }) => {
    await boot(page);
    await page.locator('.seal').click();
    const cam = page.locator('.cam').first();
    const t1 = await cam.evaluate((el: HTMLElement) => el.style.transform);
    await page.waitForTimeout(500);
    expect(await cam.evaluate((el: HTMLElement) => el.style.transform)).toBe(t1);
    expect(await page.locator('.panel').evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0s');
    await page.goto('./#inside');
    await expect(page.locator('#ch-inside')).toBeVisible();
  });
});

test('holding her on a phone shows the X-ray', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'touch');
  await boot(page);
  await page.locator('.seal').tap();
  await expect.poll(async () => (await caseState(page)).state).toBe('open');
  const on = await page.locator('[data-card]').evaluate(async (card) => {
    const t = (y: number) => new Touch({ identifier: 1, target: card, clientX: 200, clientY: y });
    card.dispatchEvent(new TouchEvent('touchstart', { touches: [t(320)], bubbles: true }));
    await new Promise((r) => setTimeout(r, 300));
    return document.querySelector('.xr')?.hasAttribute('data-on');
  });
  expect(on).toBe(true);
});

test('no accessibility violations: sealed, open, and a channel', async ({ page }) => {
  await boot(page);
  const check = async () => {
    const r = await new AxeBuilder({ page }).disableRules(['region']).analyze();
    const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  };
  await check();
  await page.locator('.seal').click();
  await page.waitForTimeout(1700);
  await check();
  await page.goto('./#rsvp');
  await page.waitForTimeout(1200);
  await check();
});

test('no layout shift while loading', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
        if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await boot(page);
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBeLessThan(0.02);
});

test('nothing from reference/ ships, and the page stays light', async ({}, info) => {
  test.skip(info.project.name !== 'desktop', 'build check runs once');
  const dist = path.resolve('dist');
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = path.join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else files.push(p);
    }
  };
  walk(dist);
  const refs = new Set<string>();
  const walkRef = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = path.join(d, f);
      if (statSync(p).isDirectory()) walkRef(p);
      else refs.add(readFileSync(p).subarray(0, 4096).toString('base64'));
    }
  };
  walkRef(path.resolve('reference'));
  for (const f of files) expect(refs.has(readFileSync(f).subarray(0, 4096).toString('base64')), f).toBe(false);
  const html = readFileSync(path.join(dist, 'index.html'), 'utf8');
  expect(html).not.toContain('reference/');
  const total = files.filter((f) => !/\.woff$/.test(f)).reduce((n, f) => n + statSync(f).size, 0);
  expect(total).toBeLessThan(1_000_000);
});
