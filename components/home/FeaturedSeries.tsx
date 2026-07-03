import Link from 'next/link';
import Image from 'next/image';
import { type FeaturedSeries } from '@/features/marketing/queries';
import { ShoppingBag } from 'lucide-react';

export default function FeaturedSeriesList({ seriesList }: { seriesList: FeaturedSeries[] }) {
  if (!seriesList || seriesList.length === 0) {
    return (
      <div className="text-center p-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl text-zinc-500">
        No featured products available.
      </div>
    );
  }

  return (
    <div className="space-y-16">
      {seriesList.map((series) => (
        <div key={series.id} className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <div>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{series.title}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{series.description}</p>
            </div>
            <Link 
              href="/products" 
              className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View All Products &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {series.products.map((product) => (
              <div 
                key={product.id}
                className="group relative flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 overflow-hidden hover:shadow-md transition-all duration-200"
              >
                <div className="aspect-[4/3] bg-zinc-100 dark:bg-zinc-800 relative flex items-center justify-center overflow-hidden">
                  {product.imageUrl ? (
                    <Image 
                      src={product.imageUrl} 
                      alt={product.name} 
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-300 dark:text-zinc-700 group-hover:scale-105 transition-transform duration-300">
                      <ShoppingBag className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-white/90 dark:bg-zinc-900/90 text-zinc-800 dark:text-zinc-200 backdrop-blur-sm shadow-sm">
                      {product.vendorName}
                    </span>
                  </div>
                </div>
                
                <div className="p-5 flex flex-col flex-grow">
                  <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-50 mb-1 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    <Link href="/products" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-sm">
                      <span className="absolute inset-0 z-10" aria-hidden="true" />
                      {product.name}
                    </Link>
                  </h4>
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{product.price}</span>
                    <button className="relative z-20 w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                      <ShoppingBag className="w-4 h-4" />
                      <span className="sr-only">Add to Cart</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
