import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { rateLimit } from '@/shared/security/rate-limit';
import { headers } from 'next/headers';

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

const mockLimit = vi.fn();

// Mock Upstash Redis and Ratelimit
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@upstash/ratelimit', () => {
  const mockRatelimitClass = vi.fn().mockImplementation(() => ({
    limit: mockLimit,
  }));
  (mockRatelimitClass as any).slidingWindow = vi.fn().mockReturnValue({});
  
  return {
    Ratelimit: mockRatelimitClass,
  };
});

describe('rateLimit Utility', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalRestUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalRestToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalRestUrl) process.env.UPSTASH_REDIS_REST_URL = originalRestUrl;
    if (originalRestToken) process.env.UPSTASH_REDIS_REST_TOKEN = originalRestToken;
  });

  // ── IN-MEMORY FALLBACK TESTS ─────────────────────────────
  
  it('should allow requests below the limit (in-memory)', async () => {
    vi.mocked(headers).mockResolvedValue({
      get: (name: string) => (name === 'x-forwarded-for' ? '192.168.1.1' : null),
    } as any);

    await expect(rateLimit(2, 1000)).resolves.not.toThrow();
    await expect(rateLimit(2, 1000)).resolves.not.toThrow();
  });

  it('should throw an error when rate limit is exceeded (in-memory)', async () => {
    vi.mocked(headers).mockResolvedValue({
      get: (name: string) => (name === 'x-forwarded-for' ? '192.168.1.2' : null),
    } as any);

    await expect(rateLimit(2, 1000)).resolves.not.toThrow();
    await expect(rateLimit(2, 1000)).resolves.not.toThrow();
    await expect(rateLimit(2, 1000)).rejects.toThrow('Rate limit exceeded');
  });

  it('should recover after the window expires (in-memory)', async () => {
    vi.mocked(headers).mockResolvedValue({
      get: (name: string) => (name === 'x-forwarded-for' ? '192.168.1.3' : null),
    } as any);

    await expect(rateLimit(1, 100)).resolves.not.toThrow();
    await expect(rateLimit(1, 100)).rejects.toThrow('Rate limit exceeded');

    // Wait for window to expire (150ms)
    await new Promise((resolve) => setTimeout(resolve, 150));

    await expect(rateLimit(1, 100)).resolves.not.toThrow();
  });

  // ── UPSTASH REDIS DISTRIBUTED TESTS ──────────────────────

  it('should allow requests when Upstash Redis succeeds', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://mock.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';
    mockLimit.mockResolvedValue({ success: true });

    vi.mocked(headers).mockResolvedValue({
      get: (name: string) => (name === 'x-forwarded-for' ? '192.168.1.4' : null),
    } as any);

    await expect(rateLimit(5, 5000)).resolves.not.toThrow();
    expect(mockLimit).toHaveBeenCalled();
  });

  it('should throw an error when Upstash Redis limit is exceeded', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://mock.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';
    mockLimit.mockResolvedValue({ success: false });

    vi.mocked(headers).mockResolvedValue({
      get: (name: string) => (name === 'x-forwarded-for' ? '192.168.1.5' : null),
    } as any);

    await expect(rateLimit(5, 5000)).rejects.toThrow('Rate limit exceeded');
  });

  it('should fallback to in-memory limiting if Upstash Redis query throws in non-production', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://mock.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';
    mockLimit.mockRejectedValue(new Error('Connection timed out'));

    vi.mocked(headers).mockResolvedValue({
      get: (name: string) => (name === 'x-forwarded-for' ? '192.168.1.6' : null),
    } as any);

    // First two pass in memory since limit is 2
    await expect(rateLimit(2, 1000)).resolves.not.toThrow();
    await expect(rateLimit(2, 1000)).resolves.not.toThrow();
    
    // Third hit exceeds in-memory limit and throws
    await expect(rateLimit(2, 1000)).rejects.toThrow('Rate limit exceeded');
    expect(mockLimit).toHaveBeenCalledTimes(3); // Attempted Upstash 3 times, then fell back to local
  });

  it('should reject requests in production when Upstash is not configured', async () => {
    process.env.NODE_ENV = 'production';

    vi.mocked(headers).mockResolvedValue({
      get: (name: string) => (name === 'x-forwarded-for' ? '192.168.1.7' : null),
    } as any);

    await expect(rateLimit(5, 5000)).rejects.toThrow('Rate limiting is temporarily unavailable');
  });

  it('should reject requests in production when Upstash query throws', async () => {
    process.env.NODE_ENV = 'production';
    process.env.UPSTASH_REDIS_REST_URL = 'https://mock.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';
    mockLimit.mockRejectedValue(new Error('Connection timed out'));

    vi.mocked(headers).mockResolvedValue({
      get: (name: string) => (name === 'x-forwarded-for' ? '192.168.1.8' : null),
    } as any);

    await expect(rateLimit(5, 5000)).rejects.toThrow('Rate limiting is temporarily unavailable');
  });
});
