import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { eq, desc, inArray, asc } from 'drizzle-orm';
import { buildVendorOrgIntegrityReport } from '@/features/vendor-org';

export async function getPricingPlansOrderedByCreatedAtAsc(limit = 200, offset = 0) {
  return db.select().from(schema.pricingPlans).orderBy(asc(schema.pricingPlans.createdAt)).limit(limit).offset(offset);
}

export async function getPricingPlansOrderedByCreatedAtDesc(limit = 200, offset = 0) {
  return db
    .select()
    .from(schema.pricingPlans)
    .orderBy(desc(schema.pricingPlans.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getCategoriesOrderedByCreatedAtDesc() {
  return db
    .select()
    .from(schema.categories)
    .orderBy(desc(schema.categories.createdAt))
    .limit(200);
}

export async function getProductsWithCategoryDetails() {
  const rawProducts = await db
    .select({
      product: schema.products,
      category: schema.categories,
    })
    .from(schema.products)
    .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .orderBy(desc(schema.products.createdAt))
    .limit(200);

  return rawProducts.map((row) => ({
    ...row.product,
    categoryName: row.category?.name || null,
  }));
}

export async function getContactSubmissionsOrderedByCreatedAtDesc() {
  return db
    .select()
    .from(schema.contactSubmissions)
    .orderBy(desc(schema.contactSubmissions.createdAt))
    .limit(100); // PII decryption is expensive — keep this low
}

export async function getImsSuppliersOrderedByCreatedAtDesc() {
  return db
    .select()
    .from(schema.suppliers)
    .orderBy(desc(schema.suppliers.createdAt))
    .limit(200);
}

export async function getInventoryItemsWithDetails() {
  const rawInventory = await db
    .select({
      inventory: schema.inventory,
      product: {
        name: schema.products.name,
        type: schema.products.type,
        orgId: schema.products.orgId,
      },
      supplier: {
        name: schema.suppliers.name,
      },
    })
    .from(schema.inventory)
    .leftJoin(schema.products, eq(schema.inventory.productId, schema.products.id))
    .leftJoin(schema.suppliers, eq(schema.inventory.supplierId, schema.suppliers.id))
    .orderBy(desc(schema.inventory.updatedAt))
    .limit(200);

  return rawInventory.map((row) => ({
    id: row.inventory.id,
    productId: row.inventory.productId,
    sku: row.inventory.sku,
    quantity: row.inventory.quantity,
    lowStockThreshold: row.inventory.lowStockThreshold,
    binLocation: row.inventory.binLocation,
    supplierId: row.inventory.supplierId,
    stockAvailability: row.inventory.stockAvailability,
    updatedAt: row.inventory.updatedAt,
    productName: row.product?.name || 'Unknown Product',
    productType: row.product?.type || 'product',
    productOrgId: row.product?.orgId || '',
    supplierName: row.supplier?.name || null,
  }));
}

export async function getInventoryMovementsWithProductName() {
  const rawMovements = await db
    .select({
      movement: schema.inventoryMovements,
      product: {
        name: schema.products.name,
      },
    })
    .from(schema.inventoryMovements)
    .leftJoin(schema.inventory, eq(schema.inventoryMovements.inventoryId, schema.inventory.id))
    .leftJoin(schema.products, eq(schema.inventory.productId, schema.products.id))
    .orderBy(desc(schema.inventoryMovements.createdAt))
    .limit(100);

  return rawMovements.map((row) => ({
    ...row.movement,
    productName: row.product?.name || null,
  }));
}

/**
 * Fetches simulated orders with their items and pickup branch names.
 *
 * NOTE: `attachPaymentSlipPreviews` was removed because it made up to 20
 * sequential Supabase API calls for signed URLs, consuming ~20-40s of the
 * 60-second serverless budget. Payment slip preview URLs are now resolved
 * on-demand client-side via a dedicated API route.
 */
export async function getSimulatedOrdersWithItems() {
  const rawOrders = await db
    .select({
      id: schema.simulatedOrders.id,
      customerName: schema.simulatedOrders.customerName,
      customerEmail: schema.simulatedOrders.customerEmail,
      totalAmount: schema.simulatedOrders.totalAmount,
      subtotalAmount: schema.simulatedOrders.subtotalAmount,
      taxAmount: schema.simulatedOrders.taxAmount,
      shippingAmount: schema.simulatedOrders.shippingAmount,
      status: schema.simulatedOrders.status,
      fulfillmentMethod: schema.simulatedOrders.fulfillmentMethod,
      paymentMethod: schema.simulatedOrders.paymentMethod,
      pickupBranchId: schema.simulatedOrders.pickupBranchId,
      paymentSlipUrl: schema.simulatedOrders.paymentSlipUrl,
      createdAt: schema.simulatedOrders.createdAt,
      updatedAt: schema.simulatedOrders.updatedAt,
    })
    .from(schema.simulatedOrders)
    .orderBy(desc(schema.simulatedOrders.createdAt))
    .limit(50);

  if (rawOrders.length === 0) {
    return [];
  }

  const pickupBranchIds = [
    ...new Set(rawOrders.map((order) => order.pickupBranchId).filter((id): id is string => Boolean(id))),
  ];
  const pickupBranchRows =
    pickupBranchIds.length > 0
      ? await db
          .select({ id: schema.branches.id, name: schema.branches.name })
          .from(schema.branches)
          .where(inArray(schema.branches.id, pickupBranchIds))
      : [];
  const pickupBranchNameById = new Map(pickupBranchRows.map((branch) => [branch.id, branch.name]));

  const orderIds = rawOrders.map((o) => o.id);
  const allItems = await db
    .select()
    .from(schema.simulatedOrderItems)
    .where(inArray(schema.simulatedOrderItems.orderId, orderIds));

  const itemsByOrderId = new Map<string, typeof allItems>();
  for (const item of allItems) {
    const arr = itemsByOrderId.get(item.orderId) || [];
    arr.push(item);
    itemsByOrderId.set(item.orderId, arr);
  }

  // Return orders WITHOUT payment slip preview URLs — they are resolved
  // on-demand client-side to avoid blocking the SSR render.
  return rawOrders.map((order) => ({
    ...order,
    items: itemsByOrderId.get(order.id) || [],
    pickupBranchName: order.pickupBranchId
      ? pickupBranchNameById.get(order.pickupBranchId) ?? null
      : null,
    paymentSlipPreviewUrl: null as string | null,
  }));
}

/**
 * Compute products without inventory in-memory.
 * This avoids an extra DB round-trip since both products and inventory
 * are already fetched by the dashboard.
 */
export function computeProductsWithoutInventory(
  products: { id: string; name: string; type: string; orgId: string }[],
  inventoryItems: { productId: string }[],
) {
  const inventoriedProductIds = new Set(inventoryItems.map((i) => i.productId));
  return products.filter((p) => !inventoriedProductIds.has(p.id));
}

export async function getVendorOrgIntegrityReport(
  organizations: { id: string }[]
) {
  // Run integrity queries sequentially in pairs to avoid exhausting the
  // 5-connection pool. Each query has a safety limit to cap row count.
  const [integrityProducts, integrityOrderItems] = await Promise.all([
    db
      .select({
        id: schema.products.id,
        name: schema.products.name,
        type: schema.products.type,
        orgId: schema.products.orgId,
        status: schema.products.status,
      })
      .from(schema.products)
      .limit(1000),
    db
      .select({
        id: schema.simulatedOrderItems.id,
        orderId: schema.simulatedOrderItems.orderId,
        productName: schema.simulatedOrderItems.productName,
        vendorOrgId: schema.simulatedOrderItems.vendorOrgId,
      })
      .from(schema.simulatedOrderItems)
      .limit(1000),
  ]);

  const [integritySuppliers, integrityBranches, integrityBillingReceipts] = await Promise.all([
    db
      .select({
        id: schema.suppliers.id,
        name: schema.suppliers.name,
        orgId: schema.suppliers.orgId,
      })
      .from(schema.suppliers)
      .limit(1000),
    db
      .select({
        id: schema.branches.id,
        name: schema.branches.name,
        orgId: schema.branches.orgId,
      })
      .from(schema.branches)
      .limit(1000),
    db
      .select({
        id: schema.billingReceipts.id,
        orgId: schema.billingReceipts.orgId,
      })
      .from(schema.billingReceipts)
      .limit(1000),
  ]);

  return buildVendorOrgIntegrityReport(
    new Set(organizations.map((org) => org.id)),
    {
      products: integrityProducts,
      orderItems: integrityOrderItems,
      suppliers: integritySuppliers,
      branches: integrityBranches,
      billingReceipts: integrityBillingReceipts,
    }
  );
}
