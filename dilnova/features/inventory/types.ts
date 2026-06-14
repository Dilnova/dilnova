import type * as schema from '@/shared/db/schema';
import type { StockAvailabilityDefinition } from '@/features/inventory/availability.shared';
import type { PremiumStatus } from '@/utils/premiumLicense';
import type { getCheckoutOptionsCatalog } from '@/utils/checkoutOptions';

export type VendorBillingRegisterData = {
  inventoryItems: Array<{
    id: string | null;
    productId: string;
    sku: string | null;
    quantity: number | null;
    lowStockThreshold: number | null;
    binLocation: string | null;
    supplierId: string | null;
    stockAvailability: string | null;
    updatedAt: Date | null;
    productName: string;
    productType: string;
    productPrice: number | null;
    supplierName: string | null;
  }>;
  branches: Array<(typeof schema.branches.$inferSelect)>;
  branchInventory: Array<{
    id: string;
    branchId: string;
    productId: string;
    sku: string | null;
    quantity: number | null;
    binLocation: string | null;
    productName: string;
  }>;
  stockAvailabilityCatalog: StockAvailabilityDefinition[];
  premiumStatus: PremiumStatus;
  billingReceiptCount: number;
};

export type VendorInventoryFullData = {
  inventoryItems: VendorBillingRegisterData['inventoryItems'];
  branches: VendorBillingRegisterData['branches'];
  branchInventory: VendorBillingRegisterData['branchInventory'];
  stockAvailabilityCatalog: VendorBillingRegisterData['stockAvailabilityCatalog'];
  premiumStatus: PremiumStatus;
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
