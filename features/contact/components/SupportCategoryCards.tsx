"use client";

export interface SupportCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  badge?: string;
  count: number;
}

export const SUPPORT_CATEGORIES: SupportCategory[] = [
  {
    id: "orders",
    title: "Orders & Delivery",
    description: "Track shipments, delivery estimates, order modifications & cancellations.",
    icon: "package",
    count: 4,
  },
  {
    id: "billing",
    title: "Billing & Refunds",
    description: "Payment methods, multi-currency invoices, FX markups & refund requests.",
    icon: "credit-card",
    count: 4,
  },
  {
    id: "vendor",
    title: "Vendor & Selling",
    description: "Store onboarding, product listings, commission structure & payouts.",
    icon: "store",
    count: 4,
  },
  {
    id: "account",
    title: "Account & Security",
    description: "Account credentials, authentication, organization roles & data privacy.",
    icon: "shield-check",
    count: 3,
  },
];

interface SupportCategoryCardsProps {
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export default function SupportCategoryCards({
  selectedCategory,
  onSelectCategory,
}: SupportCategoryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {SUPPORT_CATEGORIES.map((cat) => {
        const isSelected = selectedCategory === cat.id;

        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(isSelected ? null : cat.id)}
            className={`text-left p-6 rounded-2xl border transition-all duration-200 group relative overflow-hidden flex flex-col justify-between ${
              isSelected
                ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/20 shadow-md"
                : "bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700/60 hover:shadow-sm"
            }`}
          >
            {/* Top accent highlight */}
            <div
              className={`absolute top-0 left-0 right-0 h-1 transition-colors ${
                isSelected
                  ? "bg-indigo-600 dark:bg-indigo-400"
                  : "bg-transparent group-hover:bg-indigo-400/40"
              }`}
            />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                    isSelected
                      ? "bg-indigo-600 text-white dark:bg-indigo-500"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                  }`}
                >
                  {cat.icon === "package" && (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                  )}
                  {cat.icon === "credit-card" && (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                  {cat.icon === "store" && (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
                      />
                    </svg>
                  )}
                  {cat.icon === "shield-check" && (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  )}
                </div>
                <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                  {cat.count} articles
                </span>
              </div>

              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {cat.title}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {cat.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-xs font-medium">
              <span
                className={
                  isSelected
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200"
                }
              >
                {isSelected ? "Filtering by category" : "Browse topic"}
              </span>
              <svg
                className={`w-4 h-4 transition-transform ${
                  isSelected
                    ? "translate-x-1 text-indigo-600 dark:text-indigo-400"
                    : "text-zinc-400 group-hover:translate-x-1"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </button>
        );
      })}
    </div>
  );
}
