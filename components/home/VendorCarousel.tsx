'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Store } from 'lucide-react';

export default function VendorCarousel({ vendors }: { vendors: any[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = direction === 'left' ? -400 : 400;
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (vendors.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center p-12 text-center bg-zinc-50 dark:bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
          <Store className="w-8 h-8 text-zinc-400" />
        </div>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Vendor Spots Open</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-6">
          Our marketplace is expanding. Be among the first independent sellers to join the hub and reach our enterprise customer base.
        </p>
        <Link 
          href="/contact"
          className="inline-flex items-center justify-center h-10 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors"
        >
          Become a Marketplace Seller
        </Link>
      </div>
    );
  }

  return (
    <div className="relative group">
      {/* Navigation Controls */}
      <button 
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-6 z-10 w-10 h-10 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-md hidden md:flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity disabled:opacity-0"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      
      <button 
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-6 z-10 w-10 h-10 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-md hidden md:flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity disabled:opacity-0"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Scrollable Container */}
      <div 
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto touch-pan-x snap-x snap-mandatory scrollbar-hide py-4 px-2"
      >
        {vendors.map((vendor) => (
          <Link
            key={vendor.id}
            href={`/vendors/${vendor.slug}`}
            className="flex-none w-[85vw] sm:w-[280px] md:w-[320px] snap-start flex flex-col p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all duration-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 group/card"
          >
            <div className="flex items-start justify-between mb-4">
              {vendor.imageUrl ? (
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 relative">
                  <Image 
                    src={vendor.imageUrl} 
                    alt={`${vendor.name} logo`} 
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                  {vendor.name.charAt(0)}
                </div>
              )}
              <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                Marketplace
              </span>
            </div>
            
            <div className="flex-grow">
              <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1 group-hover/card:text-indigo-600 dark:group-hover/card:text-indigo-400 transition-colors">
                {vendor.name}
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                Independent seller on the Dilnova Commerce Hub.
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
