export default function VendorBillingLoading() {
  return (
    <main className="px-3 py-4 sm:px-6 md:px-10 lg:px-12 sm:py-8 max-w-[1400px] mx-auto font-sans w-full animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="min-w-0 space-y-2.5 flex-1">
          <div className="h-5 w-24 bg-purple-100 dark:bg-purple-900/30 rounded-full" />
          <div className="h-8 sm:h-9 w-64 sm:w-80 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          <div className="h-3.5 w-full max-w-sm bg-zinc-100 dark:bg-zinc-900 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 bg-zinc-100 dark:bg-zinc-900 rounded-lg" />
          <div className="h-8 w-20 bg-zinc-100 dark:bg-zinc-900 rounded-lg" />
        </div>
      </div>

      {/* Branch selector */}
      <div className="h-10 w-full max-w-xs bg-zinc-100 dark:bg-zinc-900 rounded-xl mb-6" />

      {/* POS layout: product grid + cart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-10 bg-zinc-100 dark:bg-zinc-900 rounded-xl" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-xl p-3 space-y-2"
              >
                <div className="h-20 bg-zinc-100 dark:bg-zinc-900 rounded-lg" />
                <div className="h-3.5 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-3 w-1/2 bg-zinc-100 dark:bg-zinc-900 rounded" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-2xl p-4 space-y-4">
          <div className="h-5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between gap-2">
                <div className="h-4 flex-1 bg-zinc-100 dark:bg-zinc-900 rounded" />
                <div className="h-4 w-12 bg-zinc-100 dark:bg-zinc-900 rounded" />
              </div>
            ))}
          </div>
          <div className="h-px bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-800 rounded ml-auto" />
          <div className="h-10 w-full bg-indigo-200/60 dark:bg-indigo-900/40 rounded-xl" />
        </div>
      </div>
    </main>
  );
}
