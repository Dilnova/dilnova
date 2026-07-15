import { Suspense } from 'react';
import { getSystemSetting } from '@/shared/platform/settings';
import { getCheckoutOptionsCatalog } from '@/features/organization/checkout-options';
import { getStockAvailabilityCatalog } from '@/features/inventory/availability.server';
import { clerkClient } from '@clerk/nextjs/server';
import { getSuperadminOrganizations } from '@/shared/auth/clerk-cache';
import { logger } from '@/shared/logging/logger';
import {
  getCategoriesOrderedByCreatedAtDesc,
  getContactSubmissionsOrderedByCreatedAtDesc,
  getInventoryItemsWithDetails,
  getInventoryMovementsWithProductName,
  getImsSuppliersOrderedByCreatedAtDesc,
  getPricingPlansOrderedByCreatedAtDesc,
  getProductsWithCategoryDetails,
  getSimulatedOrdersWithItems,
  getVendorOrgIntegrityReport,
} from '@/features/superadmin/queries';

import SuperAdminNavigation from '@/features/superadmin/components/SuperAdminNavigation';
import OverviewTab from '@/features/superadmin/components/tabs/OverviewTab';
import CategoriesTab from '@/features/superadmin/components/tabs/CategoriesTab';
import ProductsTab from '@/features/superadmin/components/tabs/ProductsTab';
import PricingTab from '@/features/superadmin/components/tabs/PricingTab';
import ContactsTab from '@/features/superadmin/components/tabs/ContactsTab';
import SettingsTab from '@/features/superadmin/components/tabs/SettingsTab';
import ComplianceTab from '@/features/superadmin/components/tabs/ComplianceTab';
import InventoryTab from '@/features/inventory/components/InventoryTab';
import VendorOrgIssuesTab from '@/features/vendor-org/components/VendorOrgIssuesTab';
import LicensesTab from '@/features/superadmin/components/LicensesTab';

export const maxDuration = 60; // Allow up to 60s for this heavy page (Vercel serverless)

