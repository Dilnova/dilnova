import 'server-only';
import { getCachedUserRole, getCachedIsSuperAdmin } from '@/shared/auth/clerk-cache';

/**
 * Ensures the currently authenticated user has the 'vendor' global role or is a superadmin.
 * This prevents users with customer roles who happen to be added to an organization
 * from invoking vendor-specific server actions via API.
 */
export async function requireVendorRole(userId: string) {
  const [userRole, isSuperAdmin] = await Promise.all([
    getCachedUserRole(userId),
    getCachedIsSuperAdmin(userId),
  ]);

  if (userRole !== 'vendor' && !isSuperAdmin) {
    throw new Error('Not authorized: You do not have vendor permissions.');
  }
}
