import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import ManageProductsClient, { type Product } from './products/ManageProductsClient';
import VendorInventoryWorkspace from '@/features/inventory/components/VendorInventoryWorkspace';
import { getVendorInventoryData } from '@/features/inventory/vendor.actions';
import {
  hasCompleteBankDetails,
  parseBankTransferDetailsFromMetadata,
} from '@/utils/bankTransfer';

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
  const user = await currentUser();

  if (!userId) {
    redirect('/unauthorized');
  }

  if (!orgId) {
    throw new Error('No active organization detected.');
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
        db
          .select({
            id: schema.products.id,
            name: schema.products.name,
            type: schema.products.type,
            description: schema.products.description,
            price: schema.products.price,
            imageUrl: schema.products.imageUrl,
            media: schema.products.media,
            categoryId: schema.products.categoryId,
          })
          .from(schema.products)
          .where(eq(schema.products.orgId, orgId)),
        getVendorInventoryData().catch((err: unknown) => {
          inventoryErrorMsg = err instanceof Error ? err.message : 'Unable to load inventory data.';
          return null;
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(schema.branches)
          .where(eq(schema.branches.orgId, orgId))
          .then((rows) => rows[0]?.count ?? 0),
        db
          .select({ count: sql<number>`count(distinct ${schema.simulatedOrderItems.orderId})::int` })
          .from(schema.simulatedOrderItems)
          .where(eq(schema.simulatedOrderItems.vendorOrgId, orgId))
          .then((rows) => rows[0]?.count ?? 0),
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
    bankName?: string;
    bankAccountName?: string;
    bankAccountNumber?: string;
    bankBranchCode?: string;
    bankTransferInstructions?: string;
  };
  const checkoutOptions = orgMetadata.checkout_options || {};
  const bankTransferConfigured = hasCompleteBankDetails(parseBankTransferDetailsFromMetadata(orgMetadata));
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
            <Link
              href="?tab=storefront"
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'storefront'
                  ? 'bg-white dark:bg-zinc-800 text-purple-700 dark:text-purple-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <span className="emoji text-sm" aria-hidden="true">🌐</span> Public Storefront
            </Link>
          </div>

          {/* Content rendering based on Tab */}
          {activeTab === 'catalog' && (
            <>
              <div className="mb-6 border border-zinc-200/60 dark:border-zinc-900 rounded-2xl p-5 bg-zinc-50/10 dark:bg-zinc-900/5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Phase 2 — Catalog Checklist</h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      Build and verify listings before inventory and POS testing.
                    </p>
                  </div>
                  <span
                    className={`self-start text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      totalProducts > 0
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                    }`}
                  >
                    {totalProducts > 0 ? 'Catalog started' : 'Add your first item'}
                  </span>
                </div>
                <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                  <li className="flex items-start gap-2">
                    <span className={totalProducts > 0 ? 'text-emerald-600' : 'text-zinc-400'}>{totalProducts > 0 ? '✓' : '○'}</span>
                    At least one <strong>product</strong> listed ({totalProducts})
                  </li>
                  <li className="flex items-start gap-2">
                    <span className={totalServices > 0 ? 'text-emerald-600' : 'text-zinc-400'}>{totalServices > 0 ? '✓' : '○'}</span>
                    At least one <strong>service</strong> listed ({totalServices}) <span className="text-zinc-400">(optional)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className={totalItems > 0 ? 'text-emerald-600' : 'text-zinc-400'}>{totalItems > 0 ? '✓' : '○'}</span>
                    Verify on public catalog: <Link href="/products" className="text-purple-700 dark:text-purple-400 hover:underline">/products</Link>
                  </li>
                  {org.slug && (
                    <li className="flex items-start gap-2">
                      <span className={totalItems > 0 ? 'text-emerald-600' : 'text-zinc-400'}>{totalItems > 0 ? '✓' : '○'}</span>
                      Verify on storefront:{' '}
                      <Link href={`/vendors/${org.slug}`} className="text-purple-700 dark:text-purple-400 hover:underline">
                        /vendors/{org.slug}
                      </Link>
                    </li>
                  )}
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400">○</span>
                    Member RBAC: member adds item at <Link href="/vendor/products/add" className="text-purple-700 dark:text-purple-400 hover:underline">/vendor/products/add</Link>; member cannot delete
                  </li>
                </ul>
              </div>
              <ManageProductsClient initialProducts={vendorProducts} orgSlug={org.slug} />
            </>
          )}

          {activeTab === 'inventory' && (
            <>
              {inventoryData && inventoryData.premiumStatus.imsActive ? (
                <>
                  <div className="mb-6 border border-zinc-200/60 dark:border-zinc-900 rounded-2xl p-5 bg-zinc-50/10 dark:bg-zinc-900/5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Phase 3 — Inventory (IMS) Checklist</h3>
                        <p className="text-xs text-zinc-500 mt-1">
                          Manage stock, suppliers, branches, and online orders before POS testing.
                        </p>
                      </div>
                      <span
                        className={`self-start text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                          inventoryData.inventoryItems.length > 0
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                        }`}
                      >
                        {inventoryData.inventoryItems.length > 0 ? 'IMS active' : 'Initialize stock'}
                      </span>
                    </div>
                    <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600">✓</span>
                        Premium IMS license enabled
                      </li>
                      <li className="flex items-start gap-2">
                        <span className={inventoryData.inventoryItems.length > 0 ? 'text-emerald-600' : 'text-zinc-400'}>
                          {inventoryData.inventoryItems.length > 0 ? '✓' : '○'}
                        </span>
                        Stock records for products ({inventoryData.inventoryItems.length} tracked)
                      </li>
                      <li className="flex items-start gap-2">
                        <span className={inventoryData.movements.length > 0 ? 'text-emerald-600' : 'text-zinc-400'}>
                          {inventoryData.movements.length > 0 ? '✓' : '○'}
                        </span>
                        Stock movement logged — restock or adjust on <strong>Stock Levels</strong> tab
                      </li>
                      <li className="flex items-start gap-2">
                        <span className={inventoryData.suppliers.length > 0 ? 'text-emerald-600' : 'text-zinc-400'}>
                          {inventoryData.suppliers.length > 0 ? '✓' : '○'}
                        </span>
                        Supplier added ({inventoryData.suppliers.length}) <span className="text-zinc-400">(optional)</span>
                      </li>
                      {inventoryData.premiumStatus.multiBranchActive && (
                        <>
                          <li className="flex items-start gap-2">
                            <span className={inventoryData.branches.length > 0 ? 'text-emerald-600' : 'text-zinc-400'}>
                              {inventoryData.branches.length > 0 ? '✓' : '○'}
                            </span>
                            Branch directory configured ({inventoryData.branches.length} branches)
                          </li>
                          <li className="flex items-start gap-2">
                            <span className={inventoryData.branchMembers.length > 0 ? 'text-emerald-600' : 'text-zinc-400'}>
                              {inventoryData.branchMembers.length > 0 ? '✓' : '○'}
                            </span>
                            Cashier assigned to branch ({inventoryData.branchMembers.length})
                          </li>
                        </>
                      )}
                      <li className="flex items-start gap-2">
                        <span className={inventoryData.simulatedOrders.length > 0 ? 'text-emerald-600' : 'text-zinc-400'}>
                          {inventoryData.simulatedOrders.length > 0 ? '✓' : '○'}
                        </span>
                        Online order visible on{' '}
                        <Link
                          href="/vendor?tab=inventory&imsTab=orders"
                          className="text-purple-700 dark:text-purple-400 hover:underline"
                        >
                          Simulated Orders
                        </Link>{' '}
                        ({inventoryData.simulatedOrders.length}) — full lifecycle in Phase 5
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-zinc-400">○</span>
                        Member RBAC: <code className="font-mono text-[10px]">org:member</code> cannot open this tab
                      </li>
                    </ul>
                  </div>
                  <VendorInventoryWorkspace initialData={inventoryData} initialAdvancedTab={initialImsTab} />
                </>
              ) : (
                <div className="text-center py-16 border border-zinc-250 rounded-2xl dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 shadow-sm space-y-4 max-w-xl mx-auto mt-6">
                  <div className="text-5xl emoji">👑</div>
                  <h2 className="text-lg font-black text-zinc-900 dark:text-white">Premium Inventory Management System</h2>
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    Unlock multi-branch stock levels, supplier management directories, real-time POS cash register checkouts, and historical stock audit log tracking. Ask your platform superadmin to enable IMS under <strong>/superadmin → Inventory → Licenses</strong>.
                  </p>
                  {inventoryErrorMsg && (
                    <div className="bg-rose-50 text-rose-700 dark:bg-rose-955/20 dark:text-rose-455 p-3 rounded-lg text-xs font-mono">
                      Access Status: {inventoryErrorMsg}
                    </div>
                  )}
                  <div className="pt-2">
                    <Link
                      href="/contact"
                      className="px-6 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-block shadow-md"
                    >
                      Contact Admin to Activate Upgrade
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'storefront' && (
            <>
              <div className="mb-6 border border-zinc-200/60 dark:border-zinc-900 rounded-2xl p-5 bg-zinc-50/10 dark:bg-zinc-900/5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Phase 6 — Public Storefront Checklist</h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      Validate the customer-facing experience after Phases 1–5. Test as guest and signed-in customer in a separate browser.
                    </p>
                  </div>
                  <span
                    className={`self-start text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      phase6ConfigReady && onlineOrderCount > 0
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                        : phase6ConfigReady
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400'
                    }`}
                  >
                    {phase6ConfigReady && onlineOrderCount > 0
                      ? 'End-to-end verified'
                      : phase6ConfigReady
                        ? 'Run customer test'
                        : 'Fix config gaps'}
                  </span>
                </div>
                <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                  <li className="flex items-start gap-2">
                    <span className={org.slug ? 'text-emerald-600' : 'text-zinc-400'}>{org.slug ? '✓' : '○'}</span>
                    Storefront URL configured
                    {org.slug ? (
                      <>
                        {' '}
                        —{' '}
                        <Link
                          href={`/vendors/${org.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-700 dark:text-purple-400 hover:underline"
                        >
                          /vendors/{org.slug}
                        </Link>
                      </>
                    ) : (
                      <span className="text-zinc-400"> (set org slug in Clerk)</span>
                    )}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className={profileFieldsComplete ? 'text-emerald-600' : 'text-zinc-400'}>
                      {profileFieldsComplete ? '✓' : '○'}
                    </span>
                    Public profile complete — banner, description, address, phone at{' '}
                    <Link href="/admin" className="text-purple-700 dark:text-purple-400 hover:underline">
                      /admin
                    </Link>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className={totalItems > 0 ? 'text-emerald-600' : 'text-zinc-400'}>{totalItems > 0 ? '✓' : '○'}</span>
                    Listings visible on storefront ({totalItems} items) and{' '}
                    <Link href="/products" className="text-purple-700 dark:text-purple-400 hover:underline">
                      /products
                    </Link>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className={hasFulfillmentOption && hasPaymentOption ? 'text-emerald-600' : 'text-zinc-400'}>
                      {hasFulfillmentOption && hasPaymentOption ? '✓' : '○'}
                    </span>
                    Checkout options saved — fulfillment + payment enabled in{' '}
                    <Link href="/admin" className="text-purple-700 dark:text-purple-400 hover:underline">
                      /admin
                    </Link>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className={bankTransferReady ? 'text-emerald-600' : 'text-zinc-400'}>
                      {bankTransferReady ? '✓' : '○'}
                    </span>
                    Bank transfer ready
                    {bankTransferEnabled ? (
                      bankTransferConfigured ? (
                        <span> — bank details complete</span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400"> — fill bank fields at /admin</span>
                      )
                    ) : (
                      <span className="text-zinc-400"> (not enabled)</span>
                    )}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className={pickupReady ? 'text-emerald-600' : 'text-zinc-400'}>
                      {pickupReady ? '✓' : '○'}
                    </span>
                    Store pickup ready
                    {pickupEnabled ? (
                      activeBranches > 0 ? (
                        <span> — {activeBranches} branch(es)</span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400"> — create a branch in Inventory</span>
                      )
                    ) : (
                      <span className="text-zinc-400"> (not enabled)</span>
                    )}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400">○</span>
                    Guest browse: out-of-stock items show unavailable; add-to-cart respects stock on storefront + product detail
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400">○</span>
                    Guest checkout blocked at <Link href="/cart" className="text-purple-700 dark:text-purple-400 hover:underline">/cart</Link> — sign-in required
                  </li>
                  <li className="flex items-start gap-2">
                    <span className={onlineOrderCount > 0 ? 'text-emerald-600' : 'text-zinc-400'}>
                      {onlineOrderCount > 0 ? '✓' : '○'}
                    </span>
                    Signed-in customer checkout completed ({onlineOrderCount} online orders) — see Phase 5 order lifecycle
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400">○</span>
                    <Link href="/cart" className="text-purple-700 dark:text-purple-400 hover:underline">/cart</Link> options match what you enabled at /admin (delivery, pickup, bank transfer, COD)
                  </li>
                </ul>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 bg-white dark:bg-zinc-950 shadow-sm space-y-3">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Guest test (incognito)</h4>
                  <ol className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2 list-decimal list-inside">
                    <li>
                      Open{' '}
                      {org.slug ? (
                        <Link href={`/vendors/${org.slug}`} className="text-purple-700 dark:text-purple-400 hover:underline">
                          /vendors/{org.slug}
                        </Link>
                      ) : (
                        'your storefront'
                      )}
                    </li>
                    <li>Browse products — confirm stock badges and add-to-cart gating</li>
                    <li>
                      Open <Link href="/cart" className="text-purple-700 dark:text-purple-400 hover:underline">/cart</Link> — checkout should prompt sign-in
                    </li>
                  </ol>
                </div>
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 bg-white dark:bg-zinc-950 shadow-sm space-y-3">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Customer test (signed in)</h4>
                  <ol className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2 list-decimal list-inside">
                    <li>Add in-stock item to cart from storefront or /products</li>
                    <li>
                      Checkout at <Link href="/cart" className="text-purple-700 dark:text-purple-400 hover:underline">/cart</Link> with enabled payment + fulfillment
                    </li>
                    <li>
                      Track order at{' '}
                      <Link href="/customer?tab=orders" className="text-purple-700 dark:text-purple-400 hover:underline">
                        /customer
                      </Link>
                    </li>
                    <li>
                      Vendor verifies on{' '}
                      <Link href="/vendor?tab=inventory&imsTab=orders" className="text-purple-700 dark:text-purple-400 hover:underline">
                        Phase 5 orders tab
                      </Link>
                    </li>
                  </ol>
                </div>
              </div>
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
        </div>
      )}
    </main>
  );
}
