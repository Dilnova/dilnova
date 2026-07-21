import React from 'react';

interface ListingTypeFilterProps {
  currentType?: string;
  updateParams: (updates: Record<string, string | null>) => void;
}

export default function ListingTypeFilter({ currentType, updateParams }: ListingTypeFilterProps) {
  return (
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
  );
}
