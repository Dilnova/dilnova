'use client';

import React from 'react';
import useSWR from 'swr';
import { useAuth } from '@clerk/nextjs';
import { getUserWishlistIdsAction } from '../product-detail.actions';
import Link from 'next/link';
import Image from 'next/image';
import { isVideoUrl } from '@/shared/media/media';
import CatalogFilters, { CatalogDesktopSidebar } from './CatalogFilters';
import WishlistButton from './product-detail/WishlistButton';
import AddToCartButton from '@/features/cart/components/AddToCartButton';
import StockAvailabilityBadge from '@/features/inventory/components/StockAvailabilityBadge';
import type { StockAvailabilityTone } from '@/features/inventory/availability.shared';
import { buildCatalogSearchParams } from '../query';
import type { CatalogCategoryRef, CatalogVendorRef, CatalogQueryParams } from '../types';

export interface CatalogItemViewData {
  product: {
    id: string;
    orgId: string;
    categoryId: string | null;
    name: string;
    description: string | null;
    price: number;
    type: string;
    status: string;
    imageUrl: string | null;
    views: number;
    createdAt: Date;
  };
  categoryName: string | null;
  vendorName: string;
  vendorLogo: string | null;
  vendorSlug: string | null;
  averageRating: number;
  totalReviews: number;
  isFavorited: boolean;
  canPurchase: boolean;
  availabilityBadge: {
    label: string;
    tone?: StockAvailabilityTone;
  } | null;
}

interface CatalogLayoutProps {
  categories: CatalogCategoryRef[];
  vendors: CatalogVendorRef[];
  catalogQuery: CatalogQueryParams;
  rawParams: {
    minPrice?: string;
    maxPrice?: string;
  };
  totalCount: number;
  totalPages: number;
  items: CatalogItemViewData[];
  viewMode: 'grid' | 'list';
}

