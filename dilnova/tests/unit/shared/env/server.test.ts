import { afterEach, describe, expect, it, vi } from 'vitest';

describe('validateServerEnv', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('skips validation outside production', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.DATABASE_URL;

    const { validateServerEnv } = await import('@/shared/env/server');
    expect(() => validateServerEnv()).not.toThrow();
  });

  it('skips validation during production build phase', async () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PHASE = 'phase-production-build';
    delete process.env.DATABASE_URL;

    const { validateServerEnv } = await import('@/shared/env/server');
    expect(() => validateServerEnv()).not.toThrow();
  });

  it('throws in production runtime when required vars are missing', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.NEXT_PHASE;
    delete process.env.DATABASE_URL;

    const { validateServerEnv } = await import('@/shared/env/server');
    expect(() => validateServerEnv()).toThrow('Server environment validation failed');
  });
});
