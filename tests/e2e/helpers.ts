import { expect, type Page } from '@playwright/test';

/** Collects console errors and page errors; assert with expect(errors).toEqual([]). */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

/** Loads a URL and waits for every load-time effect to settle and fonts to arrive. */
export async function open(page: Page, url = '/'): Promise<void> {
  await page.goto(url);
  await expect(page.locator('html')).toHaveAttribute('data-booted', '', { timeout: 10_000 });
  await page.evaluate(() => document.fonts.ready);
}

/** Total layout shift so far, from buffered layout-shift entries. */
export function layoutShift(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let total = 0;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
            if (!e.hadRecentInput) total += e.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => resolve(total), 500);
      }),
  );
}
