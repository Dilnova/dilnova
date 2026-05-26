import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import ManageProductsClient from './ManageProductsClient';

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
      categoryId: schema.products.categoryId,
    })
    .from(schema.products)
    .where(eq(schema.products.orgId, orgId));

  // 4. Fetch All Available Categories for selection
  const categories = await db
    .select({
      id: schema.categories.id,
      name: schema.categories.name,
      slug: schema.categories.slug,
    })
    .from(schema.categories);

  return (
    <main className="p-8 max-w-7xl mx-auto font-sans">
      <div className="border border-zinc-200 rounded-2xl p-8 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-md">
        
        {/* Header Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 mb-2">
              Vendor Catalog Workspace
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Inventory & Services
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
              Add, modify, and delete catalog items for <strong className="text-zinc-800 dark:text-zinc-250 font-semibold">{org.name}</strong>.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Link
              href="/vendor"
              className="text-xs font-semibold px-3 py-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
            >
              &larr; Back to Profile
            </Link>
            <Link
              href="/"
              className="text-xs font-semibold px-3 py-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
            >
              Home Page
            </Link>
          </div>
        </div>

        <hr className="border-zinc-200 dark:border-zinc-800 my-6" />

        {/* Client Management Component (Integrated with B2 Uploader) */}
        <ManageProductsClient 
          initialProducts={vendorProducts} 
          categories={categories} 
        />
        
      </div>
    </main>
  );
}
