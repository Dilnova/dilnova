import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import POSBillingClient from '@/features/billing/components/POSBillingClient';
import { getVendorBillingRegisterData } from '@/features/billing/register.actions';
import { RestrictedAccessBlock } from '@/shared/components/RestrictedAccessBlock';
import { getSystemSetting } from '@/shared/platform/settings';
import { resolveEffectiveStockAvailability } from '@/features/inventory/availability.shared';

export const revalidate = 0; // Fresh load

export default async function VendorBillingPage() {
  const { userId, orgId, orgRole } = await auth();
  if (!userId || !orgId || (orgRole !== 'org:admin' && orgRole !== 'org:member')) {
    redirect('/unauthorized');
  }

  const client = await clerkClient();
  const org = await client.organizations.getOrganization({ organizationId: orgId });

  let billingData = null;
  let errorMsg = '';
  try {
    billingData = await getVendorBillingRegisterData();
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : 'Unable to load billing register.';
  }

  const systemName = await getSystemSetting('system_name', 'Dilnova');

  const purchasableProductCount =
    billingData?.inventoryItems.filter((item) => {
      if (item.productType === 'service') return true;
      if (!item.id) return false;
      const availability = resolveEffectiveStockAvailability(
        billingData.stockAvailabilityCatalog,
        item.stockAvailability,
        item.quantity ?? 0
      );
      return availability?.allowsPurchase ?? false;
    }).length ?? 0;

  return (
    <main className="px-3 py-4 sm:px-6 md:px-10 lg:px-12 sm:py-8 max-w-[1400px] mx-auto font-sans w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
              {org.name}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Billing & Point of Sale
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-[11px] sm:text-sm mt-0.5">
            Process quick offline transactions, check out customer receipts, and manage register stock levels.
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {orgRole === 'org:admin' && (
            <Link
              href="/vendor?tab=inventory"
              className="text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-colors whitespace-nowrap"
            >
              ← Inventory
            </Link>
          )}
          <Link
            href="/vendor"
            className="hidden sm:inline-flex text-xs font-semibold px-3 py-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            Console
          </Link>
        </div>
      </div>

      {billingData && billingData.premiumStatus.billingActive ? (
        <>
          {orgRole === 'org:member' && billingData.branches.length === 0 ? (
            <RestrictedAccessBlock type="no_branch" />
          ) : (
            <POSBillingClient initialData={billingData} systemName={systemName} />
          )}
        </>
      ) : (
        <RestrictedAccessBlock type="premium_billing" errorMsg={errorMsg || undefined} />
      )}
    </main>
  );
}
