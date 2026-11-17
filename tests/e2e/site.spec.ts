import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const CHANNELS = ['info', 'attend', 'work', 'poster'];

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
  await expect(page.locator('h1')).toContainText('Thursday, December 3, 2026');
  await expect(page.locator('h1')).toContainText('Grand Atrium');
  await expect(page.locator('.door--l .door__dl .big')).toBeVisible();
  expect((await caseState(page)).state).toBe('sealed');
  await page.locator('.seal').click();
  await expect.poll(async () => (await caseState(page)).state).toBe('open');
  expect(errors).toEqual([]);
});

test('saving the date is one tap away even while sealed', async ({ page }) => {
  await boot(page);
  await page.locator('.bar__cta').click();
  await expect.poll(async () => (await caseState(page)).channel).toBe('attend');
  expect((await caseState(page)).view).toBe('channel');
  await expect(page.locator('#ch-attend-t')).toBeFocused();
  // Both calendars get the real time: 5:00 PM in Dallas is 23:00 UTC.
  await expect(page.locator('#ch-attend a[href*="calendar.google.com"]')).toHaveAttribute('href', /dates=20261203T230000Z%2F20261204T003000Z/);
  const ics = await page.request.get(new URL('c3-showcase.ics', page.url()).href);
  expect(ics.ok()).toBe(true);
  expect(await ics.text()).toContain('DTSTART:20261203T230000Z');
});

test('the countdown says how far off the show is', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-17T12:00:00-06:00') });
  await boot(page, './#info');
  await expect(page.locator('#ch-info [data-count]')).toHaveText('16 days to go');
  await page.clock.setFixedTime(new Date('2026-12-03T17:30:00-06:00'));
  await page.clock.runFor(31_000);
  await expect(page.locator('#ch-info [data-count]')).toHaveText('Happening now');
});

test('keyboard: open the case, tune in, and come back', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'keyboard path checked at desktop size');
  await boot(page);
  await page.keyboard.press('Tab'); // Save the date
  await page.keyboard.press('Tab'); // the sealed case
  await expect(page.locator('.seal')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.feed').first()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('.feed').nth(1)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#ch-attend-t')).toBeFocused();
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
  await expect.poll(async () => (await caseState(page)).channel).toBe('work');
});

test('the halo is drawn: a ring and cameras on both sides of her', async ({ page }) => {
  await boot(page);
  await page.locator('.seal').click();
  await page.waitForTimeout(300);
  for (const half of ['back', 'front']) {
    const inked = await page.locator(`.rig--${half}`).evaluate((c: HTMLCanvasElement) => {
      const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i]! > 0) n++;
      return n / (c.width * c.height);
    });
    expect(inked, half).toBeGreaterThan(0.003);
  }
});

test('the halo turns, and slows right down (without stopping) for a hovered camera', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'hover is a desktop gesture');
  await boot(page);
  await page.locator('.seal').click();
  await page.waitForTimeout(300);
  const cam = page.locator('.cam').first();
  const x = () => cam.evaluate((el: HTMLElement) => Number(/translate3d\(([-\d.]+)px/.exec(el.style.transform)![1]));
  const travel = async (ms: number) => {
    const from = await x();
    await page.waitForTimeout(ms);
    return Math.abs((await x()) - from);
  };
  const free = await travel(600);
  expect(free).toBeGreaterThan(2);
  await page.locator('.feed').nth(2).hover();
  await page.waitForTimeout(900); // eased down by now
  const slowed = await travel(600);
  expect(slowed).toBeGreaterThan(0);
  expect(slowed).toBeLessThan(free * 0.4);
});

test('every change is a cut with a burst of static: no flip, from any channel', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'checked once');
  const statics = () => page.locator('.cut').evaluate((el) => el.getAnimations().length);
  // From the poster to another channel (the case the owner saw without static)
  await boot(page, './#poster');
  await page.locator('.feed[data-feed="0"]').click();
  expect(await statics()).toBe(1);
  await expect(page.locator('#case')).toHaveAttribute('data-shown', 'info');
  await expect(page.locator('#ch-info')).toBeVisible();
  // Nothing turns: no face is transformed or animated
  for (const face of ['.face--front', '.face--back']) {
    expect(await page.locator(face).evaluate((el) => getComputedStyle(el).transform)).toBe('none');
    expect(await page.locator(face).evaluate((el) => el.getAnimations().length)).toBe(0);
  }
  await expect(page.locator('#ch-info-t')).toBeFocused();
  // Poster to her, and her to a channel
  await page.goto('./#poster');
  await expect(page.locator('#ch-poster')).toBeVisible();
  await page.locator('.tc__back').click();
  expect(await statics()).toBe(1);
  await expect(page.locator('.face--front')).toBeVisible();
  await page.waitForTimeout(500);
  await page.locator('.feed[data-feed="3"]').click();
  expect(await statics()).toBe(1);
  await expect(page.locator('#ch-poster')).toBeVisible();
});

