/**
 * Shared props interface for all vendor storefront components.
 * Every custom storefront receives the same data — what it does with
 * the data is entirely up to the component's custom code.
 */

export interface VendorProduct {
  id: string;
  name: string;
  type: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  categoryName: string | null;
  categorySlug: string | null;
}

export interface VendorOrg {
  id: string;
  name: string;
  slug: string | null;
  imageUrl: string;
  publicMetadata: {
    description?: string;
    bannerUrl?: string;
    address?: string;
    phone?: string;
    [key: string]: unknown;
  };
}

export interface StorefrontProps {
  org: VendorOrg;
  products: VendorProduct[];
}
