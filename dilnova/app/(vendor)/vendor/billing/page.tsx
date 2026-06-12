import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import POSBillingClient from './POSBillingClient';
import { getVendorBillingRegisterData } from '../products/inventoryActions';
import { getSystemSetting } from '@/utils/settings';
import { resolveEffectiveStockAvailability } from '@/utils/stockAvailabilityShared';

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
          <div className="mb-6 border border-zinc-200/60 dark:border-zinc-900 rounded-2xl p-5 bg-zinc-50/10 dark:bg-zinc-900/5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Phase 4 — POS Register Checklist</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Run in-store sales after IMS stock is configured. Admin and assigned cashiers can use this register.
                </p>
              </div>
              <span
                className={`self-start text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  billingData.billingReceiptCount > 0
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                }`}
              >
                {billingData.billingReceiptCount > 0 ? 'Register tested' : 'Run test sale'}
              </span>
            </div>
            <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600">✓</span>
                Premium POS billing license enabled
              </li>
              <li className="flex items-start gap-2">
                <span className={billingData.branches.length > 0 ? 'text-emerald-600' : 'text-zinc-400'}>
                  {billingData.branches.length > 0 ? '✓' : '○'}
                </span>
                Register branch available ({billingData.branches.length} visible to you)
              </li>
              <li className="flex items-start gap-2">
                <span className={purchasableProductCount > 0 ? 'text-emerald-600' : 'text-zinc-400'}>
                  {purchasableProductCount > 0 ? '✓' : '○'}
                </span>
                Purchasable items on register ({purchasableProductCount})
              </li>
              {billingData.premiumStatus.multiBranchActive && (
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400">○</span>
                  Multi-branch RBAC: members see <strong>assigned branches only</strong> — assign cashiers on{' '}
                  <Link href="/vendor?tab=inventory" className="text-purple-700 dark:text-purple-400 hover:underline">
                    Inventory → Branch Directory
                  </Link>
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className={billingData.billingReceiptCount > 0 ? 'text-emerald-600' : 'text-zinc-400'}>
                  {billingData.billingReceiptCount > 0 ? '✓' : '○'}
                </span>
                Test sale completed ({billingData.billingReceiptCount} receipts)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-zinc-400">○</span>
                Member RBAC: <code className="font-mono text-[10px]">org:member</code> can checkout; server rejects unassigned branch
              </li>
            </ul>
          </div>
          <POSBillingClient initialData={billingData} systemName={systemName} />
        </>
      ) : (
        <div className="text-center py-16 border border-zinc-250 rounded-2xl dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 shadow-sm space-y-4 max-w-xl mx-auto mt-6">
          <div className="text-5xl">👑</div>
          <h2 className="text-lg font-black text-zinc-900 dark:text-white">Premium Billing Register Module</h2>
          <p className="text-zinc-500 text-xs leading-relaxed">
            Unlock POS cash registers, cashier duty assignments, real-time stock deductions, and printed thermal receipts.
            Ask your platform superadmin to enable billing under <strong>/superadmin → Inventory → Licenses</strong>.
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
    </main>
  );
}
