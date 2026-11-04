import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname),
      // Server-only modules are tested directly in Node; the guard is for bundles, not for tests.
      'server-only': path.resolve(import.meta.dirname, 'tests/stubs/server-only.ts'),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    // Integration tests start an in-memory MongoDB replica set; the first run downloads the binary.
    hookTimeout: 300_000,
  },
});