test('tuning in swings that channel\'s camera round to the front, so its feed is never blocked', async ({ page }, info) => {
  await boot(page);
  await page.locator('.seal').click();
  const list = info.project.name === 'desktop' ? '.feed' : '.key';
  const attr = info.project.name === 'desktop' ? 'data-feed' : 'data-key';
  for (const i of [2, 0]) {
    await page.locator(list).nth(i).click();
    await expect.poll(async () => (await caseState(page)).view).toBe('channel');
    // The swing takes about a second; then the camera holds at the front.
    await expect(page.locator(`${list}[${attr}="${i}"]`)).toHaveAttribute('data-live', '', { timeout: 3000 });
    await page.waitForTimeout(1300);
    await expect(page.locator(`${list}[${attr}="${i}"] .shot`)).not.toHaveAttribute('data-obstructed');
    await page.locator('.tc__back').click();
    await expect.poll(async () => (await caseState(page)).view).toBe('hub');
    // Back at the hub, it's still the camera at the front.
    await expect(page.locator(`.cam[data-cam="${i}"]`)).toHaveAttribute('data-live', '');
  }
});

test('a deep link lands with its camera already at the front', async ({ page }) => {
  // The third camera starts behind her head; arriving on its channel brings it round at once.
  await boot(page, './#work');
  await expect(page.locator('.key[data-key="2"]')).toHaveAttribute('data-live', '');
  await expect(page.locator('.key[data-key="2"] .shot')).not.toHaveAttribute('data-obstructed');
});

test('on a phone, swiping a channel sideways goes to the next or the one before', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'touch');
  await boot(page, './#attend');
  const swipe = (x0: number, x1: number) =>
    page.locator('.tc').evaluate(
      (tc, [a, b]) => {
        const t = (x: number) => new Touch({ identifier: 1, target: tc, clientX: x, clientY: 500 });
        tc.dispatchEvent(new TouchEvent('touchstart', { touches: [t(a!)], bubbles: true }));
        tc.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t(b!)], bubbles: true }));
      },
      [x0, x1],
    );
  await swipe(320, 80);
  await expect.poll(async () => (await caseState(page)).channel).toBe('work');
  await swipe(80, 320);
  await expect.poll(async () => (await caseState(page)).channel).toBe('attend');
  await swipe(200, 230); // too short: stays put
  await page.waitForTimeout(200);
  expect((await caseState(page)).channel).toBe('attend');
});

test('sending it to a friend copies the link where there is no share sheet', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'desktop', 'the clipboard path is the desktop one');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await boot(page, './#attend');
  await page.evaluate(() => Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }));
  await page.locator('[data-share]').click();
  await expect(page.locator('[data-share-status]')).toHaveText(/Link copied/);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('ethanjopro.github.io/C3-Showcase-Website');
});

test('her poster is there to look at and to download', async ({ page }) => {
  await boot(page, './#poster');
  const img = page.locator('#ch-poster .poster__img');
  await expect(img).toBeVisible();
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBe(853);
  const download = page.waitForEvent('download');
  await page.locator('#ch-poster a[download]').click();
  expect((await download).suggestedFilename()).toBe('c3-showcase-poster.webp');
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
    expect(await page.locator('.face--front').evaluate((el) => getComputedStyle(el).transitionDuration)).toMatch(/^0s(, 0s)*$/);
    await page.goto('./#poster');
    await expect(page.locator('#ch-poster')).toBeVisible();
  });
});

test.describe('a phone with the browser toolbars up (390 × 664)', () => {
  test.use({ viewport: { width: 390, height: 664 } });
  test('the sealed doors still show the date and place, and open on her face, uncovered', async ({ page }, info) => {
    test.skip(info.project.name !== 'phone', 'phone layout');
    await boot(page);
    for (const side of ['l', 'r']) {
      const box = await page.locator(`.door--${side} .door__dl`).boundingBox();
      expect(box!.y + box!.height, side).toBeLessThanOrEqual(664);
    }
    await page.locator('.seal').tap();
    await expect.poll(async () => (await caseState(page)).state).toBe('open');
    await page.waitForTimeout(1700);
    // Her face and her hands, in her painting's pixels, are on screen with nothing over them.
    for (const [x, y] of [[425, 592], [425, 660]] as const) {
      const hit = await page.locator('[data-stage]').evaluate(
        (stage, [sx, sy]) => {
          const r = stage.getBoundingClientRect();
          const k = r.width / 853;
          const el = document.elementFromPoint(r.left + sx! * k, r.top + sy! * k);
          return { y: r.top + sy! * k, inCard: !!el?.closest('[data-card]'), cls: el?.className };
        },
        [x, y],
      );
      expect(hit.inCard, JSON.stringify(hit)).toBe(true);
      expect(hit.y).toBeLessThan(664);
    }
    await expect(page.locator('.sheet__when')).toBeVisible();
  });
});

test('on a phone, the open case ends under the channel buttons: nothing blank below', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone layout');
  await boot(page);
  await page.locator('.seal').tap();
  await expect(page.locator('#case')).toHaveAttribute('data-doors-gone', '', { timeout: 3000 });
  await expect(page.locator('.wing--l')).toBeHidden();
  const gap = await page.evaluate(() => document.documentElement.scrollHeight - document.querySelector('.keys')!.getBoundingClientRect().bottom - scrollY);
  expect(gap).toBeLessThanOrEqual(24);
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
  await page.goto('./#attend');
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
  // What a visit loads: not the share image or her poster download, which load only when asked for.
  const total = files
    .filter((f) => !/\.woff$|og\.jpg$|c3-showcase-poster\.webp$/.test(f))
    .reduce((n, f) => n + statSync(f).size, 0);
  expect(total).toBeLessThan(1_000_000);
});
