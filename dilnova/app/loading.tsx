export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans flex flex-col antialiased">
      {/* Hero 4-Column Split Skeleton */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 min-h-[80vh] w-full border-b border-zinc-200 dark:border-zinc-800 animate-pulse">
        {[
          { bg: 'bg-zinc-900', accent: 'bg-amber-500/10' },
          { bg: 'bg-emerald-950', accent: 'bg-emerald-400/10' },
          { bg: 'bg-indigo-950', accent: 'bg-indigo-500/10' },
          { bg: 'bg-slate-900', accent: 'bg-teal-500/10' },
        ].map((col, i) => (
          <div
            key={i}
            className={`${col.bg} flex flex-col justify-between p-8 sm:p-10 border-r border-zinc-800 last:border-r-0`}
          >
            <div className={`h-5 w-20 ${col.accent} rounded-full`} />
            <div className="space-y-4 my-auto">
              <div className="h-8 w-32 bg-zinc-800 rounded-xl" />
              <div className="h-4 w-full bg-zinc-800/60 rounded" />
              <div className="h-4 w-2/3 bg-zinc-800/40 rounded" />
              <div className="h-10 w-36 bg-zinc-800 rounded-lg mt-4" />
            </div>
            <div className="flex justify-between border-t border-zinc-800/80 pt-4 mt-6">
              <div className="h-3 w-16 bg-zinc-800 rounded" />
              <div className="h-3 w-20 bg-zinc-800 rounded" />
            </div>
          </div>
        ))}
      </section>

      {/* Other Vendors Section Skeleton */}
      <section className="max-w-6xl mx-auto px-6 py-20 w-full animate-pulse">
        <div className="text-center mb-16 space-y-3">
          <div className="h-5 w-32 bg-purple-200/20 dark:bg-purple-950/40 rounded-full mx-auto" />
          <div className="h-8 w-64 bg-zinc-200 dark:bg-zinc-800 rounded-xl mx-auto" />
          <div className="h-4 w-80 bg-zinc-100 dark:bg-zinc-900 rounded mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 rounded-2xl overflow-hidden">
              <div className="h-24 bg-zinc-100 dark:bg-zinc-900" />
              <div className="px-6 pb-6 pt-8 space-y-3">
                <div className="h-5 w-40 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-3 w-20 bg-zinc-100 dark:bg-zinc-900 rounded" />
                <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-900 rounded" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
