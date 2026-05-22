import { auth, currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';

export default async function VendorPage() {
  const { orgId, orgRole } = await auth();
  const user = await currentUser();

  return (
    <main className="p-8 max-w-4xl mx-auto font-sans">
      <div className="border border-zinc-200 rounded-xl p-8 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-sm">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 mb-4">
          Vendor Area
        </span>
        
        <h1 className="text-3xl font-bold tracking-tight mb-2">Vendor Dashboard</h1>
        <p className="text-zinc-650 dark:text-zinc-400 mb-6 font-mono text-sm">
          Welcome, {user?.firstName || 'Vendor'} (Org Role: {orgRole})
        </p>

        <hr className="border-zinc-200 dark:border-zinc-800 my-6" />

        <div className="space-y-4">
          <p className="text-base text-zinc-800 dark:text-zinc-200 leading-relaxed">
            This is your organization's vendor workspace. From here, you can manage inventory, fulfill orders, and configure storefront settings.
          </p>
          
          <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-4 dark:bg-zinc-900/50 dark:border-zinc-800/50">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-2 font-mono">Plain Text Data Feed</h2>
            <ul className="list-disc list-inside space-y-1 text-sm text-zinc-600 dark:text-zinc-400 font-mono">
              <li>Organization ID: {orgId}</li>
              <li>Status: ACTIVE</li>
              <li>Connected Storefronts: 1</li>
              <li>Pending Orders: 0</li>
              <li>Revenue (M-T-D): $0.00</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-zinc-100 dark:border-zinc-900">
          <Link 
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50 underline underline-offset-4"
          >
            &larr; Back to Main Page
          </Link>
        </div>
      </div>
    </main>
  );
}
