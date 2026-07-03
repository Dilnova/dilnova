'use client';

import { useState, useEffect } from 'react';

export default function SmartHeader({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // If scrolling down and past the header height, hide it
      if (currentScrollY > lastScrollY && currentScrollY > 64) {
        setIsVisible(false);
      } else {
        // If scrolling up, show it
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <header 
      className={`relative flex justify-between items-center px-3 sm:px-4 md:px-6 border-b border-zinc-200/60 dark:border-zinc-900 bg-white/70 dark:bg-zinc-950/70 sticky top-0 z-50 min-h-[3.5rem] sm:min-h-[4rem] max-w-full transition-transform duration-300 ease-in-out ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      {children}
    </header>
  );
}
