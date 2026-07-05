'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  CATALOG_SORT_LABELS,
  CATALOG_SORT_VALUES,
  CATALOG_STOCK_FILTER_VALUES,
  type CatalogSort,
  type CatalogStockFilter,
  type CatalogCategoryRef,
  type CatalogVendorRef,
} from '@/features/catalog/types';
import CatalogCategoryPills from './CatalogCategoryPills';
import ActiveFilterChips from './ActiveFilterChips';

interface CatalogFiltersProps {
  categories: CatalogCategoryRef[];
  vendors: CatalogVendorRef[];
  currentCategory?: string;
  currentSearch?: string;
  currentType?: string;
  currentSort?: CatalogSort;
  currentVendor?: string;
  currentMinPrice?: string;
  currentMaxPrice?: string;
  currentStock?: CatalogStockFilter;
  totalCount?: number;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
}

const PRICE_PRESETS = [
  { label: 'Under $25', min: '', max: '25' },
  { label: '$25 - $50', min: '25', max: '50' },
  { label: '$50 - $100', min: '50', max: '100' },
  { label: '$100+', min: '100', max: '' },
];

interface SharedFilterSectionProps {
  categories: CatalogCategoryRef[];
  vendors: CatalogVendorRef[];
  currentCategory?: string;
  currentType?: string;
  currentVendor?: string;
  currentMinPrice?: string;
  currentMaxPrice?: string;
  currentStock?: CatalogStockFilter;
  isPending: boolean;
  minPriceVal: string;
  maxPriceVal: string;
  setMinPriceVal: (v: string) => void;
  setMaxPriceVal: (v: string) => void;
  updateParams: (updates: Record<string, string | null>) => void;
  handlePriceSubmit: (e: React.FormEvent) => void;
  handleApplyPresetPrice: (min: string, max: string) => void;
}

