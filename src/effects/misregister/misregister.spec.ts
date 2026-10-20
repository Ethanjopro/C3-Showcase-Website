// misregister: PLAN step 9 "Verify".

import { expect, test, type Page } from '@playwright/test';
import { open, trackErrors } from '../../../tests/e2e/helpers.ts';

/**
 * Scrolls fast (a flick: ~100 px a frame, back and forth so the poster stays
 * on screen) and records the fill's and the line art's transforms each frame;
 * then reports how long after the last scroll the fill was back in register.
 */
const flick = (page: Page, step = 100, alternate = false) =>
  page.evaluate(async ([step, alternate]) => {
    const fill = document.querySelector<HTMLElement>('.layer--fill')!;
    const line = document.querySelector<HTMLElement>('.layer--lineart')!;
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    const during: [string, string][] = [];
    for (let i = 0; i < 6; i++) {
      window.scrollBy({ top: alternate && i % 2 ? -step : step, behavior: 'instant' });
      await frame();
      during.push([fill.style.transform, line.style.transform]);
    }
    const stopped = performance.now();
    while (fill.style.transform && performance.now() - stopped < 2000) await frame();
    return { during, settledAfter: performance.now() - stopped, after: [fill.style.transform, line.style.transform] };
  }, [step, alternate] as const);

const px = (t: string) => (t.match(/-?[\d.]+px/g) ?? []).map((v) => parseFloat(v));

test('a fast scroll slips ink and accent apart, at most 2 px, and they snap back within 500 ms', async ({ page }) => {
  const errors = trackErrors(page);
  await open(page, '/?only=misregister');
  const r = await flick(page);
  const slipped = r.during.filter(([fill]) => px(fill).some((v) => v !== 0));
  expect(slipped.length, 'the fill moves during the flick').toBeGreaterThan(0);
  for (const [fill, line] of r.during) {
    const [fx = 0, fy = 0] = px(fill);
    const [lx = 0, ly = 0] = px(line);
    expect(Math.hypot(fx - lx, fy - ly), 'the inks never sit more than 2 px apart').toBeLessThanOrEqual(2);
    // Opposite directions: never the same non-zero offset.
    if (fy !== 0) expect(Math.sign(fy)).toBe(-Math.sign(ly));
  }
  expect(r.settledAfter).toBeLessThan(500);
  expect(r.after).toEqual(['', '']);
  expect(errors).toEqual([]);
});

test('a slow scroll keeps the print in register', async ({ page }) => {
  await open(page, '/?only=misregister');
  const moved = await page.evaluate(async () => {
    const fill = document.querySelector<HTMLElement>('.layer--fill')!;
    let any = false;
    for (let i = 0; i < 20; i++) {
      window.scrollBy({ top: 4, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 16));
      if (fill.style.transform) any = true;
    }
    return any;
  });
  expect(moved).toBe(false);
});

test('desktop: a fast pointer flick across the poster slips the inks too', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'pointer velocity is a fine-pointer extra');
  await open(page, '/?only=misregister');
  const box = (await page.locator('.poster').boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 10, y);
  const seen = page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        const fill = document.querySelector<HTMLElement>('.layer--fill')!;
        const mo = new MutationObserver(() => {
          if (/[1-9]/.test(fill.style.transform)) resolve(true);
        });
        mo.observe(fill, { attributes: true, attributeFilter: ['style'] });
        setTimeout(() => resolve(false), 1500);
      }),
  );
  await page.mouse.move(box.x + box.width - 10, y, { steps: 3 });
  expect(await seen).toBe(true);
});

test('offscreen the poster rests in register, and a flick there writes nothing', async ({ page }) => {
  await open(page, '/?only=misregister');
  const writes = await page.evaluate(async () => {
    // Room to scroll well past the poster and its 10 % onscreen margin.
    const pad = document.createElement('div');
    pad.style.height = '4000px';
    document.body.append(pad);
    window.scrollTo({ top: 3000, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 300));
    const layers = [...document.querySelectorAll<HTMLElement>('.poster .layer')];
    let count = 0;
    const mo = new MutationObserver((records) => (count += records.length));
    layers.forEach((el) => mo.observe(el, { attributes: true, attributeFilter: ['style'] }));
    for (let i = 0; i < 6; i++) {
      window.scrollBy({ top: 100, behavior: 'instant' });
      await new Promise((r) => requestAnimationFrame(r));
    }
    await new Promise((r) => setTimeout(r, 300));
    mo.disconnect();
    return { count, transforms: layers.map((el) => el.style.transform) };
  });
  expect(writes.count).toBe(0);
  expect(new Set(writes.transforms)).toEqual(new Set(['']));
});

test('slow frames (45 ms) still settle: the spring never flips back and forth', async ({ page }) => {
  // A phone dropping frames during momentum scroll.
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => raf(() => setTimeout(() => raf(cb), 45));
  });
  await open(page, '/?only=misregister');
  // 250 px a (slow) frame, back and forth so the poster stays on screen: still a flick, ~5000 px/s.
  const r = await flick(page, 250, true);
  expect(r.during.some(([fill]) => px(fill).some((v) => v !== 0)), 'it slips').toBe(true);
  expect(r.settledAfter).toBeLessThan(1500);
  expect(r.after).toEqual(['', '']);
});

test('reduced motion: off', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ ...testInfo.project.use, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await open(page, '/?only=misregister');
  const r = await flick(page);
  expect(r.during.every(([fill, line]) => fill === '' && line === '')).toBe(true);
  await context.close();
});
