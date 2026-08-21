import Link from "next/link";
import type { Metadata } from "next";
import {
  Wrench,
  Sprout,
  Cpu,
  MapPin,
  Phone,
  Clock,
  Mail,
  Tag,
  ShieldCheck,
  Award,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ShoppingBag,
  ExternalLink,
  Hammer,
  Flower2,
  Laptop,
} from "lucide-react";
import { DILSTAR_BRAND_URL, DILSTAR_BRAND_NAME } from "@/shared/platform/brand";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const title = "Dilstar | Hardware, Botanical Nursery & Tech Shop";
  const description =
    "One Name, Three Ways to Shop Smarter. Welcome to Dilstar — your trusted local destination for Dilstar Hardware, Dilstar Nursery, and Dilstar Tech Shop.";

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
      siteName: "Dilstar",
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

// ── BRAND CONSTANTS & CONTENT ──────────────────────────────────────
const SHOPS = [
  {
    id: "hardware",
    anchor: "#hardware",
    catalogUrl: "/hardware",
    name: "Dilstar Hardware",
    badge: "Industrial & Home Improvement",
    tagline: "Heavy Industrial Tools, Materials & Motors",
    shortDesc:
      "Contractor-grade power tools, 3-phase industrial induction motors, building supplies, electrical, plumbing, and precision fasteners built for rugged durability.",
    accentGradient: "from-[#1565D8] to-[#0B4F5C]",
    accentColor: "#1565D8",
    badgeBg: "bg-[#1565D8]/10 text-[#1565D8] border-[#1565D8]/20",
    icon: Wrench,
    heroPlaceholder: "[PHOTO: hardware-store-1.jpg]",
    photos: [
      {
        label: "[PHOTO: hardware-store-1.jpg]",
        desc: "Main Storefront & Tool Aisles",
        height: "h-60",
      },
      {
        label: "[PHOTO: hardware-tools-2.jpg]",
        desc: "Contractor Power Tools & Motors",
        height: "h-36",
      },
      {
        label: "[PHOTO: hardware-motors-3.jpg]",
        desc: "Heavy Hardware & Fasteners",
        height: "h-36",
      },
    ],
    categories: [
      "Contractor Power Tools & Machinery",
      "3-Phase Industrial Induction Motors",
      "Building Materials & Structural Timber",
      "Plumbing, Valves & Pipe Fittings",
      "Electrical Switchgear & Cabling",
      "Commercial Paints, Sealants & Adhesives",
      "Fasteners, Anchors & Rigging Hardware",
    ],
    promo: {
      title: "Grand Opening Promotion",
      discount: "15% OFF",
      desc: "Enjoy 15% off heavy power tools and a complimentary contractor consultation with our in-house master technician.",
      code: "DILSTAR-HW15",
    },
    location: {
      name: "Dilstar Hardware Depot",
      address: "104 Industrial Way, Central Commerce Park, Colombo, Sri Lanka",
      phone: "+94 11 234 5671",
      email: "hardware@dilstar.pp.ua",
      hours: {
        weekdays: "Monday – Saturday: 7:30 AM – 6:30 PM",
        sunday: "Sunday: 8:30 AM – 3:00 PM",
      },
    },
  },
  {
    id: "nursery",
    anchor: "#nursery",
    catalogUrl: "/nursery",
    name: "Dilstar Nursery",
    badge: "Botanical Garden & Landscaping",
    tagline: "Exotic Flora, Organic Gardening & Cultivation",
    shortDesc:
      "A lush botanical paradise featuring curated indoor and outdoor plants, rare botanical flora, organic soils, automated irrigation, and expert landscaping services.",
    accentGradient: "from-[#0B4F5C] to-[#107C41]",
    accentColor: "#0B4F5C",
    badgeBg: "bg-[#0B4F5C]/10 text-[#0B4F5C] border-[#0B4F5C]/20",
    icon: Sprout,
    heroPlaceholder: "[PHOTO: nursery-plants-1.jpg]",
    photos: [
      {
        label: "[PHOTO: nursery-plants-1.jpg]",
        desc: "Lush Botanical Greenhouse Display",
        height: "h-60",
      },
      {
        label: "[PHOTO: nursery-greenhouse-2.jpg]",
        desc: "Exotic Indoor Flora & Seedlings",
        height: "h-36",
      },
      {
        label: "[PHOTO: nursery-landscaping-3.jpg]",
        desc: "Planters, Organic Soil & Nutrients",
        height: "h-36",
      },
    ],
    categories: [
      "Indoor Houseplants & Tropical Aroids",
      "Outdoor Landscaping Trees & Shrubs",
      "Organic Soils, Compost & Plant Nutrients",
      "Rare Botanical Seeds & Seedling Trays",
      "Hydroponic Systems & Climate Automation",
      "Handcrafted Ceramic Planters & Pots",
      "Custom Landscape Design & Maintenance",
    ],
    promo: {
      title: "Green Thumb Celebration",
      discount: "BUY 2, GET 1 FREE",
      desc: "Buy any two exotic indoor plants and receive a premium bag of organic potting mix and plant food completely free.",
      code: "GREEN-THUMB-24",
    },
    location: {
      name: "Dilstar Botanical Gardens",
      address: "88 Green Valley Road, East Garden District, Colombo, Sri Lanka",
      phone: "+94 11 234 5672",
      email: "nursery@dilstar.pp.ua",
      hours: {
        weekdays: "Monday – Saturday: 8:00 AM – 6:00 PM",
        sunday: "Sunday: 8:00 AM – 4:00 PM",
      },
    },
  },
  {
    id: "tech",
    anchor: "#tech",
    catalogUrl: "/tech",
    name: "Dilstar Tech Shop",
    badge: "Computing & Expert Repairs",
    tagline: "Developer Workstations, Silicon & Certified Tech Repairs",
    shortDesc:
      "High-performance developer workstations, custom GPU compute rigs, enterprise networking equipment, laptops, mobile accessories, and certified on-site hardware repairs.",
    accentGradient: "from-[#1565D8] to-[#2563EB]",
    accentColor: "#1565D8",
    badgeBg: "bg-[#1565D8]/10 text-[#1565D8] border-[#1565D8]/20",
    icon: Cpu,
    heroPlaceholder: "[PHOTO: tech-shop-1.jpg]",
    photos: [
      { label: "[PHOTO: tech-shop-1.jpg]", desc: "Workstation & Compute Showcase", height: "h-60" },
      {
        label: "[PHOTO: tech-repairs-2.jpg]",
        desc: "Precision Repair & Diagnostics Lab",
        height: "h-36",
      },
      {
        label: "[PHOTO: tech-workstations-3.jpg]",
        desc: "Silicon Components & Networking",
        height: "h-36",
      },
    ],
    categories: [
      "Custom High-Performance PC & GPU Builds",
      "Developer & Creator Workstation Laptops",
      "Certified Component Diagnostics & Repairs",
      "Enterprise Switching, Routers & Mesh WiFi",
      "Ultra-Fast NVMe Storage & Memory Kits",
      "Mechanical Keyboards & Studio Monitors",
      "Data Recovery & System Upgrades",
    ],
    promo: {
      title: "Tech Innovation Launch",
      discount: "FREE DIAGNOSTICS",
      desc: "Complimentary system diagnostics and 20% off all hardware upgrades and repair service fees during opening month.",
      code: "TECH-DIAG-FREE",
    },
    location: {
      name: "Dilstar Tech Innovation Hub",
      address: "42 Cyber Walk, Suite 100, Tech Corridor, Colombo, Sri Lanka",
      phone: "+94 11 234 5673",
      email: "tech@dilstar.pp.ua",
      hours: {
        weekdays: "Monday – Friday: 9:00 AM – 7:00 PM",
        sunday: "Saturday: 9:00 AM – 5:00 PM (Sun: Closed)",
      },
    },
  },
];

