import 'server-only';

import { createClerkClient } from '@clerk/nextjs/server';
import { logger } from '@/shared/logging/logger';
import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { eq } from 'drizzle-orm';

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

export async function getVendorOrderNotificationTargets(
  orgId: string,
  branchId: string | null
): Promise<{ userId: string; email: string }[]> {
  try {
    let targetUserIds: string[] = [];

    // If branch is provided, try to find branch members
    if (branchId) {
      const members = await db
        .select({ memberUserId: schema.branchMembers.memberUserId })
        .from(schema.branchMembers)
        .where(eq(schema.branchMembers.branchId, branchId));
        
      targetUserIds = members.map((m) => m.memberUserId);
    }

    // Fallback to Org Admins if no branch members or no branch specified
    if (targetUserIds.length === 0) {
      const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
      const memberships = await client.organizations.getOrganizationMembershipList({
        organizationId: orgId,
        limit: 100,
      });

      targetUserIds = memberships.data
        .filter((membership) => membership.role === 'org:admin')
        .map((membership) => membership.publicUserData?.userId)
        .filter((userId): userId is string => Boolean(userId));
    }

    const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const targets: { userId: string; email: string }[] = [];

    for (const userId of targetUserIds) {
      try {
        const user = await client.users.getUser(userId);
        const primaryEmail =
          user.emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId)?.emailAddress ||
          user.emailAddresses[0]?.emailAddress;
        if (primaryEmail) {
          targets.push({ userId, email: primaryEmail.trim().toLowerCase() });
        }
      } catch (error) {
        logger.warn('Failed to resolve target user email', { orgId, userId, error });
      }
    }

    return targets;
  } catch (error) {
    logger.error('Failed to get notification targets', error, { orgId, branchId });
    return [];
  }
}
