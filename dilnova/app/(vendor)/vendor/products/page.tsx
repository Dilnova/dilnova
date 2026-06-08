import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import ManageProductsClient, { type Product } from './ManageProductsClient';
import VendorInventoryWorkspace from './VendorInventoryWorkspace';
import { getVendorInventoryData } from './inventoryActions';

export const revalidate = 0; // Fresh load on each edit/view session

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function VendorProductsPage({ searchParams }: PageProps) {
  // 1. Authenticate & Obtain Organization Context & Role
  const { userId, orgId, orgRole } = await auth();
  if (!userId || !orgId || orgRole !== 'org:admin') {
    redirect('/unauthorized');
  }

  // 2. Fetch Organization Details from Clerk
  const client = await clerkClient();
  const org = await client.organizations.getOrganization({ organizationId: orgId });

  // 3. Fetch Catalog Products
  const vendorProducts = await db
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
    .where(eq(schema.products.orgId, orgId));

  // 4. Fetch Inventory Data (Includes premium flags checking)
  let inventoryData = null;
  let errorMsg = '';
  try {
    inventoryData = await getVendorInventoryData();
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : 'Unable to load inventory data.';
  }

  const resolvedParams = await searchParams;
  const activeTab = resolvedParams.tab || 'catalog';

  return (
    <main className="px-3 py-4 sm:px-6 md:px-10 lg:px-12 sm:py-8 max-w-[1400px] mx-auto font-sans w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
              {org.name}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Storefront Console
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-[11px] sm:text-sm mt-0.5">
            Manage your product catalog, active stock levels, multiple branches, and point-of-sale registers.
          </p>
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <Link
            href="/vendor"
            className="text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-colors whitespace-nowrap"
          >
            ← Profile
          </Link>
          <Link
            href="/"
            className="hidden sm:inline-flex text-xs font-semibold px-3 py-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            Home
          </Link>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex gap-2 border-b border-zinc-250 dark:border-zinc-850 pb-px mb-6">
        <Link
          href="?tab=catalog"
          className={`pb-2.5 px-4 text-xs font-extrabold transition-all border-b-2 ${
            activeTab === 'catalog'
              ? 'border-purple-650 text-purple-700 dark:text-purple-400 font-black'
              : 'border-transparent text-zinc-450 hover:text-zinc-700'
          }`}
        >
          📁 Product Catalog
        </Link>
        <Link
          href="?tab=inventory"
          className={`pb-2.5 px-4 text-xs font-extrabold transition-all border-b-2 ${
            activeTab === 'inventory'
              ? 'border-purple-650 text-purple-700 dark:text-purple-400 font-black'
              : 'border-transparent text-zinc-450 hover:text-zinc-700'
          }`}
        >
          📦 Inventory Workspace
        </Link>
        {inventoryData && inventoryData.premiumStatus.billingActive && (
          <Link
            href="/vendor/billing"
            className="pb-2.5 px-4 text-xs font-extrabold transition-all border-b-2 border-transparent text-zinc-450 hover:text-zinc-700"
          >
            📠 POS Billing Register
          </Link>
        )}
      </div>

      {/* Content rendering based on Tab */}
      {activeTab === 'catalog' && (
        <ManageProductsClient initialProducts={vendorProducts as Product[]} />
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
              {errorMsg && (
                <div className="bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 p-3 rounded-lg text-xs font-mono">
                  Access Status: {errorMsg}
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
    </main>
  );
}
