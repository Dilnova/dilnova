export default function AddProductLoading() {
  return (
    <main className="px-3 py-4 sm:px-6 md:px-10 lg:px-12 sm:py-8 max-w-[1400px] mx-auto font-sans w-full animate-pulse">
      {/* Header */}
      <div className="mb-6 space-y-2.5">
        <div className="h-5 w-24 bg-purple-100 dark:bg-purple-900/30 rounded-full" />
        <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        <div className="h-3.5 w-full max-w-md bg-zinc-100 dark:bg-zinc-900 rounded" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-8">
        {/* Form */}
        <div className="lg:col-span-3 space-y-5">
          {[1, 2, 3].map((section) => (
            <div
              key={section}
              className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-6 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-4"
            >
              <div className="h-5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="grid grid-cols-2 gap-2.5">
                <div className="h-12 bg-zinc-100 dark:bg-zinc-900 rounded-xl" />
                <div className="h-12 bg-zinc-100 dark:bg-zinc-900 rounded-xl" />
              </div>
              <div className="h-11 bg-zinc-100 dark:bg-zinc-900 rounded-xl" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="h-11 bg-zinc-100 dark:bg-zinc-900 rounded-xl" />
                <div className="h-11 bg-zinc-100 dark:bg-zinc-900 rounded-xl" />
                <div className="h-11 bg-zinc-100 dark:bg-zinc-900 rounded-xl" />
              </div>
            </div>
          ))}
          <div className="hidden sm:block h-12 w-full bg-purple-200/60 dark:bg-purple-900/40 rounded-xl" />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-5 dark:bg-zinc-950 dark:border-zinc-800 space-y-3">
            <div className="h-4 w-40 bg-zinc-200 dark:bg-zinc-800 rounded" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-3 w-full bg-zinc-100 dark:bg-zinc-900 rounded" />
            ))}
          </div>
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 sm:p-5 dark:bg-zinc-900/40 dark:border-zinc-800 space-y-3">
            <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between">
                <div className="h-3 w-24 bg-zinc-100 dark:bg-zinc-900 rounded" />
                <div className="h-3 w-12 bg-zinc-100 dark:bg-zinc-900 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
