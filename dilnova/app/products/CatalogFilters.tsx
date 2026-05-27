'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition, useState } from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

interface CatalogFiltersProps {
  categories: Category[];
  currentCategory?: string;
  currentSearch?: string;
  currentType?: string;
}

export default function CatalogFilters({
  categories,
  currentCategory,
  currentSearch = '',
  currentType = 'all',
}: CatalogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchVal, setSearchVal] = useState(currentSearch);
  const [prevSearch, setPrevSearch] = useState(currentSearch);

  if (currentSearch !== prevSearch) {
    setSearchVal(currentSearch);
    setPrevSearch(currentSearch);
  }

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === 'all') {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    // Reset to page 1 on filter updates
    params.delete('page');

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchVal || null });
  };

  const activeCat = categories.find((c) => c.slug === currentCategory);
  const parentCat = activeCat?.parentId
    ? categories.find((c) => c.id === activeCat.parentId)
    : activeCat;

  const mainCategories = categories.filter((c) => !c.parentId);
  const subCategories = parentCat
    ? categories.filter((c) => c.parentId === parentCat.id)
    : [];

  return (
    <div className="space-y-6 bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-900 p-6 rounded-2xl shadow-sm mb-10">
      
      {/* Search Input Row */}
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

      {/* Filter Tabs Section */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 border-t border-zinc-100 dark:border-zinc-900 pt-6">
        
        {/* Category Selection Pills */}
        <div className="flex flex-col gap-4 flex-1">
          {/* Main Categories Row */}
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

          {/* Subcategories Row */}
          {parentCat && subCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pl-4 border-l-2 border-purple-200 dark:border-purple-900/60 animate-fade-in">
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

        {/* Type Filter Selectors (Product vs Service) */}
        <div className="flex items-center gap-2 border border-zinc-200 dark:border-zinc-850 rounded-lg p-1 bg-zinc-50 dark:bg-zinc-900">
          <button
            onClick={() => updateParams({ type: 'all' })}
            className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase transition-all cursor-pointer ${
              currentType === 'all'
                ? 'bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            All Types
          </button>
          <button
            onClick={() => updateParams({ type: 'product' })}
            className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase transition-all cursor-pointer ${
              currentType === 'product'
                ? 'bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Products
          </button>
          <button
            onClick={() => updateParams({ type: 'service' })}
            className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase transition-all cursor-pointer ${
              currentType === 'service'
                ? 'bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Services
          </button>
        </div>

      </div>

    </div>
  );
}
