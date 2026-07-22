export default function StorefrontLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col antialiased">
      {/* Top Accent Bar */}
      <div className="h-1 bg-zinc-800" />

      {/* Hero Skeleton */}
      <section className="bg-zinc-900/30 border-b border-zinc-905 py-20">
        <div className="max-w-6xl mx-auto px-6 w-full animate-pulse">
          <div className="h-4 w-32 bg-zinc-800 rounded-lg mb-8" />

          <div className="flex flex-col md:flex-row md:items-end gap-8">
            {/* Logo placeholder */}
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-zinc-800 flex-shrink-0" />

            {/* Title / Meta placeholder */}
            <div className="flex-1 space-y-4">
              <div className="flex gap-3">
                <div className="h-5 w-24 bg-zinc-800 rounded-full" />
                <div className="h-5 w-28 bg-zinc-800 rounded-full" />
              </div>
              <div className="h-10 w-2/3 max-w-md bg-zinc-800 rounded-xl" />
              <div className="h-4 w-full max-w-xl bg-zinc-850 rounded-lg" />
            </div>
          </div>

          {/* Stats placeholders */}
          <div className="mt-10 flex flex-wrap gap-8 border-t border-zinc-900 pt-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-2 items-center">
                <div className="h-8 w-12 bg-zinc-800 rounded-lg" />
                <div className="h-4 w-16 bg-zinc-850 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products Grid Skeleton */}
      <section className="bg-zinc-950/80 py-16 flex-1">
        <div className="max-w-6xl mx-auto px-6 w-full animate-pulse">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-1.5 h-6 bg-zinc-800 rounded-full" />
            <div className="h-6 w-36 bg-zinc-850 rounded-lg" />
            <div className="h-4 w-24 bg-zinc-900 rounded-lg ml-2" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-5 space-y-5"
              >
                {/* Product Image placeholder */}
                <div className="h-48 bg-zinc-800 rounded-xl w-full" />

                {/* Content placeholders */}
                <div className="space-y-3">
                  <div className="h-3.5 w-16 bg-zinc-800 rounded" />
                  <div className="h-5 w-5/6 bg-zinc-800 rounded-lg" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-full bg-zinc-850 rounded" />
                    <div className="h-3 w-2/3 bg-zinc-850 rounded" />
                  </div>
                </div>

                {/* Price & Button placeholders */}
                <div className="flex items-center justify-between border-t border-zinc-900/50 pt-4">
                  <div className="h-6 w-16 bg-zinc-800 rounded-lg" />
                  <div className="h-9 w-24 bg-zinc-800 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
