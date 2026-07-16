'use server';

import { getPremiumStatus } from './premium-license';

export async function getPremiumStatusAction(orgId: string) {
  // We can't pass Date objects across the server/client boundary easily without serialization.
  // We'll just return the boolean we need.
  const status = await getPremiumStatus(orgId);
  return {
    billingActive: status.billingActive
  };
}
