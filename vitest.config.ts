import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/tests/e2e/**', '**/playwright/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'next/cache': path.resolve(__dirname, './tests/mocks/next-cache.ts'),
      'next/headers': path.resolve(__dirname, './tests/mocks/next-headers.ts'),
      'server-only': path.resolve(__dirname, './tests/mocks/server-only.ts'),
    },
  },
});
