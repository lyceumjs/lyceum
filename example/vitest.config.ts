import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Testcontainers pulls/starts a real PostgreSQL — allow for cold image pulls.
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
