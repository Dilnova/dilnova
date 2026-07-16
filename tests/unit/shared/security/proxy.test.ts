import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock clerkMiddleware
vi.mock('@clerk/nextjs/server', () => ({
  clerkMiddleware: vi.fn((handler) => {
    return (req: any, event: any) => {
      const mockAuth = {};
      return handler(mockAuth, req, event);
    };
  }),
}));

// Mock next/server to intercept responses
vi.mock('next/server', async (importOriginal) => {
  const original = await importOriginal<typeof import('next/server')>();
  class MockNextResponse {
    status: number;
    body: string;
    constructor(body: string, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status ?? 200;
    }
    static next() {
      return { headers: { set: () => {} } };
    }
  }
  return {
    ...original,
    NextResponse: MockNextResponse,
  };
});

import proxy from '@/proxy';

describe('Proxy Middleware CSRF Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows GET requests without CSRF check', () => {
    const request = new NextRequest('http://localhost:3000/api/health', {
      method: 'GET',
    });
    const result = proxy(request, {} as any);
    expect(result).not.toBeInstanceOf(NextResponse);
  });

  it('rejects POST requests without next-action header when origin/host are missing', () => {
    const request = new NextRequest('http://localhost:3000/api/some-custom-post', {
      method: 'POST',
    });
    const result = proxy(request, {} as any) as any;
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(403);
    expect(result.body).toContain('Missing Origin or Host header');
  });

  it('allows POST requests to webhooks without CSRF check', () => {
    const request = new NextRequest('http://localhost:3000/api/webhooks/clerk', {
      method: 'POST',
    });
    const result = proxy(request, {} as any);
    expect(result).not.toBeInstanceOf(NextResponse);
  });

  it('allows POST requests to csp-report without CSRF check', () => {
    const request = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
    });
    const result = proxy(request, {} as any);
    expect(result).not.toBeInstanceOf(NextResponse);
  });

  it('rejects POST requests with next-action header but missing origin', () => {
    const request = new NextRequest('http://localhost:3000/some-action', {
      method: 'POST',
      headers: {
        'next-action': 'action-id',
      },
    });
    const result = proxy(request, {} as any) as any;
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(403);
    expect(result.body).toContain('Missing Origin or Host header');
  });

  it('rejects POST requests with mismatched origin and host', () => {
    const request = new NextRequest('http://localhost:3000/some-action', {
      method: 'POST',
      headers: {
        'next-action': 'action-id',
        'origin': 'https://malicious.com',
        'host': 'localhost:3000',
      },
    });
    const result = proxy(request, {} as any) as any;
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(403);
    expect(result.body).toContain('Mismatched Origin and Host');
  });

  it('allows POST requests with matching origin and host', () => {
    const request = new NextRequest('http://localhost:3000/some-action', {
      method: 'POST',
      headers: {
        'next-action': 'action-id',
        'origin': 'http://localhost:3000',
        'host': 'localhost:3000',
      },
    });
    const result = proxy(request, {} as any);
    expect(result).not.toBeInstanceOf(NextResponse);
  });

  it('allows POST requests with matching origin and x-forwarded-host', () => {
    const request = new NextRequest('http://localhost:3000/some-action', {
      method: 'POST',
      headers: {
        'next-action': 'action-id',
        'origin': 'https://dilstar.pp.ua',
        'host': 'internal-load-balancer',
        'x-forwarded-host': 'dilstar.pp.ua',
      },
    });
    const result = proxy(request, {} as any);
    expect(result).not.toBeInstanceOf(NextResponse);
  });
});
