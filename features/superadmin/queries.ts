import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { eq, desc, inArray, asc } from 'drizzle-orm';
import { buildVendorOrgIntegrityReport } from '@/features/vendor-org';
import { attachPaymentSlipPreviews } from '@/features/orders/payment-slip-preview';

export async function getPricingPlansOrderedByCreatedAtAsc() {
  return db.select().from(schema.pricingPlans).orderBy(asc(schema.pricingPlans.createdAt));
}

export async function getPricingPlansOrderedByCreatedAtDesc() {
  return db
    .select()
    .from(schema.pricingPlans)
    .orderBy(desc(schema.pricingPlans.createdAt));
}

export async function getCategoriesOrderedByCreatedAtDesc() {
  return db
    .select()
    .from(schema.categories)
    .orderBy(desc(schema.categories.createdAt));
}

export async function getProductsWithCategoryDetails() {
  const rawProducts = await db
    .select({
      product: schema.products,
      category: schema.categories,
    })
    .from(schema.products)
    .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .orderBy(desc(schema.products.createdAt));

  return rawProducts.map((row) => ({
    ...row.product,
    categoryName: row.category?.name || null,
  }));
}

export async function getContactSubmissionsOrderedByCreatedAtDesc() {
  return db
    .select()
    .from(schema.contactSubmissions)
    .orderBy(desc(schema.contactSubmissions.createdAt));
}

export async function getImsSuppliersOrderedByCreatedAtDesc() {
  return db
    .select()
    .from(schema.suppliers)
    .orderBy(desc(schema.suppliers.createdAt));
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
    .orderBy(desc(schema.inventory.updatedAt));

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
    .limit(200);

  return rawMovements.map((row) => ({
    ...row.movement,
    productName: row.product?.name || null,
  }));
}

export async function getSimulatedOrdersWithItems() {
  const rawOrders = await db
    .select()
    .from(schema.simulatedOrders)
    .orderBy(desc(schema.simulatedOrders.createdAt))
    .limit(100);

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

  return attachPaymentSlipPreviews(
    await Promise.all(
      rawOrders.map(async (order) => {
        const items = await db
          .select()
          .from(schema.simulatedOrderItems)
          .where(eq(schema.simulatedOrderItems.orderId, order.id));
        return {
          ...order,
          items,
          pickupBranchName: order.pickupBranchId
            ? pickupBranchNameById.get(order.pickupBranchId) ?? null
            : null,
        };
      })
    )
  );
}

export async function getProductsWithoutInventory(inventoryItems: { productId: string }[]) {
  const inventoriedProductIds = inventoryItems.map((i) => i.productId);
  const allProducts = await db.select({ id: schema.products.id, name: schema.products.name, type: schema.products.type, orgId: schema.products.orgId }).from(schema.products);
  return allProducts.filter((p) => !inventoriedProductIds.includes(p.id));
}

export async function getVendorOrgIntegrityReport(
  organizations: { id: string }[]
) {
  const [
    integrityProducts,
    integrityOrderItems,
    integritySuppliers,
    integrityBranches,
    integrityBillingReceipts,
  ] = await Promise.all([
    db
      .select({
        id: schema.products.id,
        name: schema.products.name,
        type: schema.products.type,
        orgId: schema.products.orgId,
        status: schema.products.status,
      })
      .from(schema.products),
    db
      .select({
        id: schema.simulatedOrderItems.id,
        orderId: schema.simulatedOrderItems.orderId,
        productName: schema.simulatedOrderItems.productName,
        vendorOrgId: schema.simulatedOrderItems.vendorOrgId,
      })
      .from(schema.simulatedOrderItems),
    db
      .select({
        id: schema.suppliers.id,
        name: schema.suppliers.name,
        orgId: schema.suppliers.orgId,
      })
      .from(schema.suppliers),
    db
      .select({
        id: schema.branches.id,
        name: schema.branches.name,
        orgId: schema.branches.orgId,
      })
      .from(schema.branches),
    db
      .select({
        id: schema.billingReceipts.id,
        orgId: schema.billingReceipts.orgId,
      })
      .from(schema.billingReceipts),
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
