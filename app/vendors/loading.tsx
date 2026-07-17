export default function VendorsLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans antialiased">
      <div className="max-w-6xl mx-auto px-6 py-16 animate-pulse">
        {/* Header Skeleton */}
        <div className="text-center mb-16 space-y-4">
          <div className="h-5 w-28 bg-purple-200/30 dark:bg-purple-900/30 rounded-full mx-auto" />
          <div className="h-9 w-full max-w-xs bg-zinc-200 dark:bg-zinc-800 rounded-xl mx-auto" />
          <div className="h-4 w-full max-w-sm bg-zinc-100 dark:bg-zinc-900 rounded mx-auto" />
        </div>

        {/* Vendor Cards Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 rounded-2xl overflow-hidden"
            >
              {/* Banner */}
              <div className="h-24 bg-zinc-100 dark:bg-zinc-900" />

              {/* Logo + Info */}
              <div className="px-6 pb-4 relative">
                <div className="absolute -top-6 left-6">
                  <div className="w-12 h-12 rounded-lg bg-zinc-200 dark:bg-zinc-800 border border-white dark:border-zinc-950" />
                </div>
                <div className="pt-8 space-y-2.5">
                  <div className="h-5 w-36 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-3 w-20 bg-zinc-100 dark:bg-zinc-900 rounded" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-full bg-zinc-100 dark:bg-zinc-900 rounded" />
                    <div className="h-3.5 w-2/3 bg-zinc-100 dark:bg-zinc-900 rounded" />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 pb-6 pt-4 border-t border-zinc-100 dark:border-zinc-900/60 flex items-center justify-between">
                <div className="h-3 w-20 bg-zinc-100 dark:bg-zinc-900 rounded" />
                <div className="h-8 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
