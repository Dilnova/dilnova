import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import ManageProductsClient, { type Product } from '@/features/catalog/components/ManageProductsClient';
import VendorProfileForm from '@/features/vendor/components/VendorProfileForm';
import VendorInventoryWorkspace from '@/features/inventory/components/VendorInventoryWorkspace';
import { RestrictedAccessBlock } from '@/shared/components/RestrictedAccessBlock';
import { getVendorInventoryData } from '@/features/inventory/vendor.actions';
import { getVendorProductsForOrg } from '@/features/catalog/queries';
import { getBranchCountForOrg, getOnlineOrderCountForVendor } from '@/features/vendor/queries';
import { hasBankTransferConfiguredForOrg } from '@/features/billing/bank-transfer-metadata';

const IMS_WORKSPACE_TABS = ['stock', 'suppliers', 'orders', 'movements', 'branches'] as const;
type ImsWorkspaceTab = (typeof IMS_WORKSPACE_TABS)[number];

function parseImsWorkspaceTab(value: string | undefined): ImsWorkspaceTab | undefined {
  if (!value) return undefined;
  return IMS_WORKSPACE_TABS.includes(value as ImsWorkspaceTab) ? (value as ImsWorkspaceTab) : undefined;
}

interface PageProps {
  searchParams: Promise<{ tab?: string; imsTab?: string }>;
}

