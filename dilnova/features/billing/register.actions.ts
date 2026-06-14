'use server';

import { loadVendorInventoryData } from '@/features/inventory/vendor-data';
import type { VendorBillingRegisterData } from '@/features/billing/types';

export async function getVendorBillingRegisterData(): Promise<VendorBillingRegisterData> {
  return loadVendorInventoryData('billing', { allowMember: true }) as Promise<VendorBillingRegisterData>;
}