// Standalone filter section component (prevents input unmounting/focus loss)
function FilterAccordionGroup({
  categories,
  vendors,
  currentCategory,
  currentType,
  currentVendor,
  currentMinPrice,
  currentMaxPrice,
  currentStock,
  isPending,
  minPriceVal,
  maxPriceVal,
  setMinPriceVal,
  setMaxPriceVal,
  updateParams,
  handlePriceSubmit,
  handleApplyPresetPrice,
}: SharedFilterSectionProps) {
  const sortedVendors = [...vendors].sort((a, b) => a.name.localeCompare(b.name));
  const activeCat = categories.find((c) => c.slug === currentCategory);
  const mainCategories = categories.filter((c) => !c.parentId);

  return (
    <div className="space-y-6">
      {/* Category Tree / Filter Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-mono">
            Categories
          </h3>
          {currentCategory && (
            <button
              type="button"
              onClick={() => updateParams({ category: null })}
              className="text-[10px] font-mono text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        <div className="space-y-1 max-h-60 overflow-y-auto pr-1 text-xs">
          <button
            type="button"
            onClick={() => updateParams({ category: null })}
            className={`w-full text-left px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center justify-between ${
              !currentCategory
                ? 'bg-purple-50 text-purple-700 font-bold dark:bg-purple-950/60 dark:text-purple-300'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900'
            }`}
          >
            <span>All Categories</span>
          </button>

          {mainCategories.map((cat) => {
            const isSelected = activeCat?.id === cat.id || activeCat?.parentId === cat.id;
            const subCats = categories.filter((c) => c.parentId === cat.id);

            return (
              <div key={cat.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => updateParams({ category: cat.slug })}
                  className={`w-full text-left px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center justify-between ${
                    currentCategory === cat.slug
                      ? 'bg-purple-50 text-purple-700 font-bold dark:bg-purple-950/60 dark:text-purple-300'
                      : isSelected
                      ? 'font-semibold text-zinc-900 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-900/60'
                      : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900'
                  }`}
                >
                  <span>{cat.name}</span>
                  {subCats.length > 0 && <span className="text-[10px] opacity-60">›</span>}
                </button>

                {/* Subcategories */}
                {isSelected && subCats.length > 0 && (
                  <div className="pl-3.5 space-y-0.5 border-l-2 border-purple-500/40 dark:border-purple-400/40 ml-3 my-1">
                    {subCats.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => updateParams({ category: sub.slug })}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer ${
                          currentCategory === sub.slug
                            ? 'bg-purple-100 text-purple-800 font-bold dark:bg-purple-900/40 dark:text-purple-300'
                            : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-900'
                        }`}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <hr className="border-zinc-100 dark:border-zinc-900" />

      {/* Item Type Toggle */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-mono">
          Listing Type
        </label>
        <div className="grid grid-cols-3 gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
          {(['all', 'product', 'service'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => updateParams({ type: type === 'all' ? null : type })}
              className={`py-2 text-[11px] font-semibold rounded-lg transition-all cursor-pointer capitalize ${
                currentType === type
                  ? 'bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {type === 'all' ? 'All' : type === 'product' ? 'Products' : 'Services'}
            </button>
          ))}
        </div>
      </div>

      <hr className="border-zinc-100 dark:border-zinc-900" />

      {/* Price Range Filter */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-mono">
            Price Range ($)
          </label>
          {(currentMinPrice || currentMaxPrice) && (
            <button
              type="button"
              onClick={() => {
                setMinPriceVal('');
                setMaxPriceVal('');
                updateParams({ minPrice: null, maxPrice: null });
              }}
              className="text-[10px] font-mono text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap gap-1.5">
          {PRICE_PRESETS.map((preset) => {
            const isPresetActive =
              currentMinPrice === preset.min && currentMaxPrice === preset.max;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleApplyPresetPrice(preset.min, preset.max)}
                className={`text-[11px] font-mono px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  isPresetActive
                    ? 'bg-purple-600 text-white border-purple-600 dark:bg-purple-500 dark:border-purple-500 font-semibold'
                    : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Custom Min/Max Input */}
        <form onSubmit={handlePriceSubmit} className="space-y-2 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Min ($)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={minPriceVal}
                onChange={(e) => setMinPriceVal(e.target.value)}
                placeholder="0"
                className="w-full text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
            <div>
              <span className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Max ($)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={maxPriceVal}
                onChange={(e) => setMaxPriceVal(e.target.value)}
                placeholder="Any"
                className="w-full text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2 text-xs font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            Apply Price Filter
          </button>
        </form>
      </div>

      <hr className="border-zinc-100 dark:border-zinc-900" />

      {/* Availability Filter */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-mono">
          Availability
        </label>
        <select
          value={currentStock}
          onChange={(e) => updateParams({ stock: e.target.value === 'all' ? null : e.target.value })}
          className="w-full text-xs px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer font-medium"
        >
          {CATALOG_STOCK_FILTER_VALUES.map((stock) => (
            <option key={stock} value={stock}>
              {stock === 'all' ? 'All Items (In & Out of Stock)' : 'In Stock Only'}
            </option>
          ))}
        </select>
      </div>

      <hr className="border-zinc-100 dark:border-zinc-900" />

      {/* Vendor Filter */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-mono">
          Vendor / Seller
        </label>
        <select
          value={currentVendor}
          onChange={(e) => updateParams({ vendor: e.target.value || null })}
          className="w-full text-xs px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer font-medium"
        >
          <option value="">All Vendors</option>
          {sortedVendors
            .filter((vendor) => vendor.slug)
            .map((vendor) => (
              <option key={vendor.id} value={vendor.slug!}>
                {vendor.name}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
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
  viewMode = 'grid',
  onViewModeChange,
}: CatalogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [searchVal, setSearchVal] = useState(currentSearch);
  const [prevSearch, setPrevSearch] = useState(currentSearch);
  const [minPriceVal, setMinPriceVal] = useState(currentMinPrice);
  const [maxPriceVal, setMaxPriceVal] = useState(currentMaxPrice);

  if (currentSearch !== prevSearch) {
    setSearchVal(currentSearch);
    setPrevSearch(currentSearch);
  }

  // Lock background scroll when mobile drawer is open & bind Escape key
  useEffect(() => {
    if (isMobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsMobileDrawerOpen(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isMobileDrawerOpen]);

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

  const handleClearSearch = () => {
    setSearchVal('');
    updateParams({ search: null });
  };

  const handlePriceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({
      minPrice: minPriceVal || null,
      maxPrice: maxPriceVal || null,
    });
  };

  const handleApplyPresetPrice = (min: string, max: string) => {
    setMinPriceVal(min);
    setMaxPriceVal(max);
    updateParams({
      minPrice: min || null,
      maxPrice: max || null,
    });
  };

  const handleRemoveSingleFilter = (key: string) => {
    if (key === 'search') {
      setSearchVal('');
      updateParams({ search: null });
    } else if (key === 'category') {
      updateParams({ category: null });
    } else if (key === 'type') {
      updateParams({ type: null });
    } else if (key === 'vendor') {
      updateParams({ vendor: null });
    } else if (key === 'price') {
      setMinPriceVal('');
      setMaxPriceVal('');
      updateParams({ minPrice: null, maxPrice: null });
    } else if (key === 'stock') {
      updateParams({ stock: null });
    }
  };

  const clearAllFilters = () => {
    setSearchVal('');
    setMinPriceVal('');
    setMaxPriceVal('');
    startTransition(() => {
      router.push(pathname);
    });
    setIsMobileDrawerOpen(false);
  };

  // Active filter count logic
  const activeFilterCount = [
    Boolean(currentCategory),
    Boolean(currentSearch),
    currentType !== 'all',
    Boolean(currentVendor),
    Boolean(currentMinPrice),
    Boolean(currentMaxPrice),
    currentStock !== 'all',
  ].filter(Boolean).length;

  return (
    <div className="space-y-4 mb-6">
      {/* Top Search & Category Nav Header Bar */}
      <div className="space-y-3">
        {/* Search Bar Row */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search products, services, suppliers..."
              className="w-full bg-white dark:bg-zinc-900 text-sm border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 pl-10 pr-9 focus:outline-none focus:ring-2 focus:ring-purple-500/50 shadow-xs text-zinc-900 dark:text-zinc-50"
            />
            <span className="absolute left-3.5 top-3.5 text-zinc-400 text-sm">🔍</span>

            {searchVal && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-xs p-1 cursor-pointer"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white font-bold text-xs px-4 sm:px-6 py-3 rounded-xl transition-colors cursor-pointer shadow-xs flex items-center justify-center shrink-0 disabled:opacity-50"
          >
            {isPending ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Category Pills Bar */}
        <CatalogCategoryPills
          categories={categories}
          currentCategory={currentCategory}
          onSelectCategory={(slug) => updateParams({ category: slug })}
        />
      </div>

      {/* Controls & Active Filters Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-y border-zinc-200/80 dark:border-zinc-850 py-3">
        <div className="flex items-center gap-3 justify-between sm:justify-start">
          {/* Mobile Filter Trigger Button */}
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2 text-xs font-bold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl shadow-xs hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer min-h-[40px]"
          >
            <span>🎛️ Filter & Refine</span>
            {activeFilterCount > 0 && (
              <span className="bg-purple-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Results Count & Pending Indicator */}
          <div className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
            <span className="font-bold text-zinc-900 dark:text-zinc-100">{totalCount}</span>{' '}
            {totalCount === 1 ? 'item found' : 'items found'}
            {isPending && <span className="ml-2 text-purple-600 dark:text-purple-400 animate-pulse">updating...</span>}
          </div>
        </div>

        {/* Right Controls: Sort Dropdown & View Mode Switcher */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* View Mode Switcher */}
          {onViewModeChange && (
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => onViewModeChange('grid')}
                className={`p-1.5 px-2.5 rounded-lg transition-colors cursor-pointer text-xs font-medium ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
                title="Grid View"
              >
                ⊞ Grid
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('list')}
                className={`p-1.5 px-2.5 rounded-lg transition-colors cursor-pointer text-xs font-medium ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
                title="List View"
              >
                ≡ List
              </button>
            </div>
          )}

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-zinc-400 uppercase hidden sm:inline">Sort:</span>
            <select
              value={currentSort}
              onChange={(e) => updateParams({ sort: e.target.value === 'newest' ? null : e.target.value })}
              className="text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer shadow-xs font-medium min-h-[38px]"
            >
              {CATALOG_SORT_VALUES.map((sort) => (
                <option key={sort} value={sort}>
                  {CATALOG_SORT_LABELS[sort]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Active Filter Chips */}
      <ActiveFilterChips
        categories={categories}
        vendors={vendors}
        currentCategory={currentCategory}
        currentSearch={currentSearch}
        currentType={currentType}
        currentVendor={currentVendor}
        currentMinPrice={currentMinPrice}
        currentMaxPrice={currentMaxPrice}
        currentStock={currentStock}
        currentSort={currentSort}
        onRemoveFilter={handleRemoveSingleFilter}
        onClearAll={clearAllFilters}
      />

      {/* Mobile Slide-Over Drawer Modal */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Slide-in Drawer Container */}
          <div className="relative ml-auto w-full max-w-xs sm:max-w-sm bg-white dark:bg-zinc-950 h-full flex flex-col shadow-2xl z-10 border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Filter Catalog</h2>
                {activeFilterCount > 0 && (
                  <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-lg font-bold cursor-pointer"
                aria-label="Close filters"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Filter Body */}
            <div className="p-4 overflow-y-auto flex-1">
              <FilterAccordionGroup
                categories={categories}
                vendors={vendors}
                currentCategory={currentCategory}
                currentType={currentType}
                currentVendor={currentVendor}
                currentMinPrice={currentMinPrice}
                currentMaxPrice={currentMaxPrice}
                currentStock={currentStock}
                isPending={isPending}
                minPriceVal={minPriceVal}
                maxPriceVal={maxPriceVal}
                setMinPriceVal={setMinPriceVal}
                setMaxPriceVal={setMaxPriceVal}
                updateParams={updateParams}
                handlePriceSubmit={handlePriceSubmit}
                handleApplyPresetPrice={handleApplyPresetPrice}
              />
            </div>

            {/* Sticky Drawer Footer */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex items-center gap-2">
              <button
                type="button"
                onClick={clearAllFilters}
                className="flex-1 py-3 text-xs font-mono uppercase font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 transition-colors cursor-pointer text-center"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="flex-1 py-3 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 rounded-xl transition-colors cursor-pointer text-center shadow-xs"
              >
                Show Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Named export for standalone Desktop Sidebar component
export function CatalogDesktopSidebar({
  categories,
  vendors,
  currentCategory,
  currentType,
  currentVendor,
  currentMinPrice,
  currentMaxPrice,
  currentStock,
}: Omit<CatalogFiltersProps, 'totalCount' | 'currentSearch' | 'currentSort'>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [minPriceVal, setMinPriceVal] = useState(currentMinPrice || '');
  const [maxPriceVal, setMaxPriceVal] = useState(currentMaxPrice || '');

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

  const handlePriceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({
      minPrice: minPriceVal || null,
      maxPrice: maxPriceVal || null,
    });
  };

  const handleApplyPresetPrice = (min: string, max: string) => {
    setMinPriceVal(min);
    setMaxPriceVal(max);
    updateParams({
      minPrice: min || null,
      maxPrice: max || null,
    });
  };

  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-900 rounded-2xl p-5 shadow-xs space-y-6 sticky top-24">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-3">
        <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider font-mono">
          Filter Options
        </h2>
      </div>

      <FilterAccordionGroup
        categories={categories}
        vendors={vendors}
        currentCategory={currentCategory}
        currentType={currentType}
        currentVendor={currentVendor}
        currentMinPrice={currentMinPrice}
        currentMaxPrice={currentMaxPrice}
        currentStock={currentStock}
        isPending={isPending}
        minPriceVal={minPriceVal}
        maxPriceVal={maxPriceVal}
        setMinPriceVal={setMinPriceVal}
        setMaxPriceVal={setMaxPriceVal}
        updateParams={updateParams}
        handlePriceSubmit={handlePriceSubmit}
        handleApplyPresetPrice={handleApplyPresetPrice}
      />
    </div>
  );
}
