'use client';

import React from 'react';
import type { CatalogCategoryRef } from '../types';

interface CatalogCategoryPillsProps {
  categories: CatalogCategoryRef[];
  currentCategory?: string;
  onSelectCategory: (slug: string | null) => void;
  className?: string;
}

export default function CatalogCategoryPills({
  categories,
  currentCategory,
  onSelectCategory,
  className = '',
}: CatalogCategoryPillsProps) {
  const activeCat = categories.find((c) => c.slug === currentCategory);
  const parentCat = activeCat?.parentId
    ? categories.find((c) => c.id === activeCat.parentId)
    : activeCat;

  const mainCategories = categories.filter((c) => !c.parentId);
  const subCategories = parentCat
    ? categories.filter((c) => c.parentId === parentCat.id)
    : [];

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Root Category Horizontal Scroll with smooth touch scroll */}
      <div className="relative group">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1.5 px-0.5 scroll-smooth touch-pan-x [webkit-overflow-scrolling:touch]">
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer border select-none ${
              !currentCategory
                ? 'bg-purple-600 text-white border-purple-600 shadow-xs dark:bg-purple-500 dark:border-purple-500 font-semibold scale-[1.02]'
                : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800'
            }`}
          >
            All Categories
          </button>

          {mainCategories.map((cat) => {
            const isSelected = parentCat?.id === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.slug)}
                className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer border select-none ${
                  isSelected
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs dark:bg-purple-500 dark:border-purple-500 font-semibold scale-[1.02]'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subcategory Pills Row */}
      {parentCat && subCategories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 pl-2.5 border-l-2 border-purple-500/60 dark:border-purple-400/60 touch-pan-x [webkit-overflow-scrolling:touch]">
          <button
            type="button"
            onClick={() => onSelectCategory(parentCat.slug)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer border select-none ${
              currentCategory === parentCat.slug
                ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800 font-semibold'
                : 'bg-zinc-100/90 text-zinc-600 border-zinc-200 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-850'
            }`}
          >
            All {parentCat.name}
          </button>

          {subCategories.map((sub) => {
            const isSubSelected = currentCategory === sub.slug;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => onSelectCategory(sub.slug)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer border select-none ${
                  isSubSelected
                    ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800 font-semibold'
                    : 'bg-zinc-100/90 text-zinc-600 border-zinc-200 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-850'
                }`}
              >
                {sub.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
