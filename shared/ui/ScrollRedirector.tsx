'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ScrollRedirector() {
  const router = useRouter();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCancelled, setIsCancelled] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          if (countdown === null && !isCancelled) {
            setCountdown(5);
          }
        } else {
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          setCountdown(null);
          setIsCancelled(false); // Reset cancellation state when scrolled away
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
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [countdown, isCancelled]);

  useEffect(() => {
    if (countdown !== null) {
      if (countdown > 0) {
        timerRef.current = setTimeout(() => {
          setCountdown(countdown - 1);
        }, 1000);
      } else {
        router.push('/products');
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [countdown, router]);

  const handleGoImmediately = () => {
    router.push('/products');
  };

  const handleCancelRedirect = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setCountdown(null);
    setIsCancelled(true);
  };

  return (
    <div ref={sentinelRef} className="py-16 border-t border-zinc-200 dark:border-zinc-800 text-center bg-zinc-100 dark:bg-zinc-900/60 w-full flex flex-col items-center justify-center">
      <div className="max-w-md mx-auto px-4 flex flex-col items-center gap-4">
        {isCancelled ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs font-mono text-zinc-550 dark:text-zinc-400">
              Auto-redirection cancelled.
            </p>
            <button
              onClick={handleGoImmediately}
              className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer"
            >
              Explore Products
            </button>
            <p className="text-[9px] font-mono text-zinc-400/80">
              Scroll up and down to reset auto-redirect
            </p>
          </div>
        ) : countdown !== null ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
              <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider font-mono">
                {countdown > 0 ? `Redirecting in ${countdown}s...` : 'Navigating...'}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleGoImmediately}
                className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-purple-500/20 transition-all duration-200 cursor-pointer active:scale-95 animate-pulse"
              >
                Go Immediately
              </button>
              <button
                onClick={handleCancelRedirect}
                className="px-5 py-2.5 border border-zinc-300 dark:border-zinc-750 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer active:scale-95"
              >
                Cancel Redirect
              </button>
            </div>
            <p className="text-[10px] font-mono text-zinc-400">
              Scroll up or click Cancel to stop
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <span className="text-xl animate-bounce">↓</span>
            <p className="text-xs font-mono text-zinc-400">
              Scroll further to load all products & services
            </p>
            <button
              onClick={handleGoImmediately}
              className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer"
            >
              Explore Products
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
