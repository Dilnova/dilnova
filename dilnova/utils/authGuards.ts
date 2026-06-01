import { currentUser, User } from '@clerk/nextjs/server';

/**
 * Validates that the current user is authenticated and holds the global administrator role.
 * Throws an error if unauthorized, otherwise returns the Clerk User object.
 */
export async function checkSuperAdmin(): Promise<User> {
  const user = await currentUser();
  if (!user) {
    throw new Error('Unauthorized: You must be logged in.');
  }
  
  const userRole = user.publicMetadata?.role as string | undefined;
  if (userRole !== 'admin') {
    throw new Error('Unauthorized: Only global administrators can perform this action.');
  }
  
  return user;
}
