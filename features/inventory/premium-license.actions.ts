'use server';

import { auth } from '@clerk/nextjs/server';
import { getPremiumStatus } from './premium-license';

export async function getPremiumStatusAction(orgId: string) {
  const { userId, orgId: sessionOrgId } = await auth();
  if (!userId) {
    throw new Error('Unauthorized');
  }

  if (sessionOrgId !== orgId) {
    await checkSuperAdmin();
  }

  // We can't pass Date objects across the server/client boundary easily without serialization.
  // We'll just return the boolean we need.
  const status = await getPremiumStatus(orgId);
  return {
    billingActive: status.billingActive
  };
}
