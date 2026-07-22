export interface Product {
  id: string;
  name: string;
  type: string;
  price: number;
  description: string | null;
  imageUrl: string | null;
  orgId: string;
  categoryId: string | null;
  views: number;
  categoryName: string | null;
  createdAt: Date;
  media?: { url: string; type: "image" | "video" }[] | null;
}

interface OverviewTabProps {
  stats: {
    totalProducts: number;
    totalServices: number;
    totalCategories: number;
    totalViews: number;
  };
  products: Product[];
}

export default function OverviewTab({ stats, products }: OverviewTabProps) {
  // Top 5 viewed products
  const topViewedProducts = [...products].sort((a, b) => b.views - a.views).slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: "Products",
            val: stats.totalProducts,
            icon: "📦",
            accent: "text-blue-600 dark:text-blue-400",
            bg: "bg-blue-50 dark:bg-blue-950/30",
          },
          {
            label: "Services",
            val: stats.totalServices,
            icon: "🛠️",
            accent: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-950/30",
          },
          {
            label: "Categories",
            val: stats.totalCategories,
            icon: "🏷️",
            accent: "text-purple-600 dark:text-purple-400",
            bg: "bg-purple-50 dark:bg-purple-950/30",
          },
          {
            label: "Page Views",
            val: stats.totalViews,
            icon: "👁️",
            accent: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-950/30",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white border border-zinc-200/80 rounded-xl sm:rounded-2xl p-4 sm:p-5 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs text-zinc-400 font-medium">{card.label}</span>
              <span
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${card.bg} flex items-center justify-center text-base sm:text-lg`}
              >
                {card.icon}
              </span>
            </div>
            <span className={`text-2xl sm:text-3xl font-black block ${card.accent}`}>
              {card.val.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {/* Top viewed items */}
      <div className="bg-white border border-zinc-200 rounded-xl sm:rounded-2xl dark:bg-zinc-950 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800/80">
          <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <span>🔥</span> Most Viewed Listings
          </h2>
        </div>

        {/* Desktop: table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase font-mono text-[10px] tracking-wider">
                <th className="py-2.5 px-4">Listing Name</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Price</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Views</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {topViewedProducts.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                  <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-200">
                    {p.name}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        p.type === "service"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                          : "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400"
                      }`}
                    >
                      {p.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold">
                    ${(p.price / 100).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-zinc-500">{p.categoryName || "Uncategorized"}</td>
                  <td className="py-3 px-4 font-mono font-black text-zinc-850 dark:text-white">
                    👀 {p.views}
                  </td>
                </tr>
              ))}
              {topViewedProducts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-400 font-mono">
                    No listings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card layout */}
        <div className="sm:hidden divide-y divide-zinc-100 dark:divide-zinc-800/80">
          {topViewedProducts.map((p) => (
            <div key={p.id} className="p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-lg flex-shrink-0">
                {p.type === "service" ? "🛠️" : "📦"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {p.name}
                </p>
                <p className="text-[10px] text-zinc-400 font-mono">
                  ${(p.price / 100).toFixed(2)} · {p.categoryName || "Uncategorized"}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-black text-zinc-900 dark:text-zinc-100 font-mono">
                  {p.views}
                </p>
                <p className="text-[9px] text-zinc-400">views</p>
              </div>
            </div>
          ))}
          {topViewedProducts.length === 0 && (
            <div className="py-8 text-center text-zinc-400 text-xs font-mono">
              No listings found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
