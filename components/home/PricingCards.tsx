import Link from 'next/link';
import { Check, Sparkles } from 'lucide-react';

export default function PricingCards({ plans }: { plans: any[] }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch justify-center">
        {plans.map((plan: any) => {
          const isGrowth = plan.isPopular;
          return (
            <div
              key={plan.id}
              className={`flex flex-col p-6 sm:p-8 rounded-3xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1.5 ${
                isGrowth
                  ? 'border-2 border-indigo-500/80 dark:border-indigo-400/80 bg-white dark:bg-zinc-900 shadow-xl shadow-indigo-500/10 dark:shadow-indigo-500/20 ring-1 ring-indigo-500/30'
                  : 'border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xl'
              }`}
            >
              {/* Popular Highlight Gradient Backdrop */}
              {isGrowth && (
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl pointer-events-none" />
              )}

              {/* Popular Badge */}
              {isGrowth && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-mono text-[10px] uppercase font-extrabold tracking-widest px-3.5 py-1.5 rounded-bl-2xl shadow-sm flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Most Popular
                </div>
              )}

              {/* Header Info */}
              <div className="mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                  {plan.name}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed min-h-[44px]">
                  {plan.description}
                </p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                      {plan.period}
                    </span>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="w-full border-t border-zinc-100 dark:border-zinc-800/80 my-4" />

              {/* Features List */}
              <ul className="space-y-3.5 mb-8 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 flex-grow">
                {(plan.features || []).map((feature: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className={`p-0.5 rounded-full shrink-0 mt-0.5 ${
                      isGrowth ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      <Check className="w-4 h-4" />
                    </div>
                    <span className="leading-snug">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Link
                href={plan.buttonLink || '/contact'}
                className={`w-full text-center py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${
                  isGrowth
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 active:scale-[0.98]'
                    : 'bg-zinc-900 dark:bg-zinc-800 text-white hover:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-800 dark:border-zinc-700 shadow-sm active:scale-[0.98]'
                }`}
              >
                {plan.buttonText || 'Get Started'}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
