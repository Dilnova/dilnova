import type { Metadata } from "next";
import { DILSTAR_BRAND_URL } from "@/shared/platform/brand";
import { HeroSection } from "./components/HeroSection";
import { ShopShowcaseSection } from "./components/ShopShowcaseSection";
import { WhyDilstarSection } from "./components/WhyDilstarSection";
import { LocationsSection } from "./components/LocationsSection";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const title = "Dilstar | Hardware, Nursery & Tech Shop in Ambalantota";
  const description =
    "One name. Three shops. Everything close to home. Dilstar is your trusted local business in Ambalantota, Sri Lanka for hardware, coconut saplings, and mobile electronics.";

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

export default function DilstarBrandPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Dilstar",
    description:
      "Trusted local business in Ambalantota, Sri Lanka running three shops under one name: Dilstar Hardware, Dilstar Nursery, and Dilstar Tech Shop.",
    url: DILSTAR_BRAND_URL,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Ambalantota",
      addressCountry: "LK",
    },
    department: [
      {
        "@type": "HardwareStore",
        name: "Dilstar Hardware",
        description: "Dependable tools and materials for home repairs and contractor builds.",
      },
      {
        "@type": "GardenStore",
        name: "Dilstar Nursery",
        description:
          "Healthy coconut saplings and honest planting guidance, grown for Ambalantota's soil.",
      },
      {
        "@type": "ElectronicsStore",
        name: "Dilstar Tech Shop",
        description: "Phones, electronics, and honest advice — no jargon, no pressure.",
      },
    ],
  };

  return (
    <main className="min-h-screen bg-[#04060a] text-zinc-100 selection:bg-teal-500/30 selection:text-teal-200">
      {/* JSON-LD Schema for LocalBusiness */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />

      {/* 1. Hero Section (Headline Reveal, Ambient Glow, Signature 3-Node Visual & Stat Chips) */}
      <HeroSection />

      {/* 2. Shop Showcase (Three Cinematic Panels: Hardware, Nursery, Tech Shop) */}
      <ShopShowcaseSection />

      {/* 3. Why Dilstar (4 Minimalist Value Cards) */}
      <WhyDilstarSection />

      {/* 4. Locations & Practical Contact Cards */}
      <LocationsSection />
    </main>
  );
}
