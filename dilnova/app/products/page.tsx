import { clerkClient, auth } from '@clerk/nextjs/server';
import { db } from '../../db';
import * as schema from '../../db/schema';
import { eq, and, ilike, or, inArray, sql } from 'drizzle-orm';
import Link from 'next/link';
import Image from 'next/image';
import { isVideoUrl } from '../../utils/media';
import type { Metadata } from 'next';
import CatalogFilters from './CatalogFilters';
import WishlistButton from './[id]/WishlistButton';
import AddToCartButton from '../components/AddToCartButton';
import { getSystemSetting } from '../../utils/settings';
import { getCachedOrganizations } from '../../utils/clerkCache';
import { getStockAvailabilityCatalog } from '@/utils/stockAvailability';
import { resolveEffectiveStockAvailability } from '@/utils/stockAvailabilityShared';
import StockAvailabilityBadge from '../components/StockAvailabilityBadge';

export const revalidate = 0; // Fresh load on each catalog query

interface PageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    type?: string;
    page?: string;
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
  const currentSearch = params.search || '';
  const currentCategorySlug = params.category || '';
  const currentType = params.type || 'all';
  const currentPage = parseInt(params.page || '1', 10);
  const itemsPerPage = 12;

  // 1. Fetch categories and Clerk client concurrently
  const clientPromise = clerkClient();
  const categoriesPromise = db.select().from(schema.categories);

  const [client, categoriesList, stockAvailabilityCatalog] = await Promise.all([
    clientPromise,
    categoriesPromise,
    getStockAvailabilityCatalog(),
  ]);

  // 2. Fetch Organizations from Clerk (cached)
  const organizations = await getCachedOrganizations(client);
  const selectedCategory = categoriesList.find(c => c.slug === currentCategorySlug);

  // 3. Build Drizzle query clauses dynamically
  const whereClauses = [];

  if (currentSearch) {
    // Escape SQL LIKE wildcard characters to prevent unintended pattern matching
    const sanitizedSearch = currentSearch.replace(/[%_]/g, '\\$&');
    whereClauses.push(
      or(
        ilike(schema.products.name, `%${sanitizedSearch}%`),
        ilike(schema.products.description, `%${sanitizedSearch}%`)
      )
    );
  }

  if (selectedCategory) {
    if (!selectedCategory.parentId) {
      const subCategoryIds = categoriesList.filter((c) => c.parentId === selectedCategory.id).map((c) => c.id);
      const categoryIdsToFilter = [selectedCategory.id, ...subCategoryIds];
      whereClauses.push(inArray(schema.products.categoryId, categoryIdsToFilter));
    } else {
      whereClauses.push(eq(schema.products.categoryId, selectedCategory.id));
    }
  }

  if (currentType !== 'all') {
    whereClauses.push(eq(schema.products.type, currentType));
  }

  whereClauses.push(eq(schema.products.status, 'active'));

  const conditions = and(...whereClauses);
  
  // Calculate total count and retrieve paginated records in parallel
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
      .limit(itemsPerPage)
      .offset((currentPage - 1) * itemsPerPage)
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

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 font-sans pb-24">
      <div className="pt-12"></div>
      {/* Main Content Layout */}
      <main className="max-w-6xl mx-auto px-6">
        
        {/* Filters */}
        <CatalogFilters
          categories={categoriesList}
          currentCategory={currentCategorySlug}
          currentSearch={currentSearch}
          currentType={currentType}
        />

        {/* Results Grid */}
        {results.length === 0 ? (
          <div className="max-w-md mx-auto text-center border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-8 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold mb-1">No Catalog Items Found</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              No products or services matched your active search criteria. Clear your search or filters to see other listings.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {results.map(({ product, category }, index) => {
                // Map the organization ID to its name and logo in Clerk
                const orgMatch = organizations.find((o) => o.id === product.orgId);
                const vendorName = orgMatch ? orgMatch.name : 'Unknown Vendor';
                const vendorLogo = orgMatch ? orgMatch.imageUrl : null;
                const vendorSlug = orgMatch ? orgMatch.slug : null;

                const formattedPrice = (product.price / 100).toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD',
                });

                const productReviews = allReviewsForPage.filter((r) => r.productId === product.id);
                const totalReviews = productReviews.length;
                const averageRating = totalReviews
                  ? Number((productReviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1))
                  : 0;
                const isFavorited = wishlistSet.has(product.id);
                const inventoryInfo = inventoryByProduct.get(product.id);
                const availabilityDef =
                  product.type === 'product'
                    ? resolveEffectiveStockAvailability(
                        stockAvailabilityCatalog,
                        inventoryInfo?.stockAvailability,
                        inventoryInfo?.quantity
                      )
                    : null;

                return (
                  <div
                    key={product.id}
                    className="group flex flex-col justify-between border border-zinc-200/80 dark:border-zinc-850/80 bg-white dark:bg-zinc-950 rounded-2xl overflow-hidden hover:border-purple-500/40 dark:hover:border-purple-500/40 hover:shadow-lg transition-all duration-305"
                  >
                    <Link href={`/products/${product.id}`} className="flex-1 flex flex-col group">
                      {/* Image Thumbnail */}
                      <div className="h-44 bg-zinc-100 dark:bg-zinc-900 relative overflow-hidden border-b border-zinc-100 dark:border-zinc-900">
                        {product.imageUrl ? (
                          isVideoUrl(product.imageUrl) ? (
                            <video
                              src={product.imageUrl}
                              muted
                              loop
                              playsInline
                              autoPlay
                              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                              priority={index < 4}
                            />
                          )
                        ) : (
                          <div className="w-full h-full bg-gradient-to-r from-purple-500/5 via-indigo-500/5 to-blue-500/5 flex items-center justify-center text-2xl">
                            📦
                          </div>
                        )}

                        {/* Wishlist Toggle Overlay */}
                        <div className="absolute top-3 left-3 z-10">
                          <WishlistButton
                            productId={product.id}
                            initialFavorited={isFavorited}
                            isLoggedIn={!!userId}
                            showLabel={false}
                            className="p-1.5 h-8 w-8 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border-none hover:bg-white dark:hover:bg-zinc-900 shadow-sm"
                          />
                        </div>
                        
                        {/* Type Badge */}
                        <span className={`absolute top-3 right-3 text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow ${
                          product.type === 'service'
                            ? 'bg-teal-500 text-teal-950'
                            : 'bg-indigo-500 text-indigo-50'
                        }`}>
                          {product.type}
                        </span>
                      </div>

                      {/* Content Card Body */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-1.5 mb-2">
                            {category ? (
                              <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">
                                {category.name}
                              </span>
                            ) : (
                              <div />
                            )}
                            {totalReviews > 0 && (
                              <span className="text-[10px] font-bold text-amber-500 flex items-center gap-0.5">
                                <span>★</span>
                                <span>{averageRating}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 leading-snug line-clamp-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                              {product.name}
                            </h3>
                            {availabilityDef && (
                              <StockAvailabilityBadge
                                label={availabilityDef.label}
                                tone={availabilityDef.badgeTone}
                              />
                            )}
                          </div>
                          
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed min-h-[2.5rem]">
                            {product.description || 'No description provided.'}
                          </p>
                        </div>
                      </div>
                    </Link>

                    {/* Price and Vendor Ownership Row */}
                    <div className="p-4 border-t border-zinc-100 dark:border-zinc-900/60">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
                            {formattedPrice}
                          </span>
                          <div className="flex items-center gap-1 text-[9px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5" title="Views count">
                            <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>{product.views} views</span>
                          </div>
                        </div>
                        <AddToCartButton
                          product={{
                            id: product.id,
                            name: product.name,
                            price: product.price,
                            imageUrl: product.imageUrl,
                            vendorName: vendorName,
                            type: product.type,
                          }}
                          canPurchase={availabilityDef ? availabilityDef.allowsPurchase : true}
                          showLabel={false}
                          className="h-8 w-8 text-xs rounded-lg"
                        />
                      </div>

                      {/* Vendor Owner Label */}
                      <div className="flex items-center gap-2 border-t border-zinc-105/50 dark:border-zinc-900/40 pt-3">
                        {vendorLogo ? (
                          <Image
                            src={vendorLogo}
                            alt={vendorName}
                            width={20}
                            height={20}
                            className="rounded-md object-cover border border-zinc-100 dark:border-zinc-800"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-[10px] flex items-center justify-center">
                            🏢
                          </div>
                        )}
                        <div className="text-[10px] truncate flex-1 leading-none">
                          <span className="text-zinc-400 block mb-0.5">Sold by</span>
                          {vendorSlug ? (
                            <Link
                              href={`/vendors/${vendorSlug}`}
                              className="font-bold text-zinc-700 dark:text-zinc-300 hover:text-purple-500 transition-colors"
                            >
                              {vendorName}
                            </Link>
                          ) : (
                            <span className="font-bold text-zinc-600 dark:text-zinc-400">
                              {vendorName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-12">
                {currentPage > 1 && (
                  <Link
                    href={`/products?${new URLSearchParams({
                      ...Object.fromEntries(Object.entries(params)),
                      page: (currentPage - 1).toString(),
                    }).toString()}`}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs font-mono"
                  >
                    &larr; Prev
                  </Link>
                )}
                <span className="text-xs font-mono text-zinc-400">
                  Page {currentPage} of {totalPages}
                </span>
                {currentPage < totalPages && (
                  <Link
                    href={`/products?${new URLSearchParams({
                      ...Object.fromEntries(Object.entries(params)),
                      page: (currentPage + 1).toString(),
                    }).toString()}`}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs font-mono"
                  >
                    Next &rarr;
                  </Link>
                )}
              </div>
            )}
          </>
        )}

      </main>

    </div>
  );
}
