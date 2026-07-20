# Authentication & Authorization Tests Audit

This document contains the source code and security assessment for every test file related to authentication, authorization, or access control in the codebase.

## `tests/unit/features/auth/actions.test.ts`

**Assessment:** Genuine Unit Test. It mocks Clerk's `auth()` to simulate an unauthenticated user and verifies that the `toggleUserRoleAction` correctly rejects the request. It also explicitly tests production environment restrictions.

<details>
<summary>View Test Code</summary>

```typescript
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { toggleUserRoleAction } from '@/features/auth/actions';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

// Mock dependencies
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('toggleUserRoleAction', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should throw a forbidden error in production environments', async () => {
    process.env.NODE_ENV = 'production';

    await expect(toggleUserRoleAction('vendor')).rejects.toThrow(
      'Forbidden: Role toggling is disabled in production environments.'
    );
  });

  it('should throw an unauthorized error when no user is signed in', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    await expect(toggleUserRoleAction('vendor')).rejects.toThrow(
      'Not authorized: You must be logged in to toggle your role.'
    );
  });

  it('should toggle from customer to vendor and update public metadata', async () => {
    const mockUpdateUserMetadata = vi.fn();
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as any);
    vi.mocked(clerkClient).mockResolvedValue({
      users: {
        updateUserMetadata: mockUpdateUserMetadata,
      },
    } as any);

    const result = await toggleUserRoleAction('customer');

    expect(result).toEqual({ success: true, nextRole: 'vendor' });
    expect(mockUpdateUserMetadata).toHaveBeenCalledWith('user_123', {
      publicMetadata: { role: 'vendor' },
    });
    expect(revalidatePath).toHaveBeenCalledWith('/');
    expect(revalidatePath).toHaveBeenCalledWith('/admin');
  });

  it('should toggle from vendor to customer and update public metadata', async () => {
    const mockUpdateUserMetadata = vi.fn();
    vi.mocked(auth).mockResolvedValue({ userId: 'user_456' } as any);
    vi.mocked(clerkClient).mockResolvedValue({
      users: {
        updateUserMetadata: mockUpdateUserMetadata,
      },
    } as any);

    const result = await toggleUserRoleAction('vendor');

    expect(result).toEqual({ success: true, nextRole: 'customer' });
    expect(mockUpdateUserMetadata).toHaveBeenCalledWith('user_456', {
      publicMetadata: { role: 'customer' },
    });
  });
});

```
</details>

---

## `tests/unit/features/superadmin/actions.test.ts`

> [!WARNING]
> **FLAGGED: Trivialized / Mocked Away**
> This test completely mocks away `checkSuperAdmin` to always resolve `true` (`Promise.resolve({ id: 'admin_user_id' })`). It does not contain any test cases that verify what happens when the user is unauthorized. It only tests the happy path and invalid UUIDs, meaning the underlying action could completely remove its security check and this test would still pass.

<details>
<summary>View Test Code</summary>

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server-only
vi.mock('server-only', () => ({}));

// Mock drizzle-orm to avoid loading real package
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}));

// Mock DB
const mockSelectLimit = vi.fn();
const mockSelectWhere = vi.fn(() => ({
  limit: mockSelectLimit,
}));
const mockSelectFrom = vi.fn(() => ({
  where: mockSelectWhere,
}));
const mockSelect = vi.fn(() => ({
  from: mockSelectFrom,
}));

const mockUpdateWhere = vi.fn(() => Promise.resolve());
const mockUpdateSet = vi.fn(() => ({
  where: mockUpdateWhere,
}));
const mockUpdate = vi.fn(() => ({
  set: mockUpdateSet,
}));

vi.mock('@/shared/db/client', () => ({
  db: {
    select: () => mockSelect(),
    update: () => mockUpdate(),
  },
}));

// Mock Clerk
const mockGetUserList = vi.fn();
const mockUpdateUserMetadata = vi.fn();
vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(() => Promise.resolve({
    users: {
      getUserList: () => mockGetUserList(),
      updateUserMetadata: () => mockUpdateUserMetadata(),
    },
  })),
}));

// Mock Superadmin Guard & Server Helpers
vi.mock('@/shared/auth/superadmin-guard', () => ({
  checkSuperAdmin: vi.fn(() => Promise.resolve({ id: 'admin_user_id' })),
}));

vi.mock('@/shared/auth/superadmin.server', () => ({
  isSuperAdminUser: vi.fn(() => false),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

// Mock logger to prevent @sentry/node import block in sandbox
vi.mock('@/shared/logging/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  redactSensitiveData: vi.fn((x) => x),
}));

// Mock Async Context, Rate Limit, Audit logging
vi.mock('@/shared/security/async-context', () => ({
  runWithCorrelationId: (fn: any) => fn(),
}));

vi.mock('@/shared/security/rate-limit', () => ({
  rateLimit: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/shared/audit/logger', () => ({
  logAuditAction: vi.fn(() => Promise.resolve()),
}));

import { updateContactStatusAction } from '@/features/superadmin/actions';

describe('updateContactStatusAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid UUID format for id', async () => {
    await expect(updateContactStatusAction('invalid-uuid', 'connected')).rejects.toThrow('Invalid ID format.');
  });

  it('performs query and update when valid UUID is passed', async () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    mockSelectLimit.mockResolvedValueOnce([{ email: 'test@example.com' }]);
    mockGetUserList.mockResolvedValueOnce({ data: [] }); // No user to sync

    const result = await updateContactStatusAction(validUuid, 'connected');

    expect(result.success).toBe(true);
    expect(mockSelectLimit).toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenCalled();
  });
});