export default async function VendorPage({ searchParams }: PageProps) {
  const { orgId, orgRole, userId } = await auth();
  const user = await currentUser().catch(() => null);

  if (!userId) {
    redirect('/unauthorized');
  }

  if (!orgId) {
    throw new Error('No active organization detected.');
  }

  if (orgRole !== 'org:admin') {
    return (
      <main className="px-3 py-4 sm:px-6 md:px-10 lg:px-12 sm:py-8 max-w-[1400px] mx-auto font-sans w-full">
        <RestrictedAccessBlock type="unauthorized" />
      </main>
    );
  }

  // Fetch current organization details from Clerk API
  const client = await clerkClient();
  const org = await client.organizations.getOrganization({ organizationId: orgId });

  const resolvedParams = await searchParams;
  const activeTab = resolvedParams.tab || 'catalog';
  const initialImsTab = parseImsWorkspaceTab(resolvedParams.imsTab);

  // Fetch products and inventory data in parallel to optimize loading latency (reduce TTFB)
  let vendorProducts: Product[] = [];
  let inventoryData: any = null;
  let inventoryErrorMsg = '';
  let branchCount = 0;
  let onlineOrderCount = 0;

  if (orgRole === 'org:admin') {
    try {
      const [productsResult, inventoryResult, branchCountRow, onlineOrderCountRow] = await Promise.all([
        getVendorProductsForOrg(orgId),
        getVendorInventoryData().catch((err: unknown) => {
          inventoryErrorMsg = err instanceof Error ? err.message : 'Unable to load inventory data.';
          return null;
        }),
        getBranchCountForOrg(orgId),
        getOnlineOrderCountForVendor(orgId),
      ]);
      vendorProducts = productsResult as Product[];
      inventoryData = inventoryResult;
      branchCount = branchCountRow;
      onlineOrderCount = onlineOrderCountRow;
    } catch (err) {
      // Graceful fallback
    }
  }

  // Compute metrics summary stats for enterprise-grade KPI cards
  const totalItems = vendorProducts.length;
  const totalProducts = vendorProducts.filter((p) => p.type === 'product').length;
  const totalServices = vendorProducts.filter((p) => p.type === 'service').length;
  const activeBranches = branchCount;

  const orgMetadata = (org.publicMetadata || {}) as {
    description?: string;
    address?: string;
    phone?: string;
    bannerUrl?: string;
    checkout_options?: Record<string, boolean>;
    ims_max_listing_count?: number;
  };
  const checkoutOptions = orgMetadata.checkout_options || {};
  // Resolve org-specific listing limit (falls back to 10 if not set by superadmin)
  const maxListingCount =
    typeof orgMetadata.ims_max_listing_count === 'number' &&
    Number.isInteger(orgMetadata.ims_max_listing_count) &&
    orgMetadata.ims_max_listing_count >= 1
      ? orgMetadata.ims_max_listing_count
      : 10;
  const bankTransferConfigured = hasBankTransferConfiguredForOrg(org);
  const pickupEnabled = checkoutOptions.store_pickup === true;
  const bankTransferEnabled = checkoutOptions.bank_transfer === true;
  const codEnabled = checkoutOptions.cash_on_delivery === true;
  const deliveryEnabled = checkoutOptions.standard_delivery === true;
  const hasFulfillmentOption = pickupEnabled || deliveryEnabled;
  const hasPaymentOption = bankTransferEnabled || codEnabled;
  const profileFieldsComplete = ['description', 'address', 'phone', 'bannerUrl'].every(
    (field) => Boolean(orgMetadata[field as keyof typeof orgMetadata])
  );
  const pickupReady = !pickupEnabled || activeBranches > 0;
  const bankTransferReady = !bankTransferEnabled || bankTransferConfigured;
  const phase6ConfigReady =
    Boolean(org.slug) &&
    totalItems > 0 &&
    profileFieldsComplete &&
    hasFulfillmentOption &&
    hasPaymentOption &&
    pickupReady &&
    bankTransferReady;

  let lowStockCount = 0;
  let outOfStockCount = 0;
  if (inventoryData && inventoryData.inventoryItems) {
    inventoryData.inventoryItems.forEach((item: any) => {
      const qty = item.quantity ?? 0;
      if (qty === 0) {
        outOfStockCount++;
      } else if (qty <= item.lowStockThreshold) {
        lowStockCount++;
      }
    });
  }

  return (
    <main className="px-3 py-4 sm:px-6 md:px-10 lg:px-12 sm:py-8 max-w-[1400px] mx-auto font-sans w-full flex-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
          <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white shadow-sm shrink-0">
            {org.imageUrl ? (
              <Image src={org.imageUrl} alt={`${org.name} logo`} fill className="object-cover" sizes="64px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 font-extrabold text-xl sm:text-2xl">
                {org.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                {org.name}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                Vendor Control Workspace
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Storefront Console
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-[11px] sm:text-sm mt-0.5">
              {orgRole === 'org:admin'
                ? 'Manage your product catalog, active stock levels, multiple branches, and point-of-sale registers.'
                : 'Add products and services or process point-of-sale register checkouts.'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-start sm:self-center">
          {org.slug && (
            <Link
              href={`/vendors/${org.slug}`}
              target="_blank"
              className="text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-colors whitespace-nowrap cursor-pointer"
            >
              Visit Storefront &rarr;
            </Link>
          )}
          {orgRole === 'org:admin' && (
            <Link
              href="/admin"
              className="text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-red-200 hover:bg-red-50 dark:border-red-905/40 dark:hover:bg-red-955/20 text-red-750 dark:text-red-400 transition-colors whitespace-nowrap cursor-pointer"
            >
              <span className="emoji" aria-hidden="true">⚙️</span> Org Admin Console
            </Link>
          )}
          <Link
            href="/"
            className="text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            &larr; Home Page
          </Link>
        </div>
      </div>

      {orgRole === 'org:admin' ? (
        <>
          {/* Enterprise-grade KPI Metrics Summary Dashboard */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Card 1: Catalog Size */}
            <div className="relative overflow-hidden bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-900 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 right-0 p-4 opacity-40 group-hover:opacity-55 transition-opacity pointer-events-none">
                <span className="text-5xl emoji">📁</span>
              </div>
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">Catalog Items</p>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 font-mono mt-1">{totalItems}</h3>
              <div className="flex gap-2 text-[10px] text-zinc-400 mt-2 font-mono">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{totalProducts} products</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{totalServices} services</span>
              </div>
            </div>

            {/* Card 2: Active Branches */}
            <div className="relative overflow-hidden bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-900 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 right-0 p-4 opacity-40 group-hover:opacity-55 transition-opacity pointer-events-none">
                <span className="text-5xl emoji">🏬</span>
              </div>
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">Branches</p>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 font-mono mt-1">{activeBranches}</h3>
              <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-2 font-mono">
                Active branch channels
              </div>
            </div>

            {/* Card 3: Low Stock Alerts */}
            <div className="relative overflow-hidden bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-900 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 right-0 p-4 opacity-40 group-hover:opacity-55 transition-opacity pointer-events-none">
                <span className="text-5xl emoji">⚠️</span>
              </div>
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">Low Stock Alerts</p>
              <h3 className={`text-2xl font-black font-mono mt-1 ${lowStockCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-900 dark:text-zinc-50'}`}>{lowStockCount}</h3>
              <div className="text-[10px] text-zinc-450 dark:text-zinc-500 mt-2 font-mono">
                {lowStockCount > 0 ? 'Requires restocking soon' : 'All stock levels OK'}
              </div>
            </div>

            {/* Card 4: Out of Stock Warnings */}
            <div className="relative overflow-hidden bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-900 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 right-0 p-4 opacity-40 group-hover:opacity-55 transition-opacity pointer-events-none">
                <span className="text-5xl emoji">🚫</span>
              </div>
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">Out of Stock</p>
              <h3 className={`text-2xl font-black font-mono mt-1 ${outOfStockCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-zinc-50'}`}>{outOfStockCount}</h3>
              <div className="text-[10px] text-zinc-450 dark:text-zinc-500 mt-2 font-mono">
                {outOfStockCount > 0 ? 'Requires immediate action' : 'No empty stock lanes'}
              </div>
            </div>
          </div>

          {/* Premium Pill Segmented Tabs Switcher */}
          <div className="flex bg-zinc-100/80 dark:bg-zinc-900/60 backdrop-blur-md p-1 rounded-2xl mb-6 border border-zinc-200/50 dark:border-zinc-800/30 max-w-xl">
            <Link
              href="?tab=catalog"
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'catalog'
                  ? 'bg-white dark:bg-zinc-800 text-purple-700 dark:text-purple-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <span className="emoji text-sm" aria-hidden="true">📁</span> Product Catalog
            </Link>
            <Link
              href="?tab=inventory"
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'inventory'
                  ? 'bg-white dark:bg-zinc-800 text-purple-700 dark:text-purple-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-300'
              }`}
            >
              <span className="emoji text-sm" aria-hidden="true">📦</span> Inventory Workspace
            </Link>
          </div>

          {/* Content rendering based on Tab */}
          {activeTab === 'catalog' && (
            <>

              <ManageProductsClient
                initialProducts={vendorProducts}
                orgSlug={org.slug}
                maxListingCount={maxListingCount}
                activeListingCount={vendorProducts.filter((p: Product) => (p as any).status !== 'archived').length}
              />
            </>
          )}

          {activeTab === 'inventory' && (
            <>
              {inventoryData ? (
                <VendorInventoryWorkspace initialData={inventoryData} initialAdvancedTab={initialImsTab} />
              ) : (
                <RestrictedAccessBlock type="premium_ims" errorMsg={inventoryErrorMsg || undefined} />
              )}
            </>
          )}


        </>
      ) : (
        /* Regular Members Dashboard (Non-Admin View) */
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Identity details panel */}
          <div className="relative overflow-hidden bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm dark:bg-zinc-955 dark:border-zinc-900">
            <div className="absolute top-0 right-0 p-6 opacity-25 dark:opacity-30 pointer-events-none">
              <span className="text-9xl emoji">👥</span>
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-450 mb-3 font-mono">
              Active Member Session Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-zinc-650 dark:text-zinc-400">
              <div>
                <span className="text-zinc-400 block mb-0.5">Authorized User</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {user?.firstName} {user?.lastName || ''} ({user?.emailAddresses[0]?.emailAddress})
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block mb-0.5">Organization Context / Role</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 uppercase">
                  {org.name} ({orgRole})
                </span>
              </div>
            </div>
          </div>



          {/* Member Banner Card */}
          <div className="border border-emerald-250 bg-emerald-50/50 rounded-2xl p-6 dark:border-emerald-900/40 dark:bg-emerald-950/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:bg-emerald-50/80">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <span className="emoji" aria-hidden="true">🛒</span> Add Catalog Listing
              </h3>
              <p className="text-xs text-emerald-650 dark:text-emerald-450">
                Create new product or service listings and upload images for your storefront.
              </p>
            </div>
            <Link
              href="/vendor/products/add"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all whitespace-nowrap cursor-pointer"
            >
              + Add New Item &rarr;
            </Link>
          </div>

          {/* Storefront Metadata Settings Form - Admin Only */}
          {orgRole === 'org:admin' && (
            <div className="space-y-6 border border-zinc-200/60 dark:border-zinc-900 rounded-2xl p-5 bg-zinc-50/10 dark:bg-zinc-900/5">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 font-sans">Storefront Profile</h3>
                  {org.slug && (
                    <Link
                      href={`/vendors/${org.slug}`}
                      target="_blank"
                      className="text-xs text-purple-600 hover:text-purple-700 font-semibold"
                    >
                      View Storefront &rarr;
                    </Link>
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
                  Configure your public store details. Bank settings and checkout options are managed by admins.
                </p>
              </div>
              <VendorProfileForm orgId={orgId} initialMetadata={orgMetadata} isAdmin={false} />
            </div>
          )}
        </div>
      )}
    </main>
  );
}
