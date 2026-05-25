import { clerkClient } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { customStorefronts } from './custom/registry';
import DefaultStorefront from './DefaultStorefront';
import { getVendorProducts } from './getVendorProducts';
import type { VendorOrg } from './custom/types';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 0; // Fresh load on each request

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

  // 1. Fetch organization from Clerk
  let clerkOrg;
  try {
    if (isDistarSubVendor) {
      try {
        clerkOrg = await client.organizations.getOrganization({ slug: 'distar' });
      } catch {
        // ignore and let fallback handle it
      }
    } else {
      clerkOrg = await client.organizations.getOrganization({ slug });
    }
  } catch {
    // ignore and let fallback handle it
  }

  if (!clerkOrg) {
    // Fallback: search through org list
    try {
      const orgList = await client.organizations.getOrganizationList({ limit: 100 });
      console.log(`[Vendor Page] Available orgs:`, orgList.data.map(o => ({ name: o.name, slug: o.slug, id: o.id })));
      
      if (isDistarSubVendor) {
        clerkOrg = orgList.data.find(
          (o) => o.name.toLowerCase() === 'distar' || o.slug === 'distar' || o.slug.startsWith('distar-')
        );
      } else {
        clerkOrg = orgList.data.find(
          (o) => o.slug === slug || o.id === slug
        );
      }
    } catch (e) {
      console.error(`[Vendor Page] Failed to fetch orgs for slug: ${slug}`, e);
    }
  }

  if (!clerkOrg) {
    console.error(`[Vendor Page] No organization found for slug: "${slug}"`);
    return notFound();
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
  const CustomStorefront = slug ? customStorefronts[slug] : undefined;

  if (CustomStorefront) {
    return <CustomStorefront org={org} products={products} />;
  }

  // 5. Fallback to default layout
  return <DefaultStorefront org={org} products={products} />;
}
