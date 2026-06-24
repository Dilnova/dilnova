export default function VendorLoading() {
  return (
    <main className="px-3 py-4 sm:px-6 md:px-10 lg:px-12 sm:py-8 max-w-[1400px] mx-auto font-sans w-full flex-1 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="min-w-0 space-y-2.5 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="h-5 w-24 bg-purple-100 dark:bg-purple-900/30 rounded-full" />
            <div className="h-5 w-36 bg-amber-100 dark:bg-amber-900/30 rounded-full" />
          </div>
          <div className="h-8 sm:h-9 w-56 sm:w-72 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          <div className="h-3.5 w-full max-w-md bg-zinc-100 dark:bg-zinc-900 rounded" />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="h-8 w-28 bg-zinc-100 dark:bg-zinc-900 rounded-lg" />
          <div className="h-8 w-24 bg-zinc-100 dark:bg-zinc-900 rounded-lg" />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-900 rounded-2xl p-5 shadow-sm space-y-3"
          >
            <div className="h-2.5 w-20 bg-zinc-100 dark:bg-zinc-900 rounded" />
            <div className="h-8 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
            <div className="h-2.5 w-28 bg-zinc-100 dark:bg-zinc-900 rounded" />
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex bg-zinc-100/80 dark:bg-zinc-900/60 p-1 rounded-2xl mb-6 border border-zinc-200/50 dark:border-zinc-800/30 max-w-sm">
        <div className="flex-1 h-9 bg-white dark:bg-zinc-800 rounded-xl" />
        <div className="flex-1 h-9 rounded-xl" />
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-xl p-3 sm:p-4 text-center space-y-2"
          >
            <div className="h-7 sm:h-8 w-10 bg-zinc-200 dark:bg-zinc-800 rounded mx-auto" />
            <div className="h-2.5 w-16 bg-zinc-100 dark:bg-zinc-900 rounded mx-auto" />
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-xl p-3 sm:p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 h-10 bg-zinc-100 dark:bg-zinc-900 rounded-xl" />
        <div className="flex gap-2">
          <div className="h-10 w-40 bg-zinc-100 dark:bg-zinc-900 rounded-xl" />
          <div className="h-10 w-24 bg-purple-200/60 dark:bg-purple-900/40 rounded-xl" />
        </div>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="flex flex-row sm:flex-col bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-xl sm:rounded-2xl overflow-hidden"
          >
            <div className="w-28 h-28 sm:w-full sm:h-40 flex-shrink-0 bg-zinc-100 dark:bg-zinc-900" />
            <div className="flex-1 p-3 sm:p-4 space-y-2">
              <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-900 rounded" />
              <div className="h-3 w-2/3 bg-zinc-100 dark:bg-zinc-900 rounded" />
              <div className="flex justify-between items-center pt-2.5 mt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                <div className="h-5 w-14 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-7 w-16 bg-rose-100 dark:bg-rose-950/30 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
