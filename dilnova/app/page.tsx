import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import { OrganizationList } from '@clerk/nextjs';
import Link from 'next/link';
import type { Metadata } from 'next';
import RoleToggleButton from './RoleToggleButton';
import ScrollRedirector from './ScrollRedirector';
import { getCachedOrganizations } from '../utils/clerkCache';

export const metadata: Metadata = {
  title: 'Dilnova Multi-Vendor Commerce Marketplace',
  description: 'Welcome to the Dilnova Commerce Hub. Explore our industrial, botanical, consulting, and technological vendor storefronts.',
};

export default async function Home() {
  const { orgId, orgRole } = await auth();
  const user = await currentUser();

  // Retrieve user-level metadata role for RBAC
  const userRole = user?.publicMetadata?.role as string | undefined;

  // Determine permissions based on organization role
  const hasAdminAccess = !!orgId && orgRole === 'org:admin';
  const hasVendorAccess = !!orgId && (orgRole === 'org:vendor' || orgRole === 'org:member' || orgRole === 'org:admin');
  const hasCustomerAccess = !!user && (!orgId || orgRole === 'org:customer' || orgRole === 'org:member' || orgRole === 'org:admin');

  // Fetch all registered organization vendors from Clerk (cached)
  const client = await clerkClient();
  const allOrganizations = await getCachedOrganizations(client);

  // Filter out the core four portals so we only show "other" custom vendors
  const coreSlugs = ['distar-hardware', 'distar-nursery', 'distar-tech', 'dilstar-services'];
  const otherVendors = allOrganizations.filter(
    (org) => {
      if (!org.slug) return false;
      const isCore = coreSlugs.includes(org.slug);
      const isMainDistar = org.slug === 'distar' || org.slug.startsWith('distar-') || org.name.toLowerCase() === 'distar';
      const isMainServices = org.slug === 'dilstar-services' || org.slug.startsWith('dilstar-services-') || org.name.toLowerCase() === 'dilstar services';
      return !isCore && !isMainDistar && !isMainServices;
    }
  );

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 font-sans flex flex-col antialiased">
      
      {/* 1. Main Stage (4-Column Split-Screen Hero) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 min-h-[80vh] w-full border-b border-zinc-200 dark:border-zinc-800">
        
        {/* Division 1: Distar Hardware */}
        <div className="relative group overflow-hidden bg-zinc-900 text-zinc-100 flex flex-col justify-between p-8 sm:p-10 transition-all duration-500 border-r border-zinc-800 last:border-r-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
          <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full bg-amber-500/10 blur-[100px] pointer-events-none transition-all duration-700 group-hover:bg-amber-500/20" />
          
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-4 uppercase tracking-wider font-mono">
              Industrial
            </span>
          </div>

          <div className="relative z-10 my-auto">
            <h2 className="text-3xl font-extrabold tracking-tight mb-3">
              DISTAR <br />
              <span className="text-amber-500 bg-gradient-to-r from-amber-500 via-orange-400 to-amber-600 bg-clip-text text-transparent">
                HARDWARE
              </span>
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              Raw industrial power, heavy-duty machinery, and contractor-grade tools. Engineered for reliability in the field.
            </p>
            <Link
              href="/vendors/distar-hardware"
              className="inline-block bg-amber-600 hover:bg-amber-700 text-zinc-950 font-bold text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              Browse Hardware
            </Link>
          </div>

          <div className="relative z-10 flex items-center justify-between border-t border-zinc-800/80 pt-4 mt-6 text-[10px] font-mono text-zinc-500">
            <span>ENG_VER_1.4</span>
            <span className="text-amber-500">HEAVY DUTY</span>
          </div>
        </div>

        {/* Division 2: Distar Plant Nursery */}
        <div className="relative group overflow-hidden bg-emerald-950 text-emerald-50 flex flex-col justify-between p-8 sm:p-10 transition-all duration-500 border-r border-emerald-900 last:border-r-0">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
          <div className="absolute -bottom-40 -right-40 w-80 h-80 rounded-full bg-emerald-400/10 blur-[100px] pointer-events-none transition-all duration-700 group-hover:bg-emerald-400/20" />

          <div className="relative z-10">
            <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-[10px] font-semibold bg-emerald-400/10 text-emerald-300 border border-emerald-400/20 mb-4 uppercase tracking-wider font-mono">
              Botanical
            </span>
          </div>

          <div className="relative z-10 my-auto">
            <h2 className="text-3xl font-extrabold tracking-tight mb-3">
              DISTAR <br />
              <span className="text-emerald-400 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
                NURSERY
              </span>
            </h2>
            <p className="text-xs text-emerald-300/70 leading-relaxed mb-6">
              Curated organic flora, seeds, exotic indoor plants, and landscaping consulting. Grow your perfect bio-environment.
            </p>
            <Link
              href="/vendors/distar-nursery"
              className="inline-block bg-emerald-500 hover:bg-emerald-600 text-emerald-955 font-bold text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              Browse Nursery
            </Link>
          </div>

          <div className="relative z-10 flex items-center justify-between border-t border-emerald-900/60 pt-4 mt-6 text-[10px] font-mono text-emerald-700">
            <span>BOT_SYS_2.0</span>
            <span className="text-emerald-400">ORGANIC</span>
          </div>
        </div>

        {/* Division 3: Distar Tech Store */}
        <div className="relative group overflow-hidden bg-indigo-950 text-indigo-50 flex flex-col justify-between p-8 sm:p-10 transition-all duration-500 border-r border-indigo-900 last:border-r-0">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none transition-all duration-700 group-hover:bg-indigo-500/20" />

          <div className="relative z-10">
            <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-[10px] font-semibold bg-indigo-400/10 text-indigo-300 border border-indigo-400/20 mb-4 uppercase tracking-wider font-mono">
              Tech / Cyber
            </span>
          </div>

          <div className="relative z-10 my-auto">
            <h2 className="text-3xl font-extrabold tracking-tight mb-3">
              DISTAR <br />
              <span className="text-indigo-400 bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-500 bg-clip-text text-transparent">
                TECH STORE
              </span>
            </h2>
            <p className="text-xs text-indigo-300/70 leading-relaxed mb-6">
              Developer workstations, high-performance components, IoT configurations, and server accessories.
            </p>
            <Link
              href="/vendors/distar-tech"
              className="inline-block bg-indigo-500 hover:bg-indigo-600 text-indigo-955 font-bold text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              Browse Technology
            </Link>
          </div>

          <div className="relative z-10 flex items-center justify-between border-t border-indigo-900/60 pt-4 mt-6 text-[10px] font-mono text-indigo-700">
            <span>SYS_WORK_3.1</span>
            <span className="text-indigo-400">ENTERPRISE</span>
          </div>
        </div>

        {/* Division 4: Dilstar Services */}
        <div className="relative group overflow-hidden bg-slate-900 text-slate-100 flex flex-col justify-between p-8 sm:p-10 transition-all duration-500 last:border-r-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-teal-500/10 blur-[100px] pointer-events-none transition-all duration-700 group-hover:bg-teal-500/20" />

          <div className="relative z-10">
            <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-[10px] font-semibold bg-teal-400/10 text-teal-400 border border-teal-400/20 mb-4 uppercase tracking-wider font-mono">
              Consulting
            </span>
          </div>

          <div className="relative z-10 my-auto">
            <h2 className="text-3xl font-extrabold tracking-tight mb-3">
              DILSTAR <br />
              <span className="text-teal-400 bg-gradient-to-r from-teal-400 via-emerald-300 to-teal-500 bg-clip-text text-transparent">
                SERVICES
              </span>
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Connect with master gardeners, professional tool technicians, home builders, and enterprise tech architects.
            </p>
            <Link
              href="/vendors/dilstar-services"
              className="inline-block bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              Book Consultation
            </Link>
          </div>

          <div className="relative z-10 flex items-center justify-between border-t border-slate-800/80 pt-4 mt-6 text-[10px] font-mono text-slate-500">
            <span>SRV_CONS_4.5</span>
            <span className="text-teal-400">EXPERT AGENTS</span>
          </div>
        </div>

      </section>

      {/* 2. Available Other Vendors Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 w-full border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50 mb-3 font-mono">
            Active Tenant Feeds
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight mb-3">
            Available Other Vendors
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            Discover other custom storefronts and business entities registered in our sandbox database.
          </p>
        </div>

        {otherVendors.length === 0 ? (
          <div className="max-w-md mx-auto text-center border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-8 rounded-2xl">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-mono">
              No custom vendors created yet. Use the **Developer RBAC Sandbox Controls** below to register your own custom organization storefront!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherVendors.map((vendor) => {
              const metadata = (vendor.publicMetadata || {}) as {
                description?: string;
                bannerUrl?: string;
                address?: string;
                phone?: string;
              };

              return (
                <div
                  key={vendor.id}
                  className="group relative flex flex-col justify-between border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 rounded-2xl overflow-hidden hover:border-purple-500/40 dark:hover:border-purple-500/40 hover:shadow-lg transition-all duration-300"
                >
                  <div>
                    {/* Header Banner */}
                    <div className="h-24 bg-zinc-100 dark:bg-zinc-900 relative overflow-hidden border-b border-zinc-100 dark:border-zinc-900">
                      {metadata.bannerUrl ? (
                        <img
                          src={metadata.bannerUrl}
                          alt={`${vendor.name} banner`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10" />
                      )}
                    </div>

                    {/* Logo & Info */}
                    <div className="px-6 pb-4 relative">
                      <div className="absolute -top-6 left-6">
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-white dark:border-zinc-950 bg-white shadow-sm flex items-center justify-center">
                          <img
                            src={vendor.imageUrl}
                            alt={vendor.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      <div className="pt-8">
                        <h3 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50 group-hover:text-purple-500 transition-colors">
                          {vendor.name}
                        </h3>
                        <span className="text-[9px] font-mono text-zinc-400 block mb-2">
                          @{vendor.slug || 'no-slug'}
                        </span>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed min-h-[2.5rem]">
                          {metadata.description || 'No description published yet.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Visit Action */}
                  <div className="px-6 pb-6 pt-4 border-t border-zinc-100 dark:border-zinc-900/60 flex items-center justify-between">
                    <span className="text-[9px] font-mono text-zinc-400">
                      ID: {vendor.id.slice(0, 10)}...
                    </span>
                    <Link
                      href={`/vendors/${vendor.slug || vendor.id}`}
                      className="inline-flex h-8 items-center justify-center rounded-lg bg-zinc-900 hover:bg-zinc-800 px-3.5 text-[10px] font-semibold text-white dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 transition-colors cursor-pointer"
                    >
                      Visit Storefront &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Collapsible Developer Sandbox Console (Clerk RBAC Controls) */}
      {user && (
        <section className="max-w-4xl mx-auto px-6 pt-16 pb-6 w-full">
          <details className="group border border-purple-200/60 dark:border-purple-900/30 bg-purple-50/30 dark:bg-purple-950/10 rounded-2xl overflow-hidden shadow-sm">
            <summary className="flex items-center justify-between p-5 cursor-pointer font-semibold text-xs text-purple-800 dark:text-purple-300 select-none font-mono">
              <span className="flex items-center gap-2">
                🛡️ Developer RBAC Sandbox Controls
              </span>
              <span className="transition-transform group-open:rotate-180">
                ▼
              </span>
            </summary>
            
            <div className="p-6 border-t border-purple-200/60 dark:border-purple-900/20 space-y-6">
              {orgId ? (
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200/40 dark:border-zinc-800/40 pb-4">
                  <div>
                    <h4 className="text-sm font-bold">Active Organization Context</h4>
                    <p className="text-[10px] text-zinc-400 font-mono mt-0.5">Org ID: {orgId}</p>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <span className="text-zinc-400">Your Role:</span> <strong className="text-purple-650 dark:text-purple-400 uppercase">{orgRole}</strong>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200/40 dark:border-zinc-800/40 pb-4">
                  <div>
                    <h4 className="text-sm font-bold">Standard Customer Session</h4>
                    <p className="text-[10px] text-zinc-400 font-mono mt-0.5">No active Organization selected</p>
                  </div>
                </div>
              )}

              {/* Role Toggle Button */}
              <RoleToggleButton currentRole={userRole} />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-center">
                <Link
                  href="/admin"
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border ${
                    hasAdminAccess
                      ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-950/40 dark:bg-red-950/20 dark:text-red-400'
                      : 'opacity-40 border-zinc-200 text-zinc-400 pointer-events-none dark:border-zinc-800'
                  }`}
                >
                  Admin Console
                </Link>
                <Link
                  href="/vendor"
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border ${
                    hasVendorAccess
                      ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-950/40 dark:bg-amber-950/20 dark:text-amber-400'
                      : 'opacity-40 border-zinc-200 text-zinc-400 pointer-events-none dark:border-zinc-800'
                  }`}
                >
                  Vendor Portal
                </Link>
                <Link
                  href="/customer"
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border ${
                    hasCustomerAccess
                      ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-950/40 dark:bg-blue-950/20 dark:text-blue-400'
                      : 'opacity-40 border-zinc-200 text-zinc-400 pointer-events-none dark:border-zinc-800'
                  }`}
                >
                  Customer Area
                </Link>
              </div>

              {!orgId && (
                <div className="pt-4 border-t border-zinc-200/40 dark:border-zinc-800/40 text-center">
                  <p className="text-[11px] text-zinc-500 mb-4">Select or Create a Business Organization to test Admin and Vendor controls:</p>
                  <div className="flex justify-center overflow-hidden">
                    <OrganizationList 
                      hidePersonal={true} 
                      afterCreateOrganizationUrl="/" 
                      afterSelectOrganizationUrl="/" 
                      appearance={{
                        elements: {
                          organizationListCreateOrganizationButton: 'flex',
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </details>
        </section>
      )}

      {/* 4. Automatic End-of-Scroll Redirector */}
      <ScrollRedirector />

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-900 py-8 text-center text-xs text-zinc-500 dark:text-zinc-650 bg-white dark:bg-zinc-950">
        <p>&copy; {new Date().getFullYear()} Dilnova Marketplace. All rights reserved.</p>
      </footer>
    </div>
  );
}
