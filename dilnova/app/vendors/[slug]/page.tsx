import { clerkClient } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import FollowButton from './FollowButton';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 0; // Fresh load on each request

export default async function VendorProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const client = await clerkClient();

  let org;
  try {
    org = await client.organizations.getOrganization({ slug });
  } catch (err) {
    return notFound();
  }

  if (!org) {
    return notFound();
  }

  const metadata = (org.publicMetadata || {}) as {
    description?: string;
    bannerUrl?: string;
    address?: string;
    phone?: string;
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 font-sans pb-24">
      {/* 1. Hero Banner */}
      <div className="relative h-60 md:h-80 w-full overflow-hidden border-b border-zinc-200 dark:border-zinc-800 bg-zinc-200 dark:bg-zinc-900">
        {metadata.bannerUrl ? (
          <img
            src={metadata.bannerUrl}
            alt={`${org.name} banner banner`}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-purple-500/20 via-indigo-500/20 to-blue-500/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/60 via-zinc-900/20 to-transparent pointer-events-none" />
      </div>

      {/* 2. Profile Details & Navigation */}
      <main className="max-w-5xl mx-auto px-6 relative -mt-16 md:-mt-24 z-10">
        {/* Navigation Bar */}
        <div className="flex justify-between items-center mb-6">
          <Link
            href="/vendors"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/90 dark:bg-zinc-900/90 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 backdrop-blur transition-colors shadow-sm"
          >
            &larr; All Vendors
          </Link>
        </div>

        {/* Identity Card */}
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-100 dark:border-zinc-900">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden border-4 border-white dark:border-zinc-950 bg-white shadow-md flex-shrink-0">
                <img
                  src={org.imageUrl}
                  alt={`${org.name} logo`}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="pt-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {org.name}
                </h1>
                <p className="text-xs font-mono text-zinc-400 mt-0.5">
                  Identifier: <code className="bg-zinc-50 dark:bg-zinc-900 px-1 py-0.5 rounded text-[10px]">@{org.slug}</code>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <a
                href={`mailto:info@${org.slug}.com`} // Dynamic fallback contact email
                className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 px-4 text-xs font-semibold transition-all cursor-pointer"
              >
                Inquire / Email
              </a>
              <FollowButton orgName={org.name} />
            </div>
          </div>

          {/* About & Metadata Feed Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8">
            {/* Description (Left Panel) */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono mb-3">
                  Company Overview
                </h2>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                  {metadata.description || 'This company has not published a detailed description yet.'}
                </p>
              </div>
            </div>

            {/* Directory Sidebar Info (Right Panel) */}
            <div className="space-y-6 lg:border-l lg:border-zinc-100 lg:dark:border-zinc-900 lg:pl-8">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono mb-3">
                  Contact details
                </h2>
                <div className="space-y-4 text-xs">
                  <div>
                    <span className="text-zinc-400 block font-mono">Business Address</span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-250 block mt-0.5">
                      {metadata.address || 'Address not listed'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block font-mono">Contact Phone</span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-250 block mt-0.5">
                      {metadata.phone || 'Phone not listed'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-900 rounded-xl">
                <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Tenant Metadata Feed
                </h3>
                <p className="text-[10px] text-zinc-500 leading-relaxed mb-3">
                  Raw JSON attributes synced securely with Clerk's servers.
                </p>
                <pre className="text-[10px] font-mono text-zinc-400 overflow-x-auto bg-zinc-100 dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-900">
                  {JSON.stringify(org.publicMetadata, null, 2)}
                </pre>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
