import { Suspense } from 'react';
import { clerkClient, auth } from '@clerk/nextjs/server';
import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { Metadata } from 'next';
import { getSystemSetting } from '@/shared/platform/settings';
import { getCachedOrganizations } from '@/shared/auth/clerk-cache';
import { getStockAvailabilityCatalog } from '@/features/inventory/availability.server';
import { resolveOnlineProductPurchaseState } from '@/features/inventory/availability.shared';
import CatalogViewClient, { type CatalogItemViewData } from '@/features/catalog/components/CatalogViewClient';
import {
  buildCatalogOrderBy,
  buildCatalogWhereClauses,
  parseCatalogQueryParams,
  resolveVendorOrgId,
} from '@/features/catalog/query';

export const revalidate = 30; // Cache for 30s to prevent rapid re-fetches; vendor actions revalidate on-demand

interface PageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    type?: string;
    page?: string;
    sort?: string;
    vendor?: string;
    minPrice?: string;
    maxPrice?: string;
    stock?: string;
  }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const currentSearch = params.search || '';
  const currentCategorySlug = params.category || '';
  const currentType = params.type || 'all';

  const systemName = await getSystemSetting('system_name', 'Dilnova');

  let title = `Products & Services Catalog | ${systemName}`;
  let description = `Browse local multi-vendor products and services available on ${systemName} Commerce Hub.`;

  if (currentCategorySlug) {
    try {
      const [selectedCategory] = await db
        .select({ name: schema.categories.name })
        .from(schema.categories)
        .where(eq(schema.categories.slug, currentCategorySlug))
        .limit(1);

      if (selectedCategory) {
        title = `${selectedCategory.name} - Products & Services | ${systemName}`;
        description = `Explore the best ${selectedCategory.name.toLowerCase()} catalog, matching products, and services offered by our vendors on ${systemName}.`;
      }
    } catch {
      // ignore
    }
  } else if (currentSearch) {
    title = `Search results for "${currentSearch}" | ${systemName}`;
    description = `View all multi-vendor products and services matching search term "${currentSearch}" on ${systemName}.`;
  } else if (currentType !== 'all') {
    const typeLabel = currentType === 'product' ? 'Products' : 'Services';
    title = `Browse ${typeLabel} | ${systemName}`;
    description = `Explore high-quality vendor ${typeLabel.toLowerCase()} listings on ${systemName} Commerce Hub.`;
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}

export default async function ProductsCatalogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const catalogQuery = parseCatalogQueryParams(params);
  const itemsPerPage = 12;

  const [categoriesList, stockAvailabilityCatalog, organizations] = await Promise.all([
    db.select().from(schema.categories),
    getStockAvailabilityCatalog(),
    clerkClient().then((client) => getCachedOrganizations(client)),
  ]);

  const vendorOrgId = resolveVendorOrgId(catalogQuery.vendorSlug, organizations);
  const conditions = buildCatalogWhereClauses({
    search: catalogQuery.search,
    categorySlug: catalogQuery.categorySlug,
    type: catalogQuery.type,
    vendorOrgId,
    minPriceCents: catalogQuery.minPriceCents,
    maxPriceCents: catalogQuery.maxPriceCents,
    stock: catalogQuery.stock,
    categories: categoriesList,
  });
  const orderBy = buildCatalogOrderBy(catalogQuery.sort);

  const [countResult, results] = await Promise.all([
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(schema.products)
      .where(conditions),
    db
      .select({
        product: schema.products,
        category: schema.categories,
      })
      .from(schema.products)
      .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
      .where(conditions)
      .orderBy(...orderBy)
      .limit(itemsPerPage)
      .offset((catalogQuery.page - 1) * itemsPerPage),
  ]);

  const totalCount = countResult[0]?.count || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Fetch reviews and wishlist statuses for the returned product IDs in parallel
  const { userId } = await auth();
  const productIds = results.map((r) => r.product.id);

  const [allReviewsForPage, userWishlist, inventoryRows] = await Promise.all([
    productIds.length > 0
      ? db.select().from(schema.reviews).where(inArray(schema.reviews.productId, productIds))
      : Promise.resolve([]),
    (userId && productIds.length > 0)
      ? db.select().from(schema.wishlists).where(and(eq(schema.wishlists.userId, userId), inArray(schema.wishlists.productId, productIds)))
      : Promise.resolve([]),
    productIds.length > 0
      ? db
          .select({
            productId: schema.inventory.productId,
            stockAvailability: schema.inventory.stockAvailability,
            quantity: schema.inventory.quantity,
          })
          .from(schema.inventory)
          .where(inArray(schema.inventory.productId, productIds))
      : Promise.resolve([]),
  ]);

  const inventoryByProduct = new Map(
    inventoryRows.map((row) => [row.productId, { stockAvailability: row.stockAvailability, quantity: row.quantity }])
  );

  const wishlistSet = new Set(userWishlist.map((w) => w.productId));

  const items: CatalogItemViewData[] = results.map(({ product, category }) => {
    const orgMatch = organizations.find((o) => o.id === product.orgId);
    const vendorName = orgMatch ? orgMatch.name : 'Unknown Vendor';
    const vendorLogo = orgMatch ? orgMatch.imageUrl : null;
    const vendorSlug = orgMatch ? orgMatch.slug : null;

    const productReviews = allReviewsForPage.filter((r) => r.productId === product.id);
    const totalReviews = productReviews.length;
    const averageRating = totalReviews
      ? Number((productReviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1))
      : 0;

    const isFavorited = wishlistSet.has(product.id);
    const inventoryInfo = inventoryByProduct.get(product.id);
    const { canPurchase, availabilityDef } = resolveOnlineProductPurchaseState(
      product.type,
      stockAvailabilityCatalog,
      inventoryInfo
    );

    return {
      product,
      categoryName: category ? category.name : null,
      vendorName,
      vendorLogo,
      vendorSlug,
      averageRating,
      totalReviews,
      isFavorited,
      canPurchase,
      availabilityBadge: availabilityDef
        ? {
            label: availabilityDef.label,
            tone: availabilityDef.badgeTone,
          }
        : null,
    };
  });

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 font-sans pb-24">
      <div className="pt-8 sm:pt-12"></div>
      <main className="max-w-7xl mx-auto px-4 sm:px-6">
        <Suspense fallback={null}>
          <CatalogViewClient
            categories={categoriesList}
            vendors={organizations}
            catalogQuery={catalogQuery}
            rawParams={params}
            totalCount={totalCount}
            totalPages={totalPages}
            items={items}
            userId={userId}
          />
        </Suspense>
      </main>
    </div>
  );
}
