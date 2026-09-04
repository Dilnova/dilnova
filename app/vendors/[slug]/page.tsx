import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { customStorefronts } from "@/features/storefront/components/custom/registry";
import DefaultStorefront from "@/features/storefront/components/DefaultStorefront";
import { getVendorProducts } from "@/features/storefront/get-vendor-products";
import { enrichVendorProductsWithPurchaseFlags } from "@/features/storefront/purchase";
import type { VendorOrg } from "@/features/storefront/components/custom/types";
import { getCachedOrganizations, getCachedOrganizationBySlug } from "@/shared/auth/clerk-cache";
import { sanitizeVendorPublicMetadata } from "@/shared/media/sanitize-vendor-public-metadata";
import { getSystemSetting } from "@/shared/platform/settings";
import { DEFAULT_APP_URL } from "@/shared/platform/brand";
import { logger } from "@/shared/logging/logger";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 300; // Cache and regenerate page in background at most every 5 minutes (ISR)

const DILSTAR_SLUGS = [
  "dilstar-hardware",
  "dilstar-nursery",
  "dilstar-tech",
  "dilstar-services",
  // Backward-compatibility aliases
  "distar-hardware",
  "distar-nursery",
  "distar-tech",
];

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  // Domain-aware system name detection
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host") || "";
  const isDilstar = host.includes("dilstar.pp.ua");
  const systemName = isDilstar ? "Dilstar" : await getSystemSetting("system_name", "Dilnova");

  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = host
    ? `${protocol}://${host}`
    : process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;

  const isDilstarSubVendor = DILSTAR_SLUGS.includes(slug);

  let clerkOrg = null;
  try {
    const orgs = await getCachedOrganizations();
    if (isDilstarSubVendor) {
      clerkOrg = orgs.find(
        (o) =>
          o.name.toLowerCase() === "dilstar" ||
          o.slug === "dilstar" ||
          (o.slug && o.slug.startsWith("dilstar-")) ||
          o.name.toLowerCase() === "distar" ||
          o.slug === "distar" ||
          (o.slug && o.slug.startsWith("distar-")),
      );
    } else {
      clerkOrg = orgs.find((o) => o.slug === slug || o.id === slug);
    }

    if (!clerkOrg) {
      clerkOrg = await getCachedOrganizationBySlug(slug);
    }
  } catch (err) {
    logger.warn(`Metadata org resolution failed for slug: ${slug}`, { error: err });
  }

  if (!clerkOrg) {
    return {
      title: `Vendor Storefront | ${systemName}`,
    };
  }

  let displayName = clerkOrg.name;
  if (slug === "dilstar-hardware" || slug === "distar-hardware") {
    displayName = "Dilstar Hardware";
  } else if (slug === "dilstar-nursery" || slug === "distar-nursery") {
    displayName = "Dilstar Nursery";
  } else if (slug === "dilstar-tech" || slug === "distar-tech") {
    displayName = "Dilstar Tech Shop";
  } else if (slug === "dilstar-services") {
    displayName = "Dilstar Services";
  }

  const title = `${displayName} Storefront | ${systemName}`;
  const description = clerkOrg.publicMetadata?.description
    ? (clerkOrg.publicMetadata.description as string)
    : `Browse products and services catalog offered by ${displayName} on ${systemName}.`;

  const ogImages = clerkOrg.imageUrl
    ? [{ url: clerkOrg.imageUrl }]
    : [{ url: `${baseUrl}/apple-touch-icon.png`, width: 180, height: 180 }];

  return {
    title,
    description,
    alternates: {
      canonical: `/vendors/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/vendors/${slug}`,
      siteName: systemName,
      type: "website",
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: isDilstar ? "@dilstar" : "@dilnova",
    },
  };
}

// Pre-render the core sub-vendor storefront paths at build-time for instant first load
export async function generateStaticParams() {
  return [
    { slug: "dilstar-hardware" },
    { slug: "dilstar-nursery" },
    { slug: "dilstar-tech" },
    { slug: "dilstar-services" },
    { slug: "distar-hardware" },
    { slug: "distar-nursery" },
    { slug: "distar-tech" },
  ];
}

/**
 * Vendor Storefront Resolver
 *
 * 1. Fetches the organization from Clerk by slug
 * 2. Fetches the vendor's products from Supabase
 * 3. Checks the registry for a custom page component
 *    → If found: renders the custom storefront
 *    → If not: renders the default storefront
 */
