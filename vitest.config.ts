import { defineConfig } from 'vitest/config';

export default defineConfig({
  // JSX transform follows tsconfig's `react-jsx` (Vitest 4's oxc transformer reads it).
  test: {
    // Default to a Node environment; the H5P FE component test opts into jsdom
    // per-file via a `// @vitest-environment jsdom` docblock.
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // The smoke suite provisions an ephemeral Postgres via Testcontainers.
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
