import { describe, expect, it, afterEach } from 'vitest';
import { isAuthorizedHealthDetailRequest } from '@/shared/security/health-probe';

describe('isAuthorizedHealthDetailRequest', () => {
  const originalSecret = process.env.HEALTH_CHECK_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.HEALTH_CHECK_SECRET;
    } else {
      process.env.HEALTH_CHECK_SECRET = originalSecret;
    }
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('allows detailed probes in non-production without a secret', () => {
    delete process.env.HEALTH_CHECK_SECRET;
    process.env.NODE_ENV = 'development';

    expect(
      isAuthorizedHealthDetailRequest(new Request('http://localhost/api/health'))
    ).toBe(true);
  });

  it('requires bearer auth in production when a secret is configured', () => {
    process.env.HEALTH_CHECK_SECRET = 'probe-secret';
    process.env.NODE_ENV = 'production';

    const unauthorized = new Request('http://localhost/api/health');
    const authorized = new Request('http://localhost/api/health', {
      headers: { authorization: 'Bearer probe-secret' },
    });

    expect(isAuthorizedHealthDetailRequest(unauthorized)).toBe(false);
    expect(isAuthorizedHealthDetailRequest(authorized)).toBe(true);
  });
});
