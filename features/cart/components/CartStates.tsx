import Link from 'next/link';

export function CartLoadingState() {
  return (
    <div className="text-center py-20 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900/10 shadow-sm max-w-xl mx-auto space-y-4">
      <span className="text-4xl animate-pulse">🛒</span>
      <p className="text-xs font-mono uppercase tracking-wider text-zinc-500">Loading your cart...</p>
    </div>
  );
}

export function CartEmptyState() {
  return (
    <div className="text-center py-20 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900/10 shadow-sm max-w-xl mx-auto space-y-4">
      <span className="text-4xl">🛍️</span>
      <div className="space-y-1">
        <h2 className="text-sm font-bold font-mono uppercase tracking-wide text-zinc-400">Your cart is empty</h2>
        <p className="text-xs text-zinc-500 max-w-[280px] mx-auto leading-relaxed">
          Add products or services from our multi-vendor catalog to get started.
        </p>
      </div>
      <Link
        href="/products"
        className="inline-block text-[10px] bg-purple-700 hover:bg-purple-800 text-white font-bold font-mono uppercase tracking-wider px-5 py-3 rounded-xl transition-all shadow-md shadow-purple-900/10 cursor-pointer"
      >
        Browse Catalog
      </Link>
    </div>
  );
}
