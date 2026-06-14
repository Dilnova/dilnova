'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition, useState } from 'react';
import {
  CATALOG_SORT_LABELS,
  CATALOG_SORT_VALUES,
  CATALOG_STOCK_FILTER_VALUES,
  type CatalogSort,
  type CatalogStockFilter,
} from '@/utils/catalogQuery';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

interface VendorOption {
  id: string;
  slug: string | null;
  name: string;
}

interface CatalogFiltersProps {
  categories: Category[];
  vendors: VendorOption[];
  currentCategory?: string;
  currentSearch?: string;
  currentType?: string;
  currentSort?: CatalogSort;
  currentVendor?: string;
  currentMinPrice?: string;
  currentMaxPrice?: string;
  currentStock?: CatalogStockFilter;
  totalCount?: number;
}

export default function CatalogFilters({
  categories,
  vendors,
  currentCategory,
  currentSearch = '',
  currentType = 'all',
  currentSort = 'newest',
  currentVendor = '',
  currentMinPrice = '',
  currentMaxPrice = '',
  currentStock = 'all',
  totalCount = 0,
}: CatalogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchVal, setSearchVal] = useState(currentSearch);
  const [prevSearch, setPrevSearch] = useState(currentSearch);
  const [minPriceVal, setMinPriceVal] = useState(currentMinPrice);
  const [maxPriceVal, setMaxPriceVal] = useState(currentMaxPrice);

  if (currentSearch !== prevSearch) {
    setSearchVal(currentSearch);
    setPrevSearch(currentSearch);
  }

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === '' || val === 'all') {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    params.delete('page');

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchVal || null });
  };

  const handlePriceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({
      minPrice: minPriceVal || null,
      maxPrice: maxPriceVal || null,
    });
  };

  const clearAllFilters = () => {
    setSearchVal('');
    setMinPriceVal('');
    setMaxPriceVal('');
    startTransition(() => {
      router.push(pathname);
    });
  };

  const activeCat = categories.find((c) => c.slug === currentCategory);
  const parentCat = activeCat?.parentId
    ? categories.find((c) => c.id === activeCat.parentId)
    : activeCat;

  const mainCategories = categories.filter((c) => !c.parentId);
  const subCategories = parentCat
    ? categories.filter((c) => c.parentId === parentCat.id)
    : [];

  const hasActiveFilters =
    Boolean(currentSearch) ||
    Boolean(currentCategory) ||
    currentType !== 'all' ||
    currentSort !== 'newest' ||
    Boolean(currentVendor) ||
    Boolean(currentMinPrice) ||
    Boolean(currentMaxPrice) ||
    currentStock !== 'all';

  const sortedVendors = [...vendors].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6 bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-900 p-6 rounded-2xl shadow-sm mb-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Browse Catalog</h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            {totalCount} {totalCount === 1 ? 'result' : 'results'}
            {isPending ? ' · updating...' : ''}
          </p>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="self-start text-[11px] font-mono uppercase tracking-wider text-purple-700 dark:text-purple-300 hover:underline cursor-pointer"
          >
            Clear all filters
          </button>
        )}
      </div>

      <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Search items, tools, plants, expert consults..."
            className="w-full bg-zinc-50 dark:bg-zinc-900 text-sm border border-zinc-200 dark:border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-purple-500 font-sans"
          />
          <span className="absolute left-3.5 top-3 text-zinc-400 text-sm">🔍</span>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-bold px-6 py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
        >
          {isPending ? 'Searching...' : 'Search'}
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 border-t border-zinc-100 dark:border-zinc-900 pt-6">
        <label className="space-y-1.5">
          <span className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            Sort by
          </span>
          <select
            value={currentSort}
            onChange={(e) => updateParams({ sort: e.target.value === 'newest' ? null : e.target.value })}
            className="w-full h-10 px-3 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            {CATALOG_SORT_VALUES.map((sort) => (
              <option key={sort} value={sort}>
                {CATALOG_SORT_LABELS[sort]}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            Vendor
          </span>
          <select
            value={currentVendor}
            onChange={(e) => updateParams({ vendor: e.target.value || null })}
            className="w-full h-10 px-3 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="">All vendors</option>
            {sortedVendors
              .filter((vendor) => vendor.slug)
              .map((vendor) => (
                <option key={vendor.id} value={vendor.slug!}>
                  {vendor.name}
                </option>
              ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            Availability
          </span>
          <select
            value={currentStock}
            onChange={(e) => updateParams({ stock: e.target.value === 'all' ? null : e.target.value })}
            className="w-full h-10 px-3 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            {CATALOG_STOCK_FILTER_VALUES.map((stock) => (
              <option key={stock} value={stock}>
                {stock === 'all' ? 'All items' : 'In stock only'}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-1.5">
          <span className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            Item type
          </span>
          <div className="flex items-center gap-1 border border-zinc-200 dark:border-zinc-850 rounded-lg p-1 bg-zinc-50 dark:bg-zinc-900 h-10">
            {(['all', 'product', 'service'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => updateParams({ type: type === 'all' ? null : type })}
                className={`flex-1 h-full rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                  currentType === type
                    ? 'bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                {type === 'all' ? 'All' : type === 'product' ? 'Products' : 'Services'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <form
        onSubmit={handlePriceSubmit}
        className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 border-t border-zinc-100 dark:border-zinc-900 pt-6"
      >
        <label className="space-y-1.5">
          <span className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            Min price (USD)
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={minPriceVal}
            onChange={(e) => setMinPriceVal(e.target.value)}
            placeholder="0.00"
            className="w-full h-10 px-3 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </label>
        <label className="space-y-1.5">
          <span className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            Max price (USD)
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={maxPriceVal}
            onChange={(e) => setMaxPriceVal(e.target.value)}
            placeholder="999.00"
            className="w-full h-10 px-3 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-bold px-5 py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Apply price
          </button>
        </div>
      </form>

      <div className="flex flex-col gap-4 border-t border-zinc-100 dark:border-zinc-900 pt-6">
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
          Categories
        </span>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => updateParams({ category: null })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono uppercase tracking-wider transition-colors cursor-pointer border ${
              !currentCategory
                ? 'bg-purple-650 text-white border-purple-650 dark:bg-purple-500 dark:border-purple-500'
                : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-450 dark:border-zinc-850 dark:hover:bg-zinc-800'
            }`}
          >
            All Categories
          </button>
          {mainCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => updateParams({ category: cat.slug })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono uppercase tracking-wider transition-colors cursor-pointer border ${
                parentCat?.id === cat.id
                  ? 'bg-purple-650 text-white border-purple-650 dark:bg-purple-500 dark:border-purple-500'
                  : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-450 dark:border-zinc-850 dark:hover:bg-zinc-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {parentCat && subCategories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-4 border-l-2 border-purple-200 dark:border-purple-900/60">
            <button
              onClick={() => updateParams({ category: parentCat.slug })}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider transition-colors cursor-pointer border ${
                currentCategory === parentCat.slug
                  ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/60'
                  : 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-450 dark:border-zinc-850 dark:hover:bg-zinc-800'
              }`}
            >
              All {parentCat.name}
            </button>
            {subCategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() => updateParams({ category: sub.slug })}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider transition-colors cursor-pointer border ${
                  currentCategory === sub.slug
                    ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/60'
                    : 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-450 dark:border-zinc-850 dark:hover:bg-zinc-800'
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
