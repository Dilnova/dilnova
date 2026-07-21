import fs from 'node:fs';
import path from 'node:path';

const AUTH_DIR = path.join(process.cwd(), 'playwright/.clerk');

export function hasClerkApiKeys(): boolean {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return Boolean(
    secretKey &&
    !secretKey.includes('placeholder') &&
    !secretKey.includes('dummy') &&
    publishableKey &&
    !publishableKey.includes('placeholder') &&
    !publishableKey.includes('dummy')
  );
}

export function getRoleTestEmail(role: 'vendorAdmin' | 'vendorMember' | 'customer' | 'superadmin'): string | undefined {
  const map = {
    vendorAdmin: process.env.E2E_VENDOR_ADMIN_EMAIL,
    vendorMember: process.env.E2E_VENDOR_MEMBER_EMAIL,
    customer: process.env.E2E_CUSTOMER_EMAIL,
    superadmin: process.env.E2E_SUPERADMIN_EMAIL,
  } as const;
  return map[role]?.trim() || undefined;
}

export function hasRoleTestUsers(): boolean {
  return Boolean(
    getRoleTestEmail('vendorAdmin') &&
    getRoleTestEmail('vendorMember') &&
    getRoleTestEmail('customer') &&
    getRoleTestEmail('superadmin'),
  );
}

export function authStatePath(role: 'vendor-admin' | 'vendor-member' | 'customer' | 'superadmin'): string {
  return path.join(AUTH_DIR, `${role}.json`);
}

export function authStateExists(role: 'vendor-admin' | 'vendor-member' | 'customer' | 'superadmin'): boolean {
  const filePath = authStatePath(role);
  if (!fs.existsSync(filePath)) {
    return false;
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as { cookies?: unknown[] };
    return Array.isArray(data.cookies) && data.cookies.length > 0;
  } catch {
    return false;
  }
}
