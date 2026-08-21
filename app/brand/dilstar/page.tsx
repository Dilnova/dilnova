import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  Wrench,
  Cpu,
  Sprout,
  Briefcase,
  ShieldCheck,
  Zap,
  Truck,
  RotateCcw,
  ArrowRight,
  Sparkles,
  Cog,
} from "lucide-react";
import { db } from "@/shared/db/client";
import { products } from "@/shared/db/schema/catalog";
import { eq, desc } from "drizzle-orm";
import { getCachedOrganizations } from "@/shared/auth/clerk-cache";
import { DILSTAR_BRAND_URL, DILSTAR_BRAND_NAME } from "@/shared/platform/brand";
import AddToCartButton from "@/features/cart/components/AddToCartButton";
import ProductPriceDisplay from "@/shared/ui/currency/ProductPriceDisplay";
import { DEFAULT_CURRENCY } from "@/shared/currency";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const title = "Distar | Industrial Motors, Heavy Hardware & Enterprise Systems";
  const description =
    "Explore Distar: Premier manufacturer of industrial induction motors, heavy-duty machinery, developer workstations, botanical nursery solutions, and expert engineering services.";

  return {
    title,
    description,
    alternates: {
      canonical: DILSTAR_BRAND_URL,
    },
    openGraph: {
      title,
      description,
      url: DILSTAR_BRAND_URL,
      siteName: "Distar",
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

const DIVISIONS = [
  {
    id: "hardware",
    slug: "distar-hardware",
    path: "/hardware",
    name: "Distar Hardware & Motors",
    tagline: "Heavy Industrial Machinery & Power",
    description:
      "Precision 3-phase induction motors, contractor-grade power tools, heavy-duty pneumatic systems, and rugged workshop equipment.",
    icon: Wrench,
    accentColor: "from-amber-500 to-orange-600",
    badgeBg: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    borderHover: "hover:border-orange-500/50",
    isFlagship: true,
  },
  {
    id: "tech",
    slug: "distar-tech",
    path: "/tech",
    name: "Distar Tech Store",
    tagline: "Developer Workstations & Silicon",
    description:
      "Enterprise developer rigs, high-performance compute nodes, GPU workstations, network switching gear, and custom server racks.",
    icon: Cpu,
    accentColor: "from-blue-500 to-cyan-600",
    badgeBg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    borderHover: "hover:border-cyan-500/50",
    isFlagship: false,
  },
  {
    id: "nursery",
    slug: "distar-nursery",
    path: "/nursery",
    name: "Distar Nursery",
    tagline: "Botanical Flora & Organic Cultivation",
    description:
      "Curated organic flora, rare botanical seeds, hydroponic nutrients, greenhouse climate automation, and landscaping supplies.",
    icon: Sprout,
    accentColor: "from-emerald-500 to-green-600",
    badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    borderHover: "hover:border-emerald-500/50",
    isFlagship: false,
  },
  {
    id: "services",
    slug: "dilstar-services",
    path: "/services",
    name: "Dilstar Services",
    tagline: "Consulting & Master Technicians",
    description:
      "Enterprise systems architecture, industrial motor maintenance, on-site tool recalibration, and certified engineering consultations.",
    icon: Briefcase,
    accentColor: "from-purple-500 to-indigo-600",
    badgeBg: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    borderHover: "hover:border-purple-500/50",
    isFlagship: false,
  },
];

export default async function DilstarBrandHubPage() {
  // Fetch products belonging to Distar orgs
  let brandProducts: Array<{
    id: string;
    name: string;
    price: number;
    currency: string;
    imageUrl: string;
    vendorName: string;
    vendorSlug: string;
    description: string | null;
  }> = [];

  try {
    const orgs = await getCachedOrganizations();
    const distarOrgIds = orgs
      .filter(
        (o) =>
          o.slug === "distar" ||
          o.slug?.startsWith("distar-") ||
          o.slug === "dilstar-services" ||
          o.name.toLowerCase().includes("distar") ||
          o.name.toLowerCase().includes("dilstar"),
      )
      .map((o) => o.id);

    const dbProducts = await db
      .select()
      .from(products)
      .where(eq(products.status, "active"))
      .orderBy(desc(products.createdAt))
      .limit(8);

    const orgMap = new Map(orgs.map((o) => [o.id, o]));

    brandProducts = dbProducts
      .filter((p) => distarOrgIds.length === 0 || distarOrgIds.includes(p.orgId))
      .map((p) => {
        const org = orgMap.get(p.orgId);
        return {
          id: p.id,
          name: p.name,
          price: p.price,
          currency: DEFAULT_CURRENCY,
          imageUrl: p.imageUrl || "/placeholder.png",
          vendorName: org?.name || "Distar",
          vendorSlug: org?.slug || "distar-hardware",
          description: p.description,
        };
      });
  } catch {
    // Graceful fallback if database query fails during build
    brandProducts = [];
  }

  // Structured Data (JSON-LD)
  const brandJsonLd = {
    "@context": "https://schema.org",
    "@type": "Brand",
    name: DILSTAR_BRAND_NAME,
    url: DILSTAR_BRAND_URL,
    logo: `${DILSTAR_BRAND_URL}/apple-touch-icon.png`,
    description:
      "Official brand manufacturer for industrial induction motors, heavy hardware, workstations, botanical nursery flora, and engineering services.",
    sameAs: ["https://www.dilnova.pp.ua"],
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 selection:bg-orange-500/30 selection:text-orange-200">
      {/* Inject JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(brandJsonLd) }}
      />

      {/* ── 1. HERO SECTION (FLAGSHIP MOTORS & HARDWARE) ─────────── */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden border-b border-zinc-800/80">
        {/* Background Grid & Ambient Glows */}
        <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-orange-600/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-orange-500/10 text-orange-400 border border-orange-500/20 mb-6">
            <Cog className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "8s" }} />
            Flagship Industrial Engineering
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.08] mb-6">
            Engineered for Power. Built for Precision.
          </h1>

          <p className="text-base sm:text-xl text-zinc-400 max-w-3xl mx-auto font-normal leading-relaxed mb-10">
            Welcome to the official <strong>Distar</strong> brand hub. Explore high-torque
            industrial induction motors, contractor-grade hardware, tech workstations, botanical
            flora, and certified engineering services.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/hardware"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-sm transition-all duration-200 shadow-lg shadow-orange-600/25 hover:scale-[1.02] active:scale-95"
            >
              <Wrench className="w-4 h-4" />
              Explore Motors & Hardware
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#divisions"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 font-bold text-sm transition-all duration-200"
            >
              View All 4 Divisions
            </a>
          </div>

          {/* Quick Stats Trust Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-16 pt-10 border-t border-zinc-800/60 text-left">
            <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60">
              <div className="text-2xl font-extrabold text-orange-400 mb-0.5">3-Phase</div>
              <div className="text-xs text-zinc-400">High-Torque Induction Motors</div>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60">
              <div className="text-2xl font-extrabold text-cyan-400 mb-0.5">Custom</div>
              <div className="text-xs text-zinc-400">Developer Rigs & Silicon</div>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60">
              <div className="text-2xl font-extrabold text-emerald-400 mb-0.5">100%</div>
              <div className="text-xs text-zinc-400">Organic Nursery Flora</div>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60">
              <div className="text-2xl font-extrabold text-purple-400 mb-0.5">24/7</div>
              <div className="text-xs text-zinc-400">Master Technician Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. THE 4 BRAND DIVISIONS ─────────────────────────────── */}
      <section id="divisions" className="py-20 md:py-28 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-zinc-800 text-zinc-400 border border-zinc-700 mb-4">
            Distar Ecosystem
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            Four Specialized Stores. One Unified Standard.
          </h2>
          <p className="text-base text-zinc-400">
            Each store is built to serve specialized industrial, computing, botanical, or service
            needs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {DIVISIONS.map((div) => {
            const Icon = div.icon;
            return (
              <div
                key={div.id}
                className={`relative rounded-3xl bg-zinc-900/60 border border-zinc-800/80 p-8 flex flex-col justify-between transition-all duration-300 hover:bg-zinc-900 hover:shadow-2xl ${div.borderHover} group`}
              >
                <div>
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div
                      className={`p-4 rounded-2xl bg-zinc-800 border border-zinc-700/60 text-white shadow-md`}
                    >
                      <Icon className="w-7 h-7" />
                    </div>
                    {div.isFlagship && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
                        <Sparkles className="w-3 h-3" /> Flagship Brand
                      </span>
                    )}
                  </div>

                  <span
                    className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider mb-2 border ${div.badgeBg}`}
                  >
                    {div.tagline}
                  </span>

                  <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-orange-400 transition-colors">
                    {div.name}
                  </h3>

                  <p className="text-sm text-zinc-400 leading-relaxed mb-6">{div.description}</p>
                </div>

                <div className="pt-6 border-t border-zinc-800/60 flex items-center justify-between">
                  <Link
                    href={div.path}
                    className="inline-flex items-center gap-2 text-sm font-bold text-white hover:text-orange-400 transition-colors"
                  >
                    Enter Storefront
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>

                  <span className="text-xs text-zinc-400 font-mono">{div.path}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 3. FEATURED PRODUCTS ACROSS DISTAR ───────────────────── */}
      {brandProducts.length > 0 && (
        <section className="py-20 bg-zinc-900/30 border-y border-zinc-800/80">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-2 block">
                  Top Machinery & Goods
                </span>
                <h2 className="text-3xl font-extrabold text-white">Featured Distar Products</h2>
              </div>
              <Link
                href="/hardware"
                className="text-sm font-bold text-orange-400 hover:text-orange-300 inline-flex items-center gap-1"
              >
                View Full Catalog &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {brandProducts.map((product) => (
                <div
                  key={product.id}
                  className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden flex flex-col justify-between hover:border-zinc-700 transition-all group"
                >
                  <Link
                    href={`/products/${product.id}`}
                    className="block relative aspect-square bg-zinc-950"
                  >
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, 25vw"
                    />
                  </Link>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                        {product.vendorName}
                      </span>
                      <Link
                        href={`/products/${product.id}`}
                        className="text-sm font-bold text-white line-clamp-2 hover:text-orange-400 transition-colors mb-3"
                      >
                        {product.name}
                      </Link>
                    </div>

                    <div className="pt-4 border-t border-zinc-800/60 flex items-center justify-between gap-2">
                      <ProductPriceDisplay
                        priceInSubunits={product.price}
                        baseCurrency={product.currency}
                        className="text-base font-extrabold text-white"
                      />
                      <AddToCartButton
                        product={{
                          id: product.id,
                          name: product.name,
                          price: product.price,
                          imageUrl: product.imageUrl,
                          vendorName: product.vendorName,
                          type: "physical",
                        }}
                        showLabel={false}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 4. BRAND TRUST & GUARANTEES ──────────────────────────── */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex items-start gap-4">
            <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Industrial Warranty</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                All motors and heavy machinery carry standard commercial factory warranties.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex items-start gap-4">
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Rapid Dispatch</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                In-stock industrial parts and hardware ship with real-time freight tracking.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex items-start gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Heavy Freight Ready</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Specialized logistics equipped for heavy tooling, motors, and botanical freight.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex items-start gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Technician Support</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Direct access to our certified technicians for installation and diagnostics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. PLATFORM ATTRIBUTION FOOTER ───────────────────────── */}
      <footer className="py-12 border-t border-zinc-800/80 bg-zinc-950 text-xs text-zinc-400 text-center">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Distar Industries. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-zinc-300 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-zinc-300 transition-colors">
              Terms of Service
            </Link>
            <Link href="/refund" className="hover:text-zinc-300 transition-colors">
              Refund Policy
            </Link>
            <a
              href="https://www.dilnova.pp.ua"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-zinc-300 font-medium"
            >
              Powered by Dilnova Hub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
