// palette: PLAN step 8 "Verify" and SPEC §9 step 8 [auto].

import { expect, test, type Page } from '@playwright/test';
import { open, trackErrors } from '../../../tests/e2e/helpers.ts';

const mount = '[data-fx="palette"]';
const colorway = (page: Page) => page.locator('html').getAttribute('data-colorway');

test('a pick wipes accent then ink across, swaps under the ink, and uncovers', async ({ page }) => {
  const errors = trackErrors(page);
  await open(page, '/?only=palette');
  // Watch the order of what happens, from inside the page.
  const log = page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const seen: string[] = [];
        const mo = new MutationObserver((records) => {
          for (const r of records) {
            const el = r.target as HTMLElement;
            if (r.attributeName === 'data-colorway' && el === document.documentElement) seen.push(`colorway:${el.dataset.colorway}`);
            if (r.attributeName === 'data-state') seen.push(`state:${el.dataset.state}`);
            if (r.type === 'childList' && r.addedNodes.length) {
              const blocks = [...document.querySelectorAll('.palette-wipe__block')].map((b) => b.className.split('--')[1]);
              seen.push(`blocks:${blocks.join(',')}`);
            }
          }
          if (seen.includes('state:idle')) {
            mo.disconnect();
            resolve(seen);
          }
        });
        mo.observe(document.documentElement, { attributes: true, subtree: true, childList: true, attributeFilter: ['data-colorway', 'data-state'] });
      }),
  );
  const t0 = Date.now();
  await page.locator('label[for="cw-poster-black-red"]').click();
  const seen = await log;
  const took = Date.now() - t0;
  expect(seen.indexOf('blocks:accent,ink'), 'accent then ink, before the swap').toBeGreaterThan(-1);
  expect(seen.indexOf('blocks:accent,ink')).toBeLessThan(seen.indexOf('colorway:black-red'));
  expect(seen.indexOf('state:wiping')).toBeLessThan(seen.indexOf('colorway:black-red'));
  expect(seen.indexOf('colorway:black-red')).toBeLessThan(seen.indexOf('state:idle'));
  expect(took, 'about 600 ms').toBeGreaterThan(400);
  expect(took).toBeLessThan(1500);
  await expect(page.locator('.palette-wipe')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the blocks wear the new colorway and move by transform only', async ({ page }) => {
  await open(page, '/?only=palette&freeze=150');
  await page.locator('label[for="cw-poster-violet-pink"]').click();
  const blocks = await page.locator('.palette-wipe__block').evaluateAll((els) =>
    els.map((el) => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, transform: cs.transform, inset: [cs.top, cs.left, cs.width] };
    }),
  );
  const tokens = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.dataset.colorway = 'violet-pink';
    document.body.append(probe);
    const read = (t: string) => {
      probe.style.color = `var(--${t})`;
      return getComputedStyle(probe).color;
    };
    const out = [read('accent'), read('ink')];
    probe.remove();
    return out;
  });
  expect(blocks.map((b) => b.bg)).toEqual(tokens);
  for (const b of blocks) expect(b.transform).toMatch(/^matrix/);
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'wiping');
});

test('arrow keys within the radio group change the colorway, and a reload keeps it', async ({ page }) => {
  await open(page, '/?only=palette');
  await page.locator('#cw-poster-teal-coral').focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => colorway(page)).toBe('indigo-pink');
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => colorway(page)).toBe('teal-coral');
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => colorway(page)).toBe('mauve-periwinkle');
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'idle');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-colorway', 'mauve-periwinkle');
  await expect(page.locator('#cw-poster-mauve-periwinkle')).toBeChecked();
});

test('quick picks in a row do not queue a wipe each', async ({ page }) => {
  await open(page, '/?only=palette');
  await page.locator('#cw-poster-black-red').focus();
  const t0 = Date.now();
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  await expect.poll(() => colorway(page), { intervals: [50] }).toBe('brown-orange');
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'idle');
  expect(Date.now() - t0, 'five picks settle in about one wipe, not five').toBeLessThan(2000);
});

test('reduced motion: an instant swap, no blocks', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ ...testInfo.project.use, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await open(page, '/?only=palette');
  await page.locator('label[for="cw-poster-brown-orange"]').click();
  expect(await colorway(page)).toBe('brown-orange');
  await expect(page.locator('.palette-wipe')).toHaveCount(0);
  await context.close();
});

test('lite: the ink block alone', async ({ page }) => {
  await open(page, '/?only=palette&quality=lite&freeze=150');
  await page.locator('label[for="cw-poster-black-red"]').click();
  await expect(page.locator('.palette-wipe__block')).toHaveCount(1);
  await expect(page.locator('.palette-wipe__block--ink')).toHaveCount(1);
});

test('the art, the UI and the text all take the new colorway', async ({ page }) => {
  await open(page, '/?only=palette');
  await page.locator('label[for="cw-poster-indigo-pink"]').click();
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'idle');
  const colors = await page.evaluate(() => {
    const probe = document.createElement('div');
    document.body.append(probe);
    const read = (t: string) => {
      probe.style.color = `var(--${t})`;
      return getComputedStyle(probe).color;
    };
    const out = {
      ink: read('ink'),
      accent: read('accent'),
      text: read('text'),
      line: getComputedStyle(document.querySelector('.layer--lineart .layer__art')!).color,
      fill: getComputedStyle(document.querySelector('.layer--fill .layer__art')!).backgroundColor,
      value: getComputedStyle(document.querySelector('.print--date .print__value')!).color,
      menu: getComputedStyle(document.querySelector('[data-menu-open=""]')!).backgroundColor,
    };
    probe.remove();
    return out;
  });
  expect(colors.ink).toBe('rgb(64, 32, 100)');
  expect(colors.line).toBe(colors.ink);
  expect(colors.fill).toBe(colors.accent);
  expect(colors.value).toBe(colors.text);
  expect(colors.menu).toBe(colors.ink);
});

test('holding an arrow key: at most 3 colorway changes in any second (SPEC §6 flash safety)', async ({ page }) => {
  await open(page, '/?only=palette');
  // What actually renders: the colorway sampled once per frame.
  await page.evaluate(() => {
    const w = window as unknown as { changes: number[] };
    w.changes = [];
    let last = document.documentElement.dataset.colorway;
    const frame = (t: number) => {
      const now = document.documentElement.dataset.colorway;
      if (now !== last) w.changes.push(t);
      last = now;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  await page.locator('#cw-poster-black-red').focus();
  // Key auto-repeat: a press every ~33 ms for 2 s.
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(33);
  }
  await page.waitForTimeout(1500);
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'idle');
  const changes = await page.evaluate(() => (window as unknown as { changes: number[] }).changes);
  expect(changes.length).toBeGreaterThan(0);
  const worst = Math.max(...changes.map((t) => changes.filter((u) => u >= t && u < t + 1000).length));
  expect(worst, `frames with a change: ${changes.map((t) => Math.round(t)).join(', ')}`).toBeLessThanOrEqual(3);
  // The page ends on the radio that's checked.
  const checked = await page.locator('.colorbar--poster input:checked').getAttribute('value');
  expect(await colorway(page)).toBe(checked);
});
