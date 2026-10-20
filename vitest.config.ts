import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit tests only; Playwright owns *.spec.ts (tests/e2e and src/effects/*).
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
