import type * as schema from '@/shared/db/schema';
import type { StockAvailabilityDefinition } from '@/features/inventory/availability.shared';
import type { PremiumStatus } from '@/utils/premiumLicense';

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
