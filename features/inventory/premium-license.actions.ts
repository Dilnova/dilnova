'use server';

import { clerkClient } from '@clerk/nextjs/server';
import { isSuperAdminUser } from '@/shared/auth/superadmin.server';
import { getPremiumStatus } from './premium-license';
import { authenticatedAction, ActionError } from '@/lib/safe-action';
import { z } from 'zod/v3';

const actionSchema = z.object({
  orgId: z.string().min(1, 'Organization ID is required.'),
});

export const getPremiumStatusAction = authenticatedAction
  .schema(actionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { orgId } = parsedInput;

    // If the session org matches the requested org, allow directly.
    // Otherwise, require platform superadmin privileges (dual-gate check).
    if (ctx.orgId !== orgId) {
      const client = await clerkClient();
      const user = await client.users.getUser(ctx.userId);
      if (!isSuperAdminUser(user)) {
        throw new ActionError('Unauthorized: You do not have access to this organization.');
      }
    }

    // We can't pass Date objects across the server/client boundary easily without
    // serialization. Return only the boolean flag the client needs.
    const status = await getPremiumStatus(orgId);
    return {
      billingActive: status.billingActive,
    };
  });
