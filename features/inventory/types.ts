import type * as schema from '@/shared/db/schema';
import type { VendorBillingRegisterData } from '@/features/billing/types';
import type { getCheckoutOptionsCatalog } from '@/features/organization/checkout-options';

export type { VendorBillingRegisterData } from '@/features/billing/types';

export type VendorInventoryFullData = {
  inventoryItems: VendorBillingRegisterData['inventoryItems'];
  branches: VendorBillingRegisterData['branches'];
  branchInventory: VendorBillingRegisterData['branchInventory'];
  stockAvailabilityCatalog: VendorBillingRegisterData['stockAvailabilityCatalog'];
  premiumStatus: VendorBillingRegisterData['premiumStatus'];
  suppliers: Array<(typeof schema.suppliers.$inferSelect)>;
  movements: Array<{
    id: string;
    inventoryId: string;
    type: string;
    quantityChanged: number;
    previousQuantity: number;
    newQuantity: number;
    reason: string | null;
    userId: string;
    createdAt: Date;
    productName: string | null;
  }>;
  simulatedOrders: Array<{
    id: string;
    customerName: string;
    customerEmail: string;
    totalAmount: number;
    status: string;
    fulfillmentMethod: string;
    paymentMethod: string;
    pickupBranchId: string | null;
    paymentSlipUrl?: string | null;
    paymentSlipPreviewUrl?: string | null;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{
      id: string;
      productName: string;
      vendorOrgId: string;
      quantity: number;
      unitPrice: number;
    }>;
  }>;
  productsWithoutInventory: Array<{
    id: string;
    name: string;
    type: string;
    orgId: string;
  }>;
  branchMembers: Array<(typeof schema.branchMembers.$inferSelect)>;
  billingReceipts: Array<(typeof schema.billingReceipts.$inferSelect)>;
  orgMembers: Array<{ userId: string; name: string; email: string }>;
  checkoutOptionsCatalog: Awaited<ReturnType<typeof getCheckoutOptionsCatalog>>;
};
