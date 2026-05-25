'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ScrollRedirector() {
  const router = useRouter();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !redirecting) {
          setRedirecting(true);
          // Brief transition delay
          setTimeout(() => {
            router.push('/vendors');
          }, 800);
        }
      },
      { threshold: 0.1 }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [router, redirecting]);

  return (
    <div ref={sentinelRef} className="py-16 border-t border-zinc-200 dark:border-zinc-800 text-center bg-zinc-100 dark:bg-zinc-900/60 w-full flex flex-col items-center justify-center">
      <div className="max-w-md mx-auto px-4">
        {redirecting ? (
          <div className="flex flex-col items-center gap-3">
            <span className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
            <p className="text-xs font-mono text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wider animate-pulse">
              Navigating to All Product Categories...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="text-xl animate-bounce">↓</span>
            <p className="text-xs font-mono text-zinc-400">
              Scroll further to load all product categories
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
