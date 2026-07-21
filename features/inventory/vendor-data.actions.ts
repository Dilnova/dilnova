'use server';

import { runWithCorrelationId } from '@/shared/security/async-context';
import { rateLimit } from '@/shared/security/rate-limit';
import { loadVendorInventoryData, type GetVendorInventoryDataOptions } from '@/features/inventory/vendor-data';
import type { VendorInventoryFullData } from '@/features/inventory/types';

export async function getVendorInventoryData(
  options?: GetVendorInventoryDataOptions
): Promise<VendorInventoryFullData> {
  return runWithCorrelationId(async () => {
    await rateLimit(30, 60 * 1000);
    return loadVendorInventoryData('full', options) as Promise<VendorInventoryFullData>;
  });
}
