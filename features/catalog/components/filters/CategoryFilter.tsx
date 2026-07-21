import React from 'react';
import type { CatalogCategoryRef } from '@/features/catalog/types';

interface CategoryFilterProps {
  categories: CatalogCategoryRef[];
  currentCategory?: string;
  updateParams: (updates: Record<string, string | null>) => void;
}

export default function CategoryFilter({ categories, currentCategory, updateParams }: CategoryFilterProps) {
  const activeCat = categories.find((c) => c.slug === currentCategory);
  const mainCategories = categories.filter((c) => !c.parentId);

  return (
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
  );
}
