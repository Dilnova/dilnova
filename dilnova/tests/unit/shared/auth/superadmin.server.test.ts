import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getSuperAdminAllowlistFromEnv,
  isSuperAdminUser,
  readSuperAdminGrant,
  SUPERADMIN_PLATFORM_ROLE,
} from '@/shared/auth/superadmin.server';

describe('superadmin.server', () => {
  const originalAllowlist = process.env.SUPERADMIN_USER_IDS;

  beforeEach(() => {
    delete process.env.SUPERADMIN_USER_IDS;
  });

  afterEach(() => {
    if (originalAllowlist) {
      process.env.SUPERADMIN_USER_IDS = originalAllowlist;
    } else {
      delete process.env.SUPERADMIN_USER_IDS;
    }
  });

  it('grants access from privateMetadata.platformRole', () => {
    expect(
      isSuperAdminUser({
        id: 'user_1',
        privateMetadata: { platformRole: SUPERADMIN_PLATFORM_ROLE },
        publicMetadata: { role: 'customer' },
      })
    ).toBe(true);

    expect(readSuperAdminGrant({
      id: 'user_1',
      privateMetadata: { platformRole: SUPERADMIN_PLATFORM_ROLE },
    }).source).toBe('private');
  });

  it('grants access from SUPERADMIN_USER_IDS allowlist', () => {
    process.env.SUPERADMIN_USER_IDS = 'user_allow_1,user_allow_2';

    expect(
      isSuperAdminUser({
        id: 'user_allow_2',
        publicMetadata: {},
        privateMetadata: {},
      })
    ).toBe(true);

    expect(getSuperAdminAllowlistFromEnv().has('user_allow_2')).toBe(true);
  });

  it('denies legacy publicMetadata.role=admin without privateMetadata or allowlist', () => {
    expect(
      isSuperAdminUser({
        id: 'user_legacy',
        publicMetadata: { role: 'admin' },
        privateMetadata: {},
      })
    ).toBe(false);
  });

  it('denies regular customers and vendors', () => {
    expect(
      isSuperAdminUser({
        id: 'user_customer',
        publicMetadata: { role: 'customer' },
        privateMetadata: {},
      })
    ).toBe(false);

    expect(
      isSuperAdminUser({
        id: 'user_vendor',
        publicMetadata: { role: 'vendor' },
        privateMetadata: {},
      })
    ).toBe(false);
  });
});
