import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/db';
import * as schema from '@/db/schema';
import AddProductClient from './AddProductClient';
import { getSystemSetting } from '@/utils/settings';
import { getPremiumStatus } from '@/utils/premiumLicense';
import { getStockAvailabilityCatalog } from '@/utils/stockAvailability';
import { getEnabledStockAvailabilityOptions } from '@/utils/stockAvailabilityShared';
import { eq, and } from 'drizzle-orm';

export default async function AddProductPage() {
  // 1. Authenticate & Obtain Organization Context & Role
  const { userId, orgId, orgRole } = await auth();
  if (!userId || !orgId || (orgRole !== 'org:admin' && orgRole !== 'org:member')) {
    redirect('/unauthorized');
  }

  // 2. Fetch Organization Details from Clerk
  const client = await clerkClient();
  const org = await client.organizations.getOrganization({ organizationId: orgId });
  const metadata = (org.publicMetadata || {}) as {
    stockAllocationMode?: 'target_branch' | 'central_intake';
  };
  const stockAllocationMode = metadata.stockAllocationMode || 'central_intake';

  // 3. Resolve Premium Status & Branch Names
  const premiumStatus = await getPremiumStatus(orgId);
  
  let branchNames = '';
  if (premiumStatus.multiBranchActive) {
    // Find user's assigned branches
    const userBranches = await db
      .select({ name: schema.branches.name })
      .from(schema.branchMembers)
      .innerJoin(schema.branches, eq(schema.branchMembers.branchId, schema.branches.id))
      .where(
        and(
          eq(schema.branchMembers.memberUserId, userId),
          eq(schema.branches.orgId, orgId)
        )
      );
    
    if (userBranches.length > 0) {
      branchNames = userBranches.map((b) => b.name).join(', ');
    }
  }

  // Fallback to default/first branch if branchNames is empty
  if (!branchNames) {
    const [defaultBranch] = await db
      .select({ name: schema.branches.name })
      .from(schema.branches)
      .where(
        and(
          eq(schema.branches.orgId, orgId),
          eq(schema.branches.isDefault, true)
        )
      )
      .limit(1);

    if (defaultBranch) {
      branchNames = defaultBranch.name;
    } else {
      const [firstBranch] = await db
        .select({ name: schema.branches.name })
        .from(schema.branches)
        .where(eq(schema.branches.orgId, orgId))
        .limit(1);
      
      branchNames = firstBranch ? firstBranch.name : 'Main Register';
    }
  }

  // 4. Fetch All Available Categories for selection
  const categories = await db
    .select({
      id: schema.categories.id,
      name: schema.categories.name,
      slug: schema.categories.slug,
      parentId: schema.categories.parentId,
    })
    .from(schema.categories);

  // 5. Fetch branches for allocation dropdown (members see assigned branches only in multi-branch mode)
  let branches = await db
    .select({
      id: schema.branches.id,
      name: schema.branches.name,
      isDefault: schema.branches.isDefault,
    })
    .from(schema.branches)
    .where(eq(schema.branches.orgId, orgId));

  if (orgRole !== 'org:admin' && premiumStatus.multiBranchActive && branches.length > 0) {
    const assignedRows = await db
      .select({ branchId: schema.branchMembers.branchId })
      .from(schema.branchMembers)
      .where(eq(schema.branchMembers.memberUserId, userId));

    const assignedBranchIds = new Set(assignedRows.map((row) => row.branchId));
    if (assignedBranchIds.size > 0) {
      branches = branches.filter((branch) => assignedBranchIds.has(branch.id));
    }
  }

  // 6. Fetch max media limit setting
  const maxMediaLimitSetting = await getSystemSetting('max_media_limit', '5');
  const maxMediaLimit = parseInt(maxMediaLimitSetting, 10) || 5;
  const stockAvailabilityCatalog = await getStockAvailabilityCatalog();
  const stockAvailabilityOptions = getEnabledStockAvailabilityOptions(stockAvailabilityCatalog);

  return (
    <main className="px-3 py-4 sm:px-6 md:px-10 lg:px-12 sm:py-8 max-w-[1400px] mx-auto font-sans w-full">
      {/* Header — compact on mobile */}
      <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
            Add Item
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-[11px] sm:text-sm mt-0.5 truncate">
            New listing for <strong className="text-zinc-800 dark:text-zinc-250 font-semibold">{org.name} + {branchNames}</strong>
          </p>
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <Link
            href={orgRole === 'org:admin' ? "/vendor?tab=catalog" : "/vendor"}
            className="text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-colors whitespace-nowrap"
          >
            ← Catalog
          </Link>
          {orgRole === 'org:admin' && (
            <Link
              href="/admin"
              className="hidden sm:inline-flex text-xs font-semibold px-3 py-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              Org Admin
            </Link>
          )}
        </div>
      </div>

      {/* Client Form Component */}
      <AddProductClient 
        categories={categories} 
        maxMediaLimit={maxMediaLimit}
        branches={branches}
        isMultiBranchActive={premiumStatus.multiBranchActive}
        stockAllocationMode={stockAllocationMode}
        stockAvailabilityOptions={stockAvailabilityOptions}
      />
    </main>
  );
}

