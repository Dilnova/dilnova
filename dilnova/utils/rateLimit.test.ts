/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { rateLimit } from './rateLimit';
import { headers } from 'next/headers';

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

describe('rateLimit Utility', () => {
  it('should allow requests below the limit', async () => {
    vi.mocked(headers).mockResolvedValue({
      get: (name: string) => (name === 'x-forwarded-for' ? '192.168.1.1' : null),
    } as any);

    await expect(rateLimit(2, 1000)).resolves.not.toThrow();
    await expect(rateLimit(2, 1000)).resolves.not.toThrow();
  });

  it('should throw an error when rate limit is exceeded', async () => {
    vi.mocked(headers).mockResolvedValue({
      get: (name: string) => (name === 'x-forwarded-for' ? '192.168.1.2' : null),
    } as any);

    await expect(rateLimit(2, 1000)).resolves.not.toThrow();
    await expect(rateLimit(2, 1000)).resolves.not.toThrow();
    await expect(rateLimit(2, 1000)).rejects.toThrow('Rate limit exceeded');
  });

  it('should recover after the window expires', async () => {
    vi.mocked(headers).mockResolvedValue({
      get: (name: string) => (name === 'x-forwarded-for' ? '192.168.1.3' : null),
    } as any);

    await expect(rateLimit(1, 100)).resolves.not.toThrow();
    await expect(rateLimit(1, 100)).rejects.toThrow('Rate limit exceeded');

    // Wait for window to expire (150ms)
    await new Promise((resolve) => setTimeout(resolve, 150));

    await expect(rateLimit(1, 100)).resolves.not.toThrow();
  });
});
