import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import { OrganizationList } from '@clerk/nextjs';
import Link from 'next/link';
import type { Metadata } from 'next';
import RoleToggleButton from './RoleToggleButton';
import ScrollRedirector from './ScrollRedirector';
import { getCachedOrganizations } from '../utils/clerkCache';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { asc } from 'drizzle-orm';
import { getSystemSetting } from '@/utils/settings';

export async function generateMetadata(): Promise<Metadata> {
  const systemName = await getSystemSetting('system_name', 'Dilnova');
  return {
    title: `${systemName} Multi-Vendor Commerce Marketplace`,
    description: `Welcome to the ${systemName} Commerce Hub. Explore our industrial, botanical, consulting, and technological vendor storefronts.`,
  };
}

export default async function Home() {
  const { orgId, orgRole } = await auth();

  // Parallelize initial database and API fetches
  const clientPromise = clerkClient();
  const plansPromise = db.select().from(schema.pricingPlans).orderBy(asc(schema.pricingPlans.createdAt));
  const settingsPromise = Promise.all([
    getSystemSetting('system_name', 'Dilnova'),
    getSystemSetting('custom_storefront_distar-hardware', 'true'),
    getSystemSetting('custom_storefront_distar-nursery', 'true'),
    getSystemSetting('custom_storefront_distar-tech', 'true'),
    getSystemSetting('custom_storefront_dilstar-services', 'true'),
  ]);

  const [client, dbPlans, settingsResult] = await Promise.all([
    clientPromise,
    plansPromise,
    settingsPromise,
  ]);

  const [
    systemName,
    hardwareCustomEnabledVal,
    nurseryCustomEnabledVal,
    techCustomEnabledVal,
    servicesCustomEnabledVal,
  ] = settingsResult;

  const hardwareCustomEnabled = hardwareCustomEnabledVal === 'true';
  const nurseryCustomEnabled = nurseryCustomEnabledVal === 'true';
  const techCustomEnabled = techCustomEnabledVal === 'true';
  const servicesCustomEnabled = servicesCustomEnabledVal === 'true';

  let plans = dbPlans;

  // If no plans, fallback to default plans
  if (plans.length === 0) {
    plans = [
      {
        id: 'starter',
        name: 'Starter',
        price: '$0',
        period: '/month',
        description: 'Perfect for independent creators and hobbyists launching their first store.',
        features: [
          '1 Storefront Profile',
          'Up to 10 active listings',
          'Standard customer reviews',
          'Basic profile customization'
        ],
        isPopular: false,
        buttonText: 'Get Started',
        buttonLink: '/contact?plan=starter',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'growth',
        name: 'Growth',
        price: '$5',
        period: '/yearly',
        description: 'Ideal for growing brands and businesses requiring advanced features.',
        features: [
          '1 Storefront Profile',
          'Unlimited active listings',
          'Interactive Q&A system',
          'Multiple images & videos per listing',
          'Premium custom storefront themes'
        ],
        isPopular: true,
        buttonText: 'Get Growth Plan',
        buttonLink: '/contact?plan=growth',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 'Custom',
        period: '',
        description: 'Built for large organizations needing multiple stores and dedicated setups.',
        features: [
          'Multiple Storefront Profiles',
          'Unlimited listings & media uploads',
          'Customer reviews & interactive Q&A',
          'Custom branding configurations',
          'Priority support & management'
        ],
        isPopular: false,
        buttonText: 'Contact Sales',
        buttonLink: '/contact?plan=enterprise',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ] as any;
  }

  // Fetch all registered organization vendors from Clerk (cached)
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

  const activeCount = [
    hardwareCustomEnabled,
    nurseryCustomEnabled,
    techCustomEnabled,
    servicesCustomEnabled
  ].filter(Boolean).length;

  const gridColsClass = 
    activeCount === 4 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" :
    activeCount === 3 ? "grid-cols-1 sm:grid-cols-3 lg:grid-cols-3" :
    activeCount === 2 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2" :
    "grid-cols-1";

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 font-sans flex flex-col antialiased">
      
      {/* 1. Main Stage (Split-Screen Hero) */}
      <section className={`grid ${gridColsClass} min-h-[80vh] w-full border-b border-zinc-200 dark:border-zinc-800`}>
        
        {/* Division 1: Distar Hardware */}
        {hardwareCustomEnabled && (
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
                <span className="text-amber-400">HARDWARE</span>
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                Raw industrial power, heavy-duty machinery, and contractor-grade tools. Engineered for reliability in the field.
              </p>
              <Link
                href="/vendors/distar-hardware"
                className="inline-block bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                Browse Hardware
              </Link>
            </div>

            <div className="relative z-10 flex items-center justify-between border-t border-zinc-800/80 pt-4 mt-6 text-[10px] font-mono text-zinc-500">
              <span>ENG_VER_1.4</span>
              <span className="text-amber-500">HEAVY DUTY</span>
            </div>
          </div>
        )}

        {/* Division 2: Distar Plant Nursery */}
        {nurseryCustomEnabled && (
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
                <span className="text-emerald-300">NURSERY</span>
              </h2>
              <p className="text-xs text-emerald-300/70 leading-relaxed mb-6">
                Curated organic flora, seeds, exotic indoor plants, and landscaping consulting. Grow your perfect bio-environment.
              </p>
              <Link
                href="/vendors/distar-nursery"
                className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                Browse Nursery
              </Link>
            </div>

            <div className="relative z-10 flex items-center justify-between border-t border-emerald-900/60 pt-4 mt-6 text-[10px] font-mono text-emerald-400/80">
              <span>BOT_SYS_2.0</span>
              <span className="text-emerald-400">ORGANIC</span>
            </div>
          </div>
        )}

        {/* Division 3: Distar Tech Store */}
        {techCustomEnabled && (
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
                <span className="text-indigo-300">TECH STORE</span>
              </h2>
              <p className="text-xs text-indigo-300/70 leading-relaxed mb-6">
                Developer workstations, high-performance components, IoT configurations, and server accessories.
              </p>
              <Link
                href="/vendors/distar-tech"
                className="inline-block bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                Browse Technology
              </Link>
            </div>

            <div className="relative z-10 flex items-center justify-between border-t border-indigo-900/60 pt-4 mt-6 text-[10px] font-mono text-indigo-400/80">
              <span>SYS_WORK_3.1</span>
              <span className="text-indigo-400">ENTERPRISE</span>
            </div>
          </div>
        )}

        {/* Division 4: Dilstar Services */}
        {servicesCustomEnabled && (
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
                <span className="text-teal-300">SERVICES</span>
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
        )}

      </section>

      {/* 2. Platform Core Architecture & Capabilities Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 w-full border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50 mb-3 font-mono">
            Platform Capabilities
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight mb-3">
            Why {systemName} Commerce Hub?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            Discover the technical features powering our multi-tenant enterprise marketplace.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Feature 1 */}
          <div className="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 p-6 rounded-2xl flex gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl h-fit">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Multi-Tenant Storefront Isolation</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {systemName} isolates stores at the tenant level. Each registered brand or vendor operates their catalog, layout, and settings in dedicated workspaces, ensuring secure, autonomous management.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 p-6 rounded-2xl flex gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-550 rounded-xl h-fit">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Role-Based Access Control (RBAC)</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Enterprise-grade authorization models dictate catalog management. Roles like Customer, Vendor Merchant, and Hub Admin separate consumer shopping experiences from vendor configuration dashboards.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 p-6 rounded-2xl flex gap-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-550 rounded-xl h-fit">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Unified Multi-Vendor Cart</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Add products from completely different vendors (e.g. bio-plants from Nursery and tech parts from Tech Store) to a single persistent cart and manage your checkout journey seamlessly.
              </p>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 p-6 rounded-2xl flex gap-4">
            <div className="p-3 bg-teal-500/10 text-teal-550 rounded-xl h-fit">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">High Performance & SEO First</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Built with next-generation web technologies, offering server-side rendering for catalog listing, structured SEO parameters, semantic schema validation, and blazingly fast interaction rates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Pricing & Plans Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 w-full border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50 mb-3 font-mono">
            Flexible Pricing Plans
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight mb-3">
            Plans for Businesses of All Sizes
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            Choose the right subscription to scale your vendor storefront or launch a unified shopping experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan: any) => {
            const isGrowth = plan.isPopular;
            return (
              <div
                key={plan.id}
                className={`flex flex-col p-8 rounded-3xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                  isGrowth
                    ? 'border-2 border-purple-500 bg-white dark:bg-zinc-900/40 hover:shadow-xl hover:shadow-purple-500/10'
                    : 'border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/20 hover:shadow-lg'
                }`}
              >
                {isGrowth && (
                  <div className="absolute top-0 right-0 bg-purple-500 text-white font-mono text-[9px] uppercase font-bold tracking-widest px-3 py-1 rounded-bl-xl">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-2">{plan.name}</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed min-h-[32px]">
                    {plan.description}
                  </p>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                    {plan.period && (
                      <span className="ml-1 text-xs text-zinc-550 dark:text-zinc-450 font-medium">{plan.period}</span>
                    )}
                  </div>
                </div>
                <ul className="space-y-3.5 mb-8 text-xs text-zinc-600 dark:text-zinc-300 flex-grow">
                  {(plan.features || []).map((feature: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-2">
                      <svg className={`w-4 h-4 shrink-0 ${isGrowth ? 'text-purple-500' : 'text-emerald-500'}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.buttonLink || '/contact'}
                  className={`w-full text-center py-2.5 px-4 rounded-xl text-xs font-semibold transition-colors duration-200 ${
                    isGrowth
                      ? 'bg-purple-700 hover:bg-purple-800 text-white shadow-md'
                      : 'border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  {plan.buttonText || 'Get Started'}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Call-to-Action / Get in Touch Section */}
      <section className="max-w-4xl mx-auto px-6 py-16 w-full text-center">
        <div className="border border-purple-200/60 dark:border-purple-900/30 bg-gradient-to-r from-purple-500/5 via-indigo-500/5 to-blue-500/5 dark:from-purple-950/10 dark:via-indigo-950/10 dark:to-blue-950/10 p-10 rounded-3xl relative overflow-hidden shadow-md">
          {/* Ambient Glows */}
          <div className="absolute top-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Looking to Collaborate or Register Your Store?
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
              We provide partners and merchants with robust tools to scale. Whether you need to integrate, register a vendor organization, or want more details, get in touch with our team.
            </p>
            <div className="pt-2">
              <Link
                href="/contact"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-purple-700 hover:bg-purple-800 px-6 text-xs font-bold text-white transition-all duration-200 shadow-md hover:shadow-purple-500/20 active:scale-[0.98] cursor-pointer"
              >
                Contact {systemName} Hub
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Automatic End-of-Scroll Redirector */}
      <ScrollRedirector />

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-900 py-8 text-center text-xs text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-950">
        <p>&copy; {new Date().getFullYear()} {systemName} Marketplace. All rights reserved.</p>
      </footer>
    </div>
  );
}
