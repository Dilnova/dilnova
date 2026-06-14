import SuperAdminClient from '@/features/superadmin/components/SuperAdminClient';
import { getSystemSetting } from '@/shared/platform/settings';
import { getCheckoutOptionsCatalog } from '@/features/organization/checkout-options';
import { getStockAvailabilityCatalog } from '@/features/inventory/availability.server';
import { clerkClient } from '@clerk/nextjs/server';
import { fetchAllClerkOrganizations } from '@/shared/auth/clerk-cache';
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

export default async function SuperAdminDashboardPage() {
  const client = await clerkClient();
  const organizations = await fetchAllClerkOrganizations(client);

  const categories = await getCategoriesOrderedByCreatedAtDesc();
  const products = await getProductsWithCategoryDetails();

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

  const pricingPlans = await getPricingPlansOrderedByCreatedAtDesc();
  const contactSubmissions = await getContactSubmissionsOrderedByCreatedAtDesc();

  const hardwareCustomEnabled = (await getSystemSetting('custom_storefront_distar-hardware', 'true')) === 'true';
  const nurseryCustomEnabled = (await getSystemSetting('custom_storefront_distar-nursery', 'true')) === 'true';
  const techCustomEnabled = (await getSystemSetting('custom_storefront_distar-tech', 'true')) === 'true';
  const servicesCustomEnabled = (await getSystemSetting('custom_storefront_dilstar-services', 'true')) === 'true';
  const checkoutOptionsCatalog = await getCheckoutOptionsCatalog();
  const stockAvailabilityCatalog = await getStockAvailabilityCatalog();

  const imsSuppliers = await getImsSuppliersOrderedByCreatedAtDesc();
  const inventoryItems = await getInventoryItemsWithDetails();
  const inventoryMovements = await getInventoryMovementsWithProductName();
  const simulatedOrders = await getSimulatedOrdersWithItems();
  const productsWithoutInventory = await getProductsWithoutInventory(inventoryItems);
  const vendorOrgIntegrity = await getVendorOrgIntegrityReport(organizations);

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
