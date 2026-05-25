import { clerkClient } from '@clerk/nextjs/server';
import Link from 'next/link';

export const revalidate = 0; // Ensure fresh directory data

export default async function VendorsDirectoryPage() {
  const client = await clerkClient();
  
  // Fetch up to 100 organization entries from Clerk
  const response = await client.organizations.getOrganizationList({
    limit: 100,
  });
  const vendors = response.data;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 font-sans pb-24">
      {/* Hero Header Section */}
      <section className="relative max-w-6xl mx-auto px-6 pt-16 pb-10 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50 mb-4">
          Direct Directory Feed
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight mb-3">
          Explore Registered Vendors
        </h1>
        <p className="max-w-xl mx-auto text-sm text-zinc-500 dark:text-zinc-400">
          Browse profiles, banners, and descriptions managed securely by each independent organization on our B2B2C marketplace.
        </p>
      </section>

      {/* Main Grid Section */}
      <main className="max-w-6xl mx-auto px-6">
        {vendors.length === 0 ? (
          <div className="max-w-md mx-auto text-center border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold mb-2">No Active Vendors</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
              There are no organization profiles registered on this system yet. Log into the Clerk Dashboard to create your first vendor organization.
            </p>
            <Link
              href="/"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-zinc-950 hover:bg-zinc-800 px-4 text-xs font-semibold text-white dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 transition-colors"
            >
              Back to Hub
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {vendors.map((vendor) => {
              const metadata = (vendor.publicMetadata || {}) as {
                description?: string;
                bannerUrl?: string;
                address?: string;
                phone?: string;
              };

              return (
                <div
                  key={vendor.id}
                  className="group relative flex flex-col justify-between border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 rounded-2xl overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-lg dark:hover:shadow-black/20 transition-all duration-300"
                >
                  <div>
                    {/* Header Banner Background */}
                    <div className="h-28 bg-zinc-100 dark:bg-zinc-900 relative overflow-hidden border-b border-zinc-100 dark:border-zinc-900">
                      {metadata.bannerUrl ? (
                        <img
                          src={metadata.bannerUrl}
                          alt={`${vendor.name} banner`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10" />
                      )}
                    </div>

                    {/* Logo & Identity */}
                    <div className="px-6 pb-4 relative">
                      <div className="absolute -top-8 left-6">
                        <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white dark:border-zinc-950 bg-white shadow-sm flex items-center justify-center">
                          <img
                            src={vendor.imageUrl}
                            alt={vendor.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      <div className="pt-10">
                        <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {vendor.name}
                        </h2>
                        <span className="text-[10px] font-mono text-zinc-400 block mb-3">
                          @{vendor.slug || 'no-slug'}
                        </span>
                        
                        <p className="text-xs text-zinc-650 dark:text-zinc-400 line-clamp-3 leading-relaxed min-h-[4.5rem]">
                          {metadata.description || 'No custom description provided by this vendor yet.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer & Actions */}
                  <div className="px-6 pb-6 pt-4 border-t border-zinc-100 dark:border-zinc-900/60 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-zinc-400">
                      ID: {vendor.id.slice(0, 10)}...
                    </span>
                    <Link
                      href={`/vendors/${vendor.slug || vendor.id}`}
                      className="inline-flex h-8 items-center justify-center rounded-lg bg-zinc-900 hover:bg-zinc-800 px-3.5 text-[11px] font-semibold text-white dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 transition-colors cursor-pointer"
                    >
                      Visit Storefront &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
