export default function ProductsLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans antialiased">
      <div className="max-w-6xl mx-auto px-6 py-16 animate-pulse">
        {/* Header Skeleton */}
        <div className="text-center mb-16 space-y-4">
          <div className="h-5 w-28 bg-indigo-200/30 dark:bg-indigo-900/30 rounded-full mx-auto" />
          <div className="h-9 w-64 bg-zinc-200 dark:bg-zinc-800 rounded-xl mx-auto" />
          <div className="h-4 w-80 max-w-full bg-zinc-100 dark:bg-zinc-900 rounded mx-auto" />
        </div>

        {/* Product Cards Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 rounded-2xl overflow-hidden"
            >
              {/* Product Image */}
              <div className="h-44 bg-zinc-100 dark:bg-zinc-900" />

              {/* Content */}
              <div className="p-4 space-y-2.5">
                <div className="h-3 w-16 bg-zinc-100 dark:bg-zinc-900 rounded" />
                <div className="h-4 w-4/5 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="space-y-1">
                  <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-900 rounded" />
                  <div className="h-3 w-1/2 bg-zinc-100 dark:bg-zinc-900 rounded" />
                </div>
              </div>

              {/* Price */}
              <div className="p-4 border-t border-zinc-100 dark:border-zinc-900/60">
                <div className="h-5 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
