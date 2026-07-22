export default function CartLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24">
      {/* Top Header Bar Skeleton */}
      <div className="max-w-6xl mx-auto px-6 pt-10 flex items-center justify-between flex-wrap gap-4 mb-8 animate-pulse">
        <div className="space-y-3">
          <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-8 w-64 bg-zinc-300 dark:bg-zinc-700 rounded-xl" />
        </div>
        <div className="h-10 w-40 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
      </div>

      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-pulse">
        {/* Cart Items Area Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          <div className="h-10 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded-xl mb-6" />

          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex gap-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900/50"
            >
              <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800 rounded-xl shrink-0" />
              <div className="flex-1 space-y-3 py-2">
                <div className="h-5 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded" />
                <div className="h-4 w-1/2 bg-zinc-100 dark:bg-zinc-800 rounded" />
                <div className="flex justify-between items-end pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-700 rounded-lg" />
                  <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-700 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Checkout Sidebar Skeleton */}
        <div className="lg:col-span-1 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 bg-white dark:bg-zinc-900/50 space-y-6">
          <div className="h-6 w-1/2 bg-zinc-200 dark:bg-zinc-700 rounded" />

          <div className="space-y-4">
            <div className="flex justify-between">
              <div className="h-4 w-16 bg-zinc-100 dark:bg-zinc-800 rounded" />
              <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-700 rounded" />
            </div>
            <div className="flex justify-between">
              <div className="h-4 w-24 bg-zinc-100 dark:bg-zinc-800 rounded" />
              <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
            </div>
          </div>

          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 flex justify-between">
            <div className="h-6 w-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
            <div className="h-6 w-24 bg-zinc-300 dark:bg-zinc-600 rounded" />
          </div>

          <div className="h-12 w-full bg-purple-200 dark:bg-purple-900/40 rounded-xl mt-6" />
        </div>
      </div>
    </div>
  );
}
