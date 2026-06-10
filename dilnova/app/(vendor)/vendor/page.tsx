import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import ManageProductsClient, { type Product } from './products/ManageProductsClient';
import VendorInventoryWorkspace from './products/VendorInventoryWorkspace';
import { getVendorInventoryData } from './products/inventoryActions';

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
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
  // For admins, default tab is catalog
  const activeTab = resolvedParams.tab || 'catalog';

  // Fetch products and inventory data if org:admin
  let vendorProducts: Product[] = [];
  let inventoryData = null;
  let inventoryErrorMsg = '';

  if (orgRole === 'org:admin') {
    if (activeTab === 'catalog') {
      vendorProducts = (await db
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
        .where(eq(schema.products.orgId, orgId))) as Product[];
    } else if (activeTab === 'inventory') {
      try {
        inventoryData = await getVendorInventoryData();
      } catch (err) {
        inventoryErrorMsg = err instanceof Error ? err.message : 'Unable to load inventory data.';
      }
    }
  }

  return (
    <main className="px-3 py-4 sm:px-6 md:px-10 lg:px-12 sm:py-8 max-w-[1400px] mx-auto font-sans w-full flex-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
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
        
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 self-start sm:self-center">
          {orgRole === 'org:admin' && (
            <Link
              href="/admin"
              className="text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-red-200 hover:bg-red-50 dark:border-red-905/40 dark:hover:bg-red-955/20 text-red-750 dark:text-red-400 transition-colors whitespace-nowrap"
            >
              ⚙️ Org Admin Console
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
          {/* Tabs Switcher for Admin */}
          <div className="flex gap-2 border-b border-zinc-250 dark:border-zinc-850 pb-px mb-6 overflow-x-auto">
            <Link
              href="?tab=catalog"
              className={`pb-2.5 px-4 text-xs font-extrabold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'catalog'
                  ? 'border-purple-650 text-purple-700 dark:text-purple-400 font-black'
                  : 'border-transparent text-zinc-450 hover:text-zinc-700'
              }`}
            >
              📁 Product Catalog
            </Link>
            <Link
              href="?tab=inventory"
              className={`pb-2.5 px-4 text-xs font-extrabold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'inventory'
                  ? 'border-purple-650 text-purple-700 dark:text-purple-400 font-black'
                  : 'border-transparent text-zinc-450 hover:text-zinc-700'
              }`}
            >
              📦 Inventory Workspace
            </Link>
          </div>

          {/* Content rendering based on Tab */}
          {activeTab === 'catalog' && (
            <ManageProductsClient initialProducts={vendorProducts} />
          )}

          {activeTab === 'inventory' && (
            <>
              {inventoryData && inventoryData.premiumStatus.imsActive ? (
                <VendorInventoryWorkspace
                  initialData={inventoryData}
                />
              ) : (
                <div className="text-center py-16 border border-zinc-250 rounded-2xl dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 shadow-sm space-y-4 max-w-xl mx-auto mt-6">
                  <div className="text-5xl">👑</div>
                  <h2 className="text-lg font-black text-zinc-900 dark:text-white">Premium Inventory Management System</h2>
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    Unlock multi-branch stock levels, supplier management directories, real-time POS cash register checkouts, and historical stock audit log tracking.
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
        </>
      ) : (
        /* Regular Members Dashboard (Non-Admin View) */
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Identity details panel */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm dark:bg-zinc-950 dark:border-zinc-900">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-450 mb-3 font-mono">
              Active Identity Details
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
          <div className="border border-emerald-250 bg-emerald-50/50 rounded-2xl p-6 dark:border-emerald-900/40 dark:bg-emerald-950/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <span>🛒</span> Add Catalog Listing
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