```
</details>

---

## `tests/unit/features/vendor-org/integrity.test.ts`

**Assessment:** Genuine Unit Test. The test asserts business logic, ownership filters, or guard logic directly. Mocks are used appropriately to isolate the function under test without bypassing the core assertions.

<details>
<summary>View Test Code</summary>

```typescript
import { describe, expect, it } from 'vitest';
import {
  buildVendorOrgIntegrityReport,
  countSelectedScopeRecords,
  formatReassignCounts,
  getDefaultReassignScopesForGroup,
} from '@/features/vendor-org/integrity';

describe('vendorOrgIntegrity', () => {
  it('groups orphaned org references across entities', () => {
    const report = buildVendorOrgIntegrityReport(new Set(['org_live']), {
      products: [
        { id: 'p1', name: 'Widget', type: 'product', orgId: 'org_dead', status: 'active' },
        { id: 'p2', name: 'Service', type: 'service', orgId: 'org_live', status: 'active' },
      ],
      orderItems: [
        {
          id: 'oi1',
          orderId: 'o1',
          productName: 'Widget',
          vendorOrgId: 'org_dead',
        },
      ],
      suppliers: [],
      branches: [],
      billingReceipts: [],
    });

    expect(report.totals.orphanOrgIds).toBe(1);
    expect(report.totals.products).toBe(1);
    expect(report.totals.orderItems).toBe(1);
    expect(report.issueGroups[0]?.orgId).toBe('org_dead');
    expect(report.issueGroups[0]?.totalAffected).toBe(2);
  });

  it('derives default scopes and selected counts from issue groups', () => {
    const group = {
      orgId: 'org_dead',
      products: [{ id: 'p1', name: 'Widget', type: 'product', orgId: 'org_dead', status: 'active' }],
      orderItems: [],
      suppliers: [{ id: 's1', name: 'Supplier', orgId: 'org_dead' }],
      branches: [],
      billingReceipts: [],
      totalAffected: 2,
    };

    expect(getDefaultReassignScopesForGroup(group)).toEqual({
      products: true,
      orderItems: false,
      suppliers: true,
      branches: false,
      billingReceipts: false,
    });
    expect(countSelectedScopeRecords(group, getDefaultReassignScopesForGroup(group))).toBe(2);
    expect(
      formatReassignCounts({
        products: 1,
        orderItems: 0,
        suppliers: 1,
        branches: 0,
        billingReceipts: 0,
      })
    ).toBe('1 product, 1 supplier');
  });
});

```
</details>

---

## `tests/unit/features/cart/vendor-checkout.test.ts`

**Assessment:** Genuine Unit Test. The test asserts business logic, ownership filters, or guard logic directly. Mocks are used appropriately to isolate the function under test without bypassing the core assertions.

<details>
<summary>View Test Code</summary>

```typescript
import { describe, expect, it } from 'vitest';
import {
  buildVendorCartSummaries,
  filterCartLinesByVendorOrg,
  resolveCheckoutVendorOrgId,
} from '@/features/cart/vendor-checkout';

describe('cartVendorCheckout', () => {
  const productById = new Map([
    ['p1', { id: 'p1', orgId: 'org_a', price: 1000 }],
    ['p2', { id: 'p2', orgId: 'org_a', price: 500 }],
    ['p3', { id: 'p3', orgId: 'org_b', price: 2000 }],
  ]);

  const lines = [
    { id: 'p1', quantity: 2, price: 1000 },
    { id: 'p3', quantity: 1, price: 2000 },
  ];

  it('builds per-vendor summaries with product ids', () => {
    const summaries = buildVendorCartSummaries(lines, productById, {
      org_a: 'Vendor A',
      org_b: 'Vendor B',
    });

    expect(summaries).toHaveLength(2);
    expect(summaries.find((entry) => entry.orgId === 'org_a')).toMatchObject({
      vendorName: 'Vendor A',
      subtotalCents: 2000,
      productIds: ['p1'],
      itemCount: 2,
    });
    expect(summaries.find((entry) => entry.orgId === 'org_b')).toMatchObject({
      vendorName: 'Vendor B',
      subtotalCents: 2000,
      productIds: ['p3'],
      itemCount: 1,
    });
  });

  it('filters cart lines to a selected vendor org', () => {
    const filtered = filterCartLinesByVendorOrg(lines, productById, 'org_b');
    expect(filtered).toEqual([{ id: 'p3', quantity: 1, price: 2000 }]);
  });

  it('resolves checkout vendor org id for multi-vendor carts', () => {
    const summaries = buildVendorCartSummaries(lines, productById);
    expect(resolveCheckoutVendorOrgId(summaries, undefined)).toBeNull();
    expect(resolveCheckoutVendorOrgId(summaries, 'org_b')).toBe('org_b');
    expect(resolveCheckoutVendorOrgId([summaries[0]], 'org_b')).toBe(summaries[0].orgId);
  });
});

```
</details>

---

## `tests/unit/features/orders/vendor-scope.test.ts`

**Assessment:** Genuine Unit Test. The test asserts business logic, ownership filters, or guard logic directly. Mocks are used appropriately to isolate the function under test without bypassing the core assertions.

<details>
<summary>View Test Code</summary>

```typescript
import { describe, expect, it } from 'vitest';
import {
  MULTI_VENDOR_ORDER_CHECKOUT_ERROR,
  MULTI_VENDOR_VENDOR_ACTION_ERROR,
  orderSpansMultipleVendors,
} from '@/features/orders/vendor-scope';

