import 'server-only';

import { createClerkClient } from '@clerk/nextjs/server';
import { logger } from '@/utils/logger';

export async function getOrgAdminEmails(orgId: string): Promise<string[]> {
  try {
    const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 100,
    });

    const adminUserIds = memberships.data
      .filter((membership) => membership.role === 'org:admin')
      .map((membership) => membership.publicUserData?.userId)
      .filter((userId): userId is string => Boolean(userId));

    const emails: string[] = [];

    for (const userId of adminUserIds) {
      try {
        const user = await client.users.getUser(userId);
        const primaryEmail =
          user.emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId)?.emailAddress ||
          user.emailAddresses[0]?.emailAddress;
        if (primaryEmail) {
          emails.push(primaryEmail.trim().toLowerCase());
        }
      } catch (error) {
        logger.warn('Failed to resolve vendor admin email', { orgId, userId, error });
      }
    }

    return [...new Set(emails)];
  } catch (error) {
    logger.error('Failed to load organization admin emails', error, { orgId });
    return [];
  }
}

export async function getOrganizationName(orgId: string): Promise<string> {
  try {
    const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const org = await client.organizations.getOrganization({ organizationId: orgId });
    return org.name;
  } catch {
    return 'Vendor';
  }
}
