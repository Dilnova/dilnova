export default function VendorDashboardLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="space-y-3">
            <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-8 w-64 bg-zinc-300 dark:bg-zinc-700 rounded-xl" />
          </div>
          <div className="h-10 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900/50 space-y-4"
            >
              <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="h-8 w-3/4 bg-zinc-300 dark:bg-zinc-700 rounded-xl" />
            </div>
          ))}
        </div>

        {/* Main Content Area Skeleton */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900/50 p-6 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="h-6 w-40 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
            <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
          </div>

          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 border border-zinc-100 dark:border-zinc-800/60 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/30"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-700 rounded" />
                    <div className="h-3 w-20 bg-zinc-100 dark:bg-zinc-800 rounded" />
                  </div>
                </div>
                <div className="h-8 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
