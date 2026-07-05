import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AddProductClient from '@/features/catalog/components/AddProductClient';
import { getSystemSetting } from '@/shared/platform/settings';
import { getPremiumStatus } from '@/features/inventory/premium-license';
import { getStockAvailabilityCatalog } from '@/features/inventory/availability.server';
import { getEnabledStockAvailabilityOptions } from '@/features/inventory/availability.shared';
import {
  getAllCategories,
  getAssignedBranchIdsForUser,
  getBranchesForOrg,
  getDefaultBranchName,
  getUserAssignedBranchNames,
} from '@/features/catalog/queries';
import { RestrictedAccessBlock } from '@/shared/components/RestrictedAccessBlock';

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
    const assignedNames = await getUserAssignedBranchNames(userId, orgId);
    if (assignedNames) {
      branchNames = assignedNames;
    }
  }

  if (!branchNames) {
    branchNames = await getDefaultBranchName(orgId);
  }

  const categories = await getAllCategories();

  let branches = await getBranchesForOrg(orgId);

  if (orgRole !== 'org:admin' && premiumStatus.multiBranchActive && branches.length > 0) {
    const assignedBranchIds = await getAssignedBranchIdsForUser(userId);
    branches = branches.filter((branch) => assignedBranchIds.has(branch.id));
  }

  // 6. Fetch max media limit setting
  const maxMediaLimitSetting = await getSystemSetting('max_media_limit', '5');
  const maxMediaLimit = parseInt(maxMediaLimitSetting, 10) || 5;
  const stockAvailabilityCatalog = await getStockAvailabilityCatalog();
  const stockAvailabilityOptions = getEnabledStockAvailabilityOptions(stockAvailabilityCatalog);

  if (orgRole === 'org:member' && branches.length === 0) {
    return (
      <main className="px-3 py-4 sm:px-6 md:px-10 lg:px-12 sm:py-8 max-w-[1400px] mx-auto font-sans w-full">
        <RestrictedAccessBlock type="no_branch" />
      </main>
    );
  }

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

