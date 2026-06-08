import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import VendorProfileForm from './VendorProfileForm';

export default async function VendorPage() {
  const { orgId, orgRole } = await auth();
  const user = await currentUser();

  if (!orgId) {
    throw new Error('No active organization detected.');
  }

  // Fetch current organization details (including metadata) from Clerk API
  const client = await clerkClient();
  const org = await client.organizations.getOrganization({ organizationId: orgId });
  const metadata = (org.publicMetadata || {}) as {
    description?: string;
    address?: string;
    phone?: string;
    bannerUrl?: string;
  };

  return (
    <main className="p-8 max-w-4xl mx-auto font-sans">
      <div className="border border-zinc-200 rounded-2xl p-8 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-md">
        
        {/* Header Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 mb-2">
              Vendor Control Workspace
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Storefront Console
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
              Configure details for <strong className="text-zinc-800 dark:text-zinc-250 font-semibold">{org.name}</strong>.
            </p>
          </div>
          
          <div className="flex items-center gap-2 self-start">
            {orgRole === 'org:admin' && (
              <Link
                href="/admin"
                className="text-xs font-bold px-3 py-1.5 rounded-md border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-450 dark:hover:bg-rose-900/30 transition-all"
              >
                Members Console &rarr;
              </Link>
            )}
            <Link
              href="/"
              className="text-xs font-semibold px-3 py-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              &larr; Home Page
            </Link>
          </div>
        </div>

        <hr className="border-zinc-200 dark:border-zinc-800 my-6" />

        {/* Info panel */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 mb-8 dark:bg-zinc-900/40 dark:border-zinc-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 font-mono">
            Active Identity Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-zinc-600 dark:text-zinc-400">
            <div>
              <span className="text-zinc-400 block mb-0.5">Authorized User</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {user?.firstName} {user?.lastName || ''} ({user?.emailAddresses[0]?.emailAddress})
              </span>
            </div>
            <div>
              <span className="text-zinc-400 block mb-0.5">Organization Context / Role</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 uppercase">
                {org.name} ({orgRole})
              </span>
            </div>
          </div>
        </div>

        {/* Catalog Banner Links */}
        <div className="border border-purple-200 bg-purple-50/50 rounded-xl p-5 mb-8 dark:border-purple-900/40 dark:bg-purple-950/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
              <span>🛒</span> Product & Service Catalog
            </h3>
            <p className="text-xs text-purple-700/80 dark:text-purple-400">
              Add products or services, upload product images to Cloudinary, and manage your inventory directory.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/vendor/products"
              className="px-4 py-2 bg-white hover:bg-zinc-50 border border-purple-200 dark:border-purple-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-purple-700 dark:text-purple-400 rounded-lg text-xs font-semibold shadow-sm transition-all whitespace-nowrap cursor-pointer"
            >
              Manage Catalog
            </Link>
            <Link
              href="/vendor/products/add"
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all whitespace-nowrap cursor-pointer"
            >
              + Add New Item &rarr;
            </Link>
          </div>
        </div>

        {/* Metadata Settings Form */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">Public Page Setup</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              These fields are saved to Clerk Organization Metadata. They will be displayed publicly on your store page at <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">/vendors/{org.slug || 'slug'}</code>.
            </p>
          </div>

          <VendorProfileForm orgId={orgId} initialMetadata={metadata} />
        </div>

      </div>
    </main>
  );
}
