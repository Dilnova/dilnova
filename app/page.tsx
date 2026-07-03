import { auth, clerkClient } from '@clerk/nextjs/server';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Layers, Shield, ShoppingCart, Zap } from 'lucide-react';

import ScrollRedirector from '@/shared/ui/ScrollRedirector';
import { getCachedOrganizations } from '@/shared/auth/clerk-cache';
import { getSystemSetting } from '@/shared/platform/settings';
import { getPricingPlansOrderedByCreatedAtAsc } from '@/features/superadmin/queries';
import { getFeaturedSeries } from '@/features/marketing/queries';

import Hero3D from '@/components/home/Hero3D';
import StoreCard from '@/components/home/StoreCard';
import VendorCarousel from '@/components/home/VendorCarousel';
import FeaturedSeriesList from '@/components/home/FeaturedSeries';
import PricingCards from '@/components/home/PricingCards';

export async function generateMetadata(): Promise<Metadata> {
  const systemName = await getSystemSetting('system_name', 'Dilnova');
  return {
    title: `${systemName} | Enterprise Commerce Hub`,
    description: `Welcome to the ${systemName} Commerce Hub. Explore our industrial, botanical, consulting, and technological vendor storefronts.`,
  };
}

export default async function Home() {
  const { orgId, orgRole } = await auth();

  // Parallelize initial database and API fetches
  const clientPromise = clerkClient();
  const plansPromise = getPricingPlansOrderedByCreatedAtAsc();
  const seriesPromise = getFeaturedSeries();
  const settingsPromise = Promise.all([
    getSystemSetting('system_name', 'Dilnova'),
    getSystemSetting('custom_storefront_distar-hardware', 'true'),
    getSystemSetting('custom_storefront_distar-nursery', 'true'),
    getSystemSetting('custom_storefront_distar-tech', 'true'),
    getSystemSetting('custom_storefront_dilstar-services', 'true'),
  ]);

  const [client, dbPlans, featuredSeries, settingsResult] = await Promise.all([
    clientPromise,
    plansPromise,
    seriesPromise,
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

  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 font-sans flex flex-col antialiased selection:bg-indigo-500/30 selection:text-indigo-900 dark:selection:text-indigo-100">
      
      {/* 1. Hero Section (3D Animated) */}
      <section className="w-full relative border-b border-zinc-200 dark:border-zinc-800">
        <Hero3D />
        
        {/* Trust Row */}
        <div className="absolute bottom-0 left-0 w-full bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800">
          <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>{activeCount} First-Party Storefronts</span>
            <span className="hidden sm:inline">•</span>
            <span>{otherVendors.length} Marketplace Vendors</span>
            <span className="hidden sm:inline">•</span>
            <span>{plans.length} Flexible Pricing Plans</span>
            <span className="hidden sm:inline">•</span>
            <span>Enterprise SLAs Available</span>
          </div>
        </div>
      </section>

      {/* 2. Our Stores (First-Party Showcase) */}
      {activeCount > 0 && (
        <section className="py-20 md:py-28 w-full border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 mb-4">
                  First-Party Network
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
                  Our Core Stores
                </h2>
                <p className="text-base text-zinc-500 dark:text-zinc-400">
                  Shop directly from our curated, highly-specialized first-party stores running on the {systemName} infrastructure.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {hardwareCustomEnabled && (
                <StoreCard 
                  type="hardware"
                  title="Distar Hardware"
                  category="Industrial"
                  description="Raw industrial power, heavy-duty machinery, and contractor-grade tools."
                  href="/vendors/distar-hardware"
                />
              )}
              {nurseryCustomEnabled && (
                <StoreCard 
                  type="nursery"
                  title="Distar Nursery"
                  category="Botanical"
                  description="Curated organic flora, seeds, exotic indoor plants, and landscaping."
                  href="/vendors/distar-nursery"
                />
              )}
              {techCustomEnabled && (
                <StoreCard 
                  type="tech"
                  title="Distar Tech Store"
                  category="Technology"
                  description="Developer workstations, high-performance components, and servers."
                  href="/vendors/distar-tech"
                />
              )}
              {servicesCustomEnabled && (
                <StoreCard 
                  type="services"
                  title="Dilstar Services"
                  category="Consulting"
                  description="Connect with enterprise architects, gardeners, and tool technicians."
                  href="/vendors/dilstar-services"
                />
              )}
            </div>
          </div>
        </section>
      )}

      {/* 3. Marketplace Vendors */}
      <section className="py-20 md:py-28 w-full border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 mb-4">
                Third-Party Marketplace
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
                Featured Vendors
              </h2>
              <p className="text-base text-zinc-500 dark:text-zinc-400">
                Discover independent brands and trusted sellers operating natively on our platform.
              </p>
            </div>
            {otherVendors.length > 0 && (
              <Link 
                href="/vendors" 
                className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                View Directory &rarr;
              </Link>
            )}
          </div>
          
          <VendorCarousel vendors={otherVendors} />
        </div>
      </section>

      {/* 4. Featured Products & Series */}
      <section className="py-20 md:py-28 w-full border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16 text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              Trending Collections
            </h2>
            <p className="text-base text-zinc-500 dark:text-zinc-400">
              Curated equipment and components from across our global storefronts.
            </p>
          </div>
          
          <FeaturedSeriesList seriesList={featuredSeries} />
        </div>
      </section>

      {/* 5. Platform Core Architecture & Capabilities Section */}
      <section className="py-20 md:py-28 w-full border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16 md:text-center max-w-2xl md:mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 mb-4">
              Platform Capabilities
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              Why build on {systemName}?
            </h2>
            <p className="text-base text-zinc-500 dark:text-zinc-400">
              Our infrastructure provides out-of-the-box isolation, role-based controls, and high-performance checkout.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            <div className="p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 flex flex-col sm:flex-row gap-6 items-start hover:shadow-md transition-shadow">
              <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl shrink-0">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-2">Multi-Tenant Isolation</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Isolate stores at the tenant level. Each vendor operates their catalog, layout, and settings in dedicated workspaces, ensuring secure and autonomous management.
                </p>
              </div>
            </div>

            <div className="p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 flex flex-col sm:flex-row gap-6 items-start hover:shadow-md transition-shadow">
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-2">Role-Based Access Control</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Enterprise-grade authorization models. Roles like Customer, Merchant, and Admin cleanly separate consumer shopping experiences from dashboard configuration.
                </p>
              </div>
            </div>

            <div className="p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 flex flex-col sm:flex-row gap-6 items-start hover:shadow-md transition-shadow">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl shrink-0">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-2">Unified Multi-Vendor Cart</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Add products from completely different vendors—like plants from Nursery and tech parts from Tech Store—to a single persistent cart and checkout seamlessly.
                </p>
              </div>
            </div>

            <div className="p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 flex flex-col sm:flex-row gap-6 items-start hover:shadow-md transition-shadow">
              <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl shrink-0">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-2">High Performance & SEO</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Built with Next.js App Router for server-side rendering, semantic schema validation, structured SEO, and blazingly fast global edge distribution.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Pricing & Plans Section */}
      <section className="py-20 md:py-28 w-full border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10">
        <div className="mb-16 md:text-center max-w-2xl mx-auto px-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 mb-4">
            Transparent Pricing
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Scale with {systemName}
          </h2>
          <p className="text-base text-zinc-500 dark:text-zinc-400">
            Choose the right tier to launch your storefront or build a complete enterprise marketplace.
          </p>
        </div>

        <PricingCards plans={plans} />
      </section>

      {/* 7. Final CTA */}
      <section className="py-20 md:py-32 w-full text-center px-6">
        <div className="max-w-4xl mx-auto border border-zinc-200 dark:border-zinc-800 bg-zinc-950 dark:bg-zinc-900 text-white rounded-[2.5rem] p-12 md:p-20 relative overflow-hidden shadow-2xl">
          {/* Ambient Background Glows inside CTA */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Ready to transform your commerce operations?
            </h2>
            <p className="text-base md:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Join industry leaders standardizing on the {systemName} hub. Create your vendor storefront or integrate your custom platform today.
            </p>
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/contact"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-white text-zinc-950 px-8 text-sm font-bold transition-all duration-200 shadow-md hover:bg-zinc-100 hover:scale-105 active:scale-95"
              >
                Contact Sales
              </Link>
              <Link
                href="/vendors"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-zinc-800/50 backdrop-blur-md text-white border border-zinc-700 px-8 text-sm font-bold transition-all duration-200 hover:bg-zinc-700/50 hover:border-zinc-600 active:scale-95"
              >
                Explore Vendors
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Automatic End-of-Scroll Redirector */}
      <ScrollRedirector />
    </div>
  );
}
