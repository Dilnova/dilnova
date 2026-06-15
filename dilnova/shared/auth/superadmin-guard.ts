import { auth, clerkClient, type User } from '@clerk/nextjs/server';
import { isSuperAdminUser } from '@/shared/auth/superadmin.server';

/**
 * Validates that the current user is authenticated and holds platform superadmin access.
 * Authorization is resolved server-side from privateMetadata, SUPERADMIN_USER_IDS, or legacy public role.
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
 */
export async function getCurrentSuperAdminUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return isSuperAdminUser(user) ? user : null;
}
