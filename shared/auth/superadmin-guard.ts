import { auth, clerkClient, type User } from '@clerk/nextjs/server';
import { isSuperAdminUser } from '@/shared/auth/superadmin.server';

/**
 * Validates that the current user is authenticated and holds platform superadmin access.
 * Authorization is resolved server-side from both privateMetadata and the environment-variable allowlist (dual-gate).
 */
export async function checkSuperAdmin(): Promise<User> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Unauthorized: You must be logged in.');
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  if (!isSuperAdminUser(user)) {
    throw new Error('Unauthorized: Only global administrators can perform this action.');
  }

  return user;
}

/**
 * Non-throwing superadmin check for layouts and navigation.
 * Returns null on any Clerk API failure so the layout can redirect
 * instead of crashing the entire page with the error boundary.
 */
export async function getCurrentSuperAdminUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return isSuperAdminUser(user) ? user : null;
  } catch (error) {
    // Clerk API timeout / network error — return null so the layout
    // redirects to /unauthorized instead of triggering the error boundary.
    console.error('[getCurrentSuperAdminUser] Clerk API error, treating as unauthenticated:', error);
    return null;
  }
}
