'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

/**
 * Toggles the user's metadata role between 'customer' and 'vendor' to simulate different user accounts.
 */
export async function toggleUserRoleAction(currentRole: string | undefined) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Not authorized: You must be logged in to toggle your role.');
  }

  const nextRole = currentRole === 'vendor' ? 'customer' : 'vendor';
  const client = await clerkClient();
  
  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      role: nextRole,
    },
  });

  revalidatePath('/');
  revalidatePath('/admin');
  return { success: true, nextRole };
}
