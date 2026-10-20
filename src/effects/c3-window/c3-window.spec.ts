// c3-window: PLAN step 5 "Verify" and SPEC §9 steps 1 and 3 [auto].

import { expect, test, type Page } from '@playwright/test';
import { open, trackErrors } from '../../../tests/e2e/helpers.ts';

const mount = '[data-fx="c3-window"]';

/** Waits for the pin (ScrollTrigger loads after the closed window shows). */
async function ready(page: Page, query = '') {
  await open(page, `/?only=c3-window${query}`);
  await expect(page.locator(mount)).toHaveAttribute('data-ready', '');
}

const stage = (page: Page) =>
  page.locator('.poster-stage').evaluate((el) => {
    const cs = getComputedStyle(el);
    return { mask: cs.maskImage || cs.webkitMaskImage, transform: cs.transform, top: el.getBoundingClientRect().top };
  });

async function scrollTo(page: Page, y: number) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
  await page.waitForTimeout(150);
}

test('arrival: the poster shows through her C3, and when and where are on the first screen', async ({ page }) => {
  const errors = trackErrors(page);
  await ready(page);
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'closed');
  const s = await stage(page);
  expect(s.mask).toMatch(/^url\("data:image\/svg\+xml/);
  const viewport = page.viewportSize()!;
  for (const sel of ['.print--date', '.print--location']) {
    const box = (await page.locator(sel).boundingBox())!;
    expect(box.y + box.height, `${sel} inside the first screen`).toBeLessThanOrEqual(viewport.height);
    await expect(page.locator(sel)).toBeVisible();
  }
  // Her letters, not a font: the mask holds the title's own path data.
  const fromTitle = await page.evaluate(() => {
    const css = getComputedStyle(document.querySelector('.poster-stage')!).maskImage;
    const svg = decodeURIComponent(css.slice(css.indexOf(',') + 1, -2));
    const title = [...document.querySelectorAll('.layer--title svg path')].map((p) => p.getAttribute('d'));
    const used = [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
    return used.length > 0 && used.every((d) => title.includes(d!)) && used.length < title.length;
  });
  expect(fromTitle, 'the C3 paths of the title, without "Showcase"').toBe(true);
  expect(errors).toEqual([]);
});

test('phone: a cropped wordmark (wider than the poster); wide screens: whole letters; the box stays on screen', async ({ page }, testInfo) => {
  await ready(page);
  const { letters, stage, vw } = await page.locator('.poster-stage').evaluate((el: HTMLElement) => {
    const cs = getComputedStyle(el);
    return { letters: parseFloat(cs.maskSize.split(' ')[0]!), stage: el.offsetWidth, vw: window.innerWidth };
  });
  // The mask box carries a 2 % pad on each side, so whole letters sit within 0.94 x 1.04 of the stage.
  if (testInfo.project.name === 'phone') expect(letters).toBeGreaterThan(stage);
  else expect(letters).toBeLessThan(stage);
  const box = (await page.locator('.poster-stage').boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(vw);
});

test('scrolling opens the window within one screen, pinned, and scrolling back closes it', async ({ page }) => {
  await ready(page);
  const vh = page.viewportSize()!.height;
  const pin = await page.evaluate(() => {
    const spacer = document.querySelector('#poster')!.parentElement!;
    return spacer.getBoundingClientRect().height - document.querySelector('#poster')!.getBoundingClientRect().height;
  });
  expect(pin, 'some pinned scroll').toBeGreaterThan(0);
  expect(pin, 'at most one screen of pinned scroll (SPEC §6)').toBeLessThanOrEqual(vh);

  await scrollTo(page, pin / 2);
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'opening');
  const mid = await stage(page);
  expect(mid.mask).not.toBe('none');
  expect(await page.locator('#poster').evaluate((el) => el.getBoundingClientRect().top), 'pinned').toBe(0);

  await scrollTo(page, pin + 5);
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'open');
  const end = await stage(page);
  expect(end.mask).toBe('none');
  expect(end.transform).toBe('none');

  await scrollTo(page, 0);
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'closed');
  expect((await stage(page)).mask).not.toBe('none');
});

