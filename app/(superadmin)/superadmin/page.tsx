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

async function fetchAllData() {
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

  const totalProductsCount = products.filter((p) => p?.type === 'product').length;
  const totalServicesCount = products.filter((p) => p?.type === 'service').length;
  const totalCategoriesCount = categories.length;
  const totalViewsCount = products.reduce((acc, p) => acc + (p?.views || 0), 0);

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

  return {
    categories,
    products,
    stats,
    maxMediaLimit,
    systemLogo,
    systemFavicon,
    systemName,
    pricingPlans,
    contactSubmissions: contactsResult.data,
    hardwareCustomEnabled,
    nurseryCustomEnabled,
    techCustomEnabled,
    servicesCustomEnabled,
    checkoutOptionsCatalog,
    stockAvailabilityCatalog,
    inventoryItems,
    imsSuppliers: suppliersResult.data,
    inventoryMovements,
    simulatedOrders: ordersResult.data,
    productsWithoutInventory,
    organizations,
    vendorOrgIntegrity,
    queryErrors,
  };
}

export default async function SuperAdminDashboardPage() {
  let data: Awaited<ReturnType<typeof fetchAllData>>;

  try {
    data = await fetchAllData();
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error('CRITICAL ERROR in SuperAdminDashboardPage:', err);
    return (
      <main className="px-3 py-4 sm:px-6 md:px-10 lg:px-12 sm:py-8 max-w-[1400px] mx-auto font-sans w-full">
        <div className="bg-red-50 border border-red-500 text-red-900 p-6 rounded-lg shadow-sm">
          <h1 className="text-2xl font-bold mb-4">CRITICAL RENDER ERROR</h1>
          <p className="mb-4">The Superadmin Dashboard crashed during server-side rendering. This error was caught by the page-level try-catch block.</p>
          <div className="bg-white p-4 rounded border border-red-200 overflow-x-auto">
            <h2 className="font-semibold mb-2">Error Message:</h2>
            <pre className="text-sm font-mono text-red-600 whitespace-pre-wrap">{err.message}</pre>
            {err.stack && (
              <>
                <h2 className="font-semibold mt-4 mb-2">Stack Trace:</h2>
                <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">{err.stack}</pre>
              </>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="px-3 py-4 sm:px-6 md:px-10 lg:px-12 sm:py-8 max-w-[1400px] mx-auto font-sans w-full">
      {data.queryErrors.length > 0 && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/50 p-4">
          <h3 className="font-semibold text-red-800 dark:text-red-300 mb-1">
            ⚠️ Some data could not be loaded
          </h3>
          <p className="text-sm text-red-700 dark:text-red-400 mb-2">
            The following queries failed — this is likely caused by a database timeout or a missing/mismatched{' '}
            <code className="px-1 py-0.5 bg-red-100 dark:bg-red-900 rounded text-xs font-mono">PII_ENCRYPTION_KEY</code>{' '}
            environment variable in production.
          </p>
          <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400 space-y-1">
            {data.queryErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
      <SuperAdminClient
        categories={data.categories}
        products={data.products}
        stats={data.stats}
        maxMediaLimit={data.maxMediaLimit}
        systemLogo={data.systemLogo}
        systemFavicon={data.systemFavicon}
        systemName={data.systemName}
        pricingPlans={data.pricingPlans}
        contactSubmissions={data.contactSubmissions}
        hardwareCustomEnabled={data.hardwareCustomEnabled}
        nurseryCustomEnabled={data.nurseryCustomEnabled}
        techCustomEnabled={data.techCustomEnabled}
        servicesCustomEnabled={data.servicesCustomEnabled}
        checkoutOptionsCatalog={data.checkoutOptionsCatalog}
        stockAvailabilityCatalog={data.stockAvailabilityCatalog}
        inventoryItems={data.inventoryItems}
        imsSuppliers={data.imsSuppliers}
        inventoryMovements={data.inventoryMovements}
        simulatedOrders={data.simulatedOrders}
        productsWithoutInventory={data.productsWithoutInventory}
        organizations={data.organizations}
        vendorOrgIntegrity={data.vendorOrgIntegrity}
      />
    </main>
  );
}
