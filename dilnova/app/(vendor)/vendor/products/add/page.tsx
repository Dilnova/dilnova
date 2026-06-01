import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/db';
import * as schema from '@/db/schema';
import AddProductClient from './AddProductClient';
import { getSystemSetting } from '@/utils/settings';

export default async function AddProductPage() {
  // 1. Authenticate & Obtain Organization Context & Role
  const { userId, orgId, orgRole } = await auth();
  if (!userId || !orgId || (orgRole !== 'org:admin' && orgRole !== 'org:vendor')) {
    redirect('/unauthorized');
  }

  // 2. Fetch Organization Details from Clerk
  const client = await clerkClient();
  const org = await client.organizations.getOrganization({ organizationId: orgId });

  // 3. Fetch All Available Categories for selection
  const categories = await db
    .select({
      id: schema.categories.id,
      name: schema.categories.name,
      slug: schema.categories.slug,
      parentId: schema.categories.parentId,
    })
    .from(schema.categories);

  // 4. Fetch max media limit setting
  const maxMediaLimitSetting = await getSystemSetting('max_media_limit', '5');
  const maxMediaLimit = parseInt(maxMediaLimitSetting, 10) || 5;

  return (
    <main className="p-8 max-w-7xl mx-auto font-sans">
      <div className="border border-zinc-200 rounded-2xl p-8 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-md">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 mb-2">
              New Catalog Entry
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Add Product or Service
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
              Create a new catalog listing for <strong className="text-zinc-800 dark:text-zinc-250 font-semibold">{org.name}</strong>.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Link
              href="/vendor/products"
              className="text-xs font-semibold px-3 py-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
            >
              &larr; Back to Catalog
            </Link>
            <Link
              href="/vendor"
              className="text-xs font-semibold px-3 py-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
            >
              Profile
            </Link>
          </div>
        </div>

        <hr className="border-zinc-200 dark:border-zinc-800 my-6" />

        {/* Client Form Component */}
        <AddProductClient 
          categories={categories} 
          maxMediaLimit={maxMediaLimit}
        />
        
      </div>
    </main>
  );
}