describe('orderVendorScope', () => {
  it('detects multi-vendor orders', () => {
    expect(orderSpansMultipleVendors(['org_a'])).toBe(false);
    expect(orderSpansMultipleVendors(['org_a', 'org_a'])).toBe(false);
    expect(orderSpansMultipleVendors(['org_a', 'org_b'])).toBe(true);
  });

  it('exports stable error messages', () => {
    expect(MULTI_VENDOR_ORDER_CHECKOUT_ERROR).toContain('Select one vendor');
    expect(MULTI_VENDOR_VENDOR_ACTION_ERROR).toContain('multiple vendors');
  });
});

```
</details>

---

## `tests/unit/features/orders/customer-ownership.test.ts`

**Assessment:** Genuine Unit Test. The test asserts business logic, ownership filters, or guard logic directly. Mocks are used appropriately to isolate the function under test without bypassing the core assertions.

<details>
<summary>View Test Code</summary>

```typescript
import { describe, expect, it } from 'vitest';
import {
  buildCustomerOrderAccessWhere,
  customerOwnsOrder,
} from '@/features/orders/customer-ownership';

describe('customerOwnsOrder', () => {
  const boundOrder = {
    customerUserId: 'user_victim',
  };

  it('grants access to the bound Clerk user', () => {
    expect(customerOwnsOrder(boundOrder, 'user_victim')).toBe(true);
  });

  it('denies a different Clerk user', () => {
    expect(customerOwnsOrder(boundOrder, 'user_attacker')).toBe(false);
  });

  it('denies access when the order has no customerUserId', () => {
    expect(customerOwnsOrder({ customerUserId: null }, 'user_guest')).toBe(false);
  });

  it('denies access when the session user id is missing', () => {
    expect(customerOwnsOrder(boundOrder, null)).toBe(false);
  });
});

describe('buildCustomerOrderAccessWhere', () => {
  it('returns a SQL fragment for the Clerk user id', () => {
    expect(buildCustomerOrderAccessWhere('user_1')).toBeTruthy();
  });

  it('returns a false SQL clause when user id is missing', () => {
    const clause = buildCustomerOrderAccessWhere(null);
    expect(clause).toBeTruthy();
    expect(JSON.stringify(clause)).toContain('false');
  });
});

```
</details>

---

## `tests/unit/shared/auth/org-membership.test.ts`

**Assessment:** Genuine Unit Test. The test asserts business logic, ownership filters, or guard logic directly. Mocks are used appropriately to isolate the function under test without bypassing the core assertions.

<details>
<summary>View Test Code</summary>

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isUserMemberOfOrganization } from '@/shared/auth/org-membership.server';
import { clerkClient } from '@clerk/nextjs/server';

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(),
}));

describe('isUserMemberOfOrganization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when the user is listed in the organization memberships', async () => {
    vi.mocked(clerkClient).mockResolvedValue({
      organizations: {
        getOrganizationMembershipList: vi.fn().mockResolvedValue({
          data: [
            {
              publicUserData: { userId: 'user_vendor' },
            },
          ],
          totalCount: 1,
        }),
      },
    } as never);

    await expect(isUserMemberOfOrganization('user_vendor', 'org_abc')).resolves.toBe(true);
  });

  it('returns false when the user is not a member', async () => {
    vi.mocked(clerkClient).mockResolvedValue({
      organizations: {
        getOrganizationMembershipList: vi.fn().mockResolvedValue({
          data: [
            {
              publicUserData: { userId: 'user_other' },
            },
          ],
          totalCount: 1,
        }),
      },
    } as never);

    await expect(isUserMemberOfOrganization('user_customer', 'org_abc')).resolves.toBe(false);
  });

  it('paginates membership results when needed', async () => {
    const getOrganizationMembershipList = vi
      .fn()
      .mockResolvedValueOnce({
        data: Array.from({ length: 100 }, (_, index) => ({
          publicUserData: { userId: `user_${index}` },
        })),
        totalCount: 101,
      })
      .mockResolvedValueOnce({
        data: [{ publicUserData: { userId: 'user_target' } }],
        totalCount: 101,
      });

    vi.mocked(clerkClient).mockResolvedValue({
      organizations: { getOrganizationMembershipList },
    } as never);

    await expect(isUserMemberOfOrganization('user_target', 'org_abc')).resolves.toBe(true);
    expect(getOrganizationMembershipList).toHaveBeenCalledTimes(2);
  });
});

```
</details>

---

## `tests/unit/shared/auth/superadmin.server.test.ts`

**Assessment:** Genuine Unit Test. The test asserts business logic, ownership filters, or guard logic directly. Mocks are used appropriately to isolate the function under test without bypassing the core assertions.

