import type { Metadata } from 'next';
import { clerkClient } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { customStorefronts } from './custom/registry';
import DefaultStorefront from './DefaultStorefront';
import { getVendorProducts } from './getVendorProducts';
import type { VendorOrg } from './custom/types';
import { getCachedOrganizations } from '../../../utils/clerkCache';
import { getSystemSetting } from '../../../utils/settings';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 30; // Cache and regenerate page in background at most every 30 seconds (ISR)

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const client = await clerkClient();
  const systemName = await getSystemSetting('system_name', 'Dilnova');

  const isDistarSubVendor = ['distar-hardware', 'distar-nursery', 'distar-tech', 'dilstar-services'].includes(slug);

  let clerkOrg = null;
  try {
    const orgs = await getCachedOrganizations(client);
    if (isDistarSubVendor) {
      clerkOrg = orgs.find(
        (o) => o.name.toLowerCase() === 'distar' || o.slug === 'distar' || (o.slug && o.slug.startsWith('distar-'))
      );
    } else {
      clerkOrg = orgs.find(
        (o) => o.slug === slug || o.id === slug
      );
    }

    if (!clerkOrg) {
      try {
        const o = await client.organizations.getOrganization({ slug });
        if (o) {
          clerkOrg = {
            id: o.id,
            name: o.name,
            slug: o.slug,
            imageUrl: o.imageUrl,
            publicMetadata: o.publicMetadata,
          };
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }

  if (!clerkOrg) {
    return {
      title: `Vendor Storefront | ${systemName}`,
    };
  }

  let displayName = clerkOrg.name;
  if (slug === 'distar-hardware') {
    displayName = 'Distar Hardware';
  } else if (slug === 'distar-nursery') {
    displayName = 'Distar Nursery';
  } else if (slug === 'distar-tech') {
    displayName = 'Distar Tech Store';
  } else if (slug === 'dilstar-services') {
    displayName = 'Dilstar Services';
  }

  const title = `${displayName} Storefront | ${systemName}`;
  const description = clerkOrg.publicMetadata?.description
    ? (clerkOrg.publicMetadata.description as string)
    : `Browse products and services catalog offered by ${displayName} on ${systemName}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: clerkOrg.imageUrl ? [{ url: clerkOrg.imageUrl }] : [],
    },
  };
}

// Pre-render the core sub-vendor storefront paths at build-time for instant first load
export async function generateStaticParams() {
  return [
    { slug: 'distar-hardware' },
    { slug: 'distar-nursery' },
    { slug: 'distar-tech' },
    { slug: 'dilstar-services' },
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
  const client = await clerkClient();

  const isDistarSubVendor = ['distar-hardware', 'distar-nursery', 'distar-tech', 'dilstar-services'].includes(slug);

  // 1. Fetch/resolve organization from Clerk using cache
  let clerkOrg = null;
  try {
    const orgs = await getCachedOrganizations(client);
    if (isDistarSubVendor) {
      clerkOrg = orgs.find(
        (o) => o.name.toLowerCase() === 'distar' || o.slug === 'distar' || (o.slug && o.slug.startsWith('distar-'))
      );
    } else {
      clerkOrg = orgs.find(
        (o) => o.slug === slug || o.id === slug
      );
    }

    // Direct lookup fallback if not found in the cached list (for new orgs)
    if (!clerkOrg) {
      try {
        const o = await client.organizations.getOrganization({ slug });
        if (o) {
          clerkOrg = {
            id: o.id,
            name: o.name,
            slug: o.slug,
            imageUrl: o.imageUrl,
            publicMetadata: o.publicMetadata,
          };
        }
      } catch {
        // ignore
      }
    }
  } catch (e) {
    console.error(`[Vendor Page] Failed to resolve org for slug: ${slug}`, e);
  }

  if (!clerkOrg) {
    if (isDistarSubVendor) {
      let fallbackName = 'Distar Storefront';
      if (slug === 'distar-hardware') fallbackName = 'Distar Hardware';
      else if (slug === 'distar-nursery') fallbackName = 'Distar Nursery';
      else if (slug === 'distar-tech') fallbackName = 'Distar Tech Store';
      else if (slug === 'dilstar-services') fallbackName = 'Dilstar Services';

      clerkOrg = {
        id: `org_${slug.replace(/-/g, '_')}_placeholder`,
        name: fallbackName,
        slug: slug,
        imageUrl: '',
        publicMetadata: {
          description: `Welcome to ${fallbackName}. Browse our catalog.`,
        },
      };
    } else {
      console.error(`[Vendor Page] No organization found for slug: "${slug}"`);
      return notFound();
    }
  }

  // 2. Normalize org data into our StorefrontProps shape, overriding the name for specific sub-vendors sharing the 'distar' Clerk organization
  let displayName = clerkOrg.name;
  if (slug === 'distar-hardware') {
    displayName = 'Distar Hardware';
  } else if (slug === 'distar-nursery') {
    displayName = 'Distar Nursery';
  } else if (slug === 'distar-tech') {
    displayName = 'Distar Tech Store';
  } else if (slug === 'dilstar-services') {
    displayName = 'Dilstar Services';
  }

  const org: VendorOrg = {
    id: clerkOrg.id,
    name: displayName,
    slug: clerkOrg.slug,
    imageUrl: clerkOrg.imageUrl,
    publicMetadata: (clerkOrg.publicMetadata || {}) as VendorOrg['publicMetadata'],
  };

  // 3. Fetch vendor products from Supabase
  let products = await getVendorProducts(clerkOrg.id);

  // 3.5 Filter products by category for shared distar organization
  if (slug === 'distar-hardware') {
    products = products.filter(p => p.categorySlug === 'hardware');
  } else if (slug === 'distar-nursery') {
    products = products.filter(p => p.categorySlug === 'plants');
  } else if (slug === 'distar-tech') {
    products = products.filter(p => p.categorySlug === 'tech');
  } else if (slug === 'dilstar-services') {
    products = products.filter(p => p.categorySlug === 'services');
  }

  // 4. Check registry for custom storefront
  const isCustomEnabled = (await getSystemSetting(`custom_storefront_${slug}`, 'true')) === 'true';
  const CustomStorefront = (slug && isCustomEnabled) ? customStorefronts[slug] : undefined;

  if (CustomStorefront) {
    return <CustomStorefront org={org} products={products} />;
  }

  // 5. Fallback to default layout
  return <DefaultStorefront org={org} products={products} />;
}
