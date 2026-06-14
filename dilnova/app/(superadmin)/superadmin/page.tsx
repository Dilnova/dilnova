import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import SuperAdminClient from './SuperAdminClient';
import { getSystemSetting } from '@/shared/platform/settings';
import { getCheckoutOptionsCatalog } from '@/features/organization/checkout-options';
import { getStockAvailabilityCatalog } from '@/features/inventory/availability.server';
import { clerkClient } from '@clerk/nextjs/server';
import { fetchAllClerkOrganizations } from '@/shared/auth/clerk-cache';
import { buildVendorOrgIntegrityReport } from '@/features/vendor-org';

export const revalidate = 0; // Fresh database query on each load

export default async function SuperAdminDashboardPage() {
  const client = await clerkClient();
  const organizations = await fetchAllClerkOrganizations(client);

  // 1. Fetch Categories
  const categories = await db
    .select()
    .from(schema.categories)
    .orderBy(desc(schema.categories.createdAt));

  // 2. Fetch Products with joined Category details
  const rawProducts = await db
    .select({
      product: schema.products,
      category: schema.categories,
    })
    .from(schema.products)
    .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .orderBy(desc(schema.products.createdAt));

  const products = rawProducts.map((row) => ({
    ...row.product,
    categoryName: row.category?.name || null,
  }));

  // 3. Compute stats
  const totalProductsCount = products.filter((p) => p.type === 'product').length;
  const totalServicesCount = products.filter((p) => p.type === 'service').length;
  const totalCategoriesCount = categories.length;
  const totalViewsCount = products.reduce((acc, p) => acc + (p.views || 0), 0);

  const stats = {
    totalProducts: totalProductsCount,
    totalServices: totalServicesCount,
    totalCategories: totalCategoriesCount,
    totalViews: totalViewsCount,
  };

  const maxMediaLimitSetting = await getSystemSetting('max_media_limit', '5');
  const maxMediaLimit = parseInt(maxMediaLimitSetting, 10) || 5;

  const systemLogo = await getSystemSetting('system_logo', '');
  const systemFavicon = await getSystemSetting('system_favicon', '');
  const systemName = await getSystemSetting('system_name', 'Dilnova');

  // 4. Fetch Pricing Plans
  const pricingPlans = await db
    .select()
    .from(schema.pricingPlans)
    .orderBy(desc(schema.pricingPlans.createdAt));

  // 5. Fetch Contact Submissions
  const contactSubmissions = await db
    .select()
    .from(schema.contactSubmissions)
    .orderBy(desc(schema.contactSubmissions.createdAt));

  const hardwareCustomEnabled = (await getSystemSetting('custom_storefront_distar-hardware', 'true')) === 'true';
  const nurseryCustomEnabled = (await getSystemSetting('custom_storefront_distar-nursery', 'true')) === 'true';
  const techCustomEnabled = (await getSystemSetting('custom_storefront_distar-tech', 'true')) === 'true';
  const servicesCustomEnabled = (await getSystemSetting('custom_storefront_dilstar-services', 'true')) === 'true';
  const checkoutOptionsCatalog = await getCheckoutOptionsCatalog();
  const stockAvailabilityCatalog = await getStockAvailabilityCatalog();

  // ═══════════════════════════════════════════════════════════
  // 6. INVENTORY MANAGEMENT SYSTEM DATA
  // ═══════════════════════════════════════════════════════════

  // Fetch Suppliers
  const imsSuppliers = await db
    .select()
    .from(schema.suppliers)
    .orderBy(desc(schema.suppliers.createdAt));

  // Fetch Inventory with product and supplier details
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

  const inventoryItems = rawInventory.map((row) => ({
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

  // Fetch inventory movements with product name
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

  const inventoryMovements = rawMovements.map((row) => ({
    ...row.movement,
    productName: row.product?.name || null,
  }));

  // Fetch simulated orders with items
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

  const simulatedOrders = await Promise.all(
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
  );

  // Find products that don't have inventory records yet
  const inventoriedProductIds = inventoryItems.map((i) => i.productId);
  const allProducts = await db.select({ id: schema.products.id, name: schema.products.name, type: schema.products.type, orgId: schema.products.orgId }).from(schema.products);
  const productsWithoutInventory = allProducts.filter((p) => !inventoriedProductIds.includes(p.id));

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

  const vendorOrgIntegrity = buildVendorOrgIntegrityReport(
    new Set(organizations.map((org) => org.id)),
    {
      products: integrityProducts,
      orderItems: integrityOrderItems,
      suppliers: integritySuppliers,
      branches: integrityBranches,
      billingReceipts: integrityBillingReceipts,
    }
  );

  return (
    <main className="px-3 py-4 sm:px-6 md:px-10 lg:px-12 sm:py-8 max-w-[1400px] mx-auto font-sans w-full">
      <SuperAdminClient
        categories={categories}
        products={products}
        stats={stats}
        maxMediaLimit={maxMediaLimit}
        systemLogo={systemLogo}
        systemFavicon={systemFavicon}
        systemName={systemName}
        pricingPlans={pricingPlans}
        contactSubmissions={contactSubmissions}
        hardwareCustomEnabled={hardwareCustomEnabled}
        nurseryCustomEnabled={nurseryCustomEnabled}
        techCustomEnabled={techCustomEnabled}
        servicesCustomEnabled={servicesCustomEnabled}
        checkoutOptionsCatalog={checkoutOptionsCatalog}
        stockAvailabilityCatalog={stockAvailabilityCatalog}
        inventoryItems={inventoryItems}
        imsSuppliers={imsSuppliers}
        inventoryMovements={inventoryMovements}
        simulatedOrders={simulatedOrders}
        productsWithoutInventory={productsWithoutInventory}
        organizations={organizations}
        vendorOrgIntegrity={vendorOrgIntegrity}
      />
    </main>
  );
}
