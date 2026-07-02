import SuperAdminClient from '@/features/superadmin/components/SuperAdminClient';
import { getSystemSetting } from '@/shared/platform/settings';
import { getCheckoutOptionsCatalog } from '@/features/organization/checkout-options';
import { getStockAvailabilityCatalog } from '@/features/inventory/availability.server';
import { clerkClient } from '@clerk/nextjs/server';
import { getCachedOrganizations } from '@/shared/auth/clerk-cache';
import { logger } from '@/shared/logging/logger';
import {
  getCategoriesOrderedByCreatedAtDesc,
  getContactSubmissionsOrderedByCreatedAtDesc,
  getInventoryItemsWithDetails,
  getInventoryMovementsWithProductName,
  getImsSuppliersOrderedByCreatedAtDesc,
  getPricingPlansOrderedByCreatedAtDesc,
  getProductsWithCategoryDetails,
  getProductsWithoutInventory,
  getSimulatedOrdersWithItems,
  getVendorOrgIntegrityReport,
} from '@/features/superadmin/queries';

export const revalidate = 0; // Fresh database query on each load

/**
 * Safely execute a data-fetching function, returning a fallback value if it fails.
 * This prevents a single failing query (e.g. due to a PII decryption error) from
 * crashing the entire superadmin dashboard. The error is still logged server-side.
 */
async function safeQuery<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<{ data: T; error: string | null }> {
  try {
    return { data: await fn(), error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error(`SuperAdmin dashboard query failed: ${label}`, err);
    return { data: fallback, error: `${label}: ${message}` };
  }
}

export default async function SuperAdminDashboardPage() {
  const client = await clerkClient();
  const organizations = await getCachedOrganizations(client);

  // BATCH 1: Basic Catalog & Pricing
  const [categoriesResult, productsResult, pricingPlansResult] = await Promise.all([
    safeQuery('Categories', getCategoriesOrderedByCreatedAtDesc, []),
    safeQuery('Products', getProductsWithCategoryDetails, []),
    safeQuery('Pricing Plans', getPricingPlansOrderedByCreatedAtDesc, []),
  ]);

  // BATCH 2: Inventory & Movements
  const [inventoryItemsResult, inventoryMovementsResult] = await Promise.all([
    safeQuery('Inventory Items', getInventoryItemsWithDetails, []),
    safeQuery('Inventory Movements', getInventoryMovementsWithProductName, []),
  ]);

  // BATCH 3: PII & Encrypted Data
  const [suppliersResult, contactsResult, ordersResult] = await Promise.all([
    safeQuery('Suppliers', getImsSuppliersOrderedByCreatedAtDesc, []),
    safeQuery('Contact Submissions', getContactSubmissionsOrderedByCreatedAtDesc, []),
    safeQuery('Simulated Orders', getSimulatedOrdersWithItems, []),
  ]);

  const categories = categoriesResult.data;
  const products = productsResult.data;
  const pricingPlans = pricingPlansResult.data;
  const inventoryItems = inventoryItemsResult.data;
  const inventoryMovements = inventoryMovementsResult.data;

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

  // BATCH 4: System Settings
  const [
    maxMediaLimitSetting,
    systemLogo,
    systemFavicon,
    systemName,
    hardwareCustomSetting,
    nurseryCustomSetting,
    techCustomSetting,
    servicesCustomSetting,
    checkoutOptionsCatalog,
    stockAvailabilityCatalog,
  ] = await Promise.all([
    getSystemSetting('max_media_limit', '5'),
    getSystemSetting('system_logo', ''),
    getSystemSetting('system_favicon', ''),
    getSystemSetting('system_name', 'Dilnova'),
    getSystemSetting('custom_storefront_distar-hardware', 'true'),
    getSystemSetting('custom_storefront_distar-nursery', 'true'),
    getSystemSetting('custom_storefront_distar-tech', 'true'),
    getSystemSetting('custom_storefront_dilstar-services', 'true'),
    getCheckoutOptionsCatalog(),
    getStockAvailabilityCatalog(),
  ]);

  const maxMediaLimit = parseInt(maxMediaLimitSetting, 10) || 5;
  const hardwareCustomEnabled = hardwareCustomSetting === 'true';
  const nurseryCustomEnabled = nurseryCustomSetting === 'true';
  const techCustomEnabled = techCustomSetting === 'true';
  const servicesCustomEnabled = servicesCustomSetting === 'true';

  // BATCH 5: Dependent Reports
  const [productsWithoutInventoryResult, vendorOrgIntegrityResult] = await Promise.all([
    safeQuery('Products w/o Inventory', () => getProductsWithoutInventory(inventoryItems), []),
    safeQuery('Vendor Org Integrity', () => getVendorOrgIntegrityReport(organizations), {
      knownOrgCount: 0,
      issueGroups: [],
      totals: {
        orphanOrgIds: 0,
        products: 0,
        orderItems: 0,
        suppliers: 0,
        branches: 0,
        billingReceipts: 0,
      }
    }),
  ]);

  const productsWithoutInventory = productsWithoutInventoryResult.data;
  const vendorOrgIntegrity = vendorOrgIntegrityResult.data;

  // Collect any query errors to display a warning banner
  const queryErrors = [
    categoriesResult.error,
    productsResult.error,
    pricingPlansResult.error,
    inventoryItemsResult.error,
    inventoryMovementsResult.error,
    suppliersResult.error,
    contactsResult.error,
    ordersResult.error,
    productsWithoutInventoryResult.error,
    vendorOrgIntegrityResult.error,
  ].filter(Boolean) as string[];

  return (
    <main className="px-3 py-4 sm:px-6 md:px-10 lg:px-12 sm:py-8 max-w-[1400px] mx-auto font-sans w-full">
      {queryErrors.length > 0 && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/50 p-4">
          <h3 className="font-semibold text-red-800 dark:text-red-300 mb-1">
            ⚠️ Some data could not be loaded
          </h3>
          <p className="text-sm text-red-700 dark:text-red-400 mb-2">
            The following queries failed — this is likely caused by a missing or mismatched{' '}
            <code className="px-1 py-0.5 bg-red-100 dark:bg-red-900 rounded text-xs font-mono">PII_ENCRYPTION_KEY</code>{' '}
            environment variable in production. Please check your deployment configuration.
          </p>
          <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400 space-y-1">
            {queryErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
      <SuperAdminClient
        categories={categories}
        products={products}
        stats={stats}
        maxMediaLimit={maxMediaLimit}
        systemLogo={systemLogo}
        systemFavicon={systemFavicon}
        systemName={systemName}
        pricingPlans={pricingPlans}
        contactSubmissions={contactsResult.data}
        hardwareCustomEnabled={hardwareCustomEnabled}
        nurseryCustomEnabled={nurseryCustomEnabled}
        techCustomEnabled={techCustomEnabled}
        servicesCustomEnabled={servicesCustomEnabled}
        checkoutOptionsCatalog={checkoutOptionsCatalog}
        stockAvailabilityCatalog={stockAvailabilityCatalog}
        inventoryItems={inventoryItems}
        imsSuppliers={suppliersResult.data}
        inventoryMovements={inventoryMovements}
        simulatedOrders={ordersResult.data}
        productsWithoutInventory={productsWithoutInventory}
        organizations={organizations}
        vendorOrgIntegrity={vendorOrgIntegrity}
      />
    </main>
  );
}

