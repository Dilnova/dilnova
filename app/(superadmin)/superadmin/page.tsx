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

  // These queries do NOT touch encrypted columns — safe to call directly
  const categories = await getCategoriesOrderedByCreatedAtDesc();
  const products = await getProductsWithCategoryDetails();
  const pricingPlans = await getPricingPlansOrderedByCreatedAtDesc();
  const inventoryItems = await getInventoryItemsWithDetails();
  const inventoryMovements = await getInventoryMovementsWithProductName();

  // These queries touch encrypted columns (encryptedText) — wrap in safeQuery
  const suppliersResult = await safeQuery('Suppliers', getImsSuppliersOrderedByCreatedAtDesc, []);
  const contactsResult = await safeQuery('Contact Submissions', getContactSubmissionsOrderedByCreatedAtDesc, []);
  const ordersResult = await safeQuery('Simulated Orders', getSimulatedOrdersWithItems, []);

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

  const hardwareCustomEnabled = (await getSystemSetting('custom_storefront_distar-hardware', 'true')) === 'true';
  const nurseryCustomEnabled = (await getSystemSetting('custom_storefront_distar-nursery', 'true')) === 'true';
  const techCustomEnabled = (await getSystemSetting('custom_storefront_distar-tech', 'true')) === 'true';
  const servicesCustomEnabled = (await getSystemSetting('custom_storefront_dilstar-services', 'true')) === 'true';
  const checkoutOptionsCatalog = await getCheckoutOptionsCatalog();
  const stockAvailabilityCatalog = await getStockAvailabilityCatalog();

  const productsWithoutInventory = await getProductsWithoutInventory(inventoryItems);
  const vendorOrgIntegrity = await getVendorOrgIntegrityReport(organizations);

  // Collect any query errors to display a warning banner
  const queryErrors = [suppliersResult.error, contactsResult.error, ordersResult.error].filter(Boolean) as string[];

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

