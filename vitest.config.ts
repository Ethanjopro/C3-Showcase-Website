import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit tests only (shared ones in tests/unit, an effect's own next to it);
    // Playwright owns *.spec.ts (tests/e2e and src/effects/*).
    include: ['tests/unit/**/*.test.ts', 'src/effects/*/*.test.ts'],
    environment: 'node',
  },
});
