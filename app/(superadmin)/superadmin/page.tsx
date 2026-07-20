import { Suspense } from 'react';
import { getSystemSetting } from '@/shared/platform/settings';
import { getCheckoutOptionsCatalog } from '@/features/organization/checkout-options';
import { getStockAvailabilityCatalog } from '@/features/inventory/availability.server';
import { clerkClient } from '@clerk/nextjs/server';
import { getSuperadminOrganizations } from '@/shared/auth/clerk-cache';
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

async function DashboardData({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const params = await searchParams;
  const activeTab = params.tab || 'overview';


  // We need vendor org integrity for badges & org issues
  const client = await clerkClient();
  const organizations = await getSuperadminOrganizations(client);
  const vendorOrgIntegrity = await getVendorOrgIntegrityReport(organizations);
  const vendorIssuesCount = vendorOrgIntegrity.totals.orphanOrgIds || 0;

  // We need contacts for badges
  const contacts = await getContactSubmissionsOrderedByCreatedAtDesc();
  const pendingContactsCount = contacts.filter(c => c.status === 'pending').length;

  let content: React.ReactNode = null;

  switch (activeTab) {
    case 'overview': {
      const [categories, products] = await Promise.all([
        getCategoriesOrderedByCreatedAtDesc(),
        getProductsWithCategoryDetails(),
      ]);
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
      const categories = await getCategoriesOrderedByCreatedAtDesc();
      content = <CategoriesTab categories={categories} />;
      break;
    }
    case 'products': {
      const [products, categories, maxMediaSetting] = await Promise.all([
        getProductsWithCategoryDetails(),
        getCategoriesOrderedByCreatedAtDesc(),
        getSystemSetting('max_media_limit', '5'),
      ]);
      content = (
        <ProductsTab
          products={products}
          categories={categories}
          organizations={organizations}
          maxMediaLimit={parseInt(maxMediaSetting, 10) || 5}
        />
      );
      break;
    }
    case 'inventory': {
      const [products, inventoryItems, inventoryMovements, suppliers, orders, checkoutOptionsCatalog] = await Promise.all([
        getProductsWithCategoryDetails(),
        getInventoryItemsWithDetails(),
        getInventoryMovementsWithProductName(),
        getImsSuppliersOrderedByCreatedAtDesc(),
        getSimulatedOrdersWithItems(),
        getCheckoutOptionsCatalog(),
      ]);

      const productsWithoutInventory = products.filter(p => !inventoryItems.some(i => i.productId === p.id));
      content = (
        <InventoryTab
          inventoryItems={inventoryItems}
          movements={inventoryMovements}
          suppliers={suppliers}
          simulatedOrders={orders}
          productsWithoutInventory={productsWithoutInventory}
          checkoutOptionsCatalog={checkoutOptionsCatalog}
          organizations={organizations}
        />
      );
      break;
    }
    case 'vendor-issues': {
      const enableBulkReassignmentStr = await getSystemSetting('enable_bulk_reassignment', 'true');
      content = (
        <VendorOrgIssuesTab
          integrityReport={vendorOrgIntegrity}
          organizations={organizations}
          enableBulkReassignment={enableBulkReassignmentStr === 'true'}
        />
      );
      break;
    }
    case 'licenses': {
      content = <LicensesTab organizations={organizations} />;
      break;
    }
    case 'pricing': {
      const pricingPlans = await getPricingPlansOrderedByCreatedAtDesc();
      content = <PricingTab pricingPlans={pricingPlans} />;
      break;
    }
    case 'contacts': {
      content = <ContactsTab contactSubmissions={contacts} />;
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