const TRUST_POINTS = [
  {
    icon: ShieldCheck,
    title: "Locally Owned & Community-First",
    description:
      "Proudly rooted in our community. Every purchase directly empowers local craftspeople, horticulturalists, and tech technicians.",
  },
  {
    icon: Award,
    title: "15+ Years of Quality & Heritage",
    description:
      "Over a decade and a half of uncompromising standards, rigorous testing, and authorized warranties across all three divisions.",
  },
  {
    icon: Users,
    title: "In-House Certified Specialists",
    description:
      "Speak directly with master mechanics, seasoned botanists, and computer engineers ready to give tailored guidance.",
  },
  {
    icon: CheckCircle2,
    title: "One Unified Customer Account",
    description:
      "Enjoy frictionless checkout, shared reward loyalty points, and cross-department warranties under one single Dilstar family account.",
  },
];

export default function DilstarBrandHomePage() {
  // Structured Data (JSON-LD) for Local Business & Brand SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Brand",
        "@id": `${DILSTAR_BRAND_URL}/#brand`,
        name: DILSTAR_BRAND_NAME,
        url: DILSTAR_BRAND_URL,
        logo: `${DILSTAR_BRAND_URL}/apple-touch-icon.png`,
        description:
          "Dilstar is a multi-division enterprise operating Dilstar Hardware, Dilstar Nursery, and Dilstar Tech Shop.",
        sameAs: ["https://www.dilnova.pp.ua"],
      },
      ...SHOPS.map((shop) => ({
        "@type": "LocalBusiness",
        "@id": `${DILSTAR_BRAND_URL}/${shop.id}`,
        name: shop.name,
        image: `${DILSTAR_BRAND_URL}/apple-touch-icon.png`,
        telephone: shop.location.phone,
        email: shop.location.email,
        address: {
          "@type": "PostalAddress",
          streetAddress: shop.location.address,
          addressLocality: "Colombo",
          addressCountry: "LK",
        },
        openingHours: "Mo-Sa 08:00-18:00",
        priceRange: "$$",
      })),
    ],
  };

  return (
    <main className="min-h-screen bg-[#F3F4F2] text-[#1A1A1A] font-sans antialiased scroll-smooth selection:bg-[#1565D8] selection:text-white">
      {/* Structured Schema.org Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── 1. HERO SECTION ────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1565D8] via-[#0E588A] to-[#0B4F5C] text-white pt-20 pb-28 md:pt-28 md:pb-36 shadow-xl">
        {/* Subtle Decorative Pattern & Ambient Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.15),transparent_40%)] pointer-events-none" />
        <div className="absolute -bottom-24 right-0 w-96 h-96 bg-[#0B4F5C]/40 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute top-10 left-10 w-72 h-72 bg-[#1565D8]/40 blur-3xl rounded-full pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Monogram Brand Mark & Grand Opening Banner */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-semibold tracking-wide text-white mb-6 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Grand Opening Celebration — Exclusive In-Store Offers This Week!</span>
          </div>

          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#1565D8] to-[#0B4F5C] p-[2px] shadow-2xl">
              <div className="w-full h-full rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/30 text-white font-extrabold text-2xl sm:text-3xl tracking-tighter">
                D<span className="text-cyan-300">+</span>L
              </div>
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.15]">
            One Name, Three Ways to <span className="text-cyan-300">Shop Smarter</span>
          </h1>

          <p className="mt-5 text-base sm:text-lg md:text-xl text-zinc-100 max-w-2xl mx-auto font-normal leading-relaxed">
            Welcome to <strong>Dilstar</strong> — uniting premier industrial hardware &amp; motors,
            lush botanical nursery flora, and custom computing solutions under one trusted family
            brand.
          </p>

          {/* Action Callouts */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#shops"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white text-[#1565D8] font-bold text-base shadow-lg hover:bg-zinc-100 hover:shadow-xl transition-all duration-200"
            >
              Explore Our Shops
              <ChevronDown className="w-4 h-4 text-[#1565D8]" />
            </a>
            <a
              href="#locations"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-[#0B4F5C]/60 hover:bg-[#0B4F5C] text-white border border-white/30 font-semibold text-base backdrop-blur-md transition-all duration-200"
            >
              <MapPin className="w-4 h-4" />
              Visit Physical Locations
            </a>
          </div>

          {/* Highlights Row */}
          <div className="mt-12 pt-8 border-t border-white/15 grid grid-cols-3 gap-2 sm:gap-6 max-w-3xl mx-auto text-center">
            <div className="px-2">
              <div className="text-xl sm:text-3xl font-black text-white">3 Hubs</div>
              <div className="text-xs sm:text-sm text-zinc-200 mt-0.5">Specialized Shops</div>
            </div>
            <div className="px-2 border-x border-white/20">
              <div className="text-xl sm:text-3xl font-black text-cyan-300">15+ Yrs</div>
              <div className="text-xs sm:text-sm text-zinc-200 mt-0.5">Trusted Experience</div>
            </div>
            <div className="px-2">
              <div className="text-xl sm:text-3xl font-black text-white">100%</div>
              <div className="text-xs sm:text-sm text-zinc-200 mt-0.5">Satisfaction Guaranteed</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. THREE-SHOP OVERVIEW (3-Column Grid) ───────────────── */}
      <section id="shops" className="py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10">
        <div className="text-center mb-12">
          <span className="text-xs uppercase tracking-widest font-bold text-[#1565D8] bg-[#1565D8]/10 px-3.5 py-1.5 rounded-full border border-[#1565D8]/20">
            Our Three Businesses
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1A1A1A] mt-3">
            Explore the Dilstar Family
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 max-w-xl mx-auto mt-2">
            Each shop is dedicated to its craft, offering specialized expertise, certified
            inventory, and exceptional community service.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {SHOPS.map((shop) => {
            const Icon = shop.icon;
            return (
              <div
                key={shop.id}
                className="group relative flex flex-col bg-white rounded-3xl p-6 sm:p-8 shadow-md hover:shadow-2xl border border-zinc-200/80 transition-all duration-300 transform hover:-translate-y-1"
              >
                {/* Shop Icon & Badge */}
                <div className="flex items-center justify-between mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1565D8] to-[#0B4F5C] flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                    <Icon className="w-7 h-7" />
                  </div>
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${shop.badgeBg}`}
                  >
                    {shop.badge}
                  </span>
                </div>

                {/* Photo Placeholder Card */}
                <div className="relative w-full h-44 rounded-2xl bg-zinc-100 border border-dashed border-zinc-300 flex flex-col items-center justify-center text-center p-4 mb-5 overflow-hidden group-hover:border-[#1565D8]/60 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-2 text-zinc-400">
                    <Icon className="w-5 h-5 text-[#1565D8]" />
                  </div>
                  <span className="font-mono text-xs font-semibold text-[#1565D8] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                    {shop.heroPlaceholder}
                  </span>
                  <span className="text-[11px] text-zinc-500 mt-1.5">{shop.name} Showcase</span>
                </div>

                <h3 className="text-xl font-bold text-[#1A1A1A] group-hover:text-[#1565D8] transition-colors">
                  {shop.name}
                </h3>
                <p className="text-xs font-semibold text-[#0B4F5C] mt-1">{shop.tagline}</p>
                <p className="text-sm text-zinc-600 mt-3 leading-relaxed flex-grow">
                  {shop.shortDesc}
                </p>

                {/* Buttons: Jump to detail section or browse catalog */}
                <div className="mt-6 pt-5 border-t border-zinc-100 flex flex-col sm:flex-row gap-2.5">
                  <a
                    href={shop.anchor}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-[#1A1A1A] text-xs font-bold transition-colors"
                  >
                    View Details
                    <ArrowRight className="w-3.5 h-3.5 text-[#1565D8]" />
                  </a>
                  <Link
                    href={shop.catalogUrl}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1565D8] hover:bg-[#0B4F5C] text-white text-xs font-bold shadow-sm transition-colors"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Online Store
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 3. DILSTAR HARDWARE DETAILED SECTION ──────────────────── */}
      <section id="hardware" className="py-20 bg-white border-y border-zinc-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-12 items-start">
            {/* Left Column: Photo Gallery Placeholders */}
            <div className="w-full lg:w-1/2 space-y-4">
              <div className="relative w-full h-72 rounded-3xl bg-zinc-100 border-2 border-dashed border-[#1565D8]/30 p-6 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-[#1565D8]/10 flex items-center justify-center mb-3">
                  <Hammer className="w-6 h-6 text-[#1565D8]" />
                </div>
                <span className="font-mono text-sm font-bold text-[#1565D8] bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                  [PHOTO: hardware-store-1.jpg]
                </span>
                <p className="text-xs text-zinc-500 mt-2">Main Hardware &amp; Machinery Showroom</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative h-40 rounded-2xl bg-zinc-100 border border-dashed border-zinc-300 p-4 flex flex-col items-center justify-center text-center">
                  <span className="font-mono text-[11px] font-semibold text-[#1565D8] bg-blue-50 px-2 py-1 rounded border border-blue-100">
                    [PHOTO: hardware-tools-2.jpg]
                  </span>
                  <p className="text-[10px] text-zinc-500 mt-1">Contractor Power Tools</p>
                </div>
                <div className="relative h-40 rounded-2xl bg-zinc-100 border border-dashed border-zinc-300 p-4 flex flex-col items-center justify-center text-center">
                  <span className="font-mono text-[11px] font-semibold text-[#1565D8] bg-blue-50 px-2 py-1 rounded border border-blue-100">
                    [PHOTO: hardware-motors-3.jpg]
                  </span>
                  <p className="text-[10px] text-zinc-500 mt-1">3-Phase Induction Motors</p>
                </div>
              </div>
            </div>

            {/* Right Column: Information, Categories, Promo & Address */}
            <div className="w-full lg:w-1/2 space-y-6">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#1565D8] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                  Department 01
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1A1A1A] mt-2">
                  Dilstar Hardware
                </h2>
                <p className="text-sm font-semibold text-[#0B4F5C] mt-1">
                  Precision Industrial Tools, Heavy Machinery &amp; Building Supplies
                </p>
                <p className="text-sm text-zinc-600 mt-3 leading-relaxed">
                  Engineered for commercial contractors, independent builders, and serious DIYers.
                  We stock heavy-duty power tools, structural materials, plumbing fixtures, and
                  tested electrical components with full warranty backing.
                </p>
              </div>

              {/* What We Offer Checklist */}
              <div className="bg-[#F3F4F2] p-5 rounded-2xl border border-zinc-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#1565D8]" />
                  What We Offer
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-700">
                  {SHOPS[0].categories.map((cat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1565D8]" />
                      <span>{cat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Promotion Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#1565D8]/10 via-[#0B4F5C]/10 to-transparent border border-[#1565D8]/30 flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-[#1565D8] text-white shrink-0 mt-0.5">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-[#1565D8] tracking-wider">
                      {SHOPS[0].promo.title}
                    </span>
                    <span className="text-[10px] font-extrabold bg-[#1565D8] text-white px-2 py-0.5 rounded-full">
                      {SHOPS[0].promo.discount}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-700 mt-1">{SHOPS[0].promo.desc}</p>
                </div>
              </div>

              {/* Location & Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-zinc-600 pt-2 border-t border-zinc-100">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#1565D8] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-zinc-900">Address:</strong>
                    {SHOPS[0].location.address}
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-[#0B4F5C] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-zinc-900">Store Hours:</strong>
                    {SHOPS[0].location.hours.weekdays}
                    <br />
                    {SHOPS[0].location.hours.sunday}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <a
                  href={`tel:${SHOPS[0].location.phone.replace(/[^0-9+]/g, "")}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1A1A1A] text-white text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call Hardware ({SHOPS[0].location.phone})
                </a>
                <Link
                  href="/hardware"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1565D8] text-white text-xs font-bold hover:bg-[#0B4F5C] transition-colors shadow-sm"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Browse Hardware Catalog
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. DILSTAR NURSERY DETAILED SECTION ───────────────────── */}
      <section id="nursery" className="py-20 bg-[#F3F4F2]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row-reverse gap-12 items-start">
            {/* Right Column: Photo Gallery Placeholders */}
            <div className="w-full lg:w-1/2 space-y-4">
              <div className="relative w-full h-72 rounded-3xl bg-white border-2 border-dashed border-[#0B4F5C]/40 p-6 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-[#0B4F5C]/10 flex items-center justify-center mb-3">
                  <Flower2 className="w-6 h-6 text-[#0B4F5C]" />
                </div>
                <span className="font-mono text-sm font-bold text-[#0B4F5C] bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  [PHOTO: nursery-plants-1.jpg]
                </span>
                <p className="text-xs text-zinc-500 mt-2">
                  Botanical Garden &amp; Greenhouse Nursery
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative h-40 rounded-2xl bg-white border border-dashed border-zinc-300 p-4 flex flex-col items-center justify-center text-center">
                  <span className="font-mono text-[11px] font-semibold text-[#0B4F5C] bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                    [PHOTO: nursery-greenhouse-2.jpg]
                  </span>
                  <p className="text-[10px] text-zinc-500 mt-1">Indoor Flora &amp; Rare Aroids</p>
                </div>
                <div className="relative h-40 rounded-2xl bg-white border border-dashed border-zinc-300 p-4 flex flex-col items-center justify-center text-center">
                  <span className="font-mono text-[11px] font-semibold text-[#0B4F5C] bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                    [PHOTO: nursery-landscaping-3.jpg]
                  </span>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Soils, Planters &amp; Hydroponics
                  </p>
                </div>
              </div>
            </div>

            {/* Left Column: Information, Categories, Promo & Address */}
            <div className="w-full lg:w-1/2 space-y-6">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#0B4F5C] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Department 02
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1A1A1A] mt-2">
                  Dilstar Nursery
                </h2>
                <p className="text-sm font-semibold text-[#1565D8] mt-1">
                  Exotic Botanical Plants, Organic Soils &amp; Landscape Solutions
                </p>
                <p className="text-sm text-zinc-600 mt-3 leading-relaxed">
                  Transform your indoor spaces and outdoor landscapes with hand-curated exotic
                  plants, organic fertilizers, custom planters, automated irrigation, and
                  horticultural consultation.
                </p>
              </div>

              {/* What We Offer Checklist */}
              <div className="bg-white p-5 rounded-2xl border border-zinc-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0B4F5C]" />
                  What We Offer
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-700">
                  {SHOPS[1].categories.map((cat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0B4F5C]" />
                      <span>{cat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Promotion Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0B4F5C]/10 via-emerald-500/10 to-transparent border border-[#0B4F5C]/30 flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-[#0B4F5C] text-white shrink-0 mt-0.5">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-[#0B4F5C] tracking-wider">
                      {SHOPS[1].promo.title}
                    </span>
                    <span className="text-[10px] font-extrabold bg-[#0B4F5C] text-white px-2 py-0.5 rounded-full">
                      {SHOPS[1].promo.discount}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-700 mt-1">{SHOPS[1].promo.desc}</p>
                </div>
              </div>

              {/* Location & Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-zinc-600 pt-2 border-t border-zinc-200">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#0B4F5C] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-zinc-900">Address:</strong>
                    {SHOPS[1].location.address}
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-[#1565D8] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-zinc-900">Store Hours:</strong>
                    {SHOPS[1].location.hours.weekdays}
                    <br />
                    {SHOPS[1].location.hours.sunday}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <a
                  href={`tel:${SHOPS[1].location.phone.replace(/[^0-9+]/g, "")}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1A1A1A] text-white text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call Nursery ({SHOPS[1].location.phone})
                </a>
                <Link
                  href="/nursery"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B4F5C] text-white text-xs font-bold hover:bg-[#1565D8] transition-colors shadow-sm"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Browse Nursery Catalog
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. DILSTAR TECH SHOP DETAILED SECTION ─────────────────── */}
      <section id="tech" className="py-20 bg-white border-y border-zinc-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-12 items-start">
            {/* Left Column: Photo Gallery Placeholders */}
            <div className="w-full lg:w-1/2 space-y-4">
              <div className="relative w-full h-72 rounded-3xl bg-zinc-100 border-2 border-dashed border-[#1565D8]/30 p-6 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-[#1565D8]/10 flex items-center justify-center mb-3">
                  <Laptop className="w-6 h-6 text-[#1565D8]" />
                </div>
                <span className="font-mono text-sm font-bold text-[#1565D8] bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                  [PHOTO: tech-shop-1.jpg]
                </span>
                <p className="text-xs text-zinc-500 mt-2">Workstation &amp; Compute Rig Lab</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative h-40 rounded-2xl bg-zinc-100 border border-dashed border-zinc-300 p-4 flex flex-col items-center justify-center text-center">
                  <span className="font-mono text-[11px] font-semibold text-[#1565D8] bg-blue-50 px-2 py-1 rounded border border-blue-100">
                    [PHOTO: tech-repairs-2.jpg]
                  </span>
                  <p className="text-[10px] text-zinc-500 mt-1">Certified Diagnostic Bench</p>
                </div>
                <div className="relative h-40 rounded-2xl bg-zinc-100 border border-dashed border-zinc-300 p-4 flex flex-col items-center justify-center text-center">
                  <span className="font-mono text-[11px] font-semibold text-[#1565D8] bg-blue-50 px-2 py-1 rounded border border-blue-100">
                    [PHOTO: tech-workstations-3.jpg]
                  </span>
                  <p className="text-[10px] text-zinc-500 mt-1">Custom High-End Rigs</p>
                </div>
              </div>
            </div>

            {/* Right Column: Information, Categories, Promo & Address */}
            <div className="w-full lg:w-1/2 space-y-6">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#1565D8] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                  Department 03
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1A1A1A] mt-2">
                  Dilstar Tech Shop
                </h2>
                <p className="text-sm font-semibold text-[#0B4F5C] mt-1">
                  Developer Workstations, Silicon Compute &amp; Certified Repairs
                </p>
                <p className="text-sm text-zinc-600 mt-3 leading-relaxed">
                  Your headquarters for high-octane developer rigs, custom gaming and AI
                  workstations, enterprise network switching, accessories, and precision chip-level
                  hardware repair services.
                </p>
              </div>

              {/* What We Offer Checklist */}
              <div className="bg-[#F3F4F2] p-5 rounded-2xl border border-zinc-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#1565D8]" />
                  What We Offer
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-700">
                  {SHOPS[2].categories.map((cat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1565D8]" />
                      <span>{cat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Promotion Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#1565D8]/10 via-[#0B4F5C]/10 to-transparent border border-[#1565D8]/30 flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-[#1565D8] text-white shrink-0 mt-0.5">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-[#1565D8] tracking-wider">
                      {SHOPS[2].promo.title}
                    </span>
                    <span className="text-[10px] font-extrabold bg-[#1565D8] text-white px-2 py-0.5 rounded-full">
                      {SHOPS[2].promo.discount}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-700 mt-1">{SHOPS[2].promo.desc}</p>
                </div>
              </div>

              {/* Location & Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-zinc-600 pt-2 border-t border-zinc-100">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#1565D8] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-zinc-900">Address:</strong>
                    {SHOPS[2].location.address}
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-[#0B4F5C] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-zinc-900">Store Hours:</strong>
                    {SHOPS[2].location.hours.weekdays}
                    <br />
                    {SHOPS[2].location.hours.sunday}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <a
                  href={`tel:${SHOPS[2].location.phone.replace(/[^0-9+]/g, "")}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1A1A1A] text-white text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call Tech Shop ({SHOPS[2].location.phone})
                </a>
                <Link
                  href="/tech"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1565D8] text-white text-xs font-bold hover:bg-[#0B4F5C] transition-colors shadow-sm"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Browse Tech Catalog
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. WHY DILSTAR (Brand Awareness & Trust) ──────────────── */}
      <section id="about" className="py-20 bg-gradient-to-b from-[#F3F4F2] to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs uppercase tracking-widest font-bold text-[#1565D8] bg-[#1565D8]/10 px-3.5 py-1.5 rounded-full border border-[#1565D8]/20">
            Why Choose Dilstar
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1A1A1A] mt-3">
            One Unified Brand You Can Count On
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 max-w-xl mx-auto mt-2">
            Built on a heritage of honesty, craftsmanship, and dedication to our local community.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12 text-left">
            {TRUST_POINTS.map((point, idx) => {
              const Icon = point.icon;
              return (
                <div
                  key={idx}
                  className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1565D8] to-[#0B4F5C] flex items-center justify-center text-white mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-[#1A1A1A] mb-2">{point.title}</h3>
                  <p className="text-xs text-zinc-600 leading-relaxed">{point.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 7. CONTACT & THREE PHYSICAL LOCATIONS ─────────────────── */}
      <section id="locations" className="py-20 bg-[#1A1A1A] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs uppercase tracking-widest font-bold text-cyan-400 bg-cyan-950/60 px-3.5 py-1.5 rounded-full border border-cyan-800/50">
              Visit Our Three Locations
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-3">
              We&apos;re Open &amp; Ready to Welcome You
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto mt-2">
              Drop by any of our three dedicated locations in person, or reach our central support
              desk.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {SHOPS.map((shop) => (
              <div
                key={shop.id}
                className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-7 flex flex-col justify-between hover:border-[#1565D8]/50 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">{shop.name}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded-full border border-cyan-900">
                      Physical Store
                    </span>
                  </div>

                  <div className="space-y-3.5 text-xs text-zinc-300">
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-[#1565D8] shrink-0 mt-0.5" />
                      <span>{shop.location.address}</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Phone className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <a
                        href={`tel:${shop.location.phone.replace(/[^0-9+]/g, "")}`}
                        className="hover:text-white underline underline-offset-2"
                      >
                        {shop.location.phone}
                      </a>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Mail className="w-4 h-4 text-[#0B4F5C] shrink-0 mt-0.5" />
                      <a
                        href={`mailto:${shop.location.email}`}
                        className="hover:text-white underline underline-offset-2"
                      >
                        {shop.location.email}
                      </a>
                    </div>
                    <div className="flex items-start gap-2.5 pt-2 border-t border-zinc-800">
                      <Clock className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-zinc-100 font-semibold">Store Hours:</span>
                        <p className="text-zinc-400 mt-0.5">{shop.location.hours.weekdays}</p>
                        <p className="text-zinc-400">{shop.location.hours.sunday}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800">
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(shop.location.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                    Open in Google Maps
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Newsletter / Grand Opening Updates Block */}
          <div className="mt-14 p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-[#1565D8]/20 via-[#0B4F5C]/20 to-zinc-900 border border-zinc-800 text-center max-w-3xl mx-auto">
            <Sparkles className="w-8 h-8 text-cyan-400 mx-auto mb-3" />
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              Stay in the Loop with Dilstar
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-md mx-auto">
              Get notified of seasonal garden arrivals, exclusive contractor sales, and flash tech
              upgrades.
            </p>
            <form
              action="#"
              className="mt-6 flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder="Enter your email address..."
                className="flex-1 px-4 py-3 rounded-xl bg-zinc-950/80 border border-zinc-700 text-white placeholder:text-zinc-500 text-xs focus:outline-none focus:ring-2 focus:ring-[#1565D8]"
                required
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#1565D8] to-[#0B4F5C] text-white font-bold text-xs hover:opacity-95 transition-opacity shadow-md"
              >
                Subscribe
              </button>
            </form>
            <p className="text-[10px] text-zinc-500 mt-3">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
