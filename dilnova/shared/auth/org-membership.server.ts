import { clerkClient } from '@clerk/nextjs/server';

const MEMBERSHIP_PAGE_SIZE = 100;

/**
 * Returns true when the user belongs to the given Clerk organization,
 * regardless of which org is active in the current session.
 */
export async function isUserMemberOfOrganization(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const client = await clerkClient();
  let offset = 0;

  while (true) {
    const response = await client.organizations.getOrganizationMembershipList({
      organizationId,
      limit: MEMBERSHIP_PAGE_SIZE,
      offset,
    });

    const isMember = response.data.some(
      (membership) => membership.publicUserData?.userId === userId
    );
    if (isMember) {
      return true;
    }

    offset += response.data.length;
    if (response.data.length === 0 || offset >= response.totalCount) {
      return false;
    }
  }
}
