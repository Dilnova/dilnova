import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@clerk/nextjs/server', () => ({
  clerkMiddleware: vi.fn(() => vi.fn(() => new NextResponse('clerk-auth-active')))
}));

// Import the proxy module AFTER mocking its dependencies
import proxy from '@/proxy';

describe('proxy middleware bypass', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function createMockRequest() {
    return new NextRequest('http://localhost:3000/some-protected-route', {
      headers: {
        'x-forwarded-host': 'localhost:3000',
        origin: 'http://localhost:3000',
      }
    });
  }

  const mockEvent = {} as any;

  it('does NOT bypass if CLERK_SECRET_KEY is sk_test_ci_dummy but NODE_ENV is production', async () => {
    process.env.CLERK_SECRET_KEY = 'sk_test_ci_dummy';
    process.env.NODE_ENV = 'production';
    process.env.VERCEL = undefined;

    const request = createMockRequest();
    const response = await proxy(request, mockEvent);

    const body = await response?.text();
    expect(body).toBe('clerk-auth-active');
  });

  it('does NOT bypass if CLERK_SECRET_KEY is sk_test_ci_dummy but VERCEL is 1', async () => {
    process.env.CLERK_SECRET_KEY = 'sk_test_ci_dummy';
    process.env.NODE_ENV = 'test';
    process.env.VERCEL = '1';

    const request = createMockRequest();
    const response = await proxy(request, mockEvent);

    const body = await response?.text();
    expect(body).toBe('clerk-auth-active');
  });

  it('DOES bypass when all three conditions are met (genuine CI run)', async () => {
    process.env.CLERK_SECRET_KEY = 'sk_test_ci_dummy';
    process.env.NODE_ENV = 'test';
    process.env.VERCEL = undefined;

    const request = createMockRequest();
    const response = await proxy(request, mockEvent);

    // Should have returned NextResponse.next() which has an empty body
    const body = await response?.text();
    expect(body).toBe('');
    expect(response?.headers.get('x-middleware-next')).toBe('1');
  });
});
