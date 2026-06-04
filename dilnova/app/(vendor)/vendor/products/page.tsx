import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import ManageProductsClient, { type Product } from './ManageProductsClient';

export const revalidate = 0; // Fresh load on each edit/view session

export default async function VendorProductsPage() {
  // 1. Authenticate & Obtain Organization Context & Role
  const { userId, orgId, orgRole } = await auth();
  if (!userId || !orgId || (orgRole !== 'org:admin' && orgRole !== 'org:vendor')) {
    redirect('/unauthorized');
  }

  // 2. Fetch Organization Details from Clerk
  const client = await clerkClient();
  const org = await client.organizations.getOrganization({ organizationId: orgId });

  // 3. Fetch Existing Products/Services belonging to this Organization
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

  return (
    <main className="px-3 py-4 sm:px-6 md:px-10 lg:px-12 sm:py-8 max-w-[1400px] mx-auto font-sans w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
              {org.name}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Manage Inventory
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-[11px] sm:text-sm mt-0.5 hidden sm:block">
            View, search, and manage your catalog items.
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

      {/* Client Management Component */}
      <ManageProductsClient 
        initialProducts={vendorProducts as Product[]} 
      />
    </main>
  );
}
