import { Suspense } from 'react';
import { clerkClient, auth } from '@clerk/nextjs/server';
import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';

const getCachedCategories = unstable_cache(
  async () => {
    return db.select().from(schema.categories);
  },
  ['all-categories-list'],
  { revalidate: 3600, tags: ['categories'] }
);
import { getSystemSetting } from '@/shared/platform/settings';
import { getCachedOrganizations } from '@/shared/auth/clerk-cache';
import { getStockAvailabilityCatalog } from '@/features/inventory/availability.server';
import { resolveOnlineProductPurchaseState } from '@/features/inventory/availability.shared';
import CatalogLayout, { type CatalogItemViewData } from '@/features/catalog/components/CatalogLayout';
import {
  buildCatalogOrderBy,
  buildCatalogWhereClauses,
  parseCatalogQueryParams,
  resolveVendorOrgId,
} from '@/features/catalog/queries';
import { getUserWishlistIdsAction } from '@/features/catalog/product-detail.actions';

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
    view?: string;
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
  const { userId } = await auth();
  const catalogQuery = parseCatalogQueryParams(params);
  const viewMode = (params.view === 'list' ? 'list' : 'grid') as 'grid' | 'list';
  const itemsPerPage = 12;

  const [categoriesList, stockAvailabilityCatalog, organizations] = await Promise.all([
    getCachedCategories(),
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
        product: {
          id: schema.products.id,
          orgId: schema.products.orgId,
          categoryId: schema.products.categoryId,
          name: schema.products.name,
          description: schema.products.description,
          price: schema.products.price,
          type: schema.products.type,
          status: schema.products.status,
          imageUrl: schema.products.imageUrl,
          views: schema.products.views,
          createdAt: schema.products.createdAt,
        },
        category: {
          name: schema.categories.name,
        },
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

  // Fetch reviews and inventory for the returned product IDs in parallel
  const productIds = results.map((r) => r.product.id);

  const [allReviewsForPage, inventoryRows, wishlistedIds] = await Promise.all([
    productIds.length > 0
      ? db.select({
          productId: schema.reviews.productId,
          count: sql<number>`cast(count(*) as int)`,
          avgRating: sql<number>`avg(${schema.reviews.rating})`,
        })
        .from(schema.reviews)
        .where(inArray(schema.reviews.productId, productIds))
        .groupBy(schema.reviews.productId)
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
    userId && productIds.length > 0
      ? getUserWishlistIdsAction(productIds)
      : Promise.resolve([]),
  ]);

  const wishlistSet = new Set(wishlistedIds);
  const inventoryByProduct = new Map(
    inventoryRows.map((row) => [row.productId, { stockAvailability: row.stockAvailability, quantity: row.quantity }])
  );

  const items: CatalogItemViewData[] = results.map(({ product, category }) => {
    const orgMatch = organizations.find((o) => o.id === product.orgId);
    const vendorName = orgMatch ? orgMatch.name : 'Unknown Vendor';
    const vendorLogo = orgMatch ? orgMatch.imageUrl : null;
    const vendorSlug = orgMatch ? orgMatch.slug : null;

    const reviewStats = allReviewsForPage.find((r) => r.productId === product.id);
    const totalReviews = reviewStats?.count || 0;
    const averageRating = totalReviews > 0 ? Number(Number(reviewStats?.avgRating).toFixed(1)) : 0;

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
          <CatalogLayout
            categories={categoriesList}
            vendors={organizations}
            catalogQuery={catalogQuery}
            rawParams={params}
            totalCount={totalCount}
            totalPages={totalPages}
            items={items}
            viewMode={viewMode}
          />
        </Suspense>
      </main>
    </div>
  );
}