test('the window never covers the small print, at any progress', async ({ page }) => {
  await ready(page);
  const vh = page.viewportSize()!.height;
  for (const f of [0, 0.15, 0.3, 0.5, 0.7, 0.9, 1.05]) {
    await scrollTo(page, f * vh * 0.85);
    const covered = await page.evaluate(() =>
      ['.print--date .print__value', '.print--location .print__value', '.print--date .print__label', '.print--location .print__label']
        .map((sel) => document.querySelector(sel)!)
        .filter((el) => {
          const r = el.getBoundingClientRect();
          // Corners and centre: what's on top there must be the text itself.
          const pts = [[r.left + 2, r.top + 2], [r.right - 2, r.top + 2], [r.left + 2, r.bottom - 2], [r.right - 2, r.bottom - 2], [(r.left + r.right) / 2, (r.top + r.bottom) / 2]];
          return pts.some(([x, y]) => {
            const hit = document.elementFromPoint(x!, y!);
            return hit && hit.closest('.poster-stage');
          });
        })
        .map((el) => el.className),
    );
    expect(covered, `at ${f}`).toEqual([]);
  }
});

test('the color bar still takes taps while the window is closed', async ({ page }) => {
  await ready(page);
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'closed');
  await page.locator('label[for="cw-poster-black-red"]').click({ trial: false });
  await expect(page.locator('html')).toHaveAttribute('data-colorway', 'black-red');
});

test('progress only grows as the page scrolls', async ({ page }) => {
  await ready(page);
  const vh = page.viewportSize()!.height;
  let last = -1;
  for (const f of [0, 0.2, 0.4, 0.6, 0.8]) {
    await scrollTo(page, f * vh * 0.85);
    const p = Number(await page.locator(mount).getAttribute('data-progress'));
    expect(p).toBeGreaterThanOrEqual(last);
    last = p;
  }
  expect(last).toBeGreaterThan(0.5);
});

test('the clock keeps running inside the letters: line-boil plays during the pin', async ({ page }) => {
  await open(page, '/?only=c3-window,line-boil');
  await expect(page.locator(mount)).toHaveAttribute('data-ready', '');
  await expect(page.locator('html')).toHaveAttribute('data-fx-line-boil', 'on');
  await scrollTo(page, page.viewportSize()!.height * 0.4);
  await expect(page.locator(mount)).toHaveAttribute('data-state', 'opening');
  await expect(page.locator('html')).toHaveAttribute('data-fx-line-boil', 'on');
});

test('?c3=<progress> scrolls there, for screenshots', async ({ page }) => {
  await ready(page, '&c3=0.5');
  await expect.poll(async () => Number(await page.locator(mount).getAttribute('data-progress'))).toBeCloseTo(0.5, 1);
});

test('reduced motion: the open poster at the top of the page, no mask, no pin', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ ...testInfo.project.use, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await open(page, '/?only=c3-window');
  const s = await stage(page);
  expect(s.mask).toBe('none');
  expect(s.transform).toBe('none');
  expect(await page.locator('#poster').evaluate((el) => el.parentElement!.classList.contains('pin-spacer'))).toBe(false);
  await expect(page.locator('.poster-stage')).toBeVisible();
  await context.close();
});

test('no layout shift on arrival', async ({ page }) => {
  await ready(page);
  const shift = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let total = 0;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!e.hadRecentInput) total += e.value;
        }).observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => resolve(total), 500);
      }),
  );
  expect(shift).toBeLessThanOrEqual(0.01);
});

test('arrival shows her C3 in solid ink; the first of the scroll drains it to show the poster', async ({ page }) => {
  await ready(page);
  const fill = page.locator(`${mount} .c3-window__fill`);
  const state = () =>
    fill.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { clip: cs.clipPath, visibility: cs.visibility, fill: getComputedStyle(el.querySelector('path')!).fill };
    });
  const ink = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.color = 'var(--ink)';
    document.body.append(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    return c;
  });
  const arrival = await state();
  expect(arrival.clip).toBe('none');
  expect(arrival.visibility).toBe('visible');
  expect(arrival.fill).toBe(ink);
  const vh = page.viewportSize()!.height;
  await scrollTo(page, vh * 0.85 * 0.15);
  expect((await state()).clip).toMatch(/^inset\(/); // draining
  await scrollTo(page, vh * 0.85 * 0.5);
  expect((await state()).visibility).toBe('hidden'); // drained
});
