import { defineConfig } from '@playwright/test';

// `npm run test:e2e` builds, then runs these against `vite preview`.
// Tests live in tests/e2e/ (shared) and src/effects/<name>/<name>.spec.ts
// (owned by each effect step). Chromium only; @playwright/test is pinned to the
// version whose Chromium the cloud image ships.
const PORT = 4173;

export default defineConfig({
  testDir: '.',
  testMatch: ['tests/e2e/**/*.spec.ts', 'src/effects/*/*.spec.ts'],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'phone',
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    },
    {
      name: 'desktop',
      use: { viewport: { width: 1440, height: 900 } },
    },
  ],
});