/**
 * Safely execute a data-fetching function, returning a fallback value if it fails.
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

async function DashboardData({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const params = await searchParams;
  const activeTab = params.tab || 'overview';
  const queryErrors: string[] = [];

  const pushError = (err: string | null) => {
    if (err) queryErrors.push(err);
  };

  // We need vendor org integrity for badges & org issues
  const client = await clerkClient();
  const organizations = await getSuperadminOrganizations(client);
  const vendorOrgIntegrityResult = await safeQuery('Vendor Org Integrity', () => getVendorOrgIntegrityReport(organizations), {
    knownOrgCount: 0,
    issueGroups: [],
    totals: { orphanOrgIds: 0, products: 0, orderItems: 0, suppliers: 0, branches: 0, billingReceipts: 0 }
  });
  pushError(vendorOrgIntegrityResult.error);
  const vendorOrgIntegrity = vendorOrgIntegrityResult.data;
  const vendorIssuesCount = vendorOrgIntegrity.totals.orphanOrgIds || 0;

  // We need contacts for badges
  const contactsResult = await safeQuery('Contact Submissions', getContactSubmissionsOrderedByCreatedAtDesc, []);
  pushError(contactsResult.error);
  const pendingContactsCount = contactsResult.data.filter(c => c.status === 'pending').length;

  let content: React.ReactNode = null;

  switch (activeTab) {
    case 'overview': {
      const [categoriesResult, productsResult] = await Promise.all([
        safeQuery('Categories', getCategoriesOrderedByCreatedAtDesc, []),
        safeQuery('Products', getProductsWithCategoryDetails, []),
      ]);
      pushError(categoriesResult.error);
      pushError(productsResult.error);

      const categories = categoriesResult.data;
      const products = productsResult.data;
      const stats = {
        totalProducts: products.filter(p => p?.type === 'product').length,
        totalServices: products.filter(p => p?.type === 'service').length,
        totalCategories: categories.length,
        totalViews: products.reduce((acc, p) => acc + (p?.views || 0), 0),
      };

      content = <OverviewTab stats={stats} products={products} />;
      break;
    }
    case 'categories': {
      const categoriesResult = await safeQuery('Categories', getCategoriesOrderedByCreatedAtDesc, []);
      pushError(categoriesResult.error);
      content = <CategoriesTab categories={categoriesResult.data} />;
      break;
    }
    case 'products': {
      const [productsResult, categoriesResult, maxMediaSetting] = await Promise.all([
        safeQuery('Products', getProductsWithCategoryDetails, []),
        safeQuery('Categories', getCategoriesOrderedByCreatedAtDesc, []),
        getSystemSetting('max_media_limit', '5'),
      ]);
      pushError(productsResult.error);
      pushError(categoriesResult.error);
      content = (
        <ProductsTab
          products={productsResult.data}
          categories={categoriesResult.data}
          organizations={organizations}
          maxMediaLimit={parseInt(maxMediaSetting, 10) || 5}
        />
      );
      break;
    }
    case 'inventory': {
      const [productsResult, inventoryItemsResult, inventoryMovementsResult, suppliersResult, ordersResult, checkoutOptionsCatalog] = await Promise.all([
        safeQuery('Products', getProductsWithCategoryDetails, []),
        safeQuery('Inventory Items', getInventoryItemsWithDetails, []),
        safeQuery('Inventory Movements', getInventoryMovementsWithProductName, []),
        safeQuery('Suppliers', getImsSuppliersOrderedByCreatedAtDesc, []),
        safeQuery('Simulated Orders', getSimulatedOrdersWithItems, []),
        getCheckoutOptionsCatalog(),
      ]);
      pushError(productsResult.error);
      pushError(inventoryItemsResult.error);
      pushError(inventoryMovementsResult.error);
      pushError(suppliersResult.error);
      pushError(ordersResult.error);

      const productsWithoutInventory = productsResult.data.filter(p => !inventoryItemsResult.data.some(i => i.productId === p.id));
      content = (
        <InventoryTab
          inventoryItems={inventoryItemsResult.data}
          movements={inventoryMovementsResult.data}
          suppliers={suppliersResult.data}
          simulatedOrders={ordersResult.data}
          productsWithoutInventory={productsWithoutInventory}
          checkoutOptionsCatalog={checkoutOptionsCatalog}
          organizations={organizations}
        />
      );
      break;
    }
    case 'vendor-issues': {
      content = (
        <VendorOrgIssuesTab
          integrityReport={vendorOrgIntegrity}
          organizations={organizations}
        />
      );
      break;
    }
    case 'licenses': {
      content = <LicensesTab organizations={organizations} />;
      break;
    }
    case 'pricing': {
      const pricingPlansResult = await safeQuery('Pricing Plans', getPricingPlansOrderedByCreatedAtDesc, []);
      pushError(pricingPlansResult.error);
      content = <PricingTab pricingPlans={pricingPlansResult.data} />;
      break;
    }
    case 'contacts': {
      content = <ContactsTab contactSubmissions={contactsResult.data} />;
      break;
    }
    case 'settings': {
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

      content = (
        <SettingsTab
          systemName={systemName}
          mediaLimit={parseInt(maxMediaLimitSetting, 10) || 5}
          logoUrl={systemLogo}
          faviconUrl={systemFavicon}
          hardwareCustomEnabled={hardwareCustomSetting === 'true'}
          nurseryCustomEnabled={nurseryCustomSetting === 'true'}
          techCustomEnabled={techCustomSetting === 'true'}
          servicesCustomEnabled={servicesCustomSetting === 'true'}
          checkoutOptionsCatalog={checkoutOptionsCatalog}
          stockAvailabilityCatalog={stockAvailabilityCatalog}
        />
      );
      break;
    }
    case 'compliance': {
      content = <ComplianceTab />;
      break;
    }
    default: {
      content = <div className="p-10 text-center text-zinc-500 font-mono">Invalid Tab</div>;
      break;
    }
  }

  return (
    <>
      {queryErrors.length > 0 && (
        <div className="mb-6 mt-6 rounded-lg border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/50 p-4">
          <h3 className="font-semibold text-red-800 dark:text-red-300 mb-1">
            ⚠️ Some data could not be loaded
          </h3>
          <p className="text-sm text-red-700 dark:text-red-400 mb-2">
            The following queries failed — this is likely caused by a database timeout or a missing/mismatched{' '}
            <code className="px-1 py-0.5 bg-red-100 dark:bg-red-900 rounded text-xs font-mono">PII_ENCRYPTION_KEY</code>{' '}
            environment variable in production.
          </p>
          <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400 space-y-1">
            {queryErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-6">
        <SuperAdminNavigation 
          activeTab={activeTab} 
          vendorIssuesCount={vendorIssuesCount} 
          pendingContactsCount={pendingContactsCount} 
        />
        {content}
      </div>
    </>
  );
}

export default function SuperAdminDashboardPage(props: { searchParams: Promise<{ tab?: string }> }) {
  return (
    <main className="px-3 py-4 sm:px-6 md:px-10 lg:px-12 sm:py-8 max-w-[1400px] mx-auto font-sans w-full">
      <div className="mb-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
          Superadmin Dashboard
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Platform-wide analytics, operational data, and configurations.
        </p>
      </div>
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <span className="text-5xl animate-pulse">📊</span>
          <p className="text-sm font-mono text-zinc-500 uppercase tracking-widest">Loading Dashboard Data...</p>
        </div>
      }>
        <DashboardData searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
