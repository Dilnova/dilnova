import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import POSBillingClient from './POSBillingClient';
import { getVendorInventoryData } from '../products/inventoryActions';
import { getSystemSetting } from '@/utils/settings';

export const revalidate = 0; // Fresh load

export default async function VendorBillingPage() {
  const { userId, orgId, orgRole } = await auth();
  if (!userId || !orgId || (orgRole !== 'org:admin' && orgRole !== 'org:vendor' && orgRole !== 'org:member')) {
    redirect('/unauthorized');
  }

  const client = await clerkClient();
  const org = await client.organizations.getOrganization({ organizationId: orgId });

  let inventoryData = null;
  let errorMsg = '';
  try {
    inventoryData = await getVendorInventoryData();
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : 'Unable to load billing register.';
  }

  const systemName = await getSystemSetting('system_name', 'Dilnova');

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
          <Link
            href="/vendor/products"
            className="text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-colors whitespace-nowrap"
          >
            ← Inventory
          </Link>
          <Link
            href="/vendor"
            className="hidden sm:inline-flex text-xs font-semibold px-3 py-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            Console
          </Link>
        </div>
      </div>

      {inventoryData && inventoryData.premiumStatus.billingActive ? (
        <POSBillingClient
          initialData={inventoryData}
          systemName={systemName}
        />
      ) : (
        <div className="text-center py-16 border border-zinc-250 rounded-2xl dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 shadow-sm space-y-4 max-w-xl mx-auto mt-6">
          <div className="text-5xl">👑</div>
          <h2 className="text-lg font-black text-zinc-900 dark:text-white">Premium Billing Register Module</h2>
          <p className="text-zinc-500 text-xs leading-relaxed">
            Unlock POS cash registers, cashier duty assignments, real-time stock deductions, and printed thermal receipts.
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
