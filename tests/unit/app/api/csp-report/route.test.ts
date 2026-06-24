import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/csp-report/route';
import { logger } from '@/shared/logging/logger';
import { NextRequest } from 'next/server';

vi.mock('@/shared/logging/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/shared/security/rate-limit', () => ({
  rateLimit: vi.fn(() => Promise.resolve()),
}));

describe('POST /api/csp-report', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles report-uri format correctly', async () => {
    const reportData = {
      'csp-report': {
        'document-uri': 'http://localhost:3000/test',
        'blocked-uri': 'http://evil.com/script.js',
        'violated-directive': "script-src 'self'",
        'effective-directive': 'script-src',
        'original-policy': "default-src 'self'; script-src 'self'",
        'line-number': 10,
        'column-number': 20,
        'source-file': 'http://localhost:3000/test.js',
        'status-code': 200,
        'referrer': '',
      },
    };

    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      headers: {
        'content-type': 'application/csp-report',
      },
      body: JSON.stringify(reportData),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual({ success: true });

    expect(logger.warn).toHaveBeenCalledWith(
      'CSP Violation Reported (report-uri)',
      expect.objectContaining({
        documentUri: 'http://localhost:3000/test',
        blockedUri: 'http://evil.com/script.js',
        violatedDirective: "script-src 'self'",
      })
    );
  });

  it('handles Report-To format (array) correctly', async () => {
    const reportData = [
      {
        type: 'csp-violation',
        age: 10,
        url: 'http://localhost:3000/test',
        user_agent: 'Mozilla/5.0 ...',
        body: {
          'document-uri': 'http://localhost:3000/test',
          'blocked-uri': 'http://evil.com/style.css',
          'violated-directive': "style-src 'self'",
          'effective-directive': 'style-src',
          'original-policy': '...',
        },
      },
    ];

    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(reportData),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual({ success: true });

    expect(logger.warn).toHaveBeenCalledWith(
      'CSP Violation Reported (Report-To)',
      expect.objectContaining({
        type: 'csp-violation',
        url: 'http://localhost:3000/test',
        userAgent: 'Mozilla/5.0 ...',
      })
    );
  });

  it('handles unknown body formats by logging a fallback payload', async () => {
    const reportData = {
      foo: 'bar',
    };

    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(reportData),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual({ success: true });

    expect(logger.warn).toHaveBeenCalledWith(
      'CSP Violation Reported (Unknown/Invalid Format)',
      expect.objectContaining({
        error: expect.any(String),
      })
    );
  });

  it('returns 400 error status code on invalid json payload', async () => {
    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: 'invalid-json-{',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json).toEqual({ error: 'Invalid JSON' });
  });
});