<details>
<summary>View Test Code</summary>

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
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

  it('grants access when BOTH Clerk privateMetadata is correct and user ID is listed in environment allowlist', () => {
    process.env.SUPERADMIN_USER_IDS = 'user_1,user_2';

    expect(
      isSuperAdminUser({
        id: 'user_1',
        privateMetadata: { platformRole: SUPERADMIN_PLATFORM_ROLE },
        publicMetadata: { role: 'customer' },
      })
    ).toBe(true);

    expect(
      readSuperAdminGrant({
        id: 'user_1',
        privateMetadata: { platformRole: SUPERADMIN_PLATFORM_ROLE },
      })
    ).toEqual({ granted: true, source: 'dual_gate' });
  });

  it('denies access when user has Clerk privateMetadata but is NOT in environment allowlist', () => {
    process.env.SUPERADMIN_USER_IDS = 'user_other';

    expect(
      isSuperAdminUser({
        id: 'user_1',
        privateMetadata: { platformRole: SUPERADMIN_PLATFORM_ROLE },
        publicMetadata: { role: 'customer' },
      })
    ).toBe(false);

    expect(
      readSuperAdminGrant({
        id: 'user_1',
        privateMetadata: { platformRole: SUPERADMIN_PLATFORM_ROLE },
      })
    ).toEqual({ granted: false, source: null });
  });

  it('denies access when user is in environment allowlist but lacks Clerk privateMetadata', () => {
    process.env.SUPERADMIN_USER_IDS = 'user_1';

    expect(
      isSuperAdminUser({
        id: 'user_1',
        privateMetadata: {},
        publicMetadata: {},
      })
    ).toBe(false);
  });

  it('denies legacy publicMetadata.role=admin', () => {
    process.env.SUPERADMIN_USER_IDS = 'user_legacy';

    expect(
      isSuperAdminUser({
        id: 'user_legacy',
        publicMetadata: { role: 'admin' },
        privateMetadata: {},
      })
    ).toBe(false);
  });

  it('denies regular customers and vendors', () => {
    process.env.SUPERADMIN_USER_IDS = 'user_customer,user_vendor';

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

```
</details>

---

## `tests/unit/shared/auth/superadmin-guard.test.ts`

**Assessment:** Genuine Unit Test. The test asserts business logic, ownership filters, or guard logic directly. Mocks are used appropriately to isolate the function under test without bypassing the core assertions.

<details>
<summary>View Test Code</summary>

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkSuperAdmin, getCurrentSuperAdminUser } from '@/shared/auth/superadmin-guard';
import { auth, clerkClient } from '@clerk/nextjs/server';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
}));

describe('superadmin-guard', () => {
  const originalAllowlist = process.env.SUPERADMIN_USER_IDS;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPERADMIN_USER_IDS = 'user_admin';
  });

  afterEach(() => {
    if (originalAllowlist) {
      process.env.SUPERADMIN_USER_IDS = originalAllowlist;
    } else {
      delete process.env.SUPERADMIN_USER_IDS;
    }
  });

  it('checkSuperAdmin loads the user from Clerk and validates privateMetadata', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_admin' } as never);
    vi.mocked(clerkClient).mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          id: 'user_admin',
          privateMetadata: { platformRole: 'superadmin' },
          publicMetadata: { role: 'vendor' },
        }),
      },
    } as never);

    const user = await checkSuperAdmin();
    expect(user.id).toBe('user_admin');
  });

  it('checkSuperAdmin rejects users without a superadmin grant', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_customer' } as never);
    vi.mocked(clerkClient).mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          id: 'user_customer',
          privateMetadata: {},
          publicMetadata: { role: 'customer' },
        }),
      },
    } as never);

    await expect(checkSuperAdmin()).rejects.toThrow(
      'Unauthorized: Only global administrators can perform this action.'
    );
  });

  it('getCurrentSuperAdminUser returns null when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    await expect(getCurrentSuperAdminUser()).resolves.toBeNull();
  });
});

```
</details>

---

## `tests/unit/shared/media/sanitize-vendor-public-metadata.test.ts`

**Assessment:** Genuine Unit Test. The test asserts business logic, ownership filters, or guard logic directly. Mocks are used appropriately to isolate the function under test without bypassing the core assertions.

<details>
<summary>View Test Code</summary>

```typescript
import { describe, expect, it } from 'vitest';
import { sanitizeVendorPublicMetadata } from '@/shared/media/sanitize-vendor-public-metadata';

describe('sanitizeVendorPublicMetadata', () => {
  it('removes bank transfer fields from storefront metadata', () => {
    expect(
      sanitizeVendorPublicMetadata({
        description: 'Hardware store',
        bankName: 'Leak Bank',
        bankAccountNumber: '123456',
        bannerUrl: 'https://res.cloudinary.com/demo/image/upload/banner.jpg',
      })
    ).toEqual({
      description: 'Hardware store',
      bannerUrl: 'https://res.cloudinary.com/demo/image/upload/banner.jpg',
    });
  });

  it('drops unknown keys', () => {
    expect(
      sanitizeVendorPublicMetadata({
        description: 'Shop',
        secretField: 'nope',
      })
    ).toEqual({
      description: 'Shop',
    });
  });
});

```
</details>

---

## `tests/e2e/rbac/vendor-admin.spec.ts`

**Assessment:** Genuine E2E Test. This test uses Playwright to execute real network requests against the application endpoints/actions under different authenticated (or unauthenticated) contexts and verifies the responses.

<details>
<summary>View Test Code</summary>

```typescript
import { test, expect } from '@playwright/test';
import { authStateExists } from '../helpers/env';
import { PROTECTED_ROUTES, UNAUTHORIZED_PATH } from '../helpers/routes';

test.beforeEach(() => {
  test.skip(!authStateExists('vendor-admin'), 'Run auth.setup with E2E_VENDOR_ADMIN_EMAIL to enable this suite.');
});

test.describe('Vendor admin RBAC', () => {
  test('can access vendor console', async ({ page }) => {
    await page.goto(PROTECTED_ROUTES.vendor);
    await expect(page).toHaveURL(/\/vendor/);
    await expect(page).not.toHaveURL(new RegExp(`${UNAUTHORIZED_PATH.replace('/', '\\/')}$`));
  });

  test('can access org admin console', async ({ page }) => {
    await page.goto(PROTECTED_ROUTES.admin);
    await expect(page).toHaveURL(/\/admin/);
    await expect(page).not.toHaveURL(new RegExp(`${UNAUTHORIZED_PATH.replace('/', '\\/')}$`));
  });

  test('cannot access superadmin console', async ({ page }) => {
    await page.goto(PROTECTED_ROUTES.superadmin);
    await expect(page).toHaveURL(new RegExp(`${UNAUTHORIZED_PATH.replace('/', '\\/')}$`));
  });
});

```
</details>

---

## `tests/e2e/rbac/superadmin.spec.ts`

**Assessment:** Genuine E2E Test. This test uses Playwright to execute real network requests against the application endpoints/actions under different authenticated (or unauthenticated) contexts and verifies the responses.

<details>
<summary>View Test Code</summary>

```typescript
import { test, expect } from '@playwright/test';
import { authStateExists } from '../helpers/env';
import { PROTECTED_ROUTES, UNAUTHORIZED_PATH } from '../helpers/routes';

test.beforeEach(() => {
  test.skip(!authStateExists('superadmin'), 'Run auth.setup with E2E_SUPERADMIN_EMAIL to enable this suite.');
});

test.describe('Superadmin RBAC', () => {
  test('can access superadmin console', async ({ page }) => {
    await page.goto(PROTECTED_ROUTES.superadmin);
    await expect(page).toHaveURL(/\/superadmin/);
    await expect(page).not.toHaveURL(new RegExp(`${UNAUTHORIZED_PATH.replace('/', '\\/')}$`));
  });

  test('cannot access vendor console without org membership', async ({ page }) => {
    await page.goto(PROTECTED_ROUTES.vendor);
    await expect(page).toHaveURL(new RegExp(`${UNAUTHORIZED_PATH.replace('/', '\\/')}$`));
  });
});

```
</details>

---

## `tests/e2e/rbac/customer.spec.ts`

**Assessment:** Genuine E2E Test. This test uses Playwright to execute real network requests against the application endpoints/actions under different authenticated (or unauthenticated) contexts and verifies the responses.

<details>
<summary>View Test Code</summary>

```typescript
import { test, expect } from '@playwright/test';
import { authStateExists } from '../helpers/env';
import { PROTECTED_ROUTES, UNAUTHORIZED_PATH } from '../helpers/routes';

test.beforeEach(() => {
  test.skip(!authStateExists('customer'), 'Run auth.setup with E2E_CUSTOMER_EMAIL to enable this suite.');
});

test.describe('Customer RBAC', () => {
  test('can access customer portal', async ({ page }) => {
    await page.goto(PROTECTED_ROUTES.customer);
    await expect(page).toHaveURL(/\/customer/);
    await expect(page).not.toHaveURL(new RegExp(`${UNAUTHORIZED_PATH.replace('/', '\\/')}$`));
  });

  test('cannot access vendor console', async ({ page }) => {
    await page.goto(PROTECTED_ROUTES.vendor);
    await expect(page).toHaveURL(new RegExp(`${UNAUTHORIZED_PATH.replace('/', '\\/')}$`));
  });

  test('cannot access superadmin console', async ({ page }) => {
    await page.goto(PROTECTED_ROUTES.superadmin);
    await expect(page).toHaveURL(new RegExp(`${UNAUTHORIZED_PATH.replace('/', '\\/')}$`));
  });
});

```
</details>

---

## `tests/e2e/rbac/unauthenticated.spec.ts`

**Assessment:** Genuine E2E Test. This test uses Playwright to execute real network requests against the application endpoints/actions under different authenticated (or unauthenticated) contexts and verifies the responses.

<details>
<summary>View Test Code</summary>

```typescript
import { test, expect } from '../fixtures/clerk';
import { isAuthWallUrl, PROTECTED_ROUTES } from '../helpers/routes';

test.describe('Unauthenticated access', () => {
  for (const [label, path] of Object.entries(PROTECTED_ROUTES)) {
    test(`blocks ${label} (${path})`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      
      // Wait for Next.js client-side router to process the RSC redirect
      await page.waitForURL((url) => isAuthWallUrl(url.toString()), { timeout: 10000 }).catch(() => {});
      
      console.log(`URL for ${label}:`, page.url());
      expect(isAuthWallUrl(page.url())).toBe(true);
    });
  }
});

```
</details>

---

## `tests/e2e/rbac/vendor-member.spec.ts`

**Assessment:** Genuine E2E Test. This test uses Playwright to execute real network requests against the application endpoints/actions under different authenticated (or unauthenticated) contexts and verifies the responses.

<details>
<summary>View Test Code</summary>

```typescript
import { test, expect } from '@playwright/test';
import { authStateExists } from '../helpers/env';
import { PROTECTED_ROUTES, UNAUTHORIZED_PATH } from '../helpers/routes';

test.beforeEach(() => {
  test.skip(!authStateExists('vendor-member'), 'Run auth.setup with E2E_VENDOR_MEMBER_EMAIL to enable this suite.');
});

test.describe('Vendor member RBAC', () => {
  test('can access vendor console', async ({ page }) => {
    await page.goto(PROTECTED_ROUTES.vendor);
    await expect(page).toHaveURL(/\/vendor/);
    await expect(page).not.toHaveURL(new RegExp(`${UNAUTHORIZED_PATH.replace('/', '\\/')}$`));
  });

  test('can access POS billing', async ({ page }) => {
    await page.goto(PROTECTED_ROUTES.vendorBilling);
    await expect(page).toHaveURL(/\/vendor\/billing/);
    await expect(page).not.toHaveURL(new RegExp(`${UNAUTHORIZED_PATH.replace('/', '\\/')}$`));
  });

  test('cannot access org admin console', async ({ page }) => {
    await page.goto(PROTECTED_ROUTES.admin);
    await expect(page).toHaveURL(new RegExp(`${UNAUTHORIZED_PATH.replace('/', '\\/')}$`));
  });

  test('cannot access superadmin console', async ({ page }) => {
    await page.goto(PROTECTED_ROUTES.superadmin);
    await expect(page).toHaveURL(new RegExp(`${UNAUTHORIZED_PATH.replace('/', '\\/')}$`));
  });
});

```
</details>

---

## `tests/e2e/rbac/public-routes.spec.ts`

**Assessment:** Genuine E2E Test. This test uses Playwright to execute real network requests against the application endpoints/actions under different authenticated (or unauthenticated) contexts and verifies the responses.

<details>
<summary>View Test Code</summary>

```typescript
import { test, expect } from '../fixtures/clerk';
import { PUBLIC_ROUTES } from '../helpers/routes';

test.describe('Public routes', () => {
  test.setTimeout(60_000);

  for (const route of PUBLIC_ROUTES) {
    test(`${route} is accessible without sign-in`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'commit', timeout: 45_000 });
      expect(response?.status()).toBeLessThan(400);
      await expect(page).not.toHaveURL(/sign-in/);
    });
  }
});

test('unauthorized page is reachable without sign-in', async ({ page }) => {
  const response = await page.goto('/unauthorized', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBeLessThan(400);
  await expect(page.getByRole('heading', { name: /403 - Unauthorized/i })).toBeVisible();
});

```
</details>

---

## `tests/e2e/security/vendor-member-actions.spec.ts`

**Assessment:** Genuine E2E Test. This test uses Playwright to execute real network requests against the application endpoints/actions under different authenticated (or unauthenticated) contexts and verifies the responses.

<details>
<summary>View Test Code</summary>

```typescript
import { test } from '@playwright/test';
import {
  loadSecurityFixtureContext,
  loadSecurityFixtures,
} from '../helpers/security-fixtures';
import { NON_EXISTENT_UUID } from '../helpers/security-constants';
import { skipUnlessSecurityEnv } from '../helpers/security-skip';
import {
  expectSecurityDenied,
  invokeServerAction,
  waitForServerActionManifest,
} from '../helpers/server-action';

let fixtures: Awaited<ReturnType<typeof loadSecurityFixtures>>;

test.beforeAll(async () => {
  await waitForServerActionManifest();
  const context = await loadSecurityFixtureContext();
  fixtures = context ? await loadSecurityFixtures(context) : null;
});

test.describe('Vendor member server-action restrictions', () => {
  test.beforeEach(({}, testInfo) => {
    skipUnlessSecurityEnv(testInfo, 'vendor-member', fixtures);
  });

  test('cannot delete a product in their org', async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: '/vendor?tab=catalog',
      moduleFileSuffix: 'catalog/vendor.actions',
      exportName: 'deleteProductAction',
      args: [NON_EXISTENT_UUID],
    });
    expectSecurityDenied(result);
  });

  test('cannot verify an order payment', async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: '/vendor?tab=inventory&imsTab=orders',
      moduleFileSuffix: 'orders/vendor.actions',
      exportName: 'verifyOrderPaymentAction',
      args: [fixtures!.foreignVendorOrderId],
    });
    expectSecurityDenied(result);
  });

  test('cannot cancel a vendor order', async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: '/vendor?tab=inventory&imsTab=orders',
      moduleFileSuffix: 'orders/vendor.actions',
      exportName: 'cancelVendorOrderAction',
      args: [fixtures!.foreignVendorOrderId],
    });
    expectSecurityDenied(result);
  });

  test('cannot reject a payment slip', async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: '/vendor?tab=inventory&imsTab=orders',
      moduleFileSuffix: 'orders/vendor.actions',
      exportName: 'rejectPaymentSlipAction',
      args: [fixtures!.foreignVendorOrderId, 'E2E rejection attempt'],
    });
    expectSecurityDenied(result);
  });
});

```
</details>

---

## `tests/e2e/security/vendor-admin-actions.spec.ts`

**Assessment:** Genuine E2E Test. This test uses Playwright to execute real network requests against the application endpoints/actions under different authenticated (or unauthenticated) contexts and verifies the responses.

<details>
<summary>View Test Code</summary>

```typescript
import { test } from '@playwright/test';
import {
  loadSecurityFixtureContext,
  loadSecurityFixtures,
} from '../helpers/security-fixtures';
import { NON_EXISTENT_UUID } from '../helpers/security-constants';
import { skipUnlessSecurityEnv } from '../helpers/security-skip';
import {
  expectSecurityDenied,
  invokeServerAction,
  waitForServerActionManifest,
} from '../helpers/server-action';

let fixtures: Awaited<ReturnType<typeof loadSecurityFixtures>>;

test.beforeAll(async () => {
  await waitForServerActionManifest();
  const context = await loadSecurityFixtureContext();
  fixtures = context ? await loadSecurityFixtures(context) : null;
});

test.describe('Vendor admin cross-tenant server-action IDOR', () => {
  test.beforeEach(({}, testInfo) => {
    skipUnlessSecurityEnv(testInfo, 'vendor-admin', fixtures);
  });

  test('cannot delete another vendor product', async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: '/vendor?tab=catalog',
      moduleFileSuffix: 'catalog/vendor.actions',
      exportName: 'deleteProductAction',
      args: [fixtures!.foreignVendorProductId],
    });
    expectSecurityDenied(result);
  });

  test('cannot verify payment for an order outside their org', async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: '/vendor?tab=inventory&imsTab=orders',
      moduleFileSuffix: 'orders/vendor.actions',
      exportName: 'verifyOrderPaymentAction',
      args: [fixtures!.foreignVendorOrderId],
    });
    expectSecurityDenied(result);
  });

  test('cannot cancel an order outside their org', async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: '/vendor?tab=inventory&imsTab=orders',
      moduleFileSuffix: 'orders/vendor.actions',
      exportName: 'cancelVendorOrderAction',
      args: [fixtures!.foreignVendorOrderId],
    });
    expectSecurityDenied(result);
  });

  test('cannot reject a payment slip for an order outside their org', async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: '/vendor?tab=inventory&imsTab=orders',
      moduleFileSuffix: 'orders/vendor.actions',
      exportName: 'rejectPaymentSlipAction',
      args: [fixtures!.foreignVendorOrderId, 'E2E cross-tenant reject'],
    });
    expectSecurityDenied(result);
  });
});

test.describe('Vendor admin blocked from platform admin mutations', () => {
  test.beforeEach(({}, testInfo) => {
    skipUnlessSecurityEnv(testInfo, 'vendor-admin');
  });

  test('cannot create a superadmin pricing plan', async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: '/superadmin',
      moduleFileSuffix: 'superadmin/actions',
      exportName: 'createPricingPlanAction',
      args: [
        {
          name: 'E2E Intrusion Plan',
          price: '999',
          period: 'month',
          features: ['blocked'],
          isPopular: false,
          buttonText: 'Blocked',
          buttonLink: '/',
        },
      ],
    });
    expectSecurityDenied(result);
  });

  test('cannot delete a product via superadmin action endpoint', async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: '/superadmin',
      moduleFileSuffix: 'catalog/superadmin.actions',
      exportName: 'deleteProductAction',
      args: [fixtures?.foreignVendorProductId ?? NON_EXISTENT_UUID],
    });
    expectSecurityDenied(result);
  });
});

```
</details>

---

## `tests/e2e/security/superadmin-actions.spec.ts`

**Assessment:** Genuine E2E Test. This test uses Playwright to execute real network requests against the application endpoints/actions under different authenticated (or unauthenticated) contexts and verifies the responses.

<details>
<summary>View Test Code</summary>

```typescript
import { test, expect } from '@playwright/test';
import { NON_EXISTENT_UUID } from '../helpers/security-constants';
import { skipUnlessSuperadminSecurityEnv } from '../helpers/security-skip';
import {
  expectSecurityDenied,
  invokeServerAction,
  waitForServerActionManifest,
} from '../helpers/server-action';

test.beforeAll(async () => {
  await waitForServerActionManifest();
});

test.describe('Superadmin blocked from vendor org mutations without membership', () => {
  test.beforeEach(({}, testInfo) => {
    skipUnlessSuperadminSecurityEnv(testInfo);
  });

  test('cannot delete a vendor catalog product via vendor action', async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: '/vendor?tab=catalog',
      moduleFileSuffix: 'catalog/vendor.actions',
      exportName: 'deleteProductAction',
      args: [NON_EXISTENT_UUID],
    });
    expectSecurityDenied(result);
  });

  test('cannot verify vendor orders without vendor org context', async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: '/vendor?tab=inventory&imsTab=orders',
      moduleFileSuffix: 'orders/vendor.actions',
      exportName: 'verifyOrderPaymentAction',
      args: [NON_EXISTENT_UUID],
    });
    expectSecurityDenied(result);
  });
});

test.describe('Superadmin platform actions remain reachable', () => {
  test.beforeEach(({}, testInfo) => {
    skipUnlessSuperadminSecurityEnv(testInfo);
  });

  test('can invoke superadmin pricing action without auth rejection', async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: '/superadmin',
      moduleFileSuffix: 'superadmin/actions',
      exportName: 'createPricingPlanAction',
      args: [
        {
          name: '',
          price: '',
          period: 'month',
          features: [],
          isPopular: false,
          buttonText: '',
          buttonLink: '/',
        },
      ],
    });

    expect(result.actionNotFound).toBe(false);
    expect(result.status).toBeGreaterThanOrEqual(400);
    expect(result.text).not.toMatch(/global administrators|Only global administrators/i);
    expect(result.text).not.toMatch(/You must be signed in|Please sign in/i);
  });
});

test.describe('Superadmin cannot mutate org membership for arbitrary org without context', () => {
  test.beforeEach(({}, testInfo) => {
    skipUnlessSuperadminSecurityEnv(testInfo);
  });

  test('updateOrganizationMemberRole rejects foreign org context', async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: '/admin',
      moduleFileSuffix: 'admin/actions',
      exportName: 'updateOrganizationMemberRole',
      args: ['org_e2e_foreign', 'user_e2e_foreign', 'org:member'],
    });
    expectSecurityDenied(result);
  });
});

```
</details>

---

## `tests/e2e/security/customer-idor.spec.ts`

**Assessment:** Genuine E2E Test. This test uses Playwright to execute real network requests against the application endpoints/actions under different authenticated (or unauthenticated) contexts and verifies the responses.

<details>
<summary>View Test Code</summary>

```typescript
import { test, expect } from '@playwright/test';
import {
  loadAnyProductId,
  loadSecurityFixtureContext,
  loadSecurityFixtures,
} from '../helpers/security-fixtures';
import { NON_EXISTENT_UUID } from '../helpers/security-constants';
import { skipUnlessSecurityEnv } from '../helpers/security-skip';
import {
  expectSecurityDenied,
  invokeServerAction,
  waitForServerActionManifest,
} from '../helpers/server-action';

let fixtures: Awaited<ReturnType<typeof loadSecurityFixtures>>;

test.beforeAll(async () => {
  await waitForServerActionManifest();
  const context = await loadSecurityFixtureContext();
  fixtures = context ? await loadSecurityFixtures(context) : null;
});

test.describe('Customer server-action IDOR', () => {
  test.beforeEach(({}, testInfo) => {
    skipUnlessSecurityEnv(testInfo, 'customer', fixtures);
  });

  test('cannot initialize a payment slip upload for another customer order', async ({ page }) => {
    const orderId = fixtures!.foreignCustomerOrderId;

    const result = await invokeServerAction(page, {
      postPath: `/customer/invoice/${orderId}`,
      moduleFileSuffix: 'orders/customer.actions',
      exportName: 'createPaymentSlipUploadPresignedUrlAction',
      args: [{ orderId, fileName: 'slip.png', fileSize: 1024, fileType: 'image/png' }],
    });

    expectSecurityDenied(result);
  });

  test('cannot submit a payment slip path for another customer order', async ({ page }) => {
    const orderId = fixtures!.foreignCustomerOrderId;

    const result = await invokeServerAction(page, {
      postPath: `/customer/invoice/${orderId}`,
      moduleFileSuffix: 'orders/customer.actions',
      exportName: 'submitPaymentSlipPathAction',
      args: [{ orderId, storagePath: `orders/${orderId}/slip.png` }],
    });

    expectSecurityDenied(result);
  });

  test('cannot initialize a payment slip upload for a non-existent order', async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: '/customer',
      moduleFileSuffix: 'orders/customer.actions',
      exportName: 'createPaymentSlipUploadPresignedUrlAction',
      args: [{ orderId: NON_EXISTENT_UUID, fileName: 'slip.png', fileSize: 1024, fileType: 'image/png' }],
    });

    expectSecurityDenied(result);
  });
});

test.describe('Customer invoice route IDOR', () => {
  test.beforeEach(({}, testInfo) => {
    skipUnlessSecurityEnv(testInfo, 'customer', fixtures);
  });

  test('cannot view another customer invoice by URL', async ({ page }) => {
    await page.goto(`/customer/invoice/${fixtures!.foreignCustomerOrderId}`);
    await expect(page.getByRole('heading', { name: /INVOICE/i })).toHaveCount(0);
    await expect(page.getByText(/Page not found|404|Back to Portal/i).first()).toBeVisible();
  });
});

test.describe('Customer blocked from vendor/admin mutations', () => {
  test.beforeEach(({}, testInfo) => {
    skipUnlessSecurityEnv(testInfo, 'customer');
  });

  test('cannot verify a vendor order payment', async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: '/vendor?tab=inventory&imsTab=orders',
      moduleFileSuffix: 'orders/vendor.actions',
      exportName: 'verifyOrderPaymentAction',
      args: [fixtures?.foreignVendorOrderId ?? NON_EXISTENT_UUID],
    });
    expectSecurityDenied(result);
  });

  test('cannot delete a vendor catalog product', async ({ page }) => {
    const productId = (await loadAnyProductId()) ?? NON_EXISTENT_UUID;

    const result = await invokeServerAction(page, {
      postPath: '/vendor?tab=catalog',
      moduleFileSuffix: 'catalog/vendor.actions',
      exportName: 'deleteProductAction',
      args: [productId],
    });
    expectSecurityDenied(result);
  });
});

```
</details>

---

## `tests/e2e/security/unauthenticated-actions.spec.ts`

**Assessment:** Genuine E2E Test. This test uses Playwright to execute real network requests against the application endpoints/actions under different authenticated (or unauthenticated) contexts and verifies the responses.

<details>
<summary>View Test Code</summary>

```typescript
import { test, expect } from '@playwright/test';
import { NON_EXISTENT_UUID } from '../helpers/security-constants';
import { loadAnyProductId } from '../helpers/security-fixtures';
import { skipUnlessUnauthenticatedSecurityEnv } from '../helpers/security-skip';
import { invokeServerAction, waitForServerActionManifest } from '../helpers/server-action';

test.beforeAll(async () => {
  await waitForServerActionManifest();
});

test.describe('Unauthenticated server-action hardening', () => {
  test.beforeEach(({ page }, testInfo) => {
    skipUnlessUnauthenticatedSecurityEnv(testInfo);
  });

  test('cannot delete a vendor product', async ({ page }) => {
    const productId = (await loadAnyProductId()) ?? NON_EXISTENT_UUID;

    const result = await invokeServerAction(page, {
      postPath: '/vendor?tab=catalog',
      moduleFileSuffix: 'catalog/vendor.actions',
      exportName: 'deleteProductAction',
      args: [productId],
    });

    expect(result.denied).toBe(true);
  });

  test('cannot verify an order payment', async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: '/vendor?tab=inventory&imsTab=orders',
      moduleFileSuffix: 'orders/vendor.actions',
      exportName: 'verifyOrderPaymentAction',
      args: [NON_EXISTENT_UUID],
    });

    expect(result.denied).toBe(true);
  });

  test('cannot create a superadmin pricing plan', async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: '/superadmin',
      moduleFileSuffix: 'superadmin/actions',
      exportName: 'createPricingPlanAction',
      args: [
        {
          name: 'E2E Guest Plan',
          price: '0',
          period: 'month',
          features: ['blocked'],
          isPopular: false,
          buttonText: 'Blocked',
          buttonLink: '/',
        },
      ],
    });

    expect(result.denied).toBe(true);
  });

  test('cannot initialize a payment slip upload', async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: '/customer',
      moduleFileSuffix: 'orders/customer.actions',
      exportName: 'createPaymentSlipUploadPresignedUrlAction',
      args: [{ orderId: NON_EXISTENT_UUID, fileName: 'slip.png', fileSize: 1024, fileType: 'image/png' }],
    });

    expect(result.denied).toBe(true);
    expect(result.text).not.toMatch(/"success"\s*:\s*true/i);
  });
});

```
</details>

---

