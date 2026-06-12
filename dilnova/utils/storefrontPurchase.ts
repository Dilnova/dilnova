import { db } from '@/db';
import * as schema from '@/db/schema';
import { inArray } from 'drizzle-orm';
import { getStockAvailabilityCatalog } from '@/utils/stockAvailability';
import { resolveEffectiveStockAvailability } from '@/utils/stockAvailabilityShared';
import type { VendorProduct } from '@/app/vendors/[slug]/custom/types';

export async function enrichVendorProductsWithPurchaseFlags(
  products: VendorProduct[]
): Promise<VendorProduct[]> {
  if (products.length === 0) return products;

  const stockAvailabilityCatalog = await getStockAvailabilityCatalog();
  const productIds = products.filter((product) => product.type === 'product').map((product) => product.id);

  const inventoryRows =
    productIds.length > 0
      ? await db
          .select({
            productId: schema.inventory.productId,
            stockAvailability: schema.inventory.stockAvailability,
            quantity: schema.inventory.quantity,
          })
          .from(schema.inventory)
          .where(inArray(schema.inventory.productId, productIds))
      : [];

  const inventoryByProductId = new Map(
    inventoryRows.map((row) => [row.productId, row])
  );

  return products.map((product) => {
    if (product.type !== 'product') {
      return { ...product, canPurchase: true };
    }

    const inventory = inventoryByProductId.get(product.id);
    const availability = resolveEffectiveStockAvailability(
      stockAvailabilityCatalog,
      inventory?.stockAvailability,
      inventory?.quantity
    );

    return {
      ...product,
      canPurchase: availability ? availability.allowsPurchase : true,
    };
  });
}