export default async function VendorProfilePage({ params }: PageProps) {
  const { slug } = await params;

  const isDilstarSubVendor = DILSTAR_SLUGS.includes(slug);

  // 1. Fetch/resolve organization from Clerk using cache
  let clerkOrg = null;
  try {
    const orgs = await getCachedOrganizations();
    if (isDilstarSubVendor) {
      clerkOrg = orgs.find(
        (o) =>
          o.name.toLowerCase() === "dilstar" ||
          o.slug === "dilstar" ||
          (o.slug && o.slug.startsWith("dilstar-")) ||
          o.name.toLowerCase() === "distar" ||
          o.slug === "distar" ||
          (o.slug && o.slug.startsWith("distar-")),
      );
    } else {
      clerkOrg = orgs.find((o) => o.slug === slug || o.id === slug);
    }

    // Direct lookup fallback if not found in the cached list (for new orgs)
    if (!clerkOrg) {
      clerkOrg = await getCachedOrganizationBySlug(slug);
    }
  } catch (e) {
    logger.error(`[Vendor Page] Failed to resolve org for slug: ${slug}`, e);
  }

  if (!clerkOrg) {
    if (isDilstarSubVendor) {
      let fallbackName = "Dilstar Storefront";
      if (slug === "dilstar-hardware" || slug === "distar-hardware")
        fallbackName = "Dilstar Hardware";
      else if (slug === "dilstar-nursery" || slug === "distar-nursery")
        fallbackName = "Dilstar Nursery";
      else if (slug === "dilstar-tech" || slug === "distar-tech")
        fallbackName = "Dilstar Tech Shop";
      else if (slug === "dilstar-services") fallbackName = "Dilstar Services";

      clerkOrg = {
        id: `org_${slug.replace(/-/g, "_")}_placeholder`,
        name: fallbackName,
        slug: slug,
        imageUrl: "",
        publicMetadata: {
          description: `Welcome to ${fallbackName}. Browse our catalog.`,
        },
      };
    } else {
      logger.warn(`[Vendor Page] No organization found for slug: "${slug}"`);
      return notFound();
    }
  }

  // 2. Normalize org data into our StorefrontProps shape, overriding the name for specific sub-vendors sharing the 'dilstar' Clerk organization
  let displayName = clerkOrg.name;
  if (slug === "dilstar-hardware" || slug === "distar-hardware") {
    displayName = "Dilstar Hardware";
  } else if (slug === "dilstar-nursery" || slug === "distar-nursery") {
    displayName = "Dilstar Nursery";
  } else if (slug === "dilstar-tech" || slug === "distar-tech") {
    displayName = "Dilstar Tech Shop";
  } else if (slug === "dilstar-services") {
    displayName = "Dilstar Services";
  }

  const org: VendorOrg = {
    id: clerkOrg.id,
    name: displayName,
    slug: clerkOrg.slug,
    imageUrl: clerkOrg.imageUrl,
    publicMetadata: sanitizeVendorPublicMetadata(
      (clerkOrg.publicMetadata || {}) as Record<string, unknown>,
    ),
  };

  // 3. Fetch products for this org from Supabase

  const rawProducts = await getVendorProducts(clerkOrg.id);
  const products = await enrichVendorProductsWithPurchaseFlags(rawProducts);

  // 4. Build JSON-LD structured data for search engines
  const isDilstarSubVendorForLD = DILSTAR_SLUGS.includes(slug);
  const storeTypeMap: Record<string, string> = {
    "dilstar-hardware": "HardwareStore",
    "distar-hardware": "HardwareStore",
    "dilstar-nursery": "GardenStore",
    "distar-nursery": "GardenStore",
    "dilstar-tech": "ElectronicsStore",
    "distar-tech": "ElectronicsStore",
    "dilstar-services": "ProfessionalService",
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": isDilstarSubVendorForLD ? storeTypeMap[slug] || "Store" : "Organization",
    name: displayName,
    ...(clerkOrg.imageUrl ? { logo: clerkOrg.imageUrl } : {}),
    ...(isDilstarSubVendorForLD
      ? {
          address: {
            "@type": "PostalAddress",
            addressLocality: "Ambalantota",
            addressCountry: "LK",
          },
          parentOrganization: {
            "@type": "Organization",
            name: "Dilstar",
          },
        }
      : {}),
  };

  // 5. Check if custom storefront component is enabled via system settings
  const customEnabledSetting = await getSystemSetting(`custom_storefront_${slug}`, "true");
  const isCustomEnabled = customEnabledSetting === "true";

  const structuredDataScript = (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );

  // 6. Lookup custom storefront in registry if setting is enabled
  if (isCustomEnabled && customStorefronts[slug]) {
    const CustomComponent = customStorefronts[slug];
    return (
      <>
        {structuredDataScript}
        <CustomComponent org={org} products={products} />
      </>
    );
  }

  // 7. Fallback to DefaultStorefront for standard vendors
  return (
    <>
      {structuredDataScript}
      <DefaultStorefront org={org} products={products} />
    </>
  );
}
