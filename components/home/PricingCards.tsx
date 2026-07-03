import Link from 'next/link';
import { Check } from 'lucide-react';

export default function PricingCards({ plans }: { plans: any[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
      {plans.map((plan: any) => {
        const isGrowth = plan.isPopular;
        return (
          <div
            key={plan.id}
            className={`flex flex-col p-8 rounded-3xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
              isGrowth
                ? 'border-2 border-indigo-500 bg-white dark:bg-zinc-900 shadow-xl shadow-indigo-500/10'
                : 'border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 hover:shadow-lg'
            }`}
          >
            {isGrowth && (
              <div className="absolute top-0 right-0 bg-indigo-500 text-white font-mono text-[9px] uppercase font-bold tracking-widest px-3 py-1 rounded-bl-xl">
                Most Popular
              </div>
            )}
            <div className="mb-6">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">{plan.name}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed min-h-[40px]">
                {plan.description}
              </p>
              <div className="mt-6 flex items-baseline">
                <span className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{plan.price}</span>
                {plan.period && (
                  <span className="ml-1 text-sm text-zinc-500 dark:text-zinc-400 font-medium">{plan.period}</span>
                )}
              </div>
            </div>
            <ul className="space-y-4 mb-8 text-sm text-zinc-600 dark:text-zinc-300 flex-grow">
              {(plan.features || []).map((feature: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3">
                  <Check className={`w-5 h-5 shrink-0 mt-0.5 ${isGrowth ? 'text-indigo-500' : 'text-emerald-500'}`} />
                  <span className="leading-tight">{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              href={plan.buttonLink || '/contact'}
              className={`w-full text-center py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${
                isGrowth
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md hover:shadow-indigo-500/25 active:scale-[0.98]'
                  : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-700 active:scale-[0.98]'
              }`}
            >
              {plan.buttonText || 'Get Started'}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
