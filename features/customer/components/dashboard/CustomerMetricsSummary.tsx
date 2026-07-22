interface CustomerMetricsSummaryProps {
  wishlistCount: number;
  ordersCount: number;
  totalSpent: number;
}

export default function CustomerMetricsSummary({
  wishlistCount,
  ordersCount,
  totalSpent,
}: CustomerMetricsSummaryProps) {
  const formattedTotalSpent = (totalSpent / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs transition-all hover:border-purple-500/30">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
              Wishlist Items
            </p>
            <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 mt-1 font-mono">
              {wishlistCount}
            </h3>
          </div>
          <span className="text-xl bg-purple-50 dark:bg-purple-950/50 p-2 rounded-xl text-purple-600 dark:text-purple-400">
            ❤️
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs transition-all hover:border-indigo-500/30">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
              Orders Placed
            </p>
            <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 mt-1 font-mono">
              {ordersCount}
            </h3>
          </div>
          <span className="text-xl bg-indigo-50 dark:bg-indigo-950/50 p-2 rounded-xl text-indigo-600 dark:text-indigo-400">
            📋
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs transition-all hover:border-emerald-500/30">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
              Total Spend
            </p>
            <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 mt-1 font-mono">
              {formattedTotalSpent}
            </h3>
          </div>
          <span className="text-xl bg-emerald-50 dark:bg-emerald-950/50 p-2 rounded-xl text-emerald-600 dark:text-emerald-400">
            💰
          </span>
        </div>
      </div>
    </div>
  );
}