export default function CatalogLayout({
  categories,
  vendors,
  catalogQuery,
  rawParams,
  totalCount,
  totalPages,
  items,
  viewMode,
}: CatalogLayoutProps) {
  const { userId } = useAuth();
  const productIds = items.map(item => item.product.id);
  const { data: wishlistedIds } = useSWR(
    userId && productIds.length > 0 ? ['wishlist', productIds] : null,
    ([, ids]) => getUserWishlistIdsAction(ids as string[])
  );
  const wishlistSet = new Set(wishlistedIds || []);

  return (
    <div className="space-y-6">
      {/* Top Filter Header Bar */}
      <CatalogFilters
        categories={categories}
        vendors={vendors}
        currentCategory={catalogQuery.categorySlug}
        currentSearch={catalogQuery.search}
        currentType={catalogQuery.type}
        currentSort={catalogQuery.sort}
        currentVendor={catalogQuery.vendorSlug}
        currentMinPrice={rawParams.minPrice || ''}
        currentMaxPrice={rawParams.maxPrice || ''}
        currentStock={catalogQuery.stock}
        totalCount={totalCount}
        viewMode={viewMode}
      />

      {/* Main 2-Column Responsive Layout (Desktop Sidebar + Content Area) */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 items-start">
        {/* Desktop Fixed Left Sidebar */}
        <div className="hidden lg:block">
          <CatalogDesktopSidebar
            categories={categories}
            vendors={vendors}
            currentCategory={catalogQuery.categorySlug}
            currentType={catalogQuery.type}
            currentVendor={catalogQuery.vendorSlug}
            currentMinPrice={rawParams.minPrice || ''}
            currentMaxPrice={rawParams.maxPrice || ''}
            currentStock={catalogQuery.stock}
          />
        </div>

        {/* Results Area */}
        <div className="space-y-8">
          {items.length === 0 ? (
            <div className="max-w-md mx-auto text-center border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-10 rounded-3xl shadow-xs space-y-4 my-8">
              <div className="w-16 h-16 bg-purple-50 dark:bg-purple-950/50 rounded-2xl flex items-center justify-center text-3xl mx-auto border border-purple-100 dark:border-purple-900/60">
                🔎
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 mb-1">
                  No Catalog Items Found
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
                  No products or services matched your active search & filter criteria. Try clearing some filters or searching for standard keywords.
                </p>
              </div>
              <Link
                href="/products"
                className="inline-block px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Reset All Filters
              </Link>
            </div>
          ) : (
            <>
              {/* Product Layout Grid vs List */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {items.map((item, index) => {
                    const { product, categoryName, vendorName, vendorLogo, vendorSlug, averageRating, totalReviews, canPurchase, availabilityBadge } = item;
                    const isFavorited = wishlistSet.has(product.id);
                    const formattedPrice = (product.price / 100).toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    });

                    return (
                      <div
                        key={product.id}
                        className="group flex flex-col justify-between border border-zinc-200/80 dark:border-zinc-850/80 bg-white dark:bg-zinc-950 rounded-2xl overflow-hidden hover:border-purple-500/40 dark:hover:border-purple-500/40 hover:shadow-lg transition-all duration-300"
                      >
                        <Link href={`/products/${product.id}`} className="flex-1 flex flex-col group">
                          {/* Image Thumbnail */}
                          <div className="h-48 bg-zinc-100 dark:bg-zinc-900 relative overflow-hidden border-b border-zinc-100 dark:border-zinc-900">
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
                                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
                                className="p-1.5 h-8 w-8 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border-none hover:bg-white dark:hover:bg-zinc-900 shadow-xs"
                              />
                            </div>

                            {/* Type Badge */}
                            <span
                              className={`absolute top-3 right-3 text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-xs ${
                                product.type === 'service'
                                  ? 'bg-teal-500 text-teal-950'
                                  : 'bg-indigo-500 text-indigo-50'
                              }`}
                            >
                              {product.type}
                            </span>
                          </div>

                          {/* Content Card Body */}
                          <div className="p-4 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between gap-1.5 mb-2">
                                {categoryName ? (
                                  <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest truncate">
                                    {categoryName}
                                  </span>
                                ) : (
                                  <div />
                                )}
                                {totalReviews > 0 && (
                                  <span className="text-[10px] font-bold text-amber-500 flex items-center gap-0.5 shrink-0">
                                    <span>★</span>
                                    <span>{averageRating}</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 leading-snug line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                  {product.name}
                                </h3>
                                {availabilityBadge && (
                                  <StockAvailabilityBadge
                                    label={availabilityBadge.label}
                                    tone={availabilityBadge.tone}
                                  />
                                )}
                              </div>

                              <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed min-h-[2.5rem]">
                                {product.description || 'No description provided.'}
                              </p>
                            </div>
                          </div>
                        </Link>

                        {/* Price and Vendor Row */}
                        <div className="p-4 border-t border-zinc-100 dark:border-zinc-900/60">
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex flex-col">
                              <span className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
                                {formattedPrice}
                              </span>
                              <div className="flex items-center gap-1 text-[9px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">
                                <svg className="w-3 h-3 opacity-60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                              canPurchase={canPurchase}
                              showLabel={false}
                              className="h-9 w-9 text-xs rounded-xl shrink-0"
                            />
                          </div>

                          {/* Vendor Label */}
                          <div className="flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-900/40 pt-3">
                            {vendorLogo ? (
                              <Image
                                src={vendorLogo}
                                alt={vendorName}
                                width={20}
                                height={20}
                                className="rounded-md object-cover border border-zinc-100 dark:border-zinc-800 shrink-0"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-[10px] flex items-center justify-center shrink-0">
                                🏢
                              </div>
                            )}
                            <div className="text-[10px] truncate flex-1 leading-none">
                              <span className="text-zinc-400 block mb-0.5">Sold by</span>
                              {vendorSlug ? (
                                <Link
                                  href={`/vendors/${vendorSlug}`}
                                  className="font-bold text-zinc-700 dark:text-zinc-300 hover:text-purple-500 transition-colors truncate block"
                                >
                                  {vendorName}
                                </Link>
                              ) : (
                                <span className="font-bold text-zinc-600 dark:text-zinc-400 truncate block">
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
              ) : (
                /* List View Layout */
                <div className="space-y-4">
                  {items.map((item) => {
                    const { product, categoryName, vendorName, vendorLogo, vendorSlug, averageRating, totalReviews, canPurchase, availabilityBadge } = item;
                    const isFavorited = wishlistSet.has(product.id);
                    const formattedPrice = (product.price / 100).toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    });

                    return (
                      <div
                        key={product.id}
                        className="group flex flex-col sm:flex-row border border-zinc-200/80 dark:border-zinc-850/80 bg-white dark:bg-zinc-950 rounded-2xl overflow-hidden hover:border-purple-500/40 dark:hover:border-purple-500/40 hover:shadow-md transition-all duration-300"
                      >
                        {/* List Image Container with explicit mobile & tablet heights */}
                        <div className="w-full sm:w-56 h-48 sm:h-auto sm:min-h-[220px] bg-zinc-100 dark:bg-zinc-900 relative shrink-0">
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
                                sizes="(max-width: 640px) 100vw, 224px"
                              />
                            )
                          ) : (
                            <div className="w-full h-full bg-gradient-to-r from-purple-500/5 via-indigo-500/5 to-blue-500/5 flex items-center justify-center text-3xl">
                              📦
                            </div>
                          )}

                          {/* Wishlist Button Overlay */}
                          <div className="absolute top-3 left-3 z-10">
                            <WishlistButton
                              productId={product.id}
                              initialFavorited={isFavorited}
                              isLoggedIn={!!userId}
                              showLabel={false}
                              className="p-1.5 h-8 w-8 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border-none hover:bg-white dark:hover:bg-zinc-900 shadow-xs"
                            />
                          </div>

                          <span
                            className={`absolute top-3 right-3 text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-xs ${
                              product.type === 'service'
                                ? 'bg-teal-500 text-teal-950'
                                : 'bg-indigo-500 text-indigo-50'
                            }`}
                          >
                            {product.type}
                          </span>
                        </div>

                        {/* List Details */}
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              {categoryName && (
                                <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest truncate">
                                  {categoryName}
                                </span>
                              )}
                              {totalReviews > 0 && (
                                <span className="text-xs font-bold text-amber-500 flex items-center gap-0.5 shrink-0">
                                  <span>★</span>
                                  <span>{averageRating} ({totalReviews} reviews)</span>
                                </span>
                              )}
                            </div>

                            <Link href={`/products/${product.id}`}>
                              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 leading-snug group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors mb-1.5">
                                {product.name}
                              </h3>
                            </Link>

                            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-3">
                              {product.description || 'No description provided.'}
                            </p>

                            <div className="flex items-center gap-3 text-[11px] text-zinc-400 dark:text-zinc-500 font-mono flex-wrap">
                              {availabilityBadge && (
                                <StockAvailabilityBadge
                                  label={availabilityBadge.label}
                                  tone={availabilityBadge.tone}
                                />
                              )}
                              <span>• {product.views} views</span>
                            </div>
                          </div>

                          {/* List Bottom Actions */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-zinc-100 dark:border-zinc-900/60 pt-3">
                            <div className="flex items-center gap-2">
                              {vendorLogo ? (
                                <Image
                                  src={vendorLogo}
                                  alt={vendorName}
                                  width={22}
                                  height={22}
                                  className="rounded-md object-cover border border-zinc-100 dark:border-zinc-800 shrink-0"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-[10px] flex items-center justify-center shrink-0">
                                  🏢
                                </div>
                              )}
                              <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                                Sold by{' '}
                                {vendorSlug ? (
                                  <Link
                                    href={`/vendors/${vendorSlug}`}
                                    className="font-bold text-zinc-800 dark:text-zinc-200 hover:text-purple-500"
                                  >
                                    {vendorName}
                                  </Link>
                                ) : (
                                  <span className="font-bold">{vendorName}</span>
                                )}
                              </span>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-4">
                              <span className="text-base font-extrabold text-zinc-900 dark:text-zinc-50">
                                {formattedPrice}
                              </span>
                              <AddToCartButton
                                product={{
                                  id: product.id,
                                  name: product.name,
                                  price: product.price,
                                  imageUrl: product.imageUrl,
                                  vendorName: vendorName,
                                  type: product.type,
                                }}
                                canPurchase={canPurchase}
                                showLabel={true}
                                className="h-9 px-4 text-xs rounded-xl shrink-0"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-3 pt-6 flex-wrap">
                  {catalogQuery.page > 1 && (
                    <Link
                      href={`/products?${buildCatalogSearchParams(catalogQuery, catalogQuery.page - 1).toString()}`}
                      className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs font-mono font-bold transition-colors min-h-[40px] flex items-center justify-center"
                    >
                      &larr; Previous Page
                    </Link>
                  )}
                  <span className="text-xs font-mono text-zinc-400 px-2">
                    Page {catalogQuery.page} of {totalPages}
                  </span>
                  {catalogQuery.page < totalPages && (
                    <Link
                      href={`/products?${buildCatalogSearchParams(catalogQuery, catalogQuery.page + 1).toString()}`}
                      className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs font-mono font-bold transition-colors min-h-[40px] flex items-center justify-center"
                    >
                      Next Page &rarr;
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
