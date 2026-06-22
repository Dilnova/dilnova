import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/webhooks/clerk/route';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { invalidateClerkUserCache, invalidateClerkOrgCache } from '@/shared/auth/clerk-cache';

vi.mock('@/shared/logging/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/shared/auth/clerk-cache', () => ({
  invalidateClerkUserCache: vi.fn(),
  invalidateClerkOrgCache: vi.fn(),
}));

const mockHeaders = vi.fn();
vi.mock('next/headers', () => ({
  headers: () => Promise.resolve(mockHeaders()),
}));

describe('POST /api/webhooks/clerk', () => {
  const secretKey = 'not_a_real_secret_do_not_use';
  const webhookSecret = `whsec_${Buffer.from(secretKey).toString('base64')}`;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('CLERK_WEBHOOK_SECRET', webhookSecret);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns 500 when CLERK_WEBHOOK_SECRET is missing', async () => {
    vi.stubEnv('CLERK_WEBHOOK_SECRET', '');
    const req = new NextRequest('http://localhost:3000/api/webhooks/clerk', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Webhook secret is not configured.');
  });

  it('returns 400 when required svix headers are missing', async () => {
    mockHeaders.mockReturnValue(new Headers({}));
    const req = new NextRequest('http://localhost:3000/api/webhooks/clerk', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing required Svix headers.');
  });

  it('returns 401 when signature verification fails', async () => {
    mockHeaders.mockReturnValue(
      new Headers({
        'svix-id': 'msg_123',
        'svix-timestamp': Math.floor(Date.now() / 1000).toString(),
        'svix-signature': 'v1,invalid_signature_hash',
      })
    );

    const req = new NextRequest('http://localhost:3000/api/webhooks/clerk', {
      method: 'POST',
      body: JSON.stringify({ type: 'user.updated', data: { id: 'user_123' } }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Invalid webhook signature.');
  });

  it('successfully verifies signature and invalidates user cache on user.updated event', async () => {
    const payload = JSON.stringify({ type: 'user.updated', data: { id: 'user_123' } });
    const svixId = 'msg_123';
    const svixTimestamp = Math.floor(Date.now() / 1000).toString();
    const toSign = `${svixId}.${svixTimestamp}.${payload}`;
    const signature = crypto
      .createHmac('sha256', Buffer.from(secretKey))
      .update(toSign)
      .digest('base64');

    mockHeaders.mockReturnValue(
      new Headers({
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': `v1,${signature}`,
      })
    );

    const req = new NextRequest('http://localhost:3000/api/webhooks/clerk', {
      method: 'POST',
      body: payload,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ success: true });

    expect(invalidateClerkUserCache).toHaveBeenCalledWith('user_123');
  });

  it('successfully verifies signature and invalidates org + user caches on organizationMembership.created event', async () => {
    const payload = JSON.stringify({
      type: 'organizationMembership.created',
      data: {
        organization: { id: 'org_123' },
        public_user_data: { user_id: 'user_123' },
      },
    });
    const svixId = 'msg_123';
    const svixTimestamp = Math.floor(Date.now() / 1000).toString();
    const toSign = `${svixId}.${svixTimestamp}.${payload}`;
    const signature = crypto
      .createHmac('sha256', Buffer.from(secretKey))
      .update(toSign)
      .digest('base64');

    mockHeaders.mockReturnValue(
      new Headers({
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': `v1,${signature}`,
      })
    );

    const req = new NextRequest('http://localhost:3000/api/webhooks/clerk', {
      method: 'POST',
      body: payload,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ success: true });

    expect(invalidateClerkOrgCache).toHaveBeenCalledWith('org_123');
    expect(invalidateClerkUserCache).toHaveBeenCalledWith('user_123');
  });

  it('successfully verifies signature and invalidates org cache on organization.updated event', async () => {
    const payload = JSON.stringify({
      type: 'organization.updated',
      data: { id: 'org_123' },
    });
    const svixId = 'msg_123';
    const svixTimestamp = Math.floor(Date.now() / 1000).toString();
    const toSign = `${svixId}.${svixTimestamp}.${payload}`;
    const signature = crypto
      .createHmac('sha256', Buffer.from(secretKey))
      .update(toSign)
      .digest('base64');

    mockHeaders.mockReturnValue(
      new Headers({
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': `v1,${signature}`,
      })
    );

    const req = new NextRequest('http://localhost:3000/api/webhooks/clerk', {
      method: 'POST',
      body: payload,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ success: true });

    expect(invalidateClerkOrgCache).toHaveBeenCalledWith('org_123');
  });
});
